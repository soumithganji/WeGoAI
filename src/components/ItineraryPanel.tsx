'use client';

import { useState } from 'react';
import { ItineraryItem } from '@/lib/types';

interface ItineraryPanelProps {
    tripId: string;
    userId: string;
    itinerary: ItineraryItem[];
    memberCount: number;
    daysCount: number;
    onVote: (itemId: string, vote: 'yes' | 'no') => void;
    onAddItem: (item: Partial<ItineraryItem>) => void;
}

export default function ItineraryPanel({
    tripId,
    userId,
    itinerary,
    memberCount,
    daysCount,
    onVote,
    onAddItem,
}: ItineraryPanelProps) {
    const [isAddingItem, setIsAddingItem] = useState(false);
    const [newItem, setNewItem] = useState({
        title: '',
        description: '',
        day: 1,
        startTime: '',
        endTime: '',
        location: '',
    });

    const handleAddItem = () => {
        if (!newItem.title.trim()) return;

        onAddItem(newItem);
        setNewItem({
            title: '',
            description: '',
            day: 1,
            startTime: '',
            endTime: '',
            location: '',
        });
        setIsAddingItem(false);
    };

    const groupedByDay = Array.from({ length: daysCount }, (_, i) => i + 1).map((day) => ({
        day,
        items: itinerary
            .filter((item) => item.day === day)
            .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || '')),
    }));

    const getStatusConfig = (status: string) => {
        switch (status) {
            case 'approved': return {
                bg: 'bg-emerald-500/20',
                border: 'border-emerald-500/50',
                badge: 'bg-emerald-500 text-white',
                glow: 'shadow-emerald-500/20'
            };
            case 'rejected': return {
                bg: 'bg-red-500/10',
                border: 'border-red-500/30',
                badge: 'bg-red-500 text-white',
                glow: 'shadow-red-500/20'
            };
            default: return {
                bg: 'bg-white/5',
                border: 'border-white/10',
                badge: 'bg-amber-500 text-white',
                glow: 'shadow-amber-500/20'
            };
        }
    };

    const hasVoted = (item: ItineraryItem) => {
        return item.votes.yes.includes(userId) || item.votes.no.includes(userId);
    };

    const getVotePercentage = (item: ItineraryItem) => {
        if (memberCount === 0) return 0;
        return Math.round((item.votes.yes.length / memberCount) * 100);
    };

    return (
        <div className="flex flex-col h-full bg-gradient-to-b from-slate-900 to-slate-950">
            {/* Header */}
            <div className="px-5 py-4 bg-slate-900/80 backdrop-blur-xl border-b border-white/5 flex justify-between items-center">
                <div>
                    <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                        <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center text-sm">📋</span>
                        Itinerary
                    </h2>
                    <p className="text-sm text-slate-500 mt-1">{itinerary.length} activities planned</p>
                </div>
                <button
                    onClick={() => setIsAddingItem(true)}
                    className="px-4 py-2.5 bg-gradient-to-r from-pink-600 to-violet-600 text-white rounded-xl hover:from-pink-500 hover:to-violet-500 transition-smooth text-sm font-medium shadow-lg shadow-pink-500/20"
                >
                    + Add
                </button>
            </div>

            {/* Add Item Modal */}
            {isAddingItem && (
                <div className="p-5 bg-slate-800/80 backdrop-blur-xl border-b border-white/5 animate-slide-up">
                    <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-pink-500/20 flex items-center justify-center text-sm">✨</span>
                        Add Activity
                    </h3>
                    <div className="space-y-3">
                        <input
                            type="text"
                            placeholder="Activity title"
                            value={newItem.title}
                            onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
                            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus-glow transition-smooth"
                        />
                        <div className="grid grid-cols-3 gap-2">
                            <select
                                value={newItem.day}
                                onChange={(e) => setNewItem({ ...newItem, day: parseInt(e.target.value) })}
                                className="px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus-glow transition-smooth"
                            >
                                {Array.from({ length: daysCount }, (_, i) => (
                                    <option key={i + 1} value={i + 1} className="bg-slate-900">Day {i + 1}</option>
                                ))}
                            </select>
                            <input
                                type="time"
                                value={newItem.startTime}
                                onChange={(e) => setNewItem({ ...newItem, startTime: e.target.value })}
                                className="px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus-glow transition-smooth"
                            />
                            <input
                                type="time"
                                value={newItem.endTime}
                                onChange={(e) => setNewItem({ ...newItem, endTime: e.target.value })}
                                className="px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus-glow transition-smooth"
                            />
                        </div>
                        <input
                            type="text"
                            placeholder="Location (optional)"
                            value={newItem.location}
                            onChange={(e) => setNewItem({ ...newItem, location: e.target.value })}
                            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus-glow transition-smooth"
                        />
                        <div className="flex gap-2 pt-1">
                            <button
                                onClick={handleAddItem}
                                className="flex-1 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl hover:from-emerald-500 hover:to-teal-500 transition-smooth font-medium"
                            >
                                Add for Voting
                            </button>
                            <button
                                onClick={() => setIsAddingItem(false)}
                                className="px-5 py-3 bg-white/10 text-white rounded-xl hover:bg-white/20 transition-smooth"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Itinerary List */}
            <div className="flex-1 overflow-y-auto p-5 space-y-8">
                {groupedByDay.map(({ day, items }) => (
                    <div key={day} className="animate-fade-in" style={{ animationDelay: `${day * 0.1}s` }}>
                        <h3 className="text-slate-300 font-semibold mb-4 flex items-center gap-3">
                            <span className="w-10 h-10 bg-gradient-to-br from-violet-600 to-purple-600 rounded-xl flex items-center justify-center text-white text-sm font-bold shadow-lg shadow-violet-500/30">
                                {day}
                            </span>
                            <span>Day {day}</span>
                        </h3>

                        {items.length === 0 ? (
                            <p className="text-slate-600 text-sm ml-[52px] py-4 border-l-2 border-dashed border-slate-800 pl-6">No activities yet</p>
                        ) : (
                            <div className="relative mt-6">
                                {/* Continuous vertical line */}
                                <div className="absolute left-[60px] top-2 bottom-6 w-0.5 bg-violet-500/30" />

                                {items.map((item, index) => {
                                    const config = getStatusConfig(item.status);
                                    return (
                                        <div
                                            key={item.id}
                                            className="flex gap-6 relative mb-6 group animate-slide-up"
                                            style={{ animationDelay: `${index * 0.05}s` }}
                                        >
                                            {/* Time Column */}
                                            <div className="w-[45px] text-right pt-[18px] flex-shrink-0">
                                                {item.startTime ? (
                                                    <>
                                                        <div className="text-white font-bold leading-none text-sm">{item.startTime}</div>
                                                        <div className="text-[10px] text-slate-500 mt-1">{item.endTime}</div>
                                                    </>
                                                ) : (
                                                    <div className="text-slate-600 text-[10px] italic pt-1">TBD</div>
                                                )}
                                            </div>

                                            {/* Timeline Dot */}
                                            <div className="absolute left-[56px] top-[22px] w-2.5 h-2.5 rounded-full bg-violet-500 ring-4 ring-slate-900 z-10 group-hover:scale-125 transition-transform duration-300 shadow-[0_0_10px_rgba(139,92,246,0.5)]" />

                                            {/* Event Card */}
                                            <div
                                                className={`flex-1 p-4 rounded-xl border ${config.bg} ${config.border} hover-lift shadow-lg ${config.glow}`}
                                            >
                                                <div className="flex justify-between items-start gap-3">
                                                    <div className="flex-1">
                                                        <h4 className="text-white font-medium text-base">{item.title}</h4>
                                                        {item.location && (
                                                            <p className="text-sm text-slate-400 mt-1 flex items-center gap-1.5">
                                                                <span className="text-pink-400">📍</span> {item.location}
                                                            </p>
                                                        )}
                                                        {item.travelTimeFromPrevious && (
                                                            <p className="text-sm text-slate-400 mt-0.5 flex items-center gap-1.5">
                                                                <span className="text-blue-400">🚗</span> {item.travelTimeFromPrevious} min travel
                                                            </p>
                                                        )}
                                                    </div>
                                                    <div className={`px-2.5 py-1 rounded-lg text-[10px] font-bold ${config.badge} uppercase tracking-wide`}>
                                                        {item.status}
                                                    </div>
                                                </div>

                                                {/* Voting */}
                                                {item.status === 'pending' && (
                                                    <div className="mt-4 pt-4 border-t border-white/10">
                                                        {/* Progress bar */}
                                                        <div className="mb-3">
                                                            <div className="flex justify-between text-[10px] text-slate-400 mb-1.5 uppercase tracking-wider">
                                                                <span>{item.votes.yes.length}/{memberCount} VOTES</span>
                                                                <span>{getVotePercentage(item)}%</span>
                                                            </div>
                                                            <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                                                                <div
                                                                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-500"
                                                                    style={{ width: `${getVotePercentage(item)}%` }}
                                                                />
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center justify-end gap-2">
                                                            {!hasVoted(item) ? (
                                                                <>
                                                                    <button
                                                                        onClick={() => onVote(item.id, 'yes')}
                                                                        className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition-smooth text-xs font-medium flex items-center gap-1"
                                                                    >
                                                                        <span>✓</span>
                                                                    </button>
                                                                    <button
                                                                        onClick={() => onVote(item.id, 'no')}
                                                                        className="px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-500 transition-smooth text-xs font-medium flex items-center gap-1"
                                                                    >
                                                                        <span>✗</span>
                                                                    </button>
                                                                </>
                                                            ) : (
                                                                <span className="text-xs text-slate-400 font-medium">
                                                                    {item.votes.yes.includes(userId) ? '✓ Voted Yes' : '✗ Voted No'}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
