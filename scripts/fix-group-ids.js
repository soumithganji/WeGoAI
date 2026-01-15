const mongoose = require('mongoose');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

// Manual .env loading
const envPath = '.env';
if (fs.existsSync(envPath)) {
    fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
        const [key, ...vals] = line.split('=');
        if (key && vals.length) process.env[key.trim()] = vals.join('=').trim();
    });
}

async function fixGroupIds() {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;
    const trips = db.collection('trips');

    const trip = await trips.findOne({ _id: new mongoose.Types.ObjectId('6968683a5e8166442f3458e9') });

    // Get last 5 AI items without groupId
    const aiItems = trip.itinerary.filter(i => i.suggestedBy === 'ai' && !i.groupId);
    console.log('Found', aiItems.length, 'AI items without groupId');

    if (aiItems.length > 0) {
        const groupId = uuidv4();
        const ids = aiItems.slice(-5).map(i => i.id);

        // Update each item individually
        for (const id of ids) {
            await trips.updateOne(
                { _id: trip._id, 'itinerary.id': id },
                { $set: { 'itinerary.$.groupId': groupId } }
            );
        }
        console.log('Updated', ids.length, 'items with groupId:', groupId);
    }

    await mongoose.disconnect();
    console.log('Done');
}

fixGroupIds().catch(console.error);
