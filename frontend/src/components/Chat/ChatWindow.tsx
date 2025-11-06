import React, { useState, useRef, useEffect } from 'react';
import type { Conversation, Message } from '../../types/chat.ts';

type Props = {
    conversation: Conversation | null;
    messages: Array<Message & { sending?: boolean; tempId?: string }>;
    currentUserId?: number | null;
    onSend: (text: string, imageUrl?: string | File) => void;
    onLoadMore?: () => Promise<number>;
    typingUsers?: number[];
};

const isNearBottom = (el: HTMLElement | null, threshold = 150) => {
    if (!el) return true;
    const { scrollTop, scrollHeight, clientHeight } = el;
    return scrollHeight - (scrollTop + clientHeight) < threshold;
};

const ChatWindow: React.FC<Props> = ({
 conversation,
 messages,
 currentUserId,
 onSend,
 onLoadMore,
 typingUsers = [],
}) => {
    const [text, setText] = useState('');
    const messagesEndRef = useRef<HTMLDivElement | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const loadingMoreRef = useRef(false);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const nearBottom = isNearBottom(container);
        if (nearBottom) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, conversation?.id]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!text.trim()) return;
        onSend(text.trim());
        setText('');
    };

    const handleScroll = async (e: React.UIEvent<HTMLDivElement>) => {
        const el = e.currentTarget;
        if (!onLoadMore || loadingMoreRef.current) return;

        if (el.scrollTop <= 80) {
            loadingMoreRef.current = true;

            const prevScrollHeight = el.scrollHeight;

            try {
                const loaded = await onLoadMore();
                if (loaded > 0) {
                    requestAnimationFrame(() => {
                        const newScrollHeight = el.scrollHeight;
                        el.scrollTop = newScrollHeight - prevScrollHeight + el.scrollTop;
                    });
                }
            } catch (err) {
                console.error('Error cargando mensajes antiguos:', err);
            } finally {
                loadingMoreRef.current = false;
            }
        }
    };


    const formatDate = (iso?: string) =>
        iso ? new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="p-4 border-b bg-white shadow-sm">
                <h2 className="font-semibold text-gray-800">
                    {conversation?.participants?.map((p) => p.profile?.name || p.email).join(', ') || 'Chat'}
                </h2>
            </div>

            {/* Mensajes */}
            <div
                ref={containerRef}
                onScroll={handleScroll}
                className="flex-1 overflow-auto bg-gray-50 p-4"
            >
                {messages.map((m, i) => {
                    const mine = m.senderId === currentUserId;
                    return (
                        <div
                            key={m.id ?? m.tempId ?? i}
                            className={`flex mb-3 ${mine ? 'justify-end' : 'justify-start'}`}
                        >
                            <div
                                className={`rounded-lg px-4 py-2 max-w-[75%] shadow-sm ${
                                    mine ? 'bg-green-600 text-white' : 'bg-white border'
                                }`}
                            >
                                {m.text && <div>{m.text}</div>}
                                {m.imageUrl && (
                                    <img
                                        src={
                                            m.imageUrl.startsWith('/')
                                                ? `${import.meta.env.VITE_SENA_API_URL || 'http://localhost:3001'}${m.imageUrl}`
                                                : m.imageUrl
                                        }
                                        alt="imagen"
                                        className="mt-2 max-h-56 rounded object-contain"
                                    />
                                )}
                                <div className="text-[10px] text-gray-300 mt-1 text-right">
                                    {m.sending ? 'Enviando...' : formatDate(m.createdAt)}
                                </div>
                            </div>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form
                onSubmit={handleSubmit}
                className="p-4 bg-white border-t flex items-center gap-3"
            >
                <input
                    type="text"
                    placeholder="Escribe un mensaje..."
                    className="flex-1 border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                />
                <button
                    type="submit"
                    className="bg-green-600 text-white px-5 py-2 rounded-md hover:bg-green-700 transition"
                >
                    Enviar
                </button>
            </form>

            {/* Indicador de escritura */}
            {typingUsers.length > 0 && (
                <div className="absolute left-4 bottom-20 text-xs text-gray-500 animate-pulse">
                    {typingUsers.length === 1
                        ? 'Está escribiendo...'
                        : 'Varios están escribiendo...'}
                </div>
            )}
        </div>
    );
};

export default ChatWindow;
