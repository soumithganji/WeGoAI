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
        const isAIMention = content.toLowerCase().includes('@ai');

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

            // Call AI endpoint (will be handled asynchronously in production)
            try {
                const aiResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/ai/suggest`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        query: content.replace(/@ai/gi, '').trim(),
                        tripContext: trip,
                        chatHistory: recentMessages.reverse()
                    })
                });

                const aiResult = await aiResponse.json();

                // Save AI response as a message
                if (aiResult.success) {
                    const aiMessage = new Message({
                        tripId,
                        senderId: 'ai',
                        senderName: 'AI Assistant',
                        content: aiResult.result,
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
