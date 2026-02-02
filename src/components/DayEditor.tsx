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
                className="absolute inset-0 bg-black/20 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Editor Panel */}
            <div className="relative w-full max-w-2xl max-h-[90vh] bg-white border border-gray-200 rounded-3xl shadow-2xl overflow-hidden animate-slide-up m-4">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-100">
                    <div className="flex items-center gap-4">
                        <span className="w-12 h-12 bg-black rounded-2xl flex items-center justify-center text-white text-lg font-bold shadow-md">
                            {day}
                        </span>
                        <div>
                            <h2 className="text-xl font-bold text-black">Edit Day {day}</h2>
                            <p className="text-sm text-gray-500">{localItems.length} activities</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-10 h-10 rounded-xl bg-gray-50 hover:bg-gray-100 border border-transparent flex items-center justify-center text-gray-400 hover:text-black transition-all"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto max-h-[60vh] bg-gray-50/50">
                    {localItems.length === 0 && !isAddingItem ? (
                        <div className="text-center py-12">
                            <div className="w-16 h-16 rounded-full bg-white border border-gray-200 flex items-center justify-center mx-auto mb-4 shadow-sm">
                                <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                </svg>
                            </div>
                            <p className="text-gray-500 mb-4 font-medium">No activities for this day yet</p>
                            <button
                                onClick={() => setIsAddingItem(true)}
                                className="px-6 py-3 bg-black text-white rounded-xl font-medium hover:bg-gray-800 transition-all shadow-lg shadow-gray-200"
                            >
                                + Add First Activity
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {localItems.map((item, index) => (
                                <div
                                    key={item.id}
                                    className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4 group hover:border-black transition-all shadow-sm"
                                >
                                    {/* Order Number */}
                                    <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center text-gray-500 font-bold flex-shrink-0 border border-gray-100">
                                        {index + 1}
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-black font-semibold truncate">{item.title}</h3>
                                        <div className="flex items-center gap-3 mt-1">
                                            <span className="text-sm text-gray-500 bg-gray-100 px-2 py-0.5 rounded text-xs font-medium">{formatDuration(item.duration || 60)}</span>
                                            {item.location && (
                                                <span className="text-sm text-gray-500 truncate flex items-center gap-1">
                                                    <svg className="w-3 h-3 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                                    </svg>
                                                    {item.location}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Reorder Buttons */}
                                    <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => handleMoveUp(index)}
                                            disabled={index === 0}
                                            className="w-7 h-7 rounded bg-gray-100 hover:bg-black hover:text-white flex items-center justify-center text-gray-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                        >
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                            </svg>
                                        </button>
                                        <button
                                            onClick={() => handleMoveDown(index)}
                                            disabled={index === localItems.length - 1}
                                            className="w-7 h-7 rounded bg-gray-100 hover:bg-black hover:text-white flex items-center justify-center text-gray-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
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
                                <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3 shadow-lg">
                                    <input
                                        type="text"
                                        placeholder="Activity title"
                                        value={newItem.title}
                                        onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-black placeholder-gray-400 focus:bg-white focus:border-black focus:ring-1 focus:ring-black focus:outline-none transition-all"
                                        autoFocus
                                    />
                                    <div className="grid grid-cols-2 gap-3">
                                        <input
                                            type="text"
                                            placeholder="Location (optional)"
                                            value={newItem.location}
                                            onChange={(e) => setNewItem({ ...newItem, location: e.target.value })}
                                            className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-black placeholder-gray-400 focus:bg-white focus:border-black focus:ring-1 focus:ring-black focus:outline-none transition-all"
                                        />
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm text-gray-500 font-medium">Duration:</span>
                                            <select
                                                value={newItem.duration}
                                                onChange={(e) => setNewItem({ ...newItem, duration: parseInt(e.target.value) })}
                                                className="flex-1 px-3 py-3 bg-gray-50 border border-gray-200 rounded-xl text-black focus:bg-white focus:border-black focus:ring-1 focus:ring-black focus:outline-none transition-all"
                                            >
                                                <option value={30} className="bg-white text-black">30 min</option>
                                                <option value={60} className="bg-white text-black">1 hour</option>
                                                <option value={90} className="bg-white text-black">1.5 hours</option>
                                                <option value={120} className="bg-white text-black">2 hours</option>
                                                <option value={180} className="bg-white text-black">3 hours</option>
                                                <option value={240} className="bg-white text-black">4 hours</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={handleAddNewItem}
                                            disabled={!newItem.title.trim()}
                                            className="flex-1 py-3 bg-black text-white rounded-xl font-semibold hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md"
                                        >
                                            Add Activity
                                        </button>
                                        <button
                                            onClick={() => setIsAddingItem(false)}
                                            className="px-5 py-3 bg-gray-100 text-black rounded-xl hover:bg-gray-200 transition-all font-medium"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <button
                                    onClick={() => setIsAddingItem(true)}
                                    className="w-full py-4 border-2 border-dashed border-gray-200 rounded-xl text-gray-400 hover:border-black hover:text-black transition-all flex items-center justify-center gap-2 group font-medium"
                                >
                                    <span className="text-2xl group-hover:scale-110 transition-transform">+</span>
                                    Add Activity
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-100 flex justify-end gap-3 bg-white">
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 bg-gray-100 text-black rounded-xl font-medium hover:bg-gray-200 transition-all"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSaveOrder}
                        className="px-6 py-2.5 bg-black text-white rounded-xl font-medium hover:bg-gray-800 transition-all shadow-lg shadow-gray-200"
                    >
                        Save Changes
                    </button>
                </div>
            </div>
        </div>
    );
}
