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
        // Check if already joined
        const storedUser = localStorage.getItem(`trip_${tripId}_user`);
        if (storedUser) {
            router.push(`/trip/${tripId}`);
            return;
        }

        // Fetch trip info
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
            <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800 flex items-center justify-center">
                <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 text-center">
                    <p className="text-white text-xl mb-4">❌ {error}</p>
                    <button
                        onClick={() => router.push('/')}
                        className="px-6 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700"
                    >
                        Go Home
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800 flex items-center justify-center p-4">
            <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 border border-white/20 shadow-2xl max-w-md w-full">
                <div className="text-center mb-6">
                    <h1 className="text-4xl mb-2">🎉</h1>
                    <h2 className="text-2xl font-bold text-white">Join Trip</h2>
                    {tripName && (
                        <p className="text-purple-200 mt-2">
                            You're joining: <span className="font-semibold text-white">{tripName}</span>
                        </p>
                    )}
                </div>

                <form onSubmit={handleJoin} className="space-y-4">
                    <div>
                        <label className="block text-purple-200 text-sm mb-1">Your Name</label>
                        <input
                            type="text"
                            required
                            className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-pink-500"
                            placeholder="Enter your name"
                            value={userName}
                            onChange={(e) => setUserName(e.target.value)}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isJoining || !userName.trim()}
                        className="w-full py-4 bg-gradient-to-r from-pink-500 to-purple-600 text-white font-bold rounded-xl hover:from-pink-600 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                    >
                        {isJoining ? 'Joining...' : '🚀 Join Trip'}
                    </button>
                </form>
            </div>
        </div>
    );
}
