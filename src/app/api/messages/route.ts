import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db/connection';
import { Message, Trip } from '@/lib/db/models';
import { v4 as uuidv4 } from 'uuid';

// GET /api/messages?tripId=xxx - Get messages for a trip
export async function GET(request: NextRequest) {
    try {
        await connectToDatabase();

        const { searchParams } = new URL(request.url);
        const tripId = searchParams.get('tripId');

        if (!tripId) {
            return NextResponse.json({ error: 'tripId is required' }, { status: 400 });
        }

        const messages = await Message.find({ tripId })
            .sort({ createdAt: 1 })
            .limit(100);

        return NextResponse.json(messages);
    } catch (error) {
        console.error('Error fetching messages:', error);
        return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
    }
}

// POST /api/messages - Send a message
export async function POST(request: NextRequest) {
    try {
        await connectToDatabase();

        const body = await request.json();
        const { tripId, senderId, senderName, content } = body;

        if (!tripId || !senderId || !senderName || !content) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        // Check if message mentions AI
        const isAIMention = content.toLowerCase().includes('@weai');

        const message = new Message({
            tripId,
            senderId,
            senderName,
            content,
            isAIMention,
        });

        await message.save();

        // If AI is mentioned, trigger AI response
        if (isAIMention) {
            // Get trip context
            const trip = await Trip.findById(tripId);
            const recentMessages = await Message.find({ tripId })
                .sort({ createdAt: -1 })
                .limit(20);

            // Call AI endpoint
            try {
                // In development, call the local Python server directly to avoid Next.js proxy timeouts
                const aiUrl = process.env.NODE_ENV === 'development'
                    ? 'http://127.0.0.1:5328/api/ai/suggest'
                    : `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/ai/suggest`;

                console.log(`Sending AI request to: ${aiUrl}`);

                const aiResponse = await fetch(aiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        query: content.replace(/@weai/gi, '').trim(),
                        tripContext: trip,
                        chatHistory: recentMessages.reverse()
                    }),
                    // Set a long timeout for AI generation (5 minutes)
                    signal: AbortSignal.timeout(300000)
                });


                // --- ROBUST MULTI-BLOCK JSON PARSING ---
                const aiResult = await aiResponse.json();
                let finalContent = aiResult.result || '';

                console.log('================================================================================');
                console.log('RAW AI RESPONSE START (Length: ' + finalContent.length + ')');
                console.log(finalContent);
                console.log('RAW AI RESPONSE END');
                console.log('================================================================================');

                let messageContent = finalContent; // This will be cleaned up

                // Helper to extract loop over all code-fenced JSON blocks
                // Regex: match ```json or ``` (case insensitive), capture content, match ```
                const codeFenceRegex = /```(?:json)?\s*([\s\S]*?)\s*```/gi;
                let match;
                const jsonBlocks: string[] = [];

                // 1. Extract all code-fenced JSON blocks
                while ((match = codeFenceRegex.exec(finalContent)) !== null) {
                    jsonBlocks.push(match[1]);
                    // Remove the block from the messageContent
                    messageContent = messageContent.replace(match[0], '').trim();
                }

                // 2. If no fenced blocks found, try to find a single raw JSON object
                if (jsonBlocks.length === 0) {
                    const jsonStartPattern = /\{\s*"action"\s*:\s*"(add_items|update_items|remove_items|smart_schedule|update_preferences)"/;
                    const startMatch = finalContent.match(jsonStartPattern);

                    if (startMatch && startMatch.index !== undefined) {
                        // Attempt to balance braces
                        let braceCount = 0;
                        let inString = false;
                        let escaped = false;
                        let endIndex = -1;
                        const jsonStartIndex = startMatch.index;

                        for (let i = jsonStartIndex; i < finalContent.length; i++) {
                            const char = finalContent[i];
                            if (escaped) { escaped = false; continue; }
                            if (char === '\\' && inString) { escaped = true; continue; }
                            if (char === '"' && !escaped) { inString = !inString; continue; }
                            if (!inString) {
                                if (char === '{') braceCount++;
                                else if (char === '}') {
                                    braceCount--;
                                    if (braceCount === 0) {
                                        endIndex = i + 1;
                                        break;
                                    }
                                }
                            }
                        }

                        if (endIndex !== -1) {
                            const rawJson = finalContent.substring(jsonStartIndex, endIndex);
                            jsonBlocks.push(rawJson);
                            // Remove from message
                            messageContent = messageContent.replace(rawJson, '').trim();
                        }
                    }
                }

                // 3. Process ALL found JSON blocks
                let hasProcessedAction = false;

                for (const jsonStr of jsonBlocks) {
                    try {
                        const actionData = JSON.parse(jsonStr);
                        console.log('PROCESSING ACTION:', actionData.action);

                        // --- ACTION: ADD ITEMS ---
                        if (actionData.action === 'add_items' && Array.isArray(actionData.items)) {
                            // Extract strategy
                            const replacementStrategy = actionData.replacementStrategy || 'replace';
                            const isOptions = actionData.isOptions === true;

                            // Helper to validate HH:MM format
                            const isValidTime = (time: string) => {
                                if (!time || typeof time !== 'string') return false;
                                const match = time.match(/^(\d{1,2}):(\d{2})$/);
                                if (!match) return false;
                                const h = parseInt(match[1], 10);
                                const m = parseInt(match[2], 10);
                                return h >= 0 && h <= 23 && m >= 0 && m <= 59;
                            };

                            // Helper to convert HH:MM to minutes
                            const toMinutes = (time: string) => {
                                if (!isValidTime(time)) return 0;
                                const [h, m] = time.split(':').map(Number);
                                return h * 60 + m;
                            };

                            // Helper to convert minutes to HH:MM
                            const toTimeStr = (mins: number) => {
                                const h = Math.floor(mins / 60) % 24;
                                const m = mins % 60;
                                return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
                            };

                            const tripDoc = await Trip.findById(tripId);
                            if (!tripDoc) throw new Error('Trip not found');

                            const newItems: any[] = [];

                            if (isOptions) {
                                // CASE 1: Mutually exclusive options (same time slot)
                                const groupId = uuidv4();
                                const day = actionData.items[0]?.day || 1;

                                // Determine time slot
                                let startTime = '20:00'; // Default evening if not specified
                                let duration = 180;

                                // Use first item's time/duration if available
                                if (actionData.items[0]?.duration) duration = actionData.items[0].duration;
                                if (isValidTime(actionData.items[0]?.startTime)) startTime = actionData.items[0].startTime;

                                const startMins = toMinutes(startTime);
                                const endMins = startMins + duration;
                                const endTime = toTimeStr(endMins);

                                newItems.push(...actionData.items.map((item: any) => ({
                                    id: uuidv4(),
                                    title: item.title,
                                    description: item.description || '',
                                    day: day,
                                    startTime,
                                    endTime,
                                    duration,
                                    location: item.location || '',
                                    groupId,
                                    votes: { yes: [], no: [] },
                                    status: 'pending',
                                    suggestedBy: 'ai',
                                    createdAt: new Date()
                                })));
                            } else {
                                // CASE 2: Sequential items (schedule them)
                                // Sort by day to keep structure
                                const itemsByDay = new Map<number, any[]>();
                                actionData.items.forEach((item: any) => {
                                    const d = item.day || 1;
                                    if (!itemsByDay.has(d)) itemsByDay.set(d, []);
                                    itemsByDay.get(d)?.push(item);
                                });

                                // Process each day
                                itemsByDay.forEach((dayItems, day) => {
                                    let currentMins = 9 * 60; // Start at 09:00 AM by default

                                    // If appending, find end of last existing item for this day
                                    if (replacementStrategy === 'append') {
                                        const existingDayItems = tripDoc.itinerary.filter((i: any) => i.day === day);
                                        if (existingDayItems.length > 0) {
                                            // Find max end time
                                            existingDayItems.forEach((i: any) => {
                                                if (i.endTime) currentMins = Math.max(currentMins, toMinutes(i.endTime));
                                            });
                                            currentMins += 30; // Add 30 min buffer
                                        }
                                    }

                                    dayItems.forEach((item: any, index: number) => {
                                        const duration = item.duration || 60;

                                        // Use provided time if valid, otherwise schedule
                                        let sMins = currentMins;
                                        if (isValidTime(item.startTime)) {
                                            sMins = toMinutes(item.startTime);
                                        }

                                        const eMins = sMins + duration;

                                        newItems.push({
                                            id: uuidv4(),
                                            title: item.title,
                                            description: item.description || '',
                                            day: day,
                                            startTime: toTimeStr(sMins),
                                            endTime: toTimeStr(eMins),
                                            duration,
                                            order: index, // sequence
                                            location: item.location || '',
                                            votes: { yes: [], no: [] },
                                            status: 'pending',
                                            suggestedBy: 'ai',
                                            createdAt: new Date()
                                        });

                                        currentMins = eMins + 30; // buffer for next item
                                    });
                                });
                            }

                            // Handling replacements
                            const itemsToRemove = new Set<string>();
                            if (replacementStrategy === 'replace') {
                                // Add logic to clear existing items for the affected days
                                const affectedDays = new Set(newItems.map(i => i.day));
                                tripDoc.itinerary.forEach((item: any) => {
                                    if (affectedDays.has(item.day)) {
                                        // Only remove AI suggestions or generic items.
                                        if (item.suggestedBy === 'ai' || ['breakfast', 'lunch', 'dinner'].includes(item.title.toLowerCase())) {
                                            itemsToRemove.add(item.id);
                                        }
                                    }
                                });
                            }

                            if (itemsToRemove.size > 0) {
                                console.log(`Removing ${itemsToRemove.size} items (Strategy: ${replacementStrategy})`);
                                tripDoc.itinerary = tripDoc.itinerary.filter((item: any) => !itemsToRemove.has(item.id));
                            }

                            tripDoc.itinerary.push(...newItems);
                            await tripDoc.save();
                            console.log(`Added ${newItems.length} items to itinerary`);

                            hasProcessedAction = true;
                            if (!messageContent) {
                                messageContent = `I've added ${newItems.length} options to the itinerary for you to vote on. Check out the Itinerary panel!`;
                            }

                            // --- ACTION: UPDATE ITEMS ---
                        } else if (actionData.action === 'update_items' && Array.isArray(actionData.updates)) {
                            const tripDoc = await Trip.findById(tripId);
                            if (tripDoc) {
                                let updatedCount = 0;
                                for (const update of actionData.updates) {
                                    // Find item logic: match title/day, or try to guess
                                    const item = tripDoc.itinerary.find((i: any) => {
                                        const titleMatch = i.title.toLowerCase().includes(update.originalTitle.toLowerCase()) ||
                                            update.originalTitle.toLowerCase().includes(i.title.toLowerCase());
                                        return titleMatch && i.day === update.day;
                                    });

                                    if (item) {
                                        if (update.newStartTime) item.startTime = update.newStartTime;
                                        if (update.newEndTime) item.endTime = update.newEndTime;
                                        updatedCount++;
                                    }
                                }
                                if (updatedCount > 0) {
                                    await tripDoc.save();
                                    hasProcessedAction = true;
                                    if (!messageContent) messageContent = "I've updated the itinerary as requested.";
                                }
                            }

                            // --- ACTION: REMOVE ITEMS ---
                        } else if (actionData.action === 'remove_items' && Array.isArray(actionData.items)) {
                            const tripDoc = await Trip.findById(tripId);
                            if (tripDoc) {
                                const initialLength = tripDoc.itinerary.length;
                                tripDoc.itinerary = tripDoc.itinerary.filter((item: any) => {
                                    for (const toRemove of actionData.items) {
                                        const titleMatch = item.title.toLowerCase().includes(toRemove.title.toLowerCase()) ||
                                            toRemove.title.toLowerCase().includes(item.title.toLowerCase());
                                        if (titleMatch && item.day === toRemove.day) return false;
                                    }
                                    return true;
                                });

                                const removedCount = initialLength - tripDoc.itinerary.length;
                                if (removedCount > 0) {
                                    await tripDoc.save();
                                    hasProcessedAction = true;
                                    if (!messageContent) messageContent = `I've removed ${removedCount} item${removedCount > 1 ? 's' : ''} from your itinerary.`;
                                } else if (!messageContent) {
                                    messageContent = "I couldn't find the item(s) you wanted to remove. Please check the item name and try again.";
                                }
                            }

                            // --- ACTION: UPDATE PREFERENCES ---
                        } else if (actionData.action === 'update_preferences' && actionData.preferences) {
                            const tripDoc = await Trip.findById(tripId);
                            if (tripDoc) {
                                if (!tripDoc.preferences) tripDoc.preferences = { dietary: [], interests: [], constraints: [], budget: '' };
                                const newPrefs = actionData.preferences;
                                let updatedCount = 0;

                                if (Array.isArray(newPrefs.dietary)) {
                                    const set = new Set([...(tripDoc.preferences.dietary || []), ...newPrefs.dietary]);
                                    if (set.size > (tripDoc.preferences.dietary?.length || 0)) { tripDoc.preferences.dietary = Array.from(set); updatedCount++; }
                                }
                                if (Array.isArray(newPrefs.interests)) {
                                    const set = new Set([...(tripDoc.preferences.interests || []), ...newPrefs.interests]);
                                    if (set.size > (tripDoc.preferences.interests?.length || 0)) { tripDoc.preferences.interests = Array.from(set); updatedCount++; }
                                }
                                if (Array.isArray(newPrefs.constraints)) {
                                    const set = new Set([...(tripDoc.preferences.constraints || []), ...newPrefs.constraints]);
                                    if (set.size > (tripDoc.preferences.constraints?.length || 0)) { tripDoc.preferences.constraints = Array.from(set); updatedCount++; }
                                }
                                if (newPrefs.budget && tripDoc.preferences.budget !== newPrefs.budget) {
                                    tripDoc.preferences.budget = newPrefs.budget;
                                    updatedCount++;
                                }

                                if (updatedCount > 0) {
                                    await tripDoc.save();
                                    console.log('Updated preferences');
                                    hasProcessedAction = true;
                                }
                            }

                            // If this was an implicit update (no text), notify user
                            if (!messageContent.trim()) {
                                messageContent = "I've noted your preferences for the trip!";
                            }
                        }
                    } catch (e) {
                        console.error('Failed to process JSON block:', e);
                    }
                }

                // Clean up any leaked "Thought:" or "Action:" lines if verbose mode leaked them
                // Regex to remove "Thought: ... \n" lines if they appear
                messageContent = messageContent.replace(/^Thought:.*$/gm, '').trim();
                messageContent = messageContent.replace(/^Action:.*$/gm, '').trim();

                // Final clean
                finalContent = messageContent.trim();
                if (!finalContent) finalContent = "I've updated the trip plan!";

                // Save AI response as a message
                if (aiResult.success) {
                    const aiMessage = new Message({
                        tripId,
                        senderId: 'ai',
                        senderName: 'AI Assistant',
                        content: finalContent,
                        isAIMention: false,
                    });
                    await aiMessage.save();

                    return NextResponse.json({ message, aiResponse: aiMessage });
                }
            } catch (aiError) {
                console.error('AI response error:', aiError);
                console.error('⚠️ NOTE: For local development, make sure the AI server is running: npm run dev:ai');
                // Continue without AI response
            }
        }

        return NextResponse.json(message);
    } catch (error) {
        console.error('Error sending message:', error);
        return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
    }
}
