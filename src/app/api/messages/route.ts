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

            // --- SPECIAL HANDLER: "clear day X" commands ---
            // Handle these directly without AI to avoid misinterpretation
            const clearDayMatch = content.toLowerCase().match(/\b(clear|empty|reset)\s+(day\s*)?(\d+)/i);
            if (clearDayMatch && trip) {
                const dayToClear = parseInt(clearDayMatch[3], 10);
                const initialLength = trip.itinerary.length;

                // Remove all items for the specified day
                trip.itinerary = trip.itinerary.filter((item: any) => item.day !== dayToClear);
                const removedCount = initialLength - trip.itinerary.length;

                if (removedCount > 0) {
                    await trip.save();

                    const aiMessage = new Message({
                        tripId,
                        senderId: 'ai',
                        senderName: 'AI Assistant',
                        content: `Done! I've cleared day ${dayToClear} - removed ${removedCount} item${removedCount > 1 ? 's' : ''} from the itinerary.`,
                        isAIMention: false,
                    });
                    await aiMessage.save();
                    return NextResponse.json({ message, aiResponse: aiMessage });
                } else {
                    const aiMessage = new Message({
                        tripId,
                        senderId: 'ai',
                        senderName: 'AI Assistant',
                        content: `Day ${dayToClear} is already empty - there are no items to clear.`,
                        isAIMention: false,
                    });
                    await aiMessage.save();
                    return NextResponse.json({ message, aiResponse: aiMessage });
                }
            }

            // Call AI endpoint
            try {
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


                // --- Step 1: RECEIVE & LOG THE RAW AI RESPONSE ---
                // The AI returns { success, result }. `result` may contain plain text,
                // embedded JSON action blocks, or both.

                const aiResult = await aiResponse.json();
                let finalContent = aiResult.result || '';

                // Debug logging
                console.log('================================================================================');
                console.log('RAW AI RESPONSE START (Length: ' + finalContent.length + ')');
                console.log(finalContent);
                console.log('RAW AI RESPONSE END');
                console.log('================================================================================');

                // `messageContent` will hold the user-facing text after JSON blocks are stripped out
                let messageContent = finalContent;

                // --- Step 2: EXTRACT JSON BLOCKS FROM THE AI RESPONSE ---
                // look for ```json``` code fences. fallback: find raw JSON via brace-balancing.

                // --- Strategy A: Extract all code-fenced JSON blocks ---
                // Regex matches ```json ... ``` or ``` ... ``` (case-insensitive)
                const codeFenceRegex = /```(?:json)?\s*([\s\S]*?)\s*```/gi;
                let match;
                const jsonBlocks: string[] = [];

                while ((match = codeFenceRegex.exec(finalContent)) !== null) {
                    jsonBlocks.push(match[1]);
                    // Strip the JSON code fence from the user-facing message text
                    messageContent = messageContent.replace(match[0], '').trim();
                }

                // We look for `{"action": "<known_action>"`
                // and then use brace-balancing to find the complete JSON object.
                if (jsonBlocks.length === 0) {
                    // Pattern matches the start of a valid action JSON object
                    const jsonStartPattern = /\{\s*"action"\s*:\s*"(add_items|update_items|remove_items|smart_schedule|update_preferences)"/;
                    const startMatch = finalContent.match(jsonStartPattern);

                    if (startMatch && startMatch.index !== undefined) {
                        // Brace-balancing parser: walk character by character to find
                        // the matching closing brace, handling strings and escape chars
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
                                        endIndex = i + 1; // Found the complete JSON object
                                        break;
                                    }
                                }
                            }
                        }

                        if (endIndex !== -1) {
                            const rawJson = finalContent.substring(jsonStartIndex, endIndex);
                            jsonBlocks.push(rawJson);
                            // Strip the raw JSON from the user-facing message text
                            messageContent = messageContent.replace(rawJson, '').trim();
                        }
                    }
                }

                // --- Step 3: ACTION DISPATCHER ---
                // Parse each JSON block and dispatch based on `action` field.
                // Supported: add_items, update_items, remove_items, update_preferences, smart_schedule

                let hasProcessedAction = false;

                for (const jsonStr of jsonBlocks) {
                    try {
                        const actionData = JSON.parse(jsonStr);
                        console.log('PROCESSING ACTION:', actionData.action);

                        // --- ACTION: add_items ---
                        // Adds new itinerary items. isOptions=true → voteable options (grouped),
                        // isOptions=false → sequential scheduling. replacementStrategy: 'replace' or 'append'.
                        if (actionData.action === 'add_items' && Array.isArray(actionData.items)) {
                            const replacementStrategy = actionData.replacementStrategy || 'replace';
                            const isOptions = actionData.isOptions === true;

                            // --- Time utility helpers (used throughout this action) ---

                            // Validates that a string is in "HH:MM" 24-hour format
                            const isValidTime = (time: string) => {
                                if (!time || typeof time !== 'string') return false;
                                const match = time.match(/^(\d{1,2}):(\d{2})$/);
                                if (!match) return false;
                                const h = parseInt(match[1], 10);
                                const m = parseInt(match[2], 10);
                                return h >= 0 && h <= 23 && m >= 0 && m <= 59;
                            };

                            // Converts "HH:MM" → total minutes (e.g., "09:30" → 570)
                            const toMinutes = (time: string) => {
                                if (!isValidTime(time)) return 0;
                                const [h, m] = time.split(':').map(Number);
                                return h * 60 + m;
                            };

                            // Converts total minutes → "HH:MM" (e.g., 570 → "09:30")
                            const toTimeStr = (mins: number) => {
                                const h = Math.floor(mins / 60) % 24;
                                const m = mins % 60;
                                return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
                            };

                            const tripDoc = await Trip.findById(tripId);
                            if (!tripDoc) throw new Error('Trip not found');

                            const newItems: any[] = [];

                            if (isOptions) {
                                // --- OPTION MODE: Mutually exclusive choices ---
                                // All items share the same time slot and a `groupId`.
                                // The UI presents these as voteable options (pick one).
                                const groupId = uuidv4();
                                const day = actionData.items[0]?.day || 1;

                                let startTime = '20:00';
                                let duration = 180;

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
                                    groupId,      // Links these items as mutually exclusive options
                                    votes: { yes: [], no: [] },
                                    status: 'pending',
                                    suggestedBy: 'ai',
                                    createdAt: new Date()
                                })));
                            } else {
                                // --- SEQUENTIAL MODE: Schedule items one after another ---
                                // Group items by day, then assign sequential time slots
                                // starting from 09:00 AM (or after existing items if appending)
                                const itemsByDay = new Map<number, any[]>();
                                actionData.items.forEach((item: any) => {
                                    const d = item.day || 1;
                                    if (!itemsByDay.has(d)) itemsByDay.set(d, []);
                                    itemsByDay.get(d)?.push(item);
                                });

                                itemsByDay.forEach((dayItems, day) => {
                                    let currentMins = 9 * 60; // Default: start scheduling at 09:00

                                    // If using 'append' strategy, find the latest end time
                                    // on this day and start scheduling after a 30-min buffer
                                    if (replacementStrategy === 'append') {
                                        const existingDayItems = tripDoc.itinerary.filter((i: any) => i.day === day);
                                        if (existingDayItems.length > 0) {
                                            existingDayItems.forEach((i: any) => {
                                                if (i.endTime) currentMins = Math.max(currentMins, toMinutes(i.endTime));
                                            });
                                            currentMins += 30; // 30-min gap between last existing and new items
                                        }
                                    }

                                    dayItems.forEach((item: any, index: number) => {
                                        const duration = item.duration || 60;

                                        // Use the AI-provided start time if valid; otherwise auto-schedule
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
                                            order: index,
                                            location: item.location || '',
                                            votes: { yes: [], no: [] },
                                            status: 'pending',
                                            suggestedBy: 'ai',
                                            createdAt: new Date()
                                        });

                                        currentMins = eMins + 30; // 30-min buffer before next item
                                    });
                                });
                            }

                            // --- Replacement strategy: clean up old items before adding new ones ---
                            // 'replace' mode: remove previous AI-suggested items on affected days
                            // 'append' mode: keep everything, just add to the end
                            const itemsToRemove = new Set<string>();
                            if (replacementStrategy === 'replace') {
                                const affectedDays = new Set(newItems.map(i => i.day));
                                tripDoc.itinerary.forEach((item: any) => {
                                    if (affectedDays.has(item.day)) {
                                        // Only remove AI-suggested or generic meal items, not user-created ones
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

                            // --- Persist the new items to the database ---
                            tripDoc.itinerary.push(...newItems);
                            await tripDoc.save();
                            console.log(`Added ${newItems.length} items to itinerary`);

                            hasProcessedAction = true;
                            if (!messageContent) {
                                messageContent = `I've added ${newItems.length} options to the itinerary for you to vote on. Check out the Itinerary panel!`;
                            }

                            // --- ACTION: update_items ---
                            // Modifies existing items (e.g., times). Matches by fuzzy title + day number.
                        } else if (actionData.action === 'update_items' && Array.isArray(actionData.updates)) {
                            const tripDoc = await Trip.findById(tripId);
                            if (tripDoc) {
                                let updatedCount = 0;
                                for (const update of actionData.updates) {
                                    // Fuzzy match: find an itinerary item whose title partially
                                    // matches the update's originalTitle AND is on the same day
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

                            // --- ACTION: remove_items ---
                            // Removes items from the itinerary. Matches by fuzzy title + day number.
                        } else if (actionData.action === 'remove_items' && Array.isArray(actionData.items)) {
                            const tripDoc = await Trip.findById(tripId);
                            if (tripDoc) {
                                const initialLength = tripDoc.itinerary.length;
                                // Filter out items that match any of the removal targets
                                tripDoc.itinerary = tripDoc.itinerary.filter((item: any) => {
                                    for (const toRemove of actionData.items) {
                                        const titleMatch = item.title.toLowerCase().includes(toRemove.title.toLowerCase()) ||
                                            toRemove.title.toLowerCase().includes(item.title.toLowerCase());
                                        if (titleMatch && item.day === toRemove.day) return false; // Remove this item
                                    }
                                    return true; // Keep this item
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

                            // --- ACTION: update_preferences ---
                            // Updates trip preferences (dietary, interests, constraints, budget).
                            // Uses Set-based merging to avoid duplicates.
                        } else if (actionData.action === 'update_preferences' && actionData.preferences) {
                            const tripDoc = await Trip.findById(tripId);
                            if (tripDoc) {
                                // Initialize preferences if they don't exist yet
                                if (!tripDoc.preferences) tripDoc.preferences = { dietary: [], interests: [], constraints: [], budget: '' };
                                const newPrefs = actionData.preferences;
                                let updatedCount = 0;

                                // Merge each preference array using Sets to deduplicate
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

                            if (!messageContent.trim()) {
                                messageContent = "I've noted your preferences for the trip!";
                            }

                            // --- ACTION: smart_schedule ---
                            // Combined remove-and-add: removes old items then adds new ones atomically.
                            // Supports same two modes as add_items (options vs sequential).
                        } else if (actionData.action === 'smart_schedule' && Array.isArray(actionData.newItems)) {
                            const tripDoc = await Trip.findById(tripId);
                            if (!tripDoc) throw new Error('Trip not found');

                            const isOptions = actionData.isOptions === true;
                            const itemsToRemove = actionData.itemsToRemove || [];
                            const targetDay = actionData.newItems[0]?.day || 1;

                            // --- Time utility helpers (same as add_items) ---
                            const isValidTime = (time: string) => {
                                if (!time || typeof time !== 'string') return false;
                                const match = time.match(/^(\d{1,2}):(\d{2})$/);
                                if (!match) return false;
                                const h = parseInt(match[1], 10);
                                const m = parseInt(match[2], 10);
                                return h >= 0 && h <= 23 && m >= 0 && m <= 59;
                            };

                            const toMinutes = (time: string) => {
                                if (!isValidTime(time)) return 0;
                                const [h, m] = time.split(':').map(Number);
                                return h * 60 + m;
                            };

                            const toTimeStr = (mins: number) => {
                                const h = Math.floor(mins / 60) % 24;
                                const m = mins % 60;
                                return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
                            };

                            // --- Step 1: Remove specified items from the target day ---
                            // Only removes items on the target day whose title fuzzy-matches
                            let removedCount = 0;
                            if (itemsToRemove.length > 0) {
                                const initialLength = tripDoc.itinerary.length;
                                tripDoc.itinerary = tripDoc.itinerary.filter((item: any) => {
                                    if (item.day !== targetDay) return true; // Keep items on other days

                                    for (const titleToRemove of itemsToRemove) {
                                        const titleMatch = item.title.toLowerCase().includes(titleToRemove.toLowerCase()) ||
                                            titleToRemove.toLowerCase().includes(item.title.toLowerCase());
                                        if (titleMatch) {
                                            console.log(`smart_schedule: Removing "${item.title}" from day ${item.day}`);
                                            return false;
                                        }
                                    }
                                    return true;
                                });
                                removedCount = initialLength - tripDoc.itinerary.length;
                            }

                            // --- Step 2: Build and add new items ---
                            const newItems: any[] = [];

                            if (isOptions) {
                                // Option mode: mutually exclusive choices with shared groupId
                                const groupId = uuidv4();
                                const day = targetDay;

                                let startTime = actionData.newItems[0]?.startTime || '09:00';
                                let duration = actionData.newItems[0]?.duration || 60;

                                if (!isValidTime(startTime)) startTime = '09:00';

                                const startMins = toMinutes(startTime);
                                const endMins = startMins + duration;
                                const endTime = toTimeStr(endMins);

                                newItems.push(...actionData.newItems.map((item: any) => ({
                                    id: uuidv4(),
                                    title: item.title,
                                    description: item.description || '',
                                    day: day,
                                    startTime: isValidTime(item.startTime) ? item.startTime : startTime,
                                    endTime: isValidTime(item.endTime) ? item.endTime : endTime,
                                    duration: item.duration || duration,
                                    location: item.location || '',
                                    groupId,
                                    votes: { yes: [], no: [] },
                                    status: 'pending',
                                    suggestedBy: 'ai',
                                    createdAt: new Date()
                                })));
                            } else {
                                // Sequential mode: schedule items one after another
                                let currentMins = 9 * 60;

                                actionData.newItems.forEach((item: any, index: number) => {
                                    const duration = item.duration || 60;
                                    let sMins = currentMins;

                                    if (isValidTime(item.startTime)) {
                                        sMins = toMinutes(item.startTime);
                                    }

                                    const eMins = sMins + duration;

                                    newItems.push({
                                        id: uuidv4(),
                                        title: item.title,
                                        description: item.description || '',
                                        day: item.day || targetDay,
                                        startTime: toTimeStr(sMins),
                                        endTime: toTimeStr(eMins),
                                        duration,
                                        order: index,
                                        location: item.location || '',
                                        votes: { yes: [], no: [] },
                                        status: 'pending',
                                        suggestedBy: 'ai',
                                        createdAt: new Date()
                                    });

                                    currentMins = eMins + 30;
                                });
                            }

                            // --- Step 3: Persist changes ---
                            tripDoc.itinerary.push(...newItems);
                            await tripDoc.save();

                            console.log(`smart_schedule: Removed ${removedCount} items, added ${newItems.length} new items for day ${targetDay}`);
                            hasProcessedAction = true;

                            if (!messageContent) {
                                if (isOptions) {
                                    messageContent = `I've added ${newItems.length} options for you to vote on. Check the Itinerary panel!`;
                                } else {
                                    messageContent = `I've updated the schedule with ${newItems.length} new item${newItems.length > 1 ? 's' : ''}.`;
                                }
                            }
                        }
                    } catch (e) {
                        console.error('Failed to process JSON block:', e);
                    }
                }

                // --- Step 4: CLEAN UP THE USER-FACING MESSAGE ---
                // Strip leaked LLM reasoning artifacts ("Thought:", "Action:" lines).

                // Remove any leaked internal reasoning lines from the LLM
                messageContent = messageContent.replace(/^Thought:.*$/gm, '').trim();
                messageContent = messageContent.replace(/^Action:.*$/gm, '').trim();

                // If all content was JSON (no text left), provide a default message
                finalContent = messageContent.trim();
                if (!finalContent) finalContent = "I've updated the trip plan!";

                // --- Step 5: SAVE AI RESPONSE TO DATABASE & RETURN ---
                // Store the cleaned message in MongoDB and return both user message + AI response.

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
            }
        }

        return NextResponse.json(message);
    } catch (error) {
        console.error('Error sending message:', error);
        return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
    }
}
