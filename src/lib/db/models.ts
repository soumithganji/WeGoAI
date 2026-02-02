import mongoose, { Schema, Document } from 'mongoose';

// Trip Schema
const TripSettingsSchema = new Schema({
    destination: { type: String, required: true },
    landingTime: String,
    departureTime: String,
    airport: String,
    hotel: String,
    groupSize: { type: Number, required: true },
    daysCount: { type: Number, required: true },
    nightsCount: { type: Number, required: true },
    ageGroup: {
        type: String,
        enum: ['kids', 'teens', 'adults', 'seniors', 'mixed'],
        default: 'mixed'
    }
});

const TripMemberSchema = new Schema({
    id: { type: String, required: true },
    name: { type: String, required: true },
    isCreator: { type: Boolean, default: false },
    joinedAt: { type: Date, default: Date.now }
});

const ItineraryItemSchema = new Schema({
    id: { type: String, required: true },
    title: { type: String, required: true },
    description: String,
    day: { type: Number, required: true },
    startTime: String,
    endTime: String,
    location: String,
    groupId: String,
    travelTimeFromPrevious: Number,
    votes: {
        yes: [String],
        no: [String]
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
    suggestedBy: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

const TripSchema = new Schema({
    name: { type: String, required: true },
    settings: { type: TripSettingsSchema, required: true },
    preferences: {
        dietary: [String],
        interests: [String],
        constraints: [String],
        budget: String
    },
    members: [TripMemberSchema],
    itinerary: [ItineraryItemSchema],
    inviteCode: { type: String, required: true, unique: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// Message Schema
const MessageSchema = new Schema({
    tripId: { type: String, required: true, index: true },
    senderId: { type: String, required: true },
    senderName: { type: String, required: true },
    content: { type: String, required: true },
    isAIMention: { type: Boolean, default: false },
    aiResponse: String,
    createdAt: { type: Date, default: Date.now }
});

// Export models
export const Trip = mongoose.models.Trip || mongoose.model('Trip', TripSchema);
export const Message = mongoose.models.Message || mongoose.model('Message', MessageSchema);
