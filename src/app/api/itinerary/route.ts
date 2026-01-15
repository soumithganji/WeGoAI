import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db/connection';
import { Trip } from '@/lib/db/models';
import { v4 as uuidv4 } from 'uuid';

// POST /api/itinerary/vote - Vote on an itinerary item
export async function POST(request: NextRequest) {
    try {
        await connectToDatabase();

        const body = await request.json();
        const { tripId, itemId, userId, vote } = body;

        if (!tripId || !itemId || !userId || !['yes', 'no'].includes(vote)) {
            return NextResponse.json(
                { error: 'Missing or invalid fields' },
                { status: 400 }
            );
        }

        const trip = await Trip.findById(tripId);
        if (!trip) {
            return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
        }

        // Find the itinerary item
        const item = trip.itinerary.find((i: any) => i.id === itemId);
        if (!item) {
            return NextResponse.json({ error: 'Item not found' }, { status: 404 });
        }

        // Helper to remove vote
        const removeVote = (voteArray: string[], uid: string) => voteArray.filter(id => id !== uid);

        // Remove previous vote if exists (toggle behavior)
        item.votes.yes = removeVote(item.votes.yes, userId);
        item.votes.no = removeVote(item.votes.no, userId);

        // If voting YES and item has a group, remove YES votes from other items in the same group
        // Use direct MongoDB update for reliability
        if (vote === 'yes' && item.groupId) {
            // Get IDs of other items in the same group
            const otherGroupItemIds = trip.itinerary
                .filter((i: any) => i.id !== itemId && i.groupId === item.groupId)
                .map((i: any) => i.id);

            // Use individual updates for each item (more reliable than arrayFilters)
            for (const otherId of otherGroupItemIds) {
                await Trip.updateOne(
                    { _id: tripId, 'itinerary.id': otherId },
                    { $pull: { 'itinerary.$.votes.yes': userId } }
                );
            }
            console.log(`Removed votes from ${otherGroupItemIds.length} other items in group for user ${userId}`);
        }

        // Add new vote
        if (vote === 'yes') {
            item.votes.yes.push(userId);
        } else {
            item.votes.no.push(userId);
        }

        // Check if all members have voted yes for this item
        const memberCount = trip.members.length;
        if (item.votes.yes.length === memberCount) {
            item.status = 'approved';

            // If this item is in a group, remove all other items in the group
            if (item.groupId) {
                trip.itinerary = trip.itinerary.filter((otherItem: any) =>
                    otherItem.id === itemId || otherItem.groupId !== item.groupId
                );
                // Clear the groupId since it's now the only one
                item.groupId = undefined;
            }
        } else if (item.votes.no.length > 0 && item.votes.yes.length + item.votes.no.length === memberCount) {
            // All voted but not unanimous yes - mark as rejected if any no votes
            item.status = 'rejected';
        }

        // Save the current item's vote changes
        await Trip.updateOne(
            { _id: tripId, 'itinerary.id': itemId },
            {
                $set: {
                    'itinerary.$.votes': item.votes,
                    'itinerary.$.status': item.status,
                    'itinerary.$.groupId': item.groupId
                }
            }
        );

        return NextResponse.json({
            item,
            status: item.status,
            yesCount: item.votes.yes.length,
            noCount: item.votes.no.length,
            totalMembers: memberCount
        });
    } catch (error) {
        console.error('Error voting:', error);
        return NextResponse.json({ error: 'Failed to vote' }, { status: 500 });
    }
}

// POST /api/itinerary/add - Add item to itinerary (creates poll)
export async function PUT(request: NextRequest) {
    try {
        await connectToDatabase();

        const body = await request.json();
        const { tripId, item, suggestedBy } = body;

        if (!tripId || !item || !item.title) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        const trip = await Trip.findById(tripId);
        if (!trip) {
            return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
        }

        // Check for clashes
        const newStart = item.startTime;
        const newEnd = item.endTime;
        const newDay = item.day;

        const existingItems = trip.itinerary.filter((i: any) =>
            i.day === newDay && i.status !== 'rejected'
        );

        for (const existing of existingItems) {
            if (existing.startTime && newStart && existing.endTime && newEnd) {
                // Simple time clash detection
                if (
                    (newStart >= existing.startTime && newStart < existing.endTime) ||
                    (newEnd > existing.startTime && newEnd <= existing.endTime)
                ) {
                    return NextResponse.json({
                        error: 'Time clash detected',
                        clashWith: existing.title,
                        existingTime: `${existing.startTime} - ${existing.endTime}`
                    }, { status: 409 });
                }
            }
        }

        const newItem = {
            id: uuidv4(),
            title: item.title,
            description: item.description || '',
            day: item.day || 1,
            startTime: item.startTime || '',
            endTime: item.endTime || '',
            location: item.location || '',
            travelTimeFromPrevious: item.travelTimeFromPrevious,
            votes: {
                yes: suggestedBy !== 'ai' ? [suggestedBy] : [],
                no: []
            },
            status: 'pending',
            suggestedBy: suggestedBy || 'ai',
            createdAt: new Date()
        };

        trip.itinerary.push(newItem);
        trip.updatedAt = new Date();
        await trip.save();

        return NextResponse.json(newItem, { status: 201 });
    } catch (error) {
        console.error('Error adding item:', error);
        return NextResponse.json({ error: 'Failed to add item' }, { status: 500 });
    }
}
