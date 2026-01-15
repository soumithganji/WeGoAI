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
        <div className="flex flex-col h-full bg-gradient-to-b from-slate-950 to-slate-900">
            {/* Chat Header */}
            <div className="px-5 py-4 bg-slate-900/80 backdrop-blur-xl border-b border-white/5">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                    <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center text-sm">💬</span>
                    Group Chat
                </h2>
                <p className="text-sm text-slate-500 mt-1">Type <span className="text-violet-400 font-medium">@AI</span> to ask for suggestions</p>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {messages.length === 0 && (
                    <div className="text-center py-16 animate-fade-in">
                        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-violet-500/20 to-pink-500/20 flex items-center justify-center mx-auto mb-4">
                            <span className="text-4xl">👋</span>
                        </div>
                        <p className="text-slate-300 font-medium">Start chatting with your group!</p>
                        <p className="text-sm text-slate-500 mt-2">
                            Tip: Type <span className="text-violet-400 font-medium">@AI</span> to get AI suggestions
                        </p>
                    </div>
                )}

                {messages.map((msg, index) => (
                    <div
                        key={msg.id}
                        className={`flex ${msg.senderId === userId ? 'justify-end' : 'justify-start'} animate-slide-up`}
                        style={{ animationDelay: `${index * 0.05}s` }}
                    >
                        <div
                            className={`max-w-[80%] rounded-2xl px-4 py-3 shadow-lg ${msg.senderId === 'ai'
                                    ? 'bg-gradient-to-br from-violet-600 to-pink-600 text-white shadow-violet-500/20'
                                    : msg.senderId === userId
                                        ? 'bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-indigo-500/20'
                                        : 'bg-white/10 text-white shadow-black/20 border border-white/5'
                                }`}
                        >
                            {msg.senderId !== userId && msg.senderId !== 'ai' && (
                                <p className="text-xs text-slate-300 mb-1.5 font-medium">{msg.senderName}</p>
                            )}
                            {msg.senderId === 'ai' && (
                                <p className="text-xs text-violet-200 mb-1.5 flex items-center gap-1.5 font-medium">
                                    <span className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center text-[10px]">🤖</span>
                                    AI Assistant
                                </p>
                            )}
                            <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                            <p className="text-xs opacity-50 mt-2 text-right">
                                {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                        </div>
                    </div>
                ))}

                {isLoading && (
                    <div className="flex justify-start animate-fade-in">
                        <div className="bg-white/10 rounded-2xl px-5 py-4 border border-white/5">
                            <div className="flex items-center gap-1.5">
                                <div className="w-2.5 h-2.5 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                <div className="w-2.5 h-2.5 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                <div className="w-2.5 h-2.5 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                            </div>
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSubmit} className="p-4 bg-slate-900/80 backdrop-blur-xl border-t border-white/5">
                <div className="flex gap-3">
                    <button
                        type="button"
                        onClick={handleAIMention}
                        className="px-4 py-2.5 bg-gradient-to-r from-violet-600 to-pink-600 text-white rounded-xl hover:from-violet-500 hover:to-pink-500 transition-smooth text-sm font-semibold shadow-lg shadow-violet-500/20"
                    >
                        @AI
                    </button>
                    <input
                        ref={inputRef}
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Type a message..."
                        className="flex-1 px-5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus-glow transition-smooth hover:border-violet-500/30"
                    />
                    <button
                        type="submit"
                        disabled={!input.trim() || isLoading}
                        className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl hover:from-indigo-500 hover:to-violet-500 transition-smooth disabled:opacity-30 disabled:cursor-not-allowed font-medium shadow-lg shadow-indigo-500/20"
                    >
                        Send
                    </button>
                </div>
            </form>
        </div>
    );
}
