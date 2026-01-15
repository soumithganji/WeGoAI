import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db/connection';
import { Trip } from '@/lib/db/models';
import { v4 as uuidv4 } from 'uuid';

interface RouteParams {
    params: Promise<{ id: string }>;
}

// GET /api/trips/[id] - Get a specific trip
export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        await connectToDatabase();
        const { id } = await params;

        const trip = await Trip.findById(id);
        if (!trip) {
            return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
        }

        return NextResponse.json(trip);
    } catch (error) {
        console.error('Error fetching trip:', error);
        return NextResponse.json({ error: 'Failed to fetch trip' }, { status: 500 });
    }
}

// PATCH /api/trips/[id] - Update trip settings
export async function PATCH(request: NextRequest, { params }: RouteParams) {
    try {
        await connectToDatabase();
        const { id } = await params;
        const body = await request.json();

        const trip = await Trip.findById(id);
        if (!trip) {
            return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
        }

        // Update settings if provided
        if (body.settings) {
            Object.assign(trip.settings, body.settings);
        }

        trip.updatedAt = new Date();
        await trip.save();

        return NextResponse.json(trip);
    } catch (error) {
        console.error('Error updating trip:', error);
        return NextResponse.json({ error: 'Failed to update trip' }, { status: 500 });
    }
}

// POST /api/trips/[id]/join - Join a trip
export async function POST(request: NextRequest, { params }: RouteParams) {
    try {
        await connectToDatabase();
        const { id } = await params;
        const body = await request.json();
        const { userName } = body;

        if (!userName) {
            return NextResponse.json({ error: 'userName is required' }, { status: 400 });
        }

        const trip = await Trip.findById(id);
        if (!trip) {
            return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
        }

        const userId = uuidv4();
        trip.members.push({
            id: userId,
            name: userName,
            isCreator: false,
            joinedAt: new Date()
        });

        await trip.save();

        return NextResponse.json({ userId, trip });
    } catch (error) {
        console.error('Error joining trip:', error);
        return NextResponse.json({ error: 'Failed to join trip' }, { status: 500 });
    }
}
