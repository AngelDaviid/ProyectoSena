import React, { useState, useRef, useEffect } from 'react';
import type { Conversation, Message } from '../types/chat';

type Props = {
    conversation: Conversation;
    messages: Message[];
    currentUserId?: number | null;
    onSend: (text: string, imageUrl?: string) => void;
};

const ChatWindow: React.FC<Props> = ({ conversation, messages, currentUserId, onSend }) => {
    const [text, setText] = useState('');
    const messagesEndRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, conversation?.id]);

    const handleSubmit = (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!text.trim()) return;
        onSend(text.trim());
        setText('');
    };

    return (
        <div className="flex flex-col h-full">
            <div className="p-4 border-b bg-white">
                <div className="font-semibold">{conversation.participants?.map(p => p.profile?.name || p.email).join(', ')}</div>
            </div>

            <div className="flex-1 p-4 overflow-auto bg-[url('/dots.svg')]">
                {messages.map((m) => {
                    const mine = m.sender?.id === currentUserId;
                    return (
                        <div key={m.id} className={`mb-4 flex ${mine ? 'justify-end' : 'justify-start'}`}>
                            <div className={`${mine ? 'bg-green-600 text-white' : 'bg-white border'} max-w-[70%] p-3 rounded-lg shadow-sm`}>
                                {m.sender && !mine && <div className="text-xs text-gray-500 mb-1">{m.sender.profile?.name || m.sender.email}</div>}
                                {m.text && <div className="whitespace-pre-wrap">{m.text}</div>}
                                {m.imageUrl && <img src={m.imageUrl.startsWith('/') ? `${import.meta.env.SENA_API_URL || 'http://localhost:3001'}${m.imageUrl}` : m.imageUrl} alt="img" className="mt-2 max-h-48 object-contain rounded" />}
                                <div className="text-[10px] text-gray-400 mt-2 text-right">{new Date(m.createdAt || Date.now()).toLocaleString()}</div>
                            </div>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSubmit} className="p-4 bg-white border-t flex gap-2 items-center">
                <input
                    className="flex-1 border rounded px-3 py-2 focus:outline-none"
                    placeholder="Escribe un mensaje..."
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                />
                <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded">
                    Enviar
                </button>
            </form>
        </div>
    );
};

export default ChatWindow;