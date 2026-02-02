'use client';

import { useState, useEffect, use } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

interface JoinPageProps {
    params: Promise<{ id: string }>;
}

export default function JoinTripPage({ params }: JoinPageProps) {
    const { id: tripId } = use(params);
    const router = useRouter();
    const searchParams = useSearchParams();

    const [tripName, setTripName] = useState('');
    const [userName, setUserName] = useState('');
    const [isJoining, setIsJoining] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const storedUser = localStorage.getItem(`trip_${tripId}_user`);
        if (storedUser) {
            router.push(`/trip/${tripId}`);
            return;
        }

        const loadTrip = async () => {
            try {
                const res = await fetch(`/api/trips/${tripId}`);
                const data = await res.json();
                if (data.name) {
                    setTripName(data.name);
                } else {
                    setError('Trip not found');
                }
            } catch (err) {
                setError('Failed to load trip');
            }
        };
        loadTrip();
    }, [tripId, router]);

    const handleJoin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!userName.trim()) return;

        setIsJoining(true);
        try {
            const res = await fetch(`/api/trips/${tripId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userName }),
            });

            const data = await res.json();

            if (data.userId) {
                localStorage.setItem(`trip_${tripId}_user`, JSON.stringify({
                    id: data.userId,
                    name: userName,
                }));
                router.push(`/trip/${tripId}`);
            } else {
                setError('Failed to join trip');
            }
        } catch (err) {
            setError('Failed to join trip');
        } finally {
            setIsJoining(false);
        }
    };

    if (error) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center relative overflow-hidden">
                <div className="bg-white rounded-3xl p-10 text-center max-w-md animate-slide-up relative z-10 shadow-xl border border-gray-100">
                    <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4 border border-red-100">
                        <svg className="w-10 h-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </div>
                    <p className="text-black text-xl font-medium mb-6">{error}</p>
                    <button
                        onClick={() => router.push('/')}
                        className="px-8 py-3 bg-black text-white rounded-xl hover:bg-gray-800 transition-all font-medium shadow-lg shadow-gray-200"
                    >
                        Go Home
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 relative overflow-hidden">
            <div className="bg-white rounded-3xl p-10 max-w-md w-full animate-slide-up relative z-10 shadow-xl border border-gray-100">
                <div className="text-center mb-8">
                    <div className="w-20 h-20 rounded-full bg-black flex items-center justify-center mx-auto mb-4 border border-gray-200 shadow-md">
                        <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                    </div>
                    <h2 className="text-3xl font-bold text-black">Join Trip</h2>
                    {tripName && (
                        <p className="text-gray-500 mt-3">
                            You're joining: <span className="font-semibold text-black">{tripName}</span>
                        </p>
                    )}
                </div>

                <form onSubmit={handleJoin} className="space-y-6">
                    <div>
                        <label className="block text-gray-700 text-sm font-medium mb-2">Your Name</label>
                        <input
                            type="text"
                            required
                            className="w-full px-5 py-4 rounded-xl bg-gray-50 border border-gray-200 text-black placeholder-gray-400 focus:bg-white focus:border-black focus:ring-1 focus:ring-black outline-none transition-all text-lg"
                            placeholder="Enter your name"
                            value={userName}
                            onChange={(e) => setUserName(e.target.value)}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isJoining || !userName.trim()}
                        className="w-full py-4 bg-black text-white font-semibold rounded-xl hover:bg-gray-800 transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-gray-200 text-lg"
                    >
                        {isJoining ? (
                            <span className="flex items-center justify-center gap-2">
                                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                                Joining...
                            </span>
                        ) : (
                            <span className="flex items-center justify-center gap-2">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                </svg>
                                Join Trip
                            </span>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}
