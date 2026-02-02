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

                const aiResult = await aiResponse.json();
                let finalContent = aiResult.result || '';

                console.log('=== AI RESPONSE DEBUG ===');
                console.log('Full AI Result length:', finalContent.length);

                // Check for JSON action block (with or without code fences)
                let jsonMatch = finalContent.match(/```json\s*([\s\S]*?)\s*```/);
                let jsonString = jsonMatch ? jsonMatch[1] : null;
                let jsonStartIndex = -1;

                console.log('Code fence match found:', !!jsonMatch);

                // If no code fence match, try to find raw JSON object with balanced braces
                if (!jsonString) {
                    // Find the start of the JSON object - match add_items, update_items, remove_items, or smart_schedule
                    const jsonStartPattern = /\{\s*"action"\s*:\s*"(add_items|update_items|remove_items|smart_schedule)"/;
                    const startMatch = finalContent.match(jsonStartPattern);

                    if (startMatch && startMatch.index !== undefined) {
                        jsonStartIndex = startMatch.index;
                        // Extract JSON by finding matching closing brace
                        let braceCount = 0;
                        let inString = false;
                        let escaped = false;
                        let endIndex = -1;

                        for (let i = jsonStartIndex; i < finalContent.length; i++) {
                            const char = finalContent[i];

                            if (escaped) {
                                escaped = false;
                                continue;
                            }

                            if (char === '\\' && inString) {
                                escaped = true;
                                continue;
                            }

                            if (char === '"' && !escaped) {
                                inString = !inString;
                                continue;
                            }

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

                        if (endIndex > jsonStartIndex) {
                            jsonString = finalContent.substring(jsonStartIndex, endIndex);
                            console.log('Extracted JSON via balanced braces, length:', jsonString.length);
                        } else {
                            console.log('Failed to find balanced closing brace. braceCount at end:', braceCount);
                        }
                    } else {
                        console.log('No add_items pattern found in response');
                    }
                }

                console.log('JSON string found:', !!jsonString);
                if (jsonString) {
                    console.log('JSON string length:', jsonString.length);
                    console.log('JSON string preview:', jsonString.substring(0, 200));
                }

                if (jsonString) {
                    try {
                        const actionData = JSON.parse(jsonString);
                        console.log('PARSED ACTION DATA:', JSON.stringify(actionData, null, 2));

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
                                        // Don't remove things that look like user-added/confirmed items unless specifically requested? 
                                        // For now, if "replace" strategy is used by AI (usually for full itinerary gen), we replace everything for that day
                                        // UNLESS it's a "general" generic replace.
                                        // Let's be safe: only remove AI suggestions or generic items.
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


                            // Remove the JSON block from the user-facing message
                            if (jsonMatch) {
                                finalContent = finalContent.replace(jsonMatch[0], '').trim();
                            } else if (jsonStartIndex !== -1) {
                                finalContent = finalContent.substring(0, jsonStartIndex).trim();
                            }

                            if (!finalContent) {
                                finalContent = `I've added ${newItems.length} options to the itinerary for you to vote on. Check out the Itinerary panel!`;
                            }
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
                                    finalContent = "I've updated the itinerary as requested.";
                                }
                            }

                            // Remove the JSON block
                            if (jsonMatch) finalContent = finalContent.replace(jsonMatch[0], '').trim();
                            else if (jsonStartIndex !== -1) finalContent = finalContent.substring(0, jsonStartIndex).trim();
                        } else if (actionData.action === 'remove_items' && Array.isArray(actionData.items)) {
                            // Handle removing items from the itinerary
                            const tripDoc = await Trip.findById(tripId);
                            if (tripDoc) {
                                const initialLength = tripDoc.itinerary.length;

                                // Build a set of items to remove based on title and day matching
                                tripDoc.itinerary = tripDoc.itinerary.filter((item: any) => {
                                    for (const toRemove of actionData.items) {
                                        const titleMatch = item.title.toLowerCase().includes(toRemove.title.toLowerCase()) ||
                                            toRemove.title.toLowerCase().includes(item.title.toLowerCase());
                                        if (titleMatch && item.day === toRemove.day) {
                                            return false; // Remove this item
                                        }
                                    }
                                    return true; // Keep this item
                                });

                                const removedCount = initialLength - tripDoc.itinerary.length;

                                if (removedCount > 0) {
                                    await tripDoc.save();
                                    console.log(`Removed ${removedCount} items from itinerary`);
                                    finalContent = `I've removed ${removedCount} item${removedCount > 1 ? 's' : ''} from your itinerary.`;
                                } else {
                                    finalContent = "I couldn't find the item(s) you wanted to remove. Please check the item name and try again.";
                                }
                            }

                            // Remove the JSON block
                            if (jsonMatch) finalContent = finalContent.replace(jsonMatch[0], '').trim();
                            else if (jsonStartIndex !== -1) finalContent = finalContent.substring(0, jsonStartIndex).trim();
                        } else if (actionData.action === 'smart_schedule') {
                            // Handle intelligent scheduling with both new items and rescheduling
                            const tripDoc = await Trip.findById(tripId);
                            if (!tripDoc) throw new Error('Trip not found');

                            let addedCount = 0;
                            let rescheduledCount = 0;
                            let removedCount = 0;

                            // Handle explicit item removal (replacing generic placeholders)
                            if (Array.isArray(actionData.itemsToRemove) && actionData.itemsToRemove.length > 0) {
                                const initialLength = tripDoc.itinerary.length;
                                const titlesToRemove = new Set(actionData.itemsToRemove.map((t: string) => t.toLowerCase()));

                                // Get days affected by new items to scope the removal
                                const affectedDays = new Set(
                                    Array.isArray(actionData.newItems)
                                        ? actionData.newItems.map((i: any) => i.day || 1)
                                        : [1]
                                );

                                tripDoc.itinerary = tripDoc.itinerary.filter((item: any) => {
                                    // Only remove if it's on an affected day AND matches one of the titles to remove
                                    if (affectedDays.has(item.day) && titlesToRemove.has(item.title.toLowerCase())) {
                                        return false;
                                    }
                                    return true;
                                });

                                removedCount = initialLength - tripDoc.itinerary.length;
                                console.log(`Smart schedule: removed ${removedCount} items matching [${actionData.itemsToRemove.join(', ')}]`);
                            }

                            // First, handle rescheduling existing items
                            if (Array.isArray(actionData.reschedule)) {
                                for (const reschedule of actionData.reschedule) {
                                    const item = tripDoc.itinerary.find((i: any) => {
                                        const titleMatch = i.title.toLowerCase().includes(reschedule.originalTitle.toLowerCase()) ||
                                            reschedule.originalTitle.toLowerCase().includes(i.title.toLowerCase());
                                        return titleMatch && i.day === reschedule.day;
                                    });

                                    if (item) {
                                        if (reschedule.newStartTime) item.startTime = reschedule.newStartTime;
                                        if (reschedule.newEndTime) item.endTime = reschedule.newEndTime;
                                        rescheduledCount++;
                                    }
                                }
                            }

                            // Then, add new items
                            if (Array.isArray(actionData.newItems) && actionData.newItems.length > 0) {
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

                                const isOptions = actionData.isOptions === true;
                                const groupId = isOptions ? uuidv4() : undefined;

                                // If options, force shared timing based on the first item
                                let commonStartTime = '09:00';
                                let commonEndTime = '11:00';
                                let commonDuration = 120;

                                if (isOptions) {
                                    const first = actionData.newItems[0];
                                    if (isValidTime(first.startTime)) commonStartTime = first.startTime;
                                    if (first.duration) commonDuration = first.duration;

                                    // Recalculate end time to ensure consistency
                                    const startMins = toMinutes(commonStartTime);
                                    const endMins = startMins + commonDuration;
                                    commonEndTime = toTimeStr(endMins);
                                }

                                const newItems = actionData.newItems.map((item: any) => {
                                    // For options, use common times. For distinct items, use their own times.
                                    const myStartTime = isOptions ? commonStartTime : (isValidTime(item.startTime) ? item.startTime : '09:00');
                                    const myEndTime = isOptions ? commonEndTime : (isValidTime(item.endTime) ? item.endTime : '11:00');
                                    const myDuration = isOptions ? commonDuration : (item.duration || 120);

                                    return {
                                        id: uuidv4(),
                                        title: item.title,
                                        description: item.description || '',
                                        day: item.day || 1,
                                        startTime: myStartTime,
                                        endTime: myEndTime,
                                        duration: myDuration,
                                        location: item.location || '',
                                        votes: { yes: [], no: [] },
                                        status: 'pending',
                                        suggestedBy: 'ai',
                                        groupId, // Assign group ID if it's an options group
                                        createdAt: new Date()
                                    };
                                });

                                console.log('GENERATED NEW ITEMS:', JSON.stringify(newItems, null, 2));

                                tripDoc.itinerary.push(...newItems);
                                addedCount = newItems.length;
                            }

                            await tripDoc.save();
                            console.log(`Smart schedule: added ${addedCount} items, rescheduled ${rescheduledCount} items`);

                            // Build user-friendly message
                            let message = '';
                            if (addedCount > 0 && removedCount > 0) {
                                message = `I've updated your itinerary by replacing ${removedCount} item${removedCount > 1 ? 's' : ''} with ${addedCount} new option${addedCount > 1 ? 's' : ''}.`;
                            } else if (addedCount > 0 && rescheduledCount > 0) {
                                message = `I've added ${addedCount} new activity${addedCount > 1 ? 'ies' : ''} and adjusted the schedule for ${rescheduledCount} existing item${rescheduledCount > 1 ? 's' : ''} to make everything fit!`;
                            } else if (addedCount > 0) {
                                message = `I've added ${addedCount} new activity${addedCount > 1 ? 'ies' : ''} to your itinerary!`;
                            } else if (rescheduledCount > 0) {
                                message = `I've adjusted ${rescheduledCount} item${rescheduledCount > 1 ? 's' : ''} in your schedule.`;
                            } else if (removedCount > 0) {
                                message = `I've removed ${removedCount} item${removedCount > 1 ? 's' : ''} from your itinerary.`;
                            }

                            // Remove the JSON block from response
                            if (jsonMatch) {
                                finalContent = finalContent.replace(jsonMatch[0], '').trim();
                            } else if (jsonStartIndex !== -1) {
                                finalContent = finalContent.substring(0, jsonStartIndex).trim();
                            }

                            if (!finalContent) {
                                finalContent = message || "I've updated your itinerary!";
                            }
                        }
                    } catch (e) {
                        console.error('=== JSON PARSE ERROR ===');
                        console.error('Failed to parse AI action:', e);
                        console.error('JSON string that failed:', jsonString?.substring(0, 500));
                    }
                }

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
