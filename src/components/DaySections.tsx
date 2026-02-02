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
            case 'approved': return 'bg-emerald-600';
            case 'rejected': return 'bg-rose-600';
            default: return 'bg-amber-600';
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
        <div className="min-h-screen bg-gray-50 p-6">
            {/* Header */}
            <div className="mb-8 px-4">
                <h1 className="text-3xl font-bold text-black mb-2 flex items-center gap-3">
                    <span className="w-12 h-12 rounded-2xl bg-black flex items-center justify-center shadow-lg shadow-gray-200">
                        <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                        </svg>
                    </span>
                    Your Itinerary
                </h1>
                <p className="text-gray-500">Click on any day to edit its activities</p>
            </div>

            {/* Day Sections - Horizontal Layout */}
            <div className="flex overflow-x-auto pb-8 gap-6 px-4 snap-x">
                {groupedByDay.map(({ day, items }) => (
                    <div
                        key={day}
                        onClick={() => setEditingDay(day)}
                        className="min-w-[320px] max-w-[360px] flex-shrink-0 snap-center group cursor-pointer bg-white rounded-2xl border border-gray-200 p-5 hover:border-black transition-all duration-300 hover:shadow-xl hover:shadow-gray-100 flex flex-col"
                    >
                        {/* Day Header */}
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <span className="w-10 h-10 bg-black rounded-xl flex items-center justify-center text-white text-lg font-semibold shadow-md">
                                    {day}
                                </span>
                                <div>
                                    <h2 className="text-lg font-semibold text-black">Day {day}</h2>
                                    <p className="text-xs text-gray-500">{items.length} {items.length === 1 ? 'activity' : 'activities'}</p>
                                </div>
                            </div>
                            <div className="text-gray-400 group-hover:text-black transition-colors">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                </svg>
                            </div>
                        </div>

                        {/* Flowchart Timeline */}
                        {items.length === 0 ? (
                            <div className="flex-1 flex flex-col items-center justify-center py-12 text-gray-400 border-2 border-dashed border-gray-200 rounded-2xl">
                                <p className="text-base font-medium mb-1">Empty Day</p>
                                <p className="text-xs text-center px-4">Click to plan activities</p>
                            </div>
                        ) : (
                            <div className="relative pl-6 flex-1 overflow-y-auto custom-scrollbar pr-2">
                                {/* Vertical Line */}
                                <div className="absolute left-2.5 top-2 bottom-2 w-0.5 bg-gray-200 rounded-full" />

                                {items.map((item, index) => (
                                    <div key={item.id} className="relative flex items-start gap-3 pb-6 last:pb-0">
                                        {/* Timeline Node */}
                                        <div className="absolute left-[-16px] top-1.5 w-5 h-5 rounded-full bg-white border-2 border-black flex items-center justify-center text-[10px] font-semibold text-black z-10">
                                            {index + 1}
                                        </div>

                                        {/* Event Card (Wireframe Style) */}
                                        <div className={`w-full bg-white rounded-lg border border-gray-200 p-3 hover:border-black transition-colors shadow-sm`}>
                                            <div className="mb-2">
                                                <div className="flex justify-between items-start gap-2">
                                                    <h3 className="text-black text-sm font-semibold leading-tight line-clamp-2">{item.title}</h3>
                                                    <span className="flex-shrink-0 px-2 py-0.5 bg-gray-100 text-black rounded text-[10px] font-medium whitespace-nowrap">
                                                        {formatDuration(item)}
                                                    </span>
                                                </div>
                                                {item.location && (
                                                    <p className="text-[11px] text-gray-500 mt-1 truncate flex items-center gap-1">
                                                        <svg className="w-3 h-3 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                                        </svg>
                                                        {item.location}
                                                    </p>
                                                )}
                                            </div>

                                            {/* Status Badge */}
                                            <div className="flex items-center justify-between">
                                                {item.status !== 'approved' && (
                                                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider ${getStatusColor(item.status)} text-white`}>
                                                        {item.status}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Voting */}
                                            {item.status === 'pending' && (
                                                <div className="mt-2 pt-2 border-t border-gray-100 flex gap-1 justify-end">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); onVote(item.id, 'yes'); }}
                                                        className={`w-6 h-6 rounded flex items-center justify-center transition-colors ${item.votes.yes.includes(userId) ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-emerald-600 hover:bg-emerald-50'}`}
                                                    >
                                                        ✓
                                                    </button>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); onVote(item.id, 'no'); }}
                                                        className={`w-6 h-6 rounded flex items-center justify-center transition-colors ${item.votes.no.includes(userId) ? 'bg-rose-600 text-white' : 'bg-gray-100 text-rose-600 hover:bg-rose-50'}`}
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
