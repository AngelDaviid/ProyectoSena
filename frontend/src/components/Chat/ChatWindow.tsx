import React, { useEffect, useRef, useState, useCallback } from 'react';
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

function debounce<T extends (...args: any[]) => void>(fn: T, wait = 150) {
    let t: any;
    return (...args: Parameters<T>) => {
        clearTimeout(t);
        t = setTimeout(() => fn(...args), wait);
    };
}

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
    const wasNearBottomRef = useRef(true);

    // Cuando cambia conversación, reset estado relevante
    useEffect(() => {
        loadingMoreRef.current = false;
        wasNearBottomRef.current = true;
        // small delay to allow messages to mount
        setTimeout(() => {
            if (messagesEndRef.current && isNearBottom(containerRef.current)) {
                messagesEndRef.current.scrollIntoView({ behavior: 'auto' });
            }
        }, 0);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [conversation?.id]);

    // Mantener valor de si el usuario estaba cerca del bottom antes del cambio de mensajes
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        // Si estaba cerca del final, hacemos scroll al final cuando llegue un nuevo mensaje
        if (wasNearBottomRef.current) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
        // si no estaba cerca, no tocar la posición (usuario revisando historial)
    }, [messages.length]); // solo cuando cambia número de mensajes

    // Actualiza wasNearBottomRef en cada scroll rápidamente (sin debounce) para saber si se debe autoscrollear
    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;

        const updateNearBottom = () => {
            wasNearBottomRef.current = isNearBottom(el);
        };

        // also update when container size changes
        const ro = new ResizeObserver(() => updateNearBottom());
        ro.observe(el);

        el.addEventListener('scroll', updateNearBottom, { passive: true });
        // initialize
        updateNearBottom();

        return () => {
            ro.disconnect();
            el.removeEventListener('scroll', updateNearBottom);
        };
    }, []);

    const handleSubmit = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!text.trim()) return;
        onSend(text.trim());
        setText('');
        // after sending, scroll to bottom optimistically
        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 50);
    };

    // Scroll handler con debounce para evitar llamadas rápidas que causen 429
    const handleScrollInner = useCallback(
        async (el: HTMLElement) => {
            if (!onLoadMore || loadingMoreRef.current) return;
            if (el.scrollTop <= 80) {
                loadingMoreRef.current = true;
                const prevScrollHeight = el.scrollHeight;
                try {
                    const loaded = await onLoadMore();
                    if (loaded > 0) {
                        // mantener posición relativa del usuario
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
        },
        [onLoadMore]
    );

    // attach scroll listener con debounce que usa containerRef en tiempo de ejecución
    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;

        // Creamos el debounce aquí para que capture la última versión de handleScrollInner
        const debounced = debounce(() => {
            const container = containerRef.current;
            if (!container) return;
            handleScrollInner(container);
        }, 150);

        el.addEventListener('scroll', debounced, { passive: true });
        return () => el.removeEventListener('scroll', debounced);
    }, [handleScrollInner]);

    const formatDate = (iso?: string) =>
        iso ? new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

    // teclado: Enter para enviar, Shift+Enter para nueva línea
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    return (
        <div className="flex flex-col h-full relative">
            {/* Header */}
            <div className="p-4 border-b bg-white shadow-sm">
                <h2 className="font-semibold text-gray-800">
                    {conversation?.participants?.map((p) => p.profile?.name || p.email).join(', ') || 'Chat'}
                </h2>
            </div>

            {/* Mensajes */}
            <div ref={containerRef} className="flex-1 overflow-auto bg-gray-50 p-4">
                {messages.map((m, i) => {
                    // comparo como string para evitar mismatch number/string
                    const mine = String(m.senderId) === String(currentUserId);
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

            {/* Indicador de escritura */}
            {typingUsers.length > 0 && (
                <div className="absolute left-4 bottom-24 text-xs text-gray-500 animate-pulse">
                    {typingUsers.length === 1 ? 'Está escribiendo...' : 'Varios están escribiendo...'}
                </div>
            )}

            {/* Input */}
            <form onSubmit={(e) => handleSubmit(e)} className="p-4 bg-white border-t flex items-center gap-3">
                <input
                    type="text"
                    placeholder="Escribe un mensaje..."
                    className="flex-1 border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={handleKeyDown}
                />
                <button
                    type="submit"
                    className="bg-green-600 text-white px-5 py-2 rounded-md hover:bg-green-700 transition"
                >
                    Enviar
                </button>
            </form>
        </div>
    );
};

export default ChatWindow;