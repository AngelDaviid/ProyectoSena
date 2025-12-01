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

    // Cuando cambia conversación
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

    // Auto-scroll si estabas cerca del bottom
    useEffect(() => {
        const container = containerRef.current;
        if (! container) return;

        if (wasNearBottomRef.current) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages. length]);

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

    // Limpiar preview cuando se desmonta
    useEffect(() => {
        return () => {
            if (imagePreview) {
                URL.revokeObjectURL(imagePreview);
            }
        };
    }, [imagePreview]);

    const handleImageSelect = (e: React. ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (! file) return;

        // Validar tipo de archivo
        if (!file.type.startsWith('image/')) {
            alert('Por favor selecciona un archivo de imagen válido');
            return;
        }

        // Validar tamaño (máx 5MB)
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
            URL.revokeObjectURL(imagePreview);
        }
        setSelectedImage(null);
        setImagePreview(null);
        if (fileInputRef.current) {
            fileInputRef.current. value = '';
        }
    };

    const handleSubmit = (e?: React.FormEvent) => {
        if (e) e.preventDefault();

        const hasText = text.trim(). length > 0;
        const hasImage = selectedImage !== null;

        if (! hasText && !hasImage) return;

        // Enviar mensaje con texto e imagen (si existe)
        onSend(text. trim(), selectedImage || undefined);

        // Limpiar
        setText('');
        handleRemoveImage();

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

    // ✅ FUNCIÓN para obtener URL de imagen correctamente
    const getImageUrl = (imageUrl: any): string | null => {
        if (!imageUrl) return null;

        // Si es un string
        if (typeof imageUrl === 'string') {
            // Si es un blob (imagen optimista local)
            if (imageUrl. startsWith('blob:')) {
                return imageUrl;
            }
            // Si es una ruta absoluta del servidor
            if (imageUrl. startsWith('/')) {
                return `${import.meta.env. VITE_SENA_API_URL || 'http://localhost:3001'}${imageUrl}`;
            }
            // Si es una URL completa
            if (imageUrl. startsWith('http')) {
                return imageUrl;
            }
            // Si es una ruta relativa
            return `${import. meta.env.VITE_SENA_API_URL || 'http://localhost:3001'}/${imageUrl}`;
        }

        // Si no es string, retornar null
        return null;
    };

    const participantName =
        activeConversation?.participants
            ?.filter((p) => p.id !== currentUserId)
            .map((p) => `${p.profile?. name || ''} ${p.profile?.lastName || ''}`. trim() || p.email)
            .join(', ') || 'Chat';

    return (
        <div className="flex flex-col h-full relative bg-gradient-to-b from-green-50 to-white">
            {/* Header verde SENA */}
            <div className="px-6 py-4 bg-gradient-to-r from-green-600 to-emerald-600 shadow-md">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        {/* Avatar */}
                        <div className="w-11 h-11 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white font-bold text-lg border-2 border-white/30">
                            {participantName[0]?.toUpperCase() || 'C'}
                        </div>
                        <div>
                            <h2 className="font-bold text-white text-lg">{participantName}</h2>
                            <p className="text-xs text-green-100">
                                {typingUsers.length > 0 ?  (
                                    <span className="font-medium animate-pulse flex items-center gap-1">
                                        <span className="inline-block w-1. 5 h-1.5 bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                                        <span className="inline-block w-1. 5 h-1.5 bg-white rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                                        <span className="inline-block w-1.5 h-1.5 bg-white rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                                        Escribiendo
                                    </span>
                                ) : (
                                    'En línea'
                                )}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Messages */}
            <div
                ref={containerRef}
                className="flex-1 overflow-y-auto px-6 py-4"
                style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%2339B54A' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                }}
            >
                {messages. map((m, i) => {
                    const mine = String(m.senderId) === String(currentUserId);
                    const showAvatar = i === messages.length - 1 || messages[i + 1]?.senderId !== m.senderId;
                    const showTimestamp = i === messages.length - 1 ||
                        (new Date(messages[i + 1]?.createdAt || 0).getTime() - new Date(m.createdAt || 0).getTime()) > 60000;

                    // ✅ Obtener URL de imagen correctamente
                    const imageUrl = getImageUrl(m.imageUrl);

                    return (
                        <div
                            key={m.id ??  m.tempId ??  i}
                            className={`flex mb-3 ${mine ? 'justify-end' : 'justify-start'} animate-fade-in-up`}
                        >
                            <div className={`flex gap-2 max-w-[75%] ${mine ? 'flex-row-reverse' : 'flex-row'}`}>
                                {/* Avatar */}
                                {! mine && showAvatar && (
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 border-2 border-green-200">
                                        {participantName[0]?.toUpperCase() || 'U'}
                                    </div>
                                )}
                                {! mine && !showAvatar && <div className="w-8" />}

                                {/* Message bubble */}
                                <div className="flex flex-col">
                                    <div
                                        className={`rounded-2xl px-4 py-2. 5 shadow-md transition-all hover:shadow-lg ${
                                            mine
                                                ? 'bg-gradient-to-br from-green-600 to-emerald-600 text-white rounded-br-sm'
                                                : 'bg-white border border-green-100 text-gray-800 rounded-bl-sm'
                                        }`}
                                    >
                                        {/* ✅ Mostrar imagen si existe */}
                                        {imageUrl && (
                                            <div className={`${m.text ?  'mb-2' : ''}`}>
                                                <img
                                                    src={imageUrl}
                                                    alt="Imagen del mensaje"
                                                    className="rounded-lg object-contain max-h-64 w-full border-2 border-white/20"
                                                    onError={(e) => {
                                                        console.error('[ChatWindow] Error loading image:', imageUrl);
                                                        const target = e.target as HTMLImageElement;
                                                        target.style.display = 'none';
                                                    }}
                                                />
                                            </div>
                                        )}
                                        {/* Texto del mensaje */}
                                        {m.text && <div className="break-words leading-relaxed">{m.text}</div>}
                                    </div>

                                    {/* Timestamp */}
                                    {showTimestamp && (
                                        <div
                                            className={`text-[10px] text-gray-500 mt-1 px-2 font-medium ${
                                                mine ?  'text-right' : 'text-left'
                                            }`}
                                        >
                                            {m.sending ? (
                                                <span className="text-green-600 animate-pulse flex items-center gap-1 justify-end">
                                                    <span className="inline-block w-1 h-1 bg-green-600 rounded-full animate-bounce"></span>
                                                    Enviando
                                                </span>
                                            ) : (
                                                formatDate(m.createdAt)
                                            )}
                                            {mine && m.seenBy && m.seenBy.length > 0 && (
                                                <span className="ml-1 text-green-600 font-bold">✓✓</span>
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

            {/* Scroll to bottom button - Verde SENA */}
            {showScrollButton && (
                <button
                    onClick={scrollToBottom}
                    className="absolute bottom-24 right-6 bg-gradient-to-br from-green-600 to-emerald-600 text-white p-3 rounded-full shadow-xl hover:shadow-2xl hover:scale-110 transition-all z-10 border-2 border-green-400"
                    title="Ir al final"
                >
                    <ArrowDown className="w-5 h-5" />
                </button>
            )}

            {/* Input - Verde SENA */}
            <form
                onSubmit={(e) => handleSubmit(e)}
                className="px-6 py-4 bg-white border-t-2 border-green-100 shadow-lg"
            >
                {/* Image Preview */}
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
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition shadow-lg"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                )}

                <div className="flex items-end gap-3">
                    {/* Hidden file input */}
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleImageSelect}
                        className="hidden"
                    />

                    {/* Image button */}
                    <button
                        type="button"
                        onClick={() => fileInputRef. current?.click()}
                        className="p-2. 5 hover:bg-green-50 text-green-700 rounded-full transition flex-shrink-0 border border-transparent hover:border-green-200"
                        title="Adjuntar imagen"
                    >
                        <ImageIcon className="w-5 h-5" />
                    </button>

                    {/* Text input */}
                    <textarea
                        placeholder="Escribe un mensaje..."
                        className="flex-1 border-2 border-green-200 rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 resize-none max-h-32 transition bg-green-50/30 hover:bg-green-50/50"
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

                    {/* Send button - Verde SENA */}
                    <button
                        type="submit"
                        disabled={! text.trim() && !selectedImage}
                        className="p-3 bg-gradient-to-br from-green-600 to-emerald-600 text-white rounded-full hover:from-green-700 hover:to-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:grayscale flex-shrink-0 shadow-lg hover:shadow-xl hover:scale-105 active:scale-95"
                        title="Enviar mensaje"
                    >
                        <Send className="w-5 h-5" />
                    </button>
                </div>
            </form>
        </div>
    );
};

export default ChatWindow;