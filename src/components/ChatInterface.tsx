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
    const inputRef = useRef<HTMLInputElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const message = input.trim();
        setInput('');
        setIsLoading(true);

        await onSendMessage(message);
        setIsLoading(false);
    };

    const handleAIMention = () => {
        setInput(input + '@AI ');
        inputRef.current?.focus();
    };

    return (
        <div className="flex flex-col h-full bg-gray-900">
            {/* Chat Header */}
            <div className="px-4 py-3 bg-gray-800 border-b border-gray-700">
                <h2 className="text-lg font-semibold text-white">💬 Group Chat</h2>
                <p className="text-sm text-gray-400">Type @AI to ask for suggestions</p>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 && (
                    <div className="text-center text-gray-500 py-8">
                        <p className="text-4xl mb-2">👋</p>
                        <p>Start chatting with your group!</p>
                        <p className="text-sm mt-2">Tip: Type <span className="text-pink-400">@AI</span> to get AI suggestions</p>
                    </div>
                )}

                {messages.map((msg) => (
                    <div
                        key={msg.id}
                        className={`flex ${msg.senderId === userId ? 'justify-end' : 'justify-start'}`}
                    >
                        <div
                            className={`max-w-[80%] rounded-2xl px-4 py-2 ${msg.senderId === 'ai'
                                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
                                    : msg.senderId === userId
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-gray-700 text-white'
                                }`}
                        >
                            {msg.senderId !== userId && msg.senderId !== 'ai' && (
                                <p className="text-xs text-gray-300 mb-1">{msg.senderName}</p>
                            )}
                            {msg.senderId === 'ai' && (
                                <p className="text-xs text-purple-200 mb-1 flex items-center gap-1">
                                    <span>🤖</span> AI Assistant
                                </p>
                            )}
                            <p className="whitespace-pre-wrap">{msg.content}</p>
                            <p className="text-xs opacity-60 mt-1 text-right">
                                {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                        </div>
                    </div>
                ))}

                {isLoading && (
                    <div className="flex justify-start">
                        <div className="bg-gray-700 rounded-2xl px-4 py-3">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                            </div>
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSubmit} className="p-4 bg-gray-800 border-t border-gray-700">
                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={handleAIMention}
                        className="px-3 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all text-sm font-medium"
                    >
                        @AI
                    </button>
                    <input
                        ref={inputRef}
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Type a message..."
                        className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <button
                        type="submit"
                        disabled={!input.trim() || isLoading}
                        className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Send
                    </button>
                </div>
            </form>
        </div>
    );
}
