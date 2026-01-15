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
            <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-purple-950 flex items-center justify-center relative overflow-hidden">
                {/* Decorative orbs */}
                <div className="absolute top-20 left-10 w-72 h-72 bg-violet-500/20 rounded-full blur-3xl animate-float" />
                <div className="absolute bottom-20 right-20 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }} />

                <div className="glass-card rounded-3xl p-10 text-center max-w-md animate-slide-up relative z-10">
                    <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
                        <span className="text-5xl">❌</span>
                    </div>
                    <p className="text-white text-xl font-medium mb-6">{error}</p>
                    <button
                        onClick={() => router.push('/')}
                        className="px-8 py-3 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl hover:from-violet-500 hover:to-purple-500 transition-smooth font-medium shadow-lg shadow-violet-500/20"
                    >
                        Go Home
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-purple-950 flex items-center justify-center p-4 relative overflow-hidden">
            {/* Decorative orbs */}
            <div className="absolute top-20 left-10 w-72 h-72 bg-violet-500/20 rounded-full blur-3xl animate-float" />
            <div className="absolute bottom-20 right-20 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }} />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-pink-500/5 rounded-full blur-3xl" />

            <div className="glass-card rounded-3xl p-10 max-w-md w-full animate-slide-up relative z-10">
                <div className="text-center mb-8">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-violet-500/30 to-pink-500/30 flex items-center justify-center mx-auto mb-4">
                        <span className="text-5xl">🎉</span>
                    </div>
                    <h2 className="text-3xl font-bold text-white">Join Trip</h2>
                    {tripName && (
                        <p className="text-slate-300 mt-3">
                            You're joining: <span className="font-semibold gradient-text">{tripName}</span>
                        </p>
                    )}
                </div>

                <form onSubmit={handleJoin} className="space-y-6">
                    <div>
                        <label className="block text-slate-300 text-sm font-medium mb-2">Your Name</label>
                        <input
                            type="text"
                            required
                            className="w-full px-5 py-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus-glow transition-smooth hover:border-violet-500/50 text-lg"
                            placeholder="Enter your name"
                            value={userName}
                            onChange={(e) => setUserName(e.target.value)}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isJoining || !userName.trim()}
                        className="w-full py-4 bg-gradient-to-r from-violet-600 to-pink-600 text-white font-semibold rounded-xl hover:from-violet-500 hover:to-pink-500 transition-smooth transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-violet-500/25 text-lg"
                    >
                        {isJoining ? (
                            <span className="flex items-center justify-center gap-2">
                                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                                Joining...
                            </span>
                        ) : '🚀 Join Trip'}
                    </button>
                </form>
            </div>
        </div>
    );
}
