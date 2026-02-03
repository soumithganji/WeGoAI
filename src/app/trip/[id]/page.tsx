'use client';

import { useState, useEffect, use, useRef } from 'react';
import { useRouter } from 'next/navigation';
import FloatingChat from '@/components/FloatingChat';
import DaySections from '@/components/DaySections';
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
    const [hotelSuggestions, setHotelSuggestions] = useState<{ name: string; address: string }[]>([]);
    const [showAirportDropdown, setShowAirportDropdown] = useState(false);
    const [showHotelDropdown, setShowHotelDropdown] = useState(false);
    const [airportValue, setAirportValue] = useState('');
    const [hotelValue, setHotelValue] = useState('');
    const [hotelSearchLoading, setHotelSearchLoading] = useState(false);
    const airportRef = useRef<HTMLDivElement>(null);
    const hotelRef = useRef<HTMLDivElement>(null);
    const hotelSearchTimeout = useRef<NodeJS.Timeout | null>(null);

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

                setMessages(prev => {
                    const optimistic = prev.filter(m => m.id && m.id.startsWith('temp-'));
                    if (optimistic.length === 0) return msgData;

                    // Create a frequency map of incoming messages to handle duplicates correctly
                    // (e.g. if user sends "hi" twice rapidly)
                    const incomingSignatures = new Map<string, number>();
                    msgData.forEach((msg: Message) => {
                        const key = `${msg.senderId}:${msg.content}`;
                        incomingSignatures.set(key, (incomingSignatures.get(key) || 0) + 1);
                    });

                    const stillPending = optimistic.filter(opt => {
                        const key = `${opt.senderId}:${opt.content}`;
                        const count = incomingSignatures.get(key);
                        if (count && count > 0) {
                            // This optimistic message is now present in the server response
                            incomingSignatures.set(key, count - 1);
                            return false;
                        }
                        return true;
                    });

                    return [...msgData, ...stillPending];
                });

                const tripRes = await fetch(`/api/trips/${tripId}`);
                const tripData = await tripRes.json();
                setTrip(tripData);
            } catch (error) {
                console.error('Polling error:', error);
            }
        }, 3000);

        return () => clearInterval(interval);
    }, [tripId, router]);

    // Fetch airport suggestions when trip loads
    useEffect(() => {
        const fetchAirportSuggestions = async () => {
            if (!trip?.settings?.destination) return;

            try {
                const res = await fetch(`/api/suggestions?destination=${encodeURIComponent(trip.settings.destination)}&type=airports`);
                const data = await res.json();

                if (data.airports) setAirportSuggestions(data.airports);

                // Initialize input values with existing settings
                setAirportValue(trip.settings.airport || '');
                setHotelValue(trip.settings.hotel || '');
            } catch (error) {
                console.error('Error fetching airport suggestions:', error);
            }
        };

        fetchAirportSuggestions();
    }, [trip?.settings?.destination, trip?.settings?.airport, trip?.settings?.hotel]);

    // Dynamic hotel search with debouncing
    const searchHotels = async (keyword: string) => {
        if (keyword.length < 2) {
            setHotelSuggestions([]);
            return;
        }

        setHotelSearchLoading(true);
        try {
            // Pass the destination to search within the correct city
            const destination = trip?.settings?.destination || '';
            const res = await fetch(`/api/hotels/search?keyword=${encodeURIComponent(keyword)}&destination=${encodeURIComponent(destination)}`);
            const data = await res.json();

            if (data.hotels) {
                setHotelSuggestions(data.hotels);
            }
        } catch (error) {
            console.error('Error searching hotels:', error);
        } finally {
            setHotelSearchLoading(false);
        }
    };

    // Handle hotel input change with debounce
    const handleHotelInputChange = (value: string) => {
        setHotelValue(value);
        setShowHotelDropdown(true);

        // Clear previous timeout
        if (hotelSearchTimeout.current) {
            clearTimeout(hotelSearchTimeout.current);
        }

        // Debounce the search
        hotelSearchTimeout.current = setTimeout(() => {
            searchHotels(value);
        }, 300);
    };

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
        // Optimistic update
        const tempId = 'temp-' + Date.now();
        const optimisticMessage: Message = {
            id: tempId,
            tripId,
            senderId: userId,
            senderName: userName,
            content,
            isAIMention: content.toLowerCase().includes('@weai'),
            createdAt: new Date(),
        };

        setMessages((prev) => [...prev, optimisticMessage]);

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

            // Replace optimistic message with real one
            setMessages((prev) => prev.map(msg =>
                msg.id === tempId ? data : msg
            ));

            if (data.aiResponse) {
                setMessages((prev) => [...prev, data.aiResponse]);
                // Immediately refetch trip data to show any itinerary updates
                const tripRes = await fetch(`/api/trips/${tripId}`);
                const tripData = await tripRes.json();
                setTrip(tripData);
            }
        } catch (error) {
            console.error('Error sending message:', error);
            // Revert optimistic update on error
            setMessages((prev) => prev.filter(msg => msg.id !== tempId));
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
                alert(`Warning: Time clash with "${data.clashWith}" (${data.existingTime})`);
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

    const handleUpdateItem = async (itemId: string, updates: Partial<ItineraryItem>) => {
        try {
            await fetch('/api/itinerary', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tripId,
                    itemId,
                    userId,
                    updates,
                }),
            });

            const tripRes = await fetch(`/api/trips/${tripId}`);
            setTrip(await tripRes.json());
        } catch (error) {
            console.error('Error updating item:', error);
        }
    };

    const handleReorderItems = async (dayNumber: number, itemIds: string[]) => {
        try {
            await fetch('/api/itinerary/reorder', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tripId,
                    day: dayNumber,
                    itemIds,
                }),
            });

            const tripRes = await fetch(`/api/trips/${tripId}`);
            setTrip(await tripRes.json());
        } catch (error) {
            console.error('Error reordering items:', error);
        }
    };

    const copyInviteLink = () => {
        navigator.clipboard.writeText(trip?.inviteCode || '');
        setShowCopied(true);
        setTimeout(() => setShowCopied(false), 2000);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <div className="flex items-center gap-3">
                    <svg className="animate-spin h-8 w-8 text-black" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <span className="text-black text-xl font-medium">Loading trip...</span>
                </div>
            </div>
        );
    }

    if (!trip) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <div className="text-center">
                    <div className="flex justify-center mb-4">
                        <svg className="w-16 h-16 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                    <div className="text-black text-xl">Trip not found</div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white flex flex-col">
            {/* Header */}
            <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-xl border-b border-gray-100 px-6 py-4 flex items-center justify-between shadow-[0_2px_20px_rgb(0,0,0,0.02)]">
                <div className="flex items-center gap-5">
                    <h1 className="text-xl font-bold text-black flex items-center gap-2">
                        <svg className="w-6 h-6 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>{trip.name}</span>
                    </h1>
                    <div className="hidden sm:flex items-center gap-4 text-sm">
                        <span className="text-gray-500 flex items-center gap-1.5">
                            <svg className="w-4 h-4 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            {trip.settings.destination}
                        </span>
                        <span className="text-gray-500 flex items-center gap-1.5">
                            <svg className="w-4 h-4 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                            </svg>
                            {trip.members.length} members
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <button
                            onClick={copyInviteLink}
                            className="px-4 py-2 bg-black text-white rounded-xl text-sm font-medium hover:bg-gray-800 transition-all flex items-center gap-2 shadow-lg shadow-gray-200"
                        >
                            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2m-6 9l2 2 4-4" />
                            </svg>
                            <span className="hidden sm:inline">Code:</span>
                            <span className="font-mono tracking-wider">{trip.inviteCode}</span>
                        </button>
                        {showCopied && (
                            <div className="absolute z-[60] top-full left-1/2 -translate-x-1/2 mt-2 px-3 py-1.5 bg-black text-white text-xs font-medium rounded-lg shadow-lg animate-fade-in whitespace-nowrap">
                                ✓ Code Copied!
                                <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-black rotate-45" />
                            </div>
                        )}
                    </div>
                    <button
                        onClick={() => setShowSettings(!showSettings)}
                        className={`px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${showSettings
                            ? 'bg-gray-100 text-black border-transparent'
                            : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                            }`}
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span className="hidden sm:inline">Settings</span>
                    </button>
                </div>
            </header>

            {/* Settings Modal */}
            {showSettings && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/20 backdrop-blur-sm"
                        onClick={() => setShowSettings(false)}
                    />

                    {/* Modal Content */}
                    <div className="relative bg-white border border-gray-200 rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto animate-fade-in">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between p-6 border-b border-gray-100">
                            <h3 className="text-xl font-bold text-black flex items-center gap-3">
                                <span className="w-10 h-10 rounded-lg bg-black text-white flex items-center justify-center">
                                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                </span>
                                Trip Settings
                            </h3>
                            <button
                                onClick={() => setShowSettings(false)}
                                className="w-10 h-10 rounded-lg bg-gray-100 hover:bg-gray-200 border border-transparent flex items-center justify-center text-gray-500 hover:text-black transition-all"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 space-y-6">
                            {/* Trip Info */}
                            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                                <div className="flex items-center gap-3 text-gray-700">
                                    <svg className="w-6 h-6 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                    <div>
                                        <div className="text-sm text-gray-500">Destination</div>
                                        <div className="text-black font-medium">{trip.settings.destination}</div>
                                    </div>
                                </div>
                            </div>

                            {/* Flight Times */}
                            <div>
                                <h4 className="text-black font-semibold mb-3 flex items-center gap-2">
                                    <svg className="w-4 h-4 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                    </svg>
                                    Flight Times
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-gray-500 text-sm mb-2">Landing Time</label>
                                        <input
                                            type="datetime-local"
                                            defaultValue={trip.settings.landingTime}
                                            onChange={(e) => handleUpdateSettings({ landingTime: e.target.value })}
                                            className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-black text-sm focus:border-black focus:ring-1 focus:ring-black outline-none transition-all"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-gray-500 text-sm mb-2">Departure Time</label>
                                        <input
                                            type="datetime-local"
                                            defaultValue={trip.settings.departureTime}
                                            onChange={(e) => handleUpdateSettings({ departureTime: e.target.value })}
                                            className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-black text-sm focus:border-black focus:ring-1 focus:ring-black outline-none transition-all"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Airport Selection */}
                            <div>
                                <h4 className="text-black font-semibold mb-3 flex items-center gap-2">
                                    <svg className="w-4 h-4 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13l-3 3m0 0l-3-3m3 3V8m0 13a9 9 0 110-18 9 9 0 010 18z" />
                                    </svg>
                                    Airport
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
                                        className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-black text-sm focus:border-black focus:ring-1 focus:ring-black outline-none transition-all"
                                        placeholder="Search airports..."
                                    />
                                    {showAirportDropdown && airportSuggestions.length > 0 && (
                                        <div className="absolute z-[100] top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-2xl max-h-48 overflow-y-auto">
                                            {airportSuggestions
                                                .filter(a => a.toLowerCase().includes(airportValue.toLowerCase()))
                                                .map((airport, idx) => (
                                                    <button
                                                        key={idx}
                                                        type="button"
                                                        className="w-full px-4 py-3 text-left text-black text-sm hover:bg-gray-50 transition-all first:rounded-t-xl last:rounded-b-xl flex items-center gap-2"
                                                        onClick={() => {
                                                            setAirportValue(airport);
                                                            setShowAirportDropdown(false);
                                                            handleUpdateSettings({ airport });
                                                        }}
                                                    >
                                                        <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                                        </svg>
                                                        {airport}
                                                    </button>
                                                ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Hotel Selection */}
                            <div>
                                <h4 className="text-black font-semibold mb-1 flex items-center gap-2">
                                    <svg className="w-4 h-4 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                    </svg>
                                    Hotel
                                </h4>
                                <p className="text-gray-500 text-xs mb-3">Search for any hotel worldwide</p>
                                <div className="relative" ref={hotelRef}>
                                    <input
                                        type="text"
                                        value={hotelValue}
                                        onChange={(e) => handleHotelInputChange(e.target.value)}
                                        onFocus={() => setShowHotelDropdown(true)}
                                        onBlur={(e) => {
                                            setTimeout(() => {
                                                handleUpdateSettings({ hotel: e.target.value });
                                            }, 200);
                                        }}
                                        className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-black text-sm focus:border-black focus:ring-1 focus:ring-black outline-none transition-all"
                                        placeholder="Search hotels..."
                                    />
                                    {/* Loading indicator */}
                                    {hotelSearchLoading && (
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                            <svg className="animate-spin h-5 w-5 text-black" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                            </svg>
                                        </div>
                                    )}
                                    {showHotelDropdown && hotelSuggestions.length > 0 && !hotelSearchLoading && (
                                        <div className="absolute z-[100] top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-xl max-h-56 overflow-y-auto">
                                            <div className="px-4 py-2 text-xs text-gray-500 border-b border-gray-100 bg-gray-50 sticky top-0">
                                                Search results
                                            </div>
                                            {hotelSuggestions.map((hotel, idx) => (
                                                <button
                                                    key={idx}
                                                    type="button"
                                                    className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-all"
                                                    onClick={() => {
                                                        setHotelValue(hotel.name);
                                                        setShowHotelDropdown(false);
                                                        handleUpdateSettings({ hotel: hotel.name });
                                                    }}
                                                >
                                                    <div className="text-black text-sm font-medium">{hotel.name}</div>
                                                    {hotel.address && (
                                                        <div className="text-gray-400 text-xs">{hotel.address}</div>
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                    {showHotelDropdown && hotelValue.length >= 2 && hotelSuggestions.length === 0 && !hotelSearchLoading && (
                                        <div className="absolute z-[100] top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-xl p-4 text-center text-gray-500 text-sm">
                                            No hotels found. Try a different search term.
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-6 border-t border-gray-100 flex justify-end">
                            <button
                                onClick={() => setShowSettings(false)}
                                className="px-6 py-2.5 bg-black text-white rounded-xl font-medium hover:bg-gray-900 transition-all shadow-lg shadow-gray-200"
                            >
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Main Itinerary Content */}
            <div className="flex-1 overflow-y-auto">
                <DaySections
                    tripId={tripId}
                    userId={userId}
                    itinerary={trip.itinerary}
                    memberCount={trip.members.length}
                    daysCount={trip.settings.daysCount}
                    onVote={handleVote}
                    onAddItem={handleAddItem}
                    onUpdateItem={handleUpdateItem}
                    onReorderItems={handleReorderItems}
                />
            </div>

            {/* Floating Chat */}
            <FloatingChat
                tripId={tripId}
                userId={userId}
                userName={userName}
                messages={messages}
                onSendMessage={handleSendMessage}
            />
        </div>
    );
}
