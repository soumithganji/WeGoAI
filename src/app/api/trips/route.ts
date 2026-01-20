import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db/connection';
import { Trip } from '@/lib/db/models';
import { v4 as uuidv4 } from 'uuid';

// GET /api/trips - List all trips (for user) or get by invite code
export async function GET(request: NextRequest) {
    try {
        await connectToDatabase();

        const { searchParams } = new URL(request.url);
        const inviteCode = searchParams.get('inviteCode');

        if (inviteCode) {
            const trip = await Trip.findOne({ inviteCode });
            if (!trip) {
                return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
            }
            return NextResponse.json(trip);
        }

        // For now, return all trips (in production, filter by user)
        const trips = await Trip.find().sort({ createdAt: -1 }).limit(20);
        return NextResponse.json(trips);

    } catch (error) {
        console.error('Error fetching trips:', error);
        return NextResponse.json({ error: 'Failed to fetch trips' }, { status: 500 });
    }
}

// POST /api/trips - Create a new trip
export async function POST(request: NextRequest) {
    try {
        await connectToDatabase();

        const body = await request.json();
        const { name, creatorName, settings } = body;

        if (!name || !creatorName || !settings || !settings.destination) {
            return NextResponse.json(
                { error: 'Missing required fields: name, creatorName, settings.destination' },
                { status: 400 }
            );
        }

        // Generate a readable invite code based on trip name
        // Format: First 4 letters of trip name (no spaces) + 3 random digits
        // Example: "Paris Trip" → "PARI123", "Beach Vacation" → "BEAC456"
        const cleanName = name.replace(/[^a-zA-Z]/g, '').toUpperCase();
        const namePart = cleanName.substring(0, 4).padEnd(4, 'X'); // Pad with X if name is short
        const numberPart = Math.floor(100 + Math.random() * 900).toString(); // 3 digits (100-999)
        const inviteCode = `${namePart}${numberPart}`;
        const creatorId = uuidv4();

        const trip = new Trip({
            name,
            settings: {
                destination: settings.destination,
                groupSize: settings.groupSize || 4,
                daysCount: settings.daysCount || 3,
                nightsCount: settings.nightsCount || 2,
                ageGroup: settings.ageGroup || 'mixed',
                landingTime: settings.landingTime,
                departureTime: settings.departureTime,
                airport: settings.airport,
                hotel: settings.hotel,
            },
            members: [{
                id: creatorId,
                name: creatorName,
                isCreator: true,
                joinedAt: new Date()
            }],
            itinerary: [],
            inviteCode,
        });

        await trip.save();

        return NextResponse.json({
            id: trip._id,
            inviteCode,
            creatorId,
            trip
        }, { status: 201 });

    } catch (error) {
        console.error('Error creating trip:', error);
        return NextResponse.json({ error: 'Failed to create trip' }, { status: 500 });
    }
}
