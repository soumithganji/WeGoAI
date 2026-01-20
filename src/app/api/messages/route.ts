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
                let finalContent = aiResult.result;

                // Check for JSON action block (with or without code fences)
                let jsonMatch = finalContent.match(/```json\s*([\s\S]*?)\s*```/);
                let jsonString = jsonMatch ? jsonMatch[1] : null;
                let jsonStartIndex = -1;

                // If no code fence match, try to find raw JSON object
                if (!jsonString) {
                    const rawJsonMatch = finalContent.match(/\{\s*"action"\s*:\s*"add_items"[\s\S]*\}/);
                    if (rawJsonMatch) {
                        jsonString = rawJsonMatch[0];
                        jsonStartIndex = finalContent.indexOf(jsonString);
                    }
                }

                console.log('AI Result:', finalContent.substring(0, 200));
                console.log('JSON Match found:', !!jsonString);

                if (jsonString) {
                    try {
                        const actionData = JSON.parse(jsonString);
                        if (actionData.action === 'add_items' && Array.isArray(actionData.items)) {
                            // First pass: Count items per time slot to identify actual groups
                            const slotCounts = new Map<string, number>();
                            actionData.items.forEach((item: any) => {
                                const d = item.day || 1;
                                const s = item.startTime || '09:00';
                                const e = item.endTime || '11:00';
                                const key = `${d}-${s}-${e}`;
                                slotCounts.set(key, (slotCounts.get(key) || 0) + 1);
                            });

                            const itemsByTimeSlot = new Map<string, string>(); // key -> groupId

                            const newItems = actionData.items.map((item: any) => {
                                const day = item.day || 1;
                                const startTime = item.startTime || '09:00';
                                const endTime = item.endTime || '11:00';
                                const slotKey = `${day}-${startTime}-${endTime}`;

                                let groupId = undefined;

                                // Only assign groupId if there are multiple items in this slot (alternatives)
                                if ((slotCounts.get(slotKey) || 0) > 1) {
                                    if (!itemsByTimeSlot.has(slotKey)) {
                                        itemsByTimeSlot.set(slotKey, uuidv4());
                                    }
                                    groupId = itemsByTimeSlot.get(slotKey);
                                }

                                return {
                                    id: uuidv4(),
                                    title: item.title,
                                    description: item.description || '',
                                    day,
                                    startTime,
                                    endTime,
                                    location: item.location || '',
                                    groupId: groupId, // Only present if truly part of a group
                                    votes: { yes: [], no: [] },
                                    status: 'pending',
                                    suggestedBy: 'ai',
                                    createdAt: new Date()
                                };
                            });

                            // Add to trip
                            const tripDoc = await Trip.findById(tripId);
                            if (tripDoc) {
                                tripDoc.itinerary.push(...newItems);
                                await tripDoc.save();
                                console.log(`Added ${newItems.length} items to itinerary from AI`);
                            }

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
                        }
                    } catch (e) {
                        console.error('Failed to parse AI action:', e);
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
