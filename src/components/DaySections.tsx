'use client';

import { useState } from 'react';
import { ItineraryItem } from '@/lib/types';
import DayEditor from './DayEditor';

interface DaySectionsProps {
    tripId: string;
    userId: string;
    itinerary: ItineraryItem[];
    memberCount: number;
    daysCount: number;
    onVote: (itemId: string, vote: 'yes' | 'no') => void;
    onAddItem: (item: Partial<ItineraryItem>) => void;
    onUpdateItem?: (itemId: string, updates: Partial<ItineraryItem>) => void;
    onReorderItems?: (dayNumber: number, itemIds: string[]) => void;
}

export default function DaySections({
    tripId,
    userId,
    itinerary,
    memberCount,
    daysCount,
    onVote,
    onAddItem,
    onUpdateItem,
    onReorderItems,
}: DaySectionsProps) {
    const [editingDay, setEditingDay] = useState<number | null>(null);

    // Group items by day and sort by order/time
    const groupedByDay = Array.from({ length: daysCount }, (_, i) => i + 1).map((day) => ({
        day,
        items: itinerary
            .filter((item) => {
                // Hide rejected items or items where everyone voted no
                if (item.status === 'rejected') return false;
                if (memberCount > 0 && item.votes?.no?.length >= memberCount) return false;
                return item.day === day;
            })
            .sort((a, b) => {
                // Sort by order if available, otherwise by startTime
                if (a.order !== undefined && b.order !== undefined) {
                    return a.order - b.order;
                }
                return (a.startTime || '').localeCompare(b.startTime || '');
            }),
    }));

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'approved': return 'from-emerald-500 to-teal-500';
            case 'rejected': return 'from-red-500 to-rose-500';
            default: return 'from-amber-500 to-orange-500';
        }
    };

    const formatDuration = (item: ItineraryItem) => {
        if (item.duration) {
            if (item.duration >= 60) {
                const hours = Math.floor(item.duration / 60);
                const mins = item.duration % 60;
                return mins > 0 ? `~${hours}h ${mins}m` : `~${hours}h`;
            }
            return `~${item.duration}m`;
        }
        // Fallback: calculate from start/end time if available
        if (item.startTime && item.endTime) {
            const start = item.startTime.split(':').map(Number);
            const end = item.endTime.split(':').map(Number);
            const startMins = start[0] * 60 + start[1];
            const endMins = end[0] * 60 + end[1];
            const diff = endMins - startMins;
            if (diff > 0) {
                if (diff >= 60) {
                    const hours = Math.floor(diff / 60);
                    return `~${hours}h`;
                }
                return `~${diff}m`;
            }
        }
        return '~1-2h';
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-purple-950 p-6">
            {/* Header */}
            <div className="max-w-4xl mx-auto mb-8">
                <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                    <span className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center text-2xl shadow-lg shadow-violet-500/30">📋</span>
                    Your Itinerary
                </h1>
                <p className="text-slate-400">Click on any day to edit its activities</p>
            </div>

            {/* Day Sections - Horizontal Layout */}
            <div className="flex overflow-x-auto pb-8 gap-6 px-4 snap-x">
                {groupedByDay.map(({ day, items }) => (
                    <div
                        key={day}
                        onClick={() => setEditingDay(day)}
                        className="min-w-[320px] max-w-[360px] flex-shrink-0 snap-center group cursor-pointer bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 p-5 hover:bg-white/10 hover:border-violet-500/50 transition-all duration-300 hover:shadow-xl hover:shadow-violet-500/10 flex flex-col"
                    >
                        {/* Day Header */}
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <span className="w-10 h-10 bg-gradient-to-br from-violet-600 to-purple-600 rounded-xl flex items-center justify-center text-white text-lg font-bold shadow-lg shadow-violet-500/30">
                                    {day}
                                </span>
                                <div>
                                    <h2 className="text-lg font-bold text-white">Day {day}</h2>
                                    <p className="text-xs text-slate-400">{items.length} {items.length === 1 ? 'activity' : 'activities'}</p>
                                </div>
                            </div>
                            <div className="text-slate-500 group-hover:text-violet-400 transition-colors">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                </svg>
                            </div>
                        </div>

                        {/* Flowchart Timeline */}
                        {items.length === 0 ? (
                            <div className="flex-1 flex flex-col items-center justify-center py-12 text-slate-500 border-2 border-dashed border-white/5 rounded-2xl">
                                <p className="text-base font-medium mb-1">Empty Day</p>
                                <p className="text-xs text-center px-4">Click to plan activities</p>
                            </div>
                        ) : (
                            <div className="relative pl-6 flex-1 overflow-y-auto custom-scrollbar pr-2">
                                {/* Vertical Line */}
                                <div className="absolute left-2.5 top-2 bottom-2 w-0.5 bg-gradient-to-b from-violet-500/50 via-pink-500/50 to-cyan-500/50 rounded-full" />

                                {items.map((item, index) => (
                                    <div key={item.id} className="relative flex items-start gap-3 pb-6 last:pb-0">
                                        {/* Timeline Node */}
                                        <div className="absolute left-[-16px] top-1.5 w-5 h-5 rounded-full bg-slate-900 border-2 border-violet-500 flex items-center justify-center text-[10px] font-bold text-violet-400 shadow-md shadow-violet-500/20 z-10">
                                            {index + 1}
                                        </div>

                                        {/* Event Card (Wireframe Style) */}
                                        <div className={`w-full bg-slate-800/40 rounded-xl border border-white/5 p-3 hover:border-white/20 transition-colors`}>
                                            <div className="mb-2">
                                                <div className="flex justify-between items-start gap-2">
                                                    <h3 className="text-white text-sm font-semibold leading-tight line-clamp-2">{item.title}</h3>
                                                    <span className="flex-shrink-0 px-2 py-0.5 bg-violet-500/10 text-violet-300 rounded text-[10px] font-medium whitespace-nowrap">
                                                        {formatDuration(item)}
                                                    </span>
                                                </div>
                                                {item.location && (
                                                    <p className="text-[11px] text-slate-500 mt-1 truncate flex items-center gap-1">
                                                        <span>📍</span> {item.location}
                                                    </p>
                                                )}
                                            </div>

                                            {/* Status Badge */}
                                            <div className="flex items-center justify-between">
                                                {item.status !== 'approved' && (
                                                    <span className={`px-1.5 py-0.5 rounded-[4px] text-[9px] font-bold uppercase tracking-wider bg-gradient-to-r ${getStatusColor(item.status)} text-white`}>
                                                        {item.status}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Voting */}
                                            {item.status === 'pending' && (
                                                <div className="mt-2 pt-2 border-t border-white/5 flex gap-1 justify-end">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); onVote(item.id, 'yes'); }}
                                                        className={`w-6 h-6 rounded flex items-center justify-center transition-colors ${item.votes.yes.includes(userId) ? 'bg-emerald-500 text-white' : 'bg-white/10 text-emerald-400 hover:bg-emerald-500/20'}`}
                                                    >
                                                        ✓
                                                    </button>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); onVote(item.id, 'no'); }}
                                                        className={`w-6 h-6 rounded flex items-center justify-center transition-colors ${item.votes.no.includes(userId) ? 'bg-red-500 text-white' : 'bg-white/10 text-red-400 hover:bg-red-500/20'}`}
                                                    >
                                                        ✕
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Day Editor Modal */}
            {editingDay !== null && (
                <DayEditor
                    day={editingDay}
                    items={groupedByDay.find(d => d.day === editingDay)?.items || []}
                    daysCount={daysCount}
                    onClose={() => setEditingDay(null)}
                    onAddItem={onAddItem}
                    onUpdateItem={onUpdateItem}
                    onReorderItems={onReorderItems}
                />
            )}
        </div>
    );
}
