import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db/connection';
import { Trip } from '@/lib/db/models';

export async function POST(request: NextRequest) {
    try {
        await connectToDatabase();

        const body = await request.json();
        const { tripId, day, itemIds } = body;

        if (!tripId || !day || !Array.isArray(itemIds)) {
            return NextResponse.json(
                { error: 'Missing or invalid fields' },
                { status: 400 }
            );
        }

        const trip = await Trip.findById(tripId);
        if (!trip) {
            return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
        }

        // Update order for each item
        let updatedCount = 0;
        itemIds.forEach((itemId: string, index: number) => {
            const item = trip.itinerary.find((i: any) => i.id === itemId && i.day === day);
            if (item) {
                item.order = index;
                updatedCount++;
            }
        });

        if (updatedCount > 0) {
            trip.markModified('itinerary');
            await trip.save();
        }

        return NextResponse.json({ success: true, updatedCount });
    } catch (error) {
        console.error('Error reordering items:', error);
        return NextResponse.json({ error: 'Failed to reorder items' }, { status: 500 });
    }
}
