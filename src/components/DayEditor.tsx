'use client';

import { useState } from 'react';
import { ItineraryItem } from '@/lib/types';

interface DayEditorProps {
    day: number;
    items: ItineraryItem[];
    daysCount: number;
    onClose: () => void;
    onAddItem: (item: Partial<ItineraryItem>) => void;
    onUpdateItem?: (itemId: string, updates: Partial<ItineraryItem>) => void;
    onReorderItems?: (dayNumber: number, itemIds: string[]) => void;
}

export default function DayEditor({
    day,
    items,
    daysCount,
    onClose,
    onAddItem,
    onUpdateItem,
    onReorderItems,
}: DayEditorProps) {
    const [localItems, setLocalItems] = useState(items);
    const [isAddingItem, setIsAddingItem] = useState(false);
    const [newItem, setNewItem] = useState({
        title: '',
        description: '',
        location: '',
        duration: 60,
    });

    const handleMoveUp = (index: number) => {
        if (index === 0) return;
        const newItems = [...localItems];
        [newItems[index - 1], newItems[index]] = [newItems[index], newItems[index - 1]];
        setLocalItems(newItems);
    };

    const handleMoveDown = (index: number) => {
        if (index === localItems.length - 1) return;
        const newItems = [...localItems];
        [newItems[index], newItems[index + 1]] = [newItems[index + 1], newItems[index]];
        setLocalItems(newItems);
    };

    const handleSaveOrder = () => {
        if (onReorderItems) {
            onReorderItems(day, localItems.map(item => item.id));
        }
        onClose();
    };

    const handleAddNewItem = () => {
        if (!newItem.title.trim()) return;

        onAddItem({
            title: newItem.title,
            description: newItem.description,
            location: newItem.location,
            day,
            duration: newItem.duration,
        });

        setNewItem({
            title: '',
            description: '',
            location: '',
            duration: 60,
        });
        setIsAddingItem(false);
    };

    const formatDuration = (minutes: number) => {
        if (minutes >= 60) {
            const hours = Math.floor(minutes / 60);
            const mins = minutes % 60;
            return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
        }
        return `${minutes}m`;
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Editor Panel */}
            <div className="relative w-full max-w-2xl max-h-[90vh] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden animate-slide-up m-4">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-white/10">
                    <div className="flex items-center gap-4">
                        <span className="w-12 h-12 bg-gradient-to-br from-violet-600 to-purple-600 rounded-2xl flex items-center justify-center text-white text-lg font-bold shadow-lg shadow-violet-500/30">
                            {day}
                        </span>
                        <div>
                            <h2 className="text-xl font-bold text-white">Edit Day {day}</h2>
                            <p className="text-sm text-slate-400">{localItems.length} activities</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-smooth"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto max-h-[60vh]">
                    {localItems.length === 0 && !isAddingItem ? (
                        <div className="text-center py-12">
                            <div className="w-16 h-16 rounded-full bg-violet-500/20 flex items-center justify-center mx-auto mb-4">
                                <span className="text-3xl">📭</span>
                            </div>
                            <p className="text-slate-400 mb-4">No activities for this day yet</p>
                            <button
                                onClick={() => setIsAddingItem(true)}
                                className="px-6 py-3 bg-gradient-to-r from-violet-600 to-pink-600 text-white rounded-xl font-medium hover:from-violet-500 hover:to-pink-500 transition-smooth"
                            >
                                + Add First Activity
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {localItems.map((item, index) => (
                                <div
                                    key={item.id}
                                    className="bg-white/5 rounded-xl border border-white/10 p-4 flex items-center gap-4 group hover:bg-white/10 transition-colors"
                                >
                                    {/* Order Number */}
                                    <div className="w-10 h-10 rounded-xl bg-violet-600/20 flex items-center justify-center text-violet-400 font-bold flex-shrink-0">
                                        {index + 1}
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-white font-medium truncate">{item.title}</h3>
                                        <div className="flex items-center gap-3 mt-1">
                                            <span className="text-sm text-violet-400">{formatDuration(item.duration || 60)}</span>
                                            {item.location && (
                                                <span className="text-sm text-slate-500 truncate flex items-center gap-1">
                                                    <span>📍</span> {item.location}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Reorder Buttons */}
                                    <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => handleMoveUp(index)}
                                            disabled={index === 0}
                                            className="w-7 h-7 rounded bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                        >
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                            </svg>
                                        </button>
                                        <button
                                            onClick={() => handleMoveDown(index)}
                                            disabled={index === localItems.length - 1}
                                            className="w-7 h-7 rounded bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                        >
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            ))}

                            {/* Add New Item Form */}
                            {isAddingItem ? (
                                <div className="bg-violet-500/10 rounded-xl border border-violet-500/30 p-4 space-y-3">
                                    <input
                                        type="text"
                                        placeholder="Activity title"
                                        value={newItem.title}
                                        onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
                                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus-glow transition-smooth"
                                        autoFocus
                                    />
                                    <div className="grid grid-cols-2 gap-3">
                                        <input
                                            type="text"
                                            placeholder="Location (optional)"
                                            value={newItem.location}
                                            onChange={(e) => setNewItem({ ...newItem, location: e.target.value })}
                                            className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus-glow transition-smooth"
                                        />
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm text-slate-400">Duration:</span>
                                            <select
                                                value={newItem.duration}
                                                onChange={(e) => setNewItem({ ...newItem, duration: parseInt(e.target.value) })}
                                                className="flex-1 px-3 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus-glow transition-smooth"
                                            >
                                                <option value={30} className="bg-slate-900">30 min</option>
                                                <option value={60} className="bg-slate-900">1 hour</option>
                                                <option value={90} className="bg-slate-900">1.5 hours</option>
                                                <option value={120} className="bg-slate-900">2 hours</option>
                                                <option value={180} className="bg-slate-900">3 hours</option>
                                                <option value={240} className="bg-slate-900">4 hours</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={handleAddNewItem}
                                            disabled={!newItem.title.trim()}
                                            className="flex-1 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl font-medium hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 disabled:cursor-not-allowed transition-smooth"
                                        >
                                            Add Activity
                                        </button>
                                        <button
                                            onClick={() => setIsAddingItem(false)}
                                            className="px-5 py-3 bg-white/10 text-white rounded-xl hover:bg-white/20 transition-smooth"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <button
                                    onClick={() => setIsAddingItem(true)}
                                    className="w-full py-4 border-2 border-dashed border-white/20 rounded-xl text-slate-400 hover:border-violet-500/50 hover:text-violet-400 transition-colors flex items-center justify-center gap-2"
                                >
                                    <span className="text-xl">+</span>
                                    Add Activity
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-white/10 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 bg-white/10 text-white rounded-xl font-medium hover:bg-white/20 transition-smooth"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSaveOrder}
                        className="px-6 py-2.5 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl font-medium hover:from-violet-500 hover:to-purple-500 transition-smooth shadow-lg shadow-violet-500/20"
                    >
                        Save Changes
                    </button>
                </div>
            </div>
        </div>
    );
}
