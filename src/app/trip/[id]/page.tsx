'use client';

import { useState, useEffect, use, useRef } from 'react';
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
    const [showCopied, setShowCopied] = useState(false);

    // Autocomplete states
    const [airportSuggestions, setAirportSuggestions] = useState<string[]>([]);
    const [hotelSuggestions, setHotelSuggestions] = useState<string[]>([]);
    const [showAirportDropdown, setShowAirportDropdown] = useState(false);
    const [showHotelDropdown, setShowHotelDropdown] = useState(false);
    const [airportValue, setAirportValue] = useState('');
    const [hotelValue, setHotelValue] = useState('');
    const airportRef = useRef<HTMLDivElement>(null);
    const hotelRef = useRef<HTMLDivElement>(null);

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

    // Fetch airport and hotel suggestions when trip loads
    useEffect(() => {
        const fetchSuggestions = async () => {
            if (!trip?.settings?.destination) return;

            try {
                const res = await fetch(`/api/suggestions?destination=${encodeURIComponent(trip.settings.destination)}`);
                const data = await res.json();

                if (data.airports) setAirportSuggestions(data.airports);
                if (data.hotels) setHotelSuggestions(data.hotels);

                // Initialize input values with existing settings
                setAirportValue(trip.settings.airport || '');
                setHotelValue(trip.settings.hotel || '');
            } catch (error) {
                console.error('Error fetching suggestions:', error);
            }
        };

        fetchSuggestions();
    }, [trip?.settings?.destination]);

    // Handle click outside to close dropdowns
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (airportRef.current && !airportRef.current.contains(event.target as Node)) {
                setShowAirportDropdown(false);
            }
            if (hotelRef.current && !hotelRef.current.contains(event.target as Node)) {
                setShowHotelDropdown(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

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
        setShowCopied(true);
        setTimeout(() => setShowCopied(false), 2000);
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
                    <div className="relative">
                        <button
                            onClick={copyInviteLink}
                            className="px-4 py-2 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl text-sm font-medium hover:from-violet-500 hover:to-purple-500 transition-smooth flex items-center gap-2 shadow-lg shadow-violet-500/20"
                        >
                            <span>📋</span>
                            <span className="hidden sm:inline">Code:</span>
                            <span className="font-mono tracking-wider">{trip.inviteCode}</span>
                        </button>
                        {showCopied && (
                            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-3 py-1.5 bg-emerald-500 text-white text-xs font-medium rounded-lg shadow-lg animate-fade-in whitespace-nowrap">
                                ✓ Code Copied!
                                <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-emerald-500 rotate-45" />
                            </div>
                        )}
                    </div>
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

            {/* Settings Modal */}
            {showSettings && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        onClick={() => setShowSettings(false)}
                    />

                    {/* Modal Content */}
                    <div className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-white/10 rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto animate-fade-in">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between p-6 border-b border-white/10">
                            <h3 className="text-xl font-bold text-white flex items-center gap-3">
                                <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-lg shadow-lg shadow-violet-500/20">⚙️</span>
                                Trip Settings
                            </h3>
                            <button
                                onClick={() => setShowSettings(false)}
                                className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-smooth"
                            >
                                ✕
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 space-y-6">
                            {/* Trip Info */}
                            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                                <div className="flex items-center gap-3 text-slate-300">
                                    <span className="text-2xl">📍</span>
                                    <div>
                                        <div className="text-sm text-slate-400">Destination</div>
                                        <div className="text-white font-medium">{trip.settings.destination}</div>
                                    </div>
                                </div>
                            </div>

                            {/* Flight Times */}
                            <div>
                                <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                                    <span className="text-violet-400">✈️</span> Flight Times
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-slate-400 text-sm mb-2">Landing Time</label>
                                        <input
                                            type="datetime-local"
                                            defaultValue={trip.settings.landingTime}
                                            onChange={(e) => handleUpdateSettings({ landingTime: e.target.value })}
                                            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus-glow transition-smooth"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-slate-400 text-sm mb-2">Departure Time</label>
                                        <input
                                            type="datetime-local"
                                            defaultValue={trip.settings.departureTime}
                                            onChange={(e) => handleUpdateSettings({ departureTime: e.target.value })}
                                            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus-glow transition-smooth"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Airport Selection */}
                            <div>
                                <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                                    <span className="text-cyan-400">🛫</span> Airport
                                </h4>
                                <div className="relative" ref={airportRef}>
                                    <input
                                        type="text"
                                        value={airportValue}
                                        onChange={(e) => {
                                            setAirportValue(e.target.value);
                                            setShowAirportDropdown(true);
                                        }}
                                        onFocus={() => setShowAirportDropdown(true)}
                                        onBlur={(e) => {
                                            setTimeout(() => {
                                                handleUpdateSettings({ airport: e.target.value });
                                            }, 200);
                                        }}
                                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus-glow transition-smooth"
                                        placeholder="Search airports..."
                                    />
                                    {showAirportDropdown && airportSuggestions.length > 0 && (
                                        <div className="absolute z-[100] top-full left-0 right-0 mt-2 bg-slate-800 border border-white/10 rounded-xl shadow-2xl max-h-48 overflow-y-auto">
                                            {airportSuggestions
                                                .filter(a => a.toLowerCase().includes(airportValue.toLowerCase()))
                                                .map((airport, idx) => (
                                                    <button
                                                        key={idx}
                                                        type="button"
                                                        className="w-full px-4 py-3 text-left text-white text-sm hover:bg-violet-600/30 transition-smooth first:rounded-t-xl last:rounded-b-xl flex items-center gap-2"
                                                        onClick={() => {
                                                            setAirportValue(airport);
                                                            setShowAirportDropdown(false);
                                                            handleUpdateSettings({ airport });
                                                        }}
                                                    >
                                                        <span className="text-cyan-400">✈️</span> {airport}
                                                    </button>
                                                ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Hotel Selection */}
                            <div>
                                <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                                    <span className="text-amber-400">🏨</span> Hotel
                                </h4>
                                <div className="relative" ref={hotelRef}>
                                    <input
                                        type="text"
                                        value={hotelValue}
                                        onChange={(e) => {
                                            setHotelValue(e.target.value);
                                            setShowHotelDropdown(true);
                                        }}
                                        onFocus={() => setShowHotelDropdown(true)}
                                        onBlur={(e) => {
                                            setTimeout(() => {
                                                handleUpdateSettings({ hotel: e.target.value });
                                            }, 200);
                                        }}
                                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus-glow transition-smooth"
                                        placeholder="Search hotels..."
                                    />
                                    {showHotelDropdown && hotelSuggestions.length > 0 && (
                                        <div className="absolute z-[100] top-full left-0 right-0 mt-2 bg-slate-800 border border-white/10 rounded-xl shadow-2xl max-h-48 overflow-y-auto">
                                            {hotelSuggestions
                                                .filter(h => h.toLowerCase().includes(hotelValue.toLowerCase()))
                                                .map((hotel, idx) => (
                                                    <button
                                                        key={idx}
                                                        type="button"
                                                        className="w-full px-4 py-3 text-left text-white text-sm hover:bg-violet-600/30 transition-smooth first:rounded-t-xl last:rounded-b-xl flex items-center gap-2"
                                                        onClick={() => {
                                                            setHotelValue(hotel);
                                                            setShowHotelDropdown(false);
                                                            handleUpdateSettings({ hotel });
                                                        }}
                                                    >
                                                        <span className="text-amber-400">🏨</span> {hotel}
                                                    </button>
                                                ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-6 border-t border-white/10 flex justify-end">
                            <button
                                onClick={() => setShowSettings(false)}
                                className="px-6 py-2.5 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl font-medium hover:from-violet-500 hover:to-purple-500 transition-smooth shadow-lg shadow-violet-500/20"
                            >
                                Done
                            </button>
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
