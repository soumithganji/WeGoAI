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

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'approved': return 'bg-green-500';
            case 'rejected': return 'bg-red-500';
            default: return 'bg-yellow-500';
        }
    };

    const hasVoted = (item: ItineraryItem) => {
        return item.votes.yes.includes(userId) || item.votes.no.includes(userId);
    };

    return (
        <div className="flex flex-col h-full bg-gray-800">
            {/* Header */}
            <div className="px-4 py-3 bg-gray-900 border-b border-gray-700 flex justify-between items-center">
                <div>
                    <h2 className="text-lg font-semibold text-white">📋 Itinerary</h2>
                    <p className="text-sm text-gray-400">{itinerary.length} activities planned</p>
                </div>
                <button
                    onClick={() => setIsAddingItem(true)}
                    className="px-3 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-all text-sm font-medium"
                >
                    + Add
                </button>
            </div>

            {/* Add Item Modal */}
            {isAddingItem && (
                <div className="p-4 bg-gray-700 border-b border-gray-600">
                    <h3 className="text-white font-semibold mb-3">Add Activity</h3>
                    <div className="space-y-3">
                        <input
                            type="text"
                            placeholder="Activity title"
                            value={newItem.title}
                            onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
                            className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white placeholder-gray-400"
                        />
                        <div className="grid grid-cols-3 gap-2">
                            <select
                                value={newItem.day}
                                onChange={(e) => setNewItem({ ...newItem, day: parseInt(e.target.value) })}
                                className="px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white"
                            >
                                {Array.from({ length: daysCount }, (_, i) => (
                                    <option key={i + 1} value={i + 1}>Day {i + 1}</option>
                                ))}
                            </select>
                            <input
                                type="time"
                                value={newItem.startTime}
                                onChange={(e) => setNewItem({ ...newItem, startTime: e.target.value })}
                                className="px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white"
                            />
                            <input
                                type="time"
                                value={newItem.endTime}
                                onChange={(e) => setNewItem({ ...newItem, endTime: e.target.value })}
                                className="px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white"
                            />
                        </div>
                        <input
                            type="text"
                            placeholder="Location (optional)"
                            value={newItem.location}
                            onChange={(e) => setNewItem({ ...newItem, location: e.target.value })}
                            className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white placeholder-gray-400"
                        />
                        <div className="flex gap-2">
                            <button
                                onClick={handleAddItem}
                                className="flex-1 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                            >
                                Add for Voting
                            </button>
                            <button
                                onClick={() => setIsAddingItem(false)}
                                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-500"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Itinerary List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {groupedByDay.map(({ day, items }) => (
                    <div key={day}>
                        <h3 className="text-purple-400 font-semibold mb-3 flex items-center gap-2">
                            <span className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-white text-sm">
                                {day}
                            </span>
                            Day {day}
                        </h3>

                        {items.length === 0 ? (
                            <p className="text-gray-500 text-sm ml-10">No activities yet</p>
                        ) : (
                            <div className="space-y-3 ml-10">
                                {items.map((item) => (
                                    <div
                                        key={item.id}
                                        className={`p-4 rounded-xl border ${item.status === 'approved'
                                                ? 'bg-green-900/30 border-green-600'
                                                : item.status === 'rejected'
                                                    ? 'bg-red-900/30 border-red-600 opacity-50'
                                                    : 'bg-gray-700 border-gray-600'
                                            }`}
                                    >
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h4 className="text-white font-medium">{item.title}</h4>
                                                {item.startTime && (
                                                    <p className="text-sm text-gray-400">
                                                        🕐 {item.startTime} - {item.endTime}
                                                    </p>
                                                )}
                                                {item.location && (
                                                    <p className="text-sm text-gray-400">
                                                        📍 {item.location}
                                                    </p>
                                                )}
                                                {item.travelTimeFromPrevious && (
                                                    <p className="text-sm text-blue-400">
                                                        🚗 {item.travelTimeFromPrevious} min travel
                                                    </p>
                                                )}
                                            </div>
                                            <div className={`px-2 py-1 rounded text-xs font-medium text-white ${getStatusColor(item.status)}`}>
                                                {item.status}
                                            </div>
                                        </div>

                                        {/* Voting */}
                                        {item.status === 'pending' && (
                                            <div className="mt-3 pt-3 border-t border-gray-600">
                                                <div className="flex items-center justify-between">
                                                    <p className="text-sm text-gray-400">
                                                        {item.votes.yes.length}/{memberCount} approved
                                                    </p>
                                                    {!hasVoted(item) ? (
                                                        <div className="flex gap-2">
                                                            <button
                                                                onClick={() => onVote(item.id, 'yes')}
                                                                className="px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                                                            >
                                                                ✓ Yes
                                                            </button>
                                                            <button
                                                                onClick={() => onVote(item.id, 'no')}
                                                                className="px-3 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
                                                            >
                                                                ✗ No
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <span className="text-sm text-gray-400">
                                                            {item.votes.yes.includes(userId) ? '✓ Voted Yes' : '✗ Voted No'}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
