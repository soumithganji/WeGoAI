'use client';

import { useState, useEffect, useRef } from 'react';
import { Trip, Message, ItineraryItem } from '@/lib/types';

interface ChatInterfaceProps {
    tripId: string;
    userId: string;
    userName: string;
    messages: Message[];
    onSendMessage: (content: string) => void;
}

export default function ChatInterface({
    tripId,
    userId,
    userName,
    messages,
    onSendMessage
}: ChatInterfaceProps) {
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const [isNearBottom, setIsNearBottom] = useState(true);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    // Check if user is near the bottom of the chat
    const handleScroll = () => {
        const container = messagesContainerRef.current;
        if (container) {
            const threshold = 100; // pixels from bottom
            const isNear = container.scrollHeight - container.scrollTop - container.clientHeight < threshold;
            setIsNearBottom(isNear);
        }
    };

    // Only auto-scroll if user is near bottom
    useEffect(() => {
        if (isNearBottom) {
            scrollToBottom();
        }
    }, [messages, isNearBottom]);

    const sendMessage = async () => {
        if (!input.trim() || isLoading) return;

        const message = input.trim();
        setInput('');
        if (inputRef.current) {
            inputRef.current.style.height = 'auto';
        }
        setIsLoading(true);

        await onSendMessage(message);
        setIsLoading(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await sendMessage();
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.style.height = 'auto';
            inputRef.current.style.height = `${inputRef.current.scrollHeight}px`;
        }
    }, [input]);

    const handleAIMention = () => {
        setInput('@weai ' + input);
        inputRef.current?.focus();
    };

    const formatMessageContent = (content: string) => {
        if (!content) return null;
        const parts = content.split(/(@weai)/gi);
        return parts.map((part, i) => {
            if (part.toLowerCase() === '@weai') {
                return (
                    <span
                        key={i}
                        className="bg-gray-200 text-black px-1.5 py-0.5 rounded font-semibold mx-0.5 inline-block"
                    >
                        {part}
                    </span>
                );
            }
            return part;
        });
    };

    return (
        <div className="flex flex-col h-full bg-white">
            {/* Chat Header */}
            <div className="px-5 py-4 bg-white/90 backdrop-blur-xl border-b border-gray-100 z-10">
                <h2 className="text-lg font-bold text-black flex items-center gap-2">
                    <span className="w-8 h-8 rounded-lg bg-black text-white flex items-center justify-center shadow-md">
                        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                    </span>
                    Group Chat
                </h2>
                <p className="text-sm text-gray-500 mt-1">Type <span className="text-black font-semibold">@weai</span> to ask for suggestions</p>
            </div>

            {/* Messages */}
            <div
                ref={messagesContainerRef}
                onScroll={handleScroll}
                className="flex-1 overflow-y-auto p-5 space-y-4 scroll-smooth"
            >
                {messages.length === 0 && (
                    <div className="text-center py-16 animate-fade-in">
                        <div className="w-20 h-20 rounded-full bg-gray-50 border border-gray-200 flex items-center justify-center mx-auto mb-4 text-gray-400">
                            <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                        </div>
                        <p className="text-black font-semibold">Start chatting with your group!</p>
                        <p className="text-sm text-gray-500 mt-2">
                            Tip: Type <span className="text-black font-medium">@weai</span> to get AI suggestions
                        </p>
                    </div>
                )}

                {messages.map((msg, index) => {
                    const messageId = (msg as any)._id || msg.id || index;
                    const createdAt = msg.createdAt ? new Date(msg.createdAt) : new Date();
                    const timeString = !isNaN(createdAt.getTime())
                        ? createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : '';

                    return (
                        <div
                            key={index}
                            className={`flex ${msg.senderId === userId ? 'justify-end' : 'justify-start'} animate-slide-up`}
                            style={{ animationDelay: `${index * 0.05}s` }}
                        >
                            <div
                                className={`max-w-[80%] rounded-2xl px-5 py-3.5 shadow-sm ${msg.senderId === 'ai'
                                    ? 'bg-black text-white'
                                    : msg.senderId === userId
                                        ? 'bg-white text-black border border-gray-200'
                                        : 'bg-gray-50 text-black border border-gray-200'
                                    }`}
                            >
                                {msg.senderId !== userId && msg.senderId !== 'ai' && (
                                    <p className="text-xs text-gray-500 mb-1.5 font-semibold">{msg.senderName}</p>
                                )}
                                {msg.senderId === 'ai' && (
                                    <p className="text-xs text-white mb-1.5 flex items-center gap-1.5 font-bold uppercase tracking-wider">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                        </svg>
                                        AI Assistant
                                    </p>
                                )}
                                <p className="whitespace-pre-wrap leading-relaxed">{formatMessageContent(msg.content)}</p>
                                {timeString && (
                                    <p className={`text-[10px] mt-2 text-right ${msg.senderId === 'ai' ? 'text-white/60' : 'text-gray-400'
                                        }`}>
                                        {timeString}
                                    </p>
                                )}
                            </div>
                        </div>
                    );
                })}

                {isLoading && (
                    <div className="flex justify-start animate-fade-in">
                        <div className="bg-gray-50 rounded-2xl px-5 py-4 border border-gray-200">
                            <div className="flex items-center gap-1.5">
                                <div className="w-2 h-2 bg-black rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                <div className="w-2 h-2 bg-black rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                <div className="w-2 h-2 bg-black rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                            </div>
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSubmit} className="p-4 bg-white border-t border-gray-100">
                <div className="flex gap-3 items-end">
                    <button
                        type="button"
                        onClick={handleAIMention}
                        className="px-4 py-3 bg-gray-100 text-black rounded-xl hover:bg-gray-200 transition-all text-sm font-semibold border border-transparent"
                    >
                        @weai
                    </button>
                    <textarea
                        ref={inputRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Type a message..."
                        rows={1}
                        className="flex-1 px-5 py-3 bg-gray-50 border border-gray-200 rounded-xl text-black placeholder-gray-400 focus:bg-white focus:border-black focus:ring-1 focus:ring-black focus:outline-none transition-all resize-none"
                        style={{ minHeight: '48px', maxHeight: '120px' }}
                    />
                    <button
                        type="submit"
                        disabled={!input.trim() || isLoading}
                        className="px-6 py-3 bg-black text-white rounded-xl hover:bg-gray-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-semibold shadow-lg shadow-gray-200"
                    >
                        Send
                    </button>
                </div>
            </form>
        </div>
    );
}
