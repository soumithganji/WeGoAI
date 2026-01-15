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

    useEffect(() => {
        const loadData = async () => {
            try {
                const storedUser = localStorage.getItem(`trip_${tripId}_user`);
                if (!storedUser) {
                    router.push(`/trip/${tripId}/join`);
                    return;
                }

                const user = JSON.parse(storedUser);
                setUserId(user.id);
                setUserName(user.name);

                const tripRes = await fetch(`/api/trips/${tripId}`);
                const tripData = await tripRes.json();
                if (tripData.error) {
                    alert('Trip not found');
                    router.push('/');
                    return;
                }
                setTrip(tripData);

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
            setMessages((prev) => [...prev, data]);

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
            <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-purple-950 flex items-center justify-center">
                <div className="flex items-center gap-3">
                    <svg className="animate-spin h-8 w-8 text-violet-500" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <span className="text-white text-xl font-medium">Loading trip...</span>
                </div>
            </div>
        );
    }

    if (!trip) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-purple-950 flex items-center justify-center">
                <div className="text-center">
                    <div className="text-6xl mb-4">🔍</div>
                    <div className="text-white text-xl">Trip not found</div>
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen bg-slate-950 flex flex-col">
            {/* Header */}
            <header className="bg-gradient-to-r from-slate-900/90 via-indigo-950/90 to-purple-950/90 backdrop-blur-xl border-b border-white/10 px-6 py-4 flex items-center justify-between animate-fade-in">
                <div className="flex items-center gap-5">
                    <h1 className="text-xl font-bold text-white flex items-center gap-2">
                        <span className="text-2xl">🌍</span>
                        <span>{trip.name}</span>
                    </h1>
                    <div className="hidden sm:flex items-center gap-4 text-sm">
                        <span className="text-slate-400 flex items-center gap-1.5">
                            <span className="text-violet-400">📍</span> {trip.settings.destination}
                        </span>
                        <span className="text-slate-400 flex items-center gap-1.5">
                            <span className="text-cyan-400">👥</span> {trip.members.length} members
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={copyInviteLink}
                        className="px-4 py-2 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl text-sm font-medium hover:from-violet-500 hover:to-purple-500 transition-smooth flex items-center gap-2 shadow-lg shadow-violet-500/20"
                    >
                        <span>📋</span>
                        <span className="hidden sm:inline">Code:</span>
                        <span className="font-mono tracking-wider">{trip.inviteCode}</span>
                    </button>
                    <button
                        onClick={() => setShowSettings(!showSettings)}
                        className={`px-4 py-2 rounded-xl text-sm font-medium transition-smooth flex items-center gap-2 ${showSettings
                                ? 'bg-violet-600 text-white'
                                : 'bg-white/10 text-white hover:bg-white/20 border border-white/10'
                            }`}
                    >
                        ⚙️ <span className="hidden sm:inline">Settings</span>
                    </button>
                    <button
                        onClick={() => setShowItinerary(!showItinerary)}
                        className="px-4 py-2 bg-white/10 text-white rounded-xl text-sm font-medium hover:bg-white/20 transition-smooth md:hidden border border-white/10"
                    >
                        {showItinerary ? '💬 Chat' : '📋 Itinerary'}
                    </button>
                </div>
            </header>

            {/* Settings Panel */}
            {showSettings && (
                <div className="bg-slate-900/80 backdrop-blur-xl border-b border-white/10 p-5 animate-slide-up">
                    <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-violet-500/20 flex items-center justify-center text-sm">⚙️</span>
                        Trip Settings
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                            <label className="block text-slate-400 text-sm mb-2">Landing Time</label>
                            <input
                                type="datetime-local"
                                defaultValue={trip.settings.landingTime}
                                onChange={(e) => handleUpdateSettings({ landingTime: e.target.value })}
                                className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus-glow transition-smooth"
                            />
                        </div>
                        <div>
                            <label className="block text-slate-400 text-sm mb-2">Departure Time</label>
                            <input
                                type="datetime-local"
                                defaultValue={trip.settings.departureTime}
                                onChange={(e) => handleUpdateSettings({ departureTime: e.target.value })}
                                className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus-glow transition-smooth"
                            />
                        </div>
                        <div>
                            <label className="block text-slate-400 text-sm mb-2">Airport</label>
                            <input
                                type="text"
                                defaultValue={trip.settings.airport}
                                onBlur={(e) => handleUpdateSettings({ airport: e.target.value })}
                                className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus-glow transition-smooth"
                                placeholder="e.g., CDG"
                            />
                        </div>
                        <div>
                            <label className="block text-slate-400 text-sm mb-2">Hotel</label>
                            <input
                                type="text"
                                defaultValue={trip.settings.hotel}
                                onBlur={(e) => handleUpdateSettings({ hotel: e.target.value })}
                                className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus-glow transition-smooth"
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
                <div className={`${showItinerary ? 'flex' : 'hidden md:flex'} w-full md:w-[400px] flex-col border-l border-white/10`}>
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
