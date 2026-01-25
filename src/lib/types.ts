// Trip and Itinerary Types

export interface TripSettings {
  destination: string;
  landingTime?: string;
  departureTime?: string;
  airport?: string;
  hotel?: string;
  groupSize: number;
  daysCount: number;
  nightsCount: number;
  ageGroup: 'kids' | 'teens' | 'adults' | 'seniors' | 'mixed';
}

export interface ItineraryItem {
  id: string;
  title: string;
  description: string;
  day: number;
  startTime?: string;
  endTime?: string;
  duration?: number; // in minutes
  order?: number; // sequence within the day
  location?: string;
  groupId?: string; // For mutually exclusive options
  travelTimeFromPrevious?: number; // in minutes
  votes: {
    yes: string[];  // user IDs
    no: string[];
  };
  status: 'pending' | 'approved' | 'rejected';
  suggestedBy: 'ai' | string; // 'ai' or user ID
  createdAt: Date;
}

export interface Trip {
  id: string;
  name: string;
  settings: TripSettings;
  members: TripMember[];
  itinerary: ItineraryItem[];
  inviteCode: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TripMember {
  id: string;
  name: string;
  isCreator: boolean;
  joinedAt: Date;
}

export interface Message {
  id: string;
  tripId: string;
  senderId: string;
  senderName: string;
  content: string;
  isAIMention: boolean;
  aiResponse?: string;
  createdAt: Date;
}

export interface Poll {
  id: string;
  tripId: string;
  question: string;
  options: PollOption[];
  createdAt: Date;
  expiresAt?: Date;
  status: 'active' | 'completed';
}

export interface PollOption {
  id: string;
  text: string;
  votes: string[]; // user IDs
}
