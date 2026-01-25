
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

// Load env
const envPath = path.join(process.cwd(), '.env');
const env = fs.readFileSync(envPath, 'utf8');
env.split('\n').forEach(line => {
    if (line.includes('=')) {
        const parts = line.split('=');
        const k = parts[0].trim();
        const v = parts.slice(1).join('=').trim();
        process.env[k] = v;
    }
});

const MONGODB_URI = process.env.MONGODB_URI;

async function check() {
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to DB");

    // Schema definition (simplified)
    const ItineraryItemSchema = new mongoose.Schema({
        id: String,
        title: String,
        description: String,
        day: Number,
        startTime: String,
        endTime: String,
        location: String,
        groupId: String,
        suggestedBy: String,
        createdAt: { type: Date, default: Date.now }
    });

    const TripSchema = new mongoose.Schema({
        name: String,
        itinerary: [ItineraryItemSchema]
    });

    const Trip = mongoose.models.Trip || mongoose.model('Trip', TripSchema);

    // Find the most recent trip
    const trip = await Trip.findOne().sort({ updatedAt: -1 });

    if (!trip) {
        console.log("No trip found");
        return;
    }

    console.log(`Checking trip: ${trip._id}`);

    const items = trip.itinerary.filter(i => i.title.includes('Option'));
    console.log(`Found ${items.length} 'Option' items`);

    items.forEach(i => {
        console.log(`Item: ${i.title}`);
        console.log(`  - groupId: ${i.groupId}`);
        console.log(`  - day: ${i.day}`);
        console.log(`  - time: ${i.startTime}`);
    });

    await mongoose.disconnect();
}

check().catch(console.error);
