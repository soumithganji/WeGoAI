'use client';

import { useState, useEffect } from 'react';
import { Message } from '@/lib/types';
import ChatInterface from './ChatInterface';

interface FloatingChatProps {
    tripId: string;
    userId: string;
    userName: string;
    messages: Message[];
    onSendMessage: (content: string) => void;
}

export default function FloatingChat({
    tripId,
    userId,
    userName,
    messages,
    onSendMessage,
}: FloatingChatProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    // Initialize from localStorage if available, otherwise 0
    const [lastSeenCount, setLastSeenCount] = useState(0);

    // KEY for localStorage
    const STORAGE_KEY = `weai_chat_last_seen_${tripId}`;

    // Load initial state from localStorage
    useEffect(() => {
        const savedCount = localStorage.getItem(STORAGE_KEY);
        if (savedCount) {
            setLastSeenCount(parseInt(savedCount, 10));
        }
    }, [tripId]);

    // Track unread messages when chat is closed
    useEffect(() => {
        if (!isOpen && messages.length > lastSeenCount) {
            setUnreadCount(messages.length - lastSeenCount);
        }
    }, [messages.length, isOpen, lastSeenCount]);

    // Reset unread count when opening chat
    const handleOpen = () => {
        setIsOpen(true);
        setUnreadCount(0);
        const newCount = messages.length;
        setLastSeenCount(newCount);
        localStorage.setItem(STORAGE_KEY, newCount.toString());
    };

    const handleClose = () => {
        setIsOpen(false);
        const newCount = messages.length;
        setLastSeenCount(newCount);
        localStorage.setItem(STORAGE_KEY, newCount.toString());
    };

    return (
        <>
            {/* Floating Action Button */}
            <button
                onClick={handleOpen}
                className={`fixed bottom-6 right-6 z-40 w-16 h-16 rounded-full bg-black text-white shadow-[0_8px_30px_rgb(0,0,0,0.12)] flex items-center justify-center transition-all duration-300 hover:scale-110 hover:bg-gray-800 ${isOpen ? 'scale-0 opacity-0' : 'scale-100 opacity-100'}`}
            >
                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>

                {/* Unread Badge */}
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-6 h-6 bg-rose-500 border-2 border-white rounded-full text-white text-xs font-bold flex items-center justify-center animate-bounce shadow-sm">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Chat Drawer Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm animate-fade-in"
                    onClick={handleClose}
                />
            )}

            {/* Chat Drawer */}
            <div
                className={`fixed bottom-0 right-0 z-50 w-full sm:w-[420px] h-[85vh] sm:h-[600px] sm:bottom-6 sm:right-6 sm:rounded-3xl overflow-hidden shadow-2xl transition-all duration-300 bg-white border border-gray-100 ${isOpen ? 'translate-y-0 opacity-100' : 'translate-y-full sm:translate-y-8 opacity-0 pointer-events-none'}`}
            >
                {/* Close Button */}
                <button
                    onClick={handleClose}
                    className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 hover:text-black transition-all"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                {/* Chat Content */}
                <ChatInterface
                    tripId={tripId}
                    userId={userId}
                    userName={userName}
                    messages={messages}
                    onSendMessage={onSendMessage}
                />
            </div>
        </>
    );
}
