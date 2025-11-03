import React, { useState, useRef, useEffect } from 'react';
import type { Conversation, Message } from '../types/chat';

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
    const lastAutoScrollRef = useRef(true);

    // Scroll automático al fondo cuando cambian los mensajes
    useEffect(() => {
        const should = isNearBottom(containerRef.current);
        lastAutoScrollRef.current = should;
        if (should) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, conversation?.id]);

    const handleSubmit = (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!text.trim()) return;
        onSend(text.trim());
        setText('');
    };

    const handleScroll = async (e: React.UIEvent<HTMLDivElement>) => {
        const el = e.currentTarget;
        if (el.scrollTop < 120 && onLoadMore && !loadingMoreRef.current) {
            loadingMoreRef.current = true;
            const prevScrollHeight = el.scrollHeight;

            try {
                await onLoadMore();
                requestAnimationFrame(() => {
                    const newScrollHeight = el.scrollHeight;
                    el.scrollTop = newScrollHeight - prevScrollHeight;
                });
            } catch (err) {
                console.error('Error al cargar mensajes antiguos:', err);
            } finally {
                loadingMoreRef.current = false;
            }
        }

        lastAutoScrollRef.current = isNearBottom(el);
    };

    const formatDate = (iso?: string) => {
        if (!iso) return '';
        const d = new Date(iso);
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const groupByDate = (idx: number) => {
        if (idx === 0) return true;
        const cur = messages[idx];
        const prev = messages[idx - 1];
        const curDay = new Date(cur.createdAt || '').toDateString();
        const prevDay = new Date(prev.createdAt || '').toDateString();
        return curDay !== prevDay;
    };

    return (
        <div className="flex flex-col h-full relative">
            {/* Encabezado */}
            <div className="p-4 border-b bg-white shadow-sm">
                <div className="font-semibold text-gray-800">
                    {conversation?.participants
                        ?.map((p) => p.profile?.name || p.email)
                        .join(', ') || 'Sin participantes'}
                </div>
            </div>

            {/* Mensajes */}
            <div
                ref={containerRef}
                onScroll={handleScroll}
                className="flex-1 p-4 overflow-auto bg-gray-50"
            >
                {messages.map((m, idx) => {
                    const mine = m.senderId === currentUserId;
                    return (
                        <React.Fragment key={m.id ?? m.tempId ?? `msg-${idx}`}>
                            {groupByDate(idx) && (
                                <div className="text-center text-xs text-gray-400 my-3">
                                    {new Date(m.createdAt || Date.now()).toLocaleDateString()}
                                </div>
                            )}

                            <div className={`mb-4 flex ${mine ? 'justify-end' : 'justify-start'}`}>
                                <div
                                    className={`${
                                        mine ? 'bg-green-600 text-white' : 'bg-white border'
                                    } max-w-[70%] p-3 rounded-lg shadow-sm`}
                                >
                                    {m.text && <div className="whitespace-pre-wrap">{m.text}</div>}

                                    {m.imageUrl && (
                                        <img
                                            src={
                                                m.imageUrl.startsWith('/')
                                                    ? `${import.meta.env.VITE_SENA_API_URL || 'http://localhost:3001'}${m.imageUrl}`
                                                    : m.imageUrl
                                            }
                                            alt="imagen"
                                            className="mt-2 max-h-48 object-contain rounded"
                                        />
                                    )}

                                    {'sending' in m && m.sending && (
                                        <div className="text-[10px] text-gray-400 mt-2">Enviando...</div>
                                    )}

                                    <div className="text-[10px] text-gray-400 mt-2 text-right">
                                        {formatDate(m.createdAt)}
                                    </div>
                                </div>
                            </div>
                        </React.Fragment>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSubmit} className="p-4 bg-white border-t flex gap-2 items-center">
                <input
                    className="flex-1 border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Escribe un mensaje..."
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                />
                <button
                    type="submit"
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded transition-colors"
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
