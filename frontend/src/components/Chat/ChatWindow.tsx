import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Send, Image as ImageIcon, ArrowDown, X } from 'lucide-react';
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
    const [selectedImage, setSelectedImage] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [showScrollButton, setShowScrollButton] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const loadingMoreRef = useRef(false);
    const wasNearBottomRef = useRef(true);

    useEffect(() => {
        loadingMoreRef.current = false;
        wasNearBottomRef.current = true;
        setShowScrollButton(false);
        setSelectedImage(null);
        setImagePreview(null);

        setTimeout(() => {
            if (messagesEndRef.current && isNearBottom(containerRef.current)) {
                messagesEndRef.current.scrollIntoView({ behavior: 'auto' });
            }
        }, 0);
    }, [activeConversation?. id]);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        if (wasNearBottomRef. current) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages. length]);

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

    useEffect(() => {
        return () => {
            if (imagePreview) {
                URL.revokeObjectURL(imagePreview);
            }
        };
    }, [imagePreview]);

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (! file) return;

        if (! file.type.startsWith('image/')) {
            alert('Por favor selecciona un archivo de imagen válido');
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            alert('La imagen no debe superar los 5MB');
            return;
        }

        setSelectedImage(file);
        const preview = URL.createObjectURL(file);
        setImagePreview(preview);
    };

    const handleRemoveImage = () => {
        if (imagePreview) {
            URL. revokeObjectURL(imagePreview);
        }
        setSelectedImage(null);
        setImagePreview(null);
        if (fileInputRef.current) {
            fileInputRef.current. value = '';
        }
    };

    const handleSubmit = (e?: React.FormEvent) => {
        if (e) e.preventDefault();

        const hasText = text.trim().length > 0;
        const hasImage = selectedImage !== null;

        if (!hasText && !hasImage) return;

        onSend(text. trim(), selectedImage || undefined);

        setText('');
        handleRemoveImage();

        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 50);
    };

    const handleScrollInner = useCallback(
        async (el: HTMLElement) => {
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

    const handleKeyDown = (e: React. KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const getImageUrl = (imageUrl: any): string | null => {
        if (!imageUrl) return null;

        if (typeof imageUrl === 'string') {
            if (imageUrl.startsWith('blob:')) {
                return imageUrl;
            }
            if (imageUrl.startsWith('/')) {
                return `${import.meta.env.VITE_SENA_API_URL || 'http://localhost:3001'}${imageUrl}`;
            }
            if (imageUrl.startsWith('http')) {
                return imageUrl;
            }
            return `${import.meta.env.VITE_SENA_API_URL || 'http://localhost:3001'}/${imageUrl}`;
        }

        return null;
    };

    const participantName =
        activeConversation?.participants
            ?.filter((p) => p.id !== currentUserId)
            .map((p) => `${p.profile?. name || ''} ${p.profile?.lastName || ''}`. trim() || p.email)
            .join(', ') || 'Chat';

    return (
        <div className="flex flex-col h-full bg-white">
            {/* Header - Altura fija */}
            <div className="flex-shrink-0 px-3 py-3 sm:px-4 sm:py-4 md:px-6 bg-gradient-to-r from-green-600 to-emerald-600 shadow-md">
                <div className="flex items-center gap-2 sm:gap-3">
                    <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white font-bold text-base sm:text-lg border-2 border-white/40 shadow-lg flex-shrink-0">
                        {participantName[0]?.toUpperCase() || 'C'}
                    </div>
                    <div className="flex-1 min-w-0">
                        <h2 className="font-bold text-white text-sm sm:text-base md:text-lg truncate">
                            {participantName}
                        </h2>
                        <p className="text-[10px] sm:text-xs text-green-100 flex items-center gap-1">
                            {typingUsers. length > 0 ? (
                                <>
                                    <span className="flex gap-0.5">
                                        <span className="w-1 h-1 bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                                        <span className="w-1 h-1 bg-white rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                                        <span className="w-1 h-1 bg-white rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                                    </span>
                                    <span>Escribiendo...</span>
                                </>
                            ) : (
                                <>
                                    <span className="w-2 h-2 bg-green-300 rounded-full"></span>
                                    <span>En línea</span>
                                </>
                            )}
                        </p>
                    </div>
                </div>
            </div>

            {/* Messages - Crece para ocupar espacio disponible */}
            <div
                ref={containerRef}
                className="flex-1 overflow-y-auto px-3 py-4 sm:px-4 sm:py-5 md:px-6 md:py-6 bg-gradient-to-b from-gray-50 to-white"
            >
                {messages.map((m, i) => {
                    const mine = String(m.senderId) === String(currentUserId);
                    const showAvatar = i === messages.length - 1 || messages[i + 1]?.senderId !== m.senderId;
                    const showTimestamp = i === messages.length - 1 ||
                        (new Date(messages[i + 1]?.createdAt || 0).getTime() - new Date(m.createdAt || 0).getTime()) > 60000;

                    const imageUrl = getImageUrl(m. imageUrl);

                    return (
                        <div
                            key={m.id ??  m.tempId ??  i}
                            className={`flex mb-3 sm:mb-4 ${mine ? 'justify-end' : 'justify-start'}`}
                        >
                            <div className={`flex gap-2 items-start max-w-[85%] sm:max-w-[75%] md:max-w-[70%] ${mine ? 'flex-row-reverse' : 'flex-row'}`}>
                                {! mine && showAvatar && (
                                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-md mt-1">
                                        {participantName[0]?.toUpperCase() || 'U'}
                                    </div>
                                )}
                                {!mine && ! showAvatar && <div className="w-7 sm:w-8" />}

                                <div className="flex flex-col">
                                    <div
                                        className={`rounded-2xl px-3 py-2 sm:px-4 sm:py-2.5 shadow-sm transition-all ${
                                            mine
                                                ? 'bg-gradient-to-br from-green-600 to-emerald-600 text-white rounded-br-md'
                                                : 'bg-white text-gray-800 rounded-bl-md border border-gray-200'
                                        }`}
                                    >
                                        {imageUrl && (
                                            <div className={`${m.text ? 'mb-2' : ''}`}>
                                                <img
                                                    src={imageUrl}
                                                    alt="Imagen"
                                                    className="rounded-lg max-h-56 sm:max-h-64 w-full object-cover"
                                                    onError={(e) => {
                                                        const target = e.target as HTMLImageElement;
                                                        target.style.display = 'none';
                                                    }}
                                                />
                                            </div>
                                        )}
                                        {m.text && (
                                            <p className="break-words leading-relaxed text-sm sm:text-base whitespace-pre-wrap">
                                                {m. text}
                                            </p>
                                        )}
                                    </div>

                                    {showTimestamp && (
                                        <div className={`text-[10px] text-gray-400 mt-1 px-2 ${mine ? 'text-right' : 'text-left'}`}>
                                            {m.sending ? (
                                                <span className="text-green-600 font-medium">Enviando...</span>
                                            ) : (
                                                <>
                                                    {formatDate(m.createdAt)}
                                                    {mine && m.seenBy && m.seenBy.length > 0 && (
                                                        <span className="ml-1 text-blue-500">✓✓</span>
                                                    )}
                                                </>
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

            {/* Scroll button */}
            {showScrollButton && (
                <button
                    onClick={scrollToBottom}
                    className="absolute bottom-24 sm:bottom-28 md:bottom-32 right-4 sm:right-6 bg-green-600 hover:bg-green-700 text-white p-3 rounded-full shadow-lg hover:shadow-xl transition-all z-10"
                    title="Ir al final"
                >
                    <ArrowDown className="w-5 h-5" />
                </button>
            )}

            {/* ✅ Input Area - SIEMPRE VISIBLE, NUNCA CORTADO */}
            <div className="flex-shrink-0 border-t border-gray-200 bg-white">
                <form
                    onSubmit={handleSubmit}
                    className="px-3 py-3 sm:px-4 sm:py-4 md:px-6"
                >
                    {imagePreview && (
                        <div className="mb-3 relative inline-block">
                            <img
                                src={imagePreview}
                                alt="Preview"
                                className="max-h-32 rounded-lg border-2 border-green-200"
                            />
                            <button
                                type="button"
                                onClick={handleRemoveImage}
                                className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1. 5 shadow-lg transition"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    )}

                    <div className="flex items-center gap-2 sm:gap-3">
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleImageSelect}
                            className="hidden"
                        />

                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="p-2. 5 hover:bg-gray-100 text-gray-600 hover:text-green-600 rounded-full transition flex-shrink-0"
                            title="Adjuntar imagen"
                        >
                            <ImageIcon className="w-5 h-5" />
                        </button>

                        <textarea
                            placeholder="Escribe un mensaje..."
                            className="flex-1 border border-gray-300 rounded-2xl px-4 py-2. 5 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none bg-gray-50 hover:bg-white transition text-sm sm:text-base"
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            onKeyDown={handleKeyDown}
                            rows={1}
                            style={{
                                minHeight: '44px',
                                maxHeight: '120px',
                                overflowY: text.split('\n').length > 3 ? 'auto' : 'hidden',
                            }}
                        />

                        <button
                            type="submit"
                            disabled={!text.trim() && !selectedImage}
                            className="p-3 bg-green-600 hover:bg-green-700 text-white rounded-full transition-all disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 shadow-md hover:shadow-lg active:scale-95"
                            title="Enviar"
                        >
                            <Send className="w-5 h-5" />
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ChatWindow;