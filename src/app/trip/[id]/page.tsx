'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import ChatInterface from '@/components/ChatInterface';
import ItineraryPanel from '@/components/ItineraryPanel';
import { Trip, Message, ItineraryItem } from '@/lib/types';

interface TripPageProps {
    params: Promise<{ id: string }>;
}

export default function TripPage({ params }: TripPageProps) {
    const { id: tripId } = use(params);
    const router = useRouter();

    const [trip, setTrip] = useState<Trip | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [userId, setUserId] = useState<string>('');
    const [userName, setUserName] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [showItinerary, setShowItinerary] = useState(true);
    const [showSettings, setShowSettings] = useState(false);

    // Load trip and user data
    useEffect(() => {
        const loadData = async () => {
            try {
                // Get user from localStorage
                const storedUser = localStorage.getItem(`trip_${tripId}_user`);
                if (!storedUser) {
                    router.push(`/trip/${tripId}/join`);
                    return;
                }

                const user = JSON.parse(storedUser);
                setUserId(user.id);
                setUserName(user.name);

                // Fetch trip
                const tripRes = await fetch(`/api/trips/${tripId}`);
                const tripData = await tripRes.json();
                if (tripData.error) {
                    alert('Trip not found');
                    router.push('/');
                    return;
                }
                setTrip(tripData);

                // Fetch messages
                const msgRes = await fetch(`/api/messages?tripId=${tripId}`);
                const msgData = await msgRes.json();
                setMessages(msgData);

                setLoading(false);
            } catch (error) {
                console.error('Error loading trip:', error);
                setLoading(false);
            }
        };

        loadData();

        // Poll for new messages every 3 seconds
        const interval = setInterval(async () => {
            try {
                const msgRes = await fetch(`/api/messages?tripId=${tripId}`);
                const msgData = await msgRes.json();
                setMessages(msgData);

                const tripRes = await fetch(`/api/trips/${tripId}`);
                const tripData = await tripRes.json();
                setTrip(tripData);
            } catch (error) {
                console.error('Polling error:', error);
            }
        }, 3000);

        return () => clearInterval(interval);
    }, [tripId, router]);

    const handleSendMessage = async (content: string) => {
        try {
            const res = await fetch('/api/messages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tripId,
                    senderId: userId,
                    senderName: userName,
                    content,
                }),
            });

            const data = await res.json();

            // Add message to state
            setMessages((prev) => [...prev, data]);

            // If AI responded, add that too
            if (data.aiResponse) {
                setMessages((prev) => [...prev, data.aiResponse]);
            }
        } catch (error) {
            console.error('Error sending message:', error);
        }
    };

    const handleVote = async (itemId: string, vote: 'yes' | 'no') => {
        try {
            await fetch('/api/itinerary', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tripId,
                    itemId,
                    userId,
                    vote,
                }),
            });

            // Refresh trip data
            const tripRes = await fetch(`/api/trips/${tripId}`);
            const tripData = await tripRes.json();
            setTrip(tripData);
        } catch (error) {
            console.error('Error voting:', error);
        }
    };

    const handleAddItem = async (item: Partial<ItineraryItem>) => {
        try {
            const res = await fetch('/api/itinerary', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tripId,
                    item,
                    suggestedBy: userId,
                }),
            });

            const data = await res.json();

            if (data.error === 'Time clash detected') {
                alert(`⚠️ Time clash with "${data.clashWith}" (${data.existingTime})`);
                return;
            }

            // Refresh trip data
            const tripRes = await fetch(`/api/trips/${tripId}`);
            const tripData = await tripRes.json();
            setTrip(tripData);
        } catch (error) {
            console.error('Error adding item:', error);
        }
    };

    const handleUpdateSettings = async (settings: any) => {
        try {
            await fetch(`/api/trips/${tripId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ settings }),
            });

            // Refresh trip
            const tripRes = await fetch(`/api/trips/${tripId}`);
            setTrip(await tripRes.json());
            setShowSettings(false);
        } catch (error) {
            console.error('Error updating settings:', error);
        }
    };

    const copyInviteLink = () => {
        const link = `${window.location.origin}/trip/${tripId}/join?code=${trip?.inviteCode}`;
        navigator.clipboard.writeText(link);
        alert('Invite link copied to clipboard!');
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                <div className="text-white text-xl">Loading trip...</div>
            </div>
        );
    }

    if (!trip) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                <div className="text-white text-xl">Trip not found</div>
            </div>
        );
    }

    return (
        <div className="h-screen bg-gray-900 flex flex-col">
            {/* Header */}
            <header className="bg-gray-800 border-b border-gray-700 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <h1 className="text-xl font-bold text-white">
                        🌍 {trip.name}
                    </h1>
                    <span className="text-sm text-gray-400">
                        📍 {trip.settings.destination}
                    </span>
                    <span className="text-sm text-gray-400">
                        👥 {trip.members.length} members
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={copyInviteLink}
                        className="px-3 py-1.5 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700"
                    >
                        📋 Invite Code: {trip.inviteCode}
                    </button>
                    <button
                        onClick={() => setShowSettings(!showSettings)}
                        className="px-3 py-1.5 bg-gray-700 text-white rounded-lg text-sm hover:bg-gray-600"
                    >
                        ⚙️ Settings
                    </button>
                    <button
                        onClick={() => setShowItinerary(!showItinerary)}
                        className="px-3 py-1.5 bg-gray-700 text-white rounded-lg text-sm hover:bg-gray-600 md:hidden"
                    >
                        {showItinerary ? '💬 Chat' : '📋 Itinerary'}
                    </button>
                </div>
            </header>

            {/* Settings Panel */}
            {showSettings && (
                <div className="bg-gray-800 border-b border-gray-700 p-4">
                    <h3 className="text-white font-semibold mb-3">Trip Settings</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                            <label className="block text-gray-400 text-sm mb-1">Landing Time</label>
                            <input
                                type="datetime-local"
                                defaultValue={trip.settings.landingTime}
                                onChange={(e) => handleUpdateSettings({ landingTime: e.target.value })}
                                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-gray-400 text-sm mb-1">Departure Time</label>
                            <input
                                type="datetime-local"
                                defaultValue={trip.settings.departureTime}
                                onChange={(e) => handleUpdateSettings({ departureTime: e.target.value })}
                                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-gray-400 text-sm mb-1">Airport</label>
                            <input
                                type="text"
                                defaultValue={trip.settings.airport}
                                onBlur={(e) => handleUpdateSettings({ airport: e.target.value })}
                                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm"
                                placeholder="e.g., CDG"
                            />
                        </div>
                        <div>
                            <label className="block text-gray-400 text-sm mb-1">Hotel</label>
                            <input
                                type="text"
                                defaultValue={trip.settings.hotel}
                                onBlur={(e) => handleUpdateSettings({ hotel: e.target.value })}
                                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm"
                                placeholder="Hotel name"
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Main Content */}
            <div className="flex-1 flex overflow-hidden">
                {/* Chat Panel */}
                <div className={`${showItinerary ? 'hidden md:flex' : 'flex'} flex-1 flex-col`}>
                    <ChatInterface
                        tripId={tripId}
                        userId={userId}
                        userName={userName}
                        messages={messages}
                        onSendMessage={handleSendMessage}
                    />
                </div>

                {/* Itinerary Panel */}
                <div className={`${showItinerary ? 'flex' : 'hidden md:flex'} w-full md:w-96 flex-col border-l border-gray-700`}>
                    <ItineraryPanel
                        tripId={tripId}
                        userId={userId}
                        itinerary={trip.itinerary}
                        memberCount={trip.members.length}
                        daysCount={trip.settings.daysCount}
                        onVote={handleVote}
                        onAddItem={handleAddItem}
                    />
                </div>
            </div>
        </div>
    );
}
