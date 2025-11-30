import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Send, Image as ImageIcon, Paperclip, MoreVertical, Phone, Video, ArrowDown } from 'lucide-react';
import type { Conversation, Message } from '../../types/chat';

type Props = {
    activeConversation: Conversation;
    messages: Array<Message & { sending?: boolean; tempId?: string; seenBy?: number[] }>;
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
                                         activeConversation,
                                         messages,
                                         currentUserId,
                                         onSend,
                                         onLoadMore,
                                         typingUsers = [],
                                     }) => {
    const [text, setText] = useState('');
    const [showScrollButton, setShowScrollButton] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const loadingMoreRef = useRef(false);
    const wasNearBottomRef = useRef(true);

    // Cuando cambia conversación
    useEffect(() => {
        loadingMoreRef.current = false;
        wasNearBottomRef.current = true;
        setShowScrollButton(false);
        setTimeout(() => {
            if (messagesEndRef.current && isNearBottom(containerRef.current)) {
                messagesEndRef.current.scrollIntoView({ behavior: 'auto' });
            }
        }, 0);
    }, [activeConversation?. id]);

    // Auto-scroll si estabas cerca del bottom
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        if (wasNearBottomRef.current) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages.length]);

    // Actualizar wasNearBottomRef y mostrar botón de scroll
    useEffect(() => {
        const el = containerRef.current;
        if (! el) return;

        const updateScrollState = () => {
            const nearBottom = isNearBottom(el);
            wasNearBottomRef.current = nearBottom;
            setShowScrollButton(! nearBottom);
        };

        const ro = new ResizeObserver(() => updateScrollState());
        ro.observe(el);

        el.addEventListener('scroll', updateScrollState, { passive: true });
        updateScrollState();

        return () => {
            ro.disconnect();
            el.removeEventListener('scroll', updateScrollState);
        };
    }, []);

    const handleSubmit = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (! text.trim()) return;
        onSend(text. trim());
        setText('');
        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 50);
    };

    const handleScrollInner = useCallback(
        async (el: HTMLElement) => {
            if (! onLoadMore || loadingMoreRef.current) return;
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
                    console. error('Error cargando mensajes antiguos:', err);
                } finally {
                    loadingMoreRef. current = false;
                }
            }
        },
        [onLoadMore]
    );

    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;

        const debounced = debounce(() => {
            const container = containerRef.current;
            if (! container) return;
            handleScrollInner(container);
        }, 150);

        el.addEventListener('scroll', debounced, { passive: true });
        return () => el.removeEventListener('scroll', debounced);
    }, [handleScrollInner]);

    const formatDate = (iso?: string) => {
        if (! iso) return '';
        const date = new Date(iso);
        return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const participantName =
        activeConversation?. participants
            ?.filter((p) => p.id !== currentUserId)
            .map((p) => `${p.profile?.name || ''} ${p.profile?.lastName || ''}`.trim() || p.email)
            . join(', ') || 'Chat';

    return (
        <div className="flex flex-col h-full relative bg-gradient-to-b from-gray-50 to-white">
            {/* Header */}
            <div className="px-6 py-4 bg-white border-b border-gray-200 shadow-sm">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        {/* Avatar */}
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white font-semibold">
                            {participantName[0]?.toUpperCase() || 'C'}
                        </div>
                        <div>
                            <h2 className="font-semibold text-gray-800">{participantName}</h2>
                            <p className="text-xs text-gray-500">
                                {typingUsers.length > 0 ?  (
                                    <span className="text-blue-600 font-medium animate-pulse">Escribiendo...</span>
                                ) : (
                                    'En línea'
                                )}
                            </p>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                        <button className="p-2 hover:bg-gray-100 rounded-full transition">
                            <Phone className="w-5 h-5 text-gray-600" />
                        </button>
                        <button className="p-2 hover:bg-gray-100 rounded-full transition">
                            <Video className="w-5 h-5 text-gray-600" />
                        </button>
                        <button className="p-2 hover:bg-gray-100 rounded-full transition">
                            <MoreVertical className="w-5 h-5 text-gray-600" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Messages */}
            <div
                ref={containerRef}
                className="flex-1 overflow-y-auto px-6 py-4"
                style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                }}
            >
                {messages.map((m, i) => {
                    const mine = String(m.senderId) === String(currentUserId);
                    const showAvatar = i === messages.length - 1 || messages[i + 1]?.senderId !== m.senderId;
                    const showTimestamp = i === messages.length - 1 ||
                        (new Date(messages[i + 1]?.createdAt || 0).getTime() - new Date(m.createdAt || 0). getTime()) > 60000;

                    return (
                        <div
                            key={m.id ??  m.tempId ??  i}
                            className={`flex mb-2 ${mine ? 'justify-end' : 'justify-start'} animate-fade-in-up`}
                        >
                            <div className={`flex gap-2 max-w-[75%] ${mine ? 'flex-row-reverse' : 'flex-row'}`}>
                                {/* Avatar */}
                                {! mine && showAvatar && (
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-400 to-gray-500 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                                        {participantName[0]?.toUpperCase() || 'U'}
                                    </div>
                                )}
                                {! mine && !showAvatar && <div className="w-8" />}

                                {/* Message bubble */}
                                <div className="flex flex-col">
                                    <div
                                        className={`rounded-2xl px-4 py-2 shadow-sm ${
                                            mine
                                                ? 'bg-gradient-to-br from-blue-600 to-purple-600 text-white rounded-br-sm'
                                                : 'bg-white border border-gray-200 text-gray-800 rounded-bl-sm'
                                        }`}
                                    >
                                        {m.text && <div className="break-words">{m.text}</div>}
                                        {m.imageUrl && (
                                            <img
                                                src={
                                                    m.imageUrl.startsWith('/')
                                                        ? `${import.meta.env. VITE_SENA_API_URL || 'http://localhost:3001'}${m.imageUrl}`
                                                        : m.imageUrl
                                                }
                                                alt="imagen"
                                                className="mt-2 max-h-56 rounded-lg object-contain"
                                            />
                                        )}
                                    </div>

                                    {/* Timestamp */}
                                    {showTimestamp && (
                                        <div
                                            className={`text-[10px] text-gray-400 mt-1 px-2 ${
                                                mine ? 'text-right' : 'text-left'
                                            }`}
                                        >
                                            {m.sending ? (
                                                <span className="text-blue-500 animate-pulse">Enviando...</span>
                                            ) : (
                                                formatDate(m.createdAt)
                                            )}
                                            {mine && m.seenBy && m.seenBy.length > 0 && (
                                                <span className="ml-1 text-blue-500">✓✓</span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            {/* Scroll to bottom button */}
            {showScrollButton && (
                <button
                    onClick={scrollToBottom}
                    className="absolute bottom-24 right-6 bg-blue-600 text-white p-3 rounded-full shadow-lg hover:bg-blue-700 transition-all animate-bounce-gentle z-10"
                >
                    <ArrowDown className="w-5 h-5" />
                </button>
            )}

            {/* Input */}
            <form
                onSubmit={(e) => handleSubmit(e)}
                className="px-6 py-4 bg-white border-t border-gray-200 shadow-lg"
            >
                <div className="flex items-end gap-3">
                    {/* Attachments */}
                    <button
                        type="button"
                        className="p-2 hover:bg-gray-100 rounded-full transition flex-shrink-0"
                        title="Adjuntar archivo"
                    >
                        <Paperclip className="w-5 h-5 text-gray-600" />
                    </button>
                    <button
                        type="button"
                        className="p-2 hover:bg-gray-100 rounded-full transition flex-shrink-0"
                        title="Adjuntar imagen"
                    >
                        <ImageIcon className="w-5 h-5 text-gray-600" />
                    </button>

                    {/* Text input */}
                    <textarea
                        placeholder="Escribe un mensaje..."
                        className="flex-1 border border-gray-300 rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none max-h-32 transition"
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        onKeyDown={handleKeyDown}
                        rows={1}
                        style={{
                            minHeight: '44px',
                            maxHeight: '128px',
                            overflowY: text.split('\n').length > 3 ? 'auto' : 'hidden',
                        }}
                    />

                    {/* Send button */}
                    <button
                        type="submit"
                        disabled={!text.trim()}
                        className="p-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full hover:from-blue-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 shadow-lg"
                    >
                        <Send className="w-5 h-5" />
                    </button>
                </div>
            </form>
        </div>
    );
};

export default ChatWindow;