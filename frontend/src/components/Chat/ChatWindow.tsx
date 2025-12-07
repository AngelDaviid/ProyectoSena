import React, { useEffect, useRef, useState } from 'react';
import { Send, Image as ImageIcon, X, ChevronDown } from 'lucide-react';
import type { Conversation, Message } from '../../types/chat';

interface Props {
    activeConversation: Conversation | null;
    messages: Message[];
    currentUserId: number;
    onSend: (text: string, image?: File | string) => void;
    onLoadMore?: () => void;
    typingUsers?: number[];
}

const API_BASE = import.meta.env.VITE_SENA_API_URL || 'http://localhost:3001';

function isNearBottom(el: HTMLDivElement | null): boolean {
    if (! el) return true;
    const threshold = 150;
    return el.scrollHeight - el.scrollTop - el. clientHeight < threshold;
}

function getImageUrl(imageUrl: string | null | undefined): string | null {
    if (!imageUrl) return null;
    if (imageUrl.startsWith('blob:')) return imageUrl;
    if (imageUrl.startsWith('http')) return imageUrl;
    return `${API_BASE}${imageUrl}`;
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
    const [toast, setToast] = useState<{ message: string; type: 'error' | 'success' } | null>(null);

    const messagesEndRef = useRef<HTMLDivElement | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const loadingMoreRef = useRef(false);
    const wasNearBottomRef = useRef(true);

    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [toast]);

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
    }, [activeConversation?.id]);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        if (wasNearBottomRef.current) {
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
                URL. revokeObjectURL(imagePreview);
            }
        };
    }, [imagePreview]);

    const showToast = (message: string, type: 'error' | 'success' = 'error') => {
        setToast({ message, type });
    };

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (! file) return;

        if (! file.type.startsWith('image/')) {
            showToast('Por favor selecciona un archivo de imagen válido', 'error');
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            showToast('La imagen no debe superar los 5MB', 'error');
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
            fileInputRef.current.value = '';
        }
    };

    const handleSubmit = (e?: React.FormEvent) => {
        if (e) e.preventDefault();

        const hasText = text.trim().length > 0;
        const hasImage = selectedImage !== null;

        if (!hasText && !hasImage) return;

        onSend(text.trim(), selectedImage || undefined);

        setText('');
        handleRemoveImage();

        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 50);
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleScroll = () => {
        const el = containerRef.current;
        if (!el || loadingMoreRef.current) return;

        if (el.scrollTop < 100 && onLoadMore) {
            loadingMoreRef.current = true;
            const prevHeight = el.scrollHeight;
            onLoadMore();

            setTimeout(() => {
                if (el) {
                    const newHeight = el.scrollHeight;
                    el.scrollTop = newHeight - prevHeight;
                }
                loadingMoreRef.current = false;
            }, 300);
        }
    };

    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        el.addEventListener('scroll', handleScroll);
        return () => el.removeEventListener('scroll', handleScroll);
    }, [onLoadMore]);

    if (!activeConversation) {
        return (
            <div className="flex flex-col items-center justify-center h-full bg-gradient-to-br from-green-50 to-emerald-50 p-4 sm:p-6">
                <div className="text-center max-w-md">
                    <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-4 sm:mb-6 bg-gradient-to-br from-green-600 to-emerald-600 rounded-full flex items-center justify-center shadow-xl">
                        <Send className="w-10 h-10 sm:w-12 sm:h-12 text-white" />
                    </div>
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2 sm:mb-3">
                        Selecciona una conversación
                    </h2>
                    <p className="text-sm sm:text-base text-gray-600">
                        Elige un contacto de la lista para comenzar a chatear
                    </p>
                </div>
            </div>
        );
    }

    const participantName =
        activeConversation?. participants
            ?.filter((p) => p.id !== currentUserId)
            .map((p) => `${p.profile?.name || ''} ${p.profile?.lastName || ''}`.trim() || p.email)
            .join(', ') || 'Chat';

    // Obtener el participante (sin el usuario actual)
    const otherParticipant = activeConversation?.participants?.find(p => p.id !== currentUserId);

    // Obtener avatar para el header
    const headerAvatarUrl = otherParticipant?.profile?.avatar
        ? (otherParticipant.profile.avatar.startsWith('/')
            ? `${API_BASE}${otherParticipant.profile.avatar}`
            : otherParticipant.profile.avatar)
        : null;

    // Función para obtener el avatar de cualquier participante por ID
    const getSenderAvatar = (senderId: number): string | null => {
        const participant = activeConversation?.participants?.find(p => p.id === senderId);

        if (!participant?.profile?.avatar) {
            return null;
        }

        return participant.profile. avatar.startsWith('/')
            ? `${API_BASE}${participant.profile.avatar}`
            : participant.profile.avatar;
    };

    // Función para obtener el nombre del remitente para las iniciales
    const getSenderName = (senderId: number): string => {
        const participant = activeConversation?.participants?. find(p => p.id === senderId);

        if (!participant) return 'U';

        const fullName = `${participant.profile?.name || ''} ${participant.profile?.lastName || ''}`.trim();
        return fullName || participant.email || 'Usuario';
    };

    return (
        <div className="flex flex-col h-full bg-white relative">
            {/* Toast Notification */}
            {toast && (
                <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50 animate-slide-down">
                    <div className={`
                        px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 min-w-[250px]
                        ${toast. type === 'error'
                        ? 'bg-red-500 text-white'
                        : 'bg-green-500 text-white'
                    }
                    `}>
                        <span className="text-sm font-medium">{toast.message}</span>
                        <button
                            onClick={() => setToast(null)}
                            className="ml-2 hover:opacity-75"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}

            {/* Header - Altura fija */}
            <div className="flex-shrink-0 px-3 py-3 sm:px-4 sm:py-4 md:px-6 bg-gradient-to-r from-green-600 to-emerald-600 shadow-md">
                <div className="flex items-center gap-2 sm:gap-3">
                    {/* Avatar condicional: imagen si existe, iniciales si no */}
                    {headerAvatarUrl ?  (
                        <img
                            src={headerAvatarUrl}
                            alt={participantName}
                            className="w-10 h-10 sm:w-11 sm:h-11 rounded-full object-cover border-2 border-white/40 shadow-lg flex-shrink-0"
                            onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style. display = 'none';

                                // Crear elemento fallback con iniciales
                                const fallback = document.createElement('div');
                                fallback.className = 'w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white font-bold text-base sm:text-lg border-2 border-white/40 shadow-lg flex-shrink-0';
                                fallback.textContent = participantName[0]?.toUpperCase() || 'C';

                                // Insertar el fallback
                                const parent = target.parentNode;
                                if (parent) {
                                    parent.insertBefore(fallback, target as Node);
                                }
                            }}
                        />
                    ) : (
                        <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white font-bold text-base sm:text-lg border-2 border-white/40 shadow-lg flex-shrink-0">
                            {participantName[0]?.toUpperCase() || 'C'}
                        </div>
                    )}

                    <div className="flex-1 min-w-0">
                        <h2 className="font-bold text-white text-sm sm:text-base md:text-lg truncate">
                            {participantName}
                        </h2>
                        <p className="text-[10px] sm:text-xs text-green-100 flex items-center gap-1">
                            {typingUsers.length > 0 ?  (
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
                    const senderAvatar = !mine ?  getSenderAvatar(m.senderId!) : null;
                    const senderName = !mine ? getSenderName(m.senderId!) : '';

                    return (
                        <div
                            key={m.id ??  m.tempId ??  i}
                            className={`flex mb-3 sm:mb-4 ${mine ?  'justify-end' : 'justify-start'}`}
                        >
                            <div className={`flex gap-2 items-start max-w-[85%] sm:max-w-[75%] md:max-w-[70%] ${mine ? 'flex-row-reverse' : 'flex-row'}`}>
                                {/* Avatar del remitente (solo mensajes de otros) */}
                                {!mine && showAvatar && (
                                    <>
                                        {senderAvatar ? (
                                            <img
                                                src={senderAvatar}
                                                alt="Avatar"
                                                className="w-8 h-8 sm:w-9 sm:h-9 rounded-full object-cover ring-2 ring-green-500/20 flex-shrink-0"
                                                onError={(e) => {
                                                    const target = e.target as HTMLImageElement;
                                                    target.style.display = 'none';

                                                    // Crear elemento fallback con iniciales
                                                    const fallback = document.createElement('div');
                                                    fallback.className = 'w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-green-500 text-white flex items-center justify-center font-bold text-sm ring-2 ring-green-500/20 flex-shrink-0';
                                                    fallback.textContent = senderName[0]?.toUpperCase() || 'U';

                                                    const parent = target.parentNode;
                                                    if (parent) {
                                                        parent. insertBefore(fallback, target as Node);
                                                    }
                                                }}
                                            />
                                        ) : (
                                            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-green-500 text-white flex items-center justify-center font-bold text-sm ring-2 ring-green-500/20 flex-shrink-0">
                                                {senderName[0]?.toUpperCase() || 'U'}
                                            </div>
                                        )}
                                    </>
                                )}

                                {/* Espacio vacío cuando no se muestra avatar pero es necesario para alineación */}
                                {! mine && !showAvatar && (
                                    <div className="w-8 h-8 sm:w-9 sm:h-9 flex-shrink-0" />
                                )}

                                <div className={`flex flex-col ${mine ? 'items-end' : 'items-start'}`}>
                                    {/* Burbuja del mensaje */}
                                    <div
                                        className={`
                                            relative px-3 py-2 sm:px-4 sm:py-2.5 rounded-2xl shadow-sm
                                            ${mine
                                            ? 'bg-gradient-to-br from-green-600 to-emerald-600 text-white rounded-br-md'
                                            : 'bg-white border border-gray-200 text-gray-800 rounded-bl-md'
                                        }
                                        `}
                                    >
                                        {imageUrl && (
                                            <img
                                                src={imageUrl}
                                                alt="Imagen del mensaje"
                                                className="rounded-lg max-w-full max-h-64 sm:max-h-80 mb-2 object-contain"
                                            />
                                        )}
                                        {m.text && (
                                            <p className="text-sm sm:text-base break-words whitespace-pre-wrap">
                                                {m.text}
                                            </p>
                                        )}
                                        {m.sending && (
                                            <span className="text-[10px] sm:text-xs opacity-70 ml-2">
                                                Enviando...
                                            </span>
                                        )}
                                    </div>

                                    {/* Timestamp */}
                                    {showTimestamp && m.createdAt && (
                                        <span className="text-[10px] sm:text-xs text-gray-400 mt-1 px-1">
                                            {new Date(m.createdAt).toLocaleTimeString('es-ES', {
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            {/* Botón de scroll hacia abajo */}
            {showScrollButton && (
                <button
                    onClick={scrollToBottom}
                    className="absolute bottom-24 sm:bottom-28 right-4 sm:right-6 bg-green-600 text-white p-2 sm:p-3 rounded-full shadow-lg hover:bg-green-700 transition-all z-10"
                    aria-label="Ir al final"
                >
                    <ChevronDown className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
            )}

            {/* Preview de imagen seleccionada */}
            {imagePreview && (
                <div className="flex-shrink-0 px-3 py-2 sm:px-4 sm:py-3 md:px-6 bg-gray-50 border-t">
                    <div className="relative inline-block">
                        <img
                            src={imagePreview}
                            alt="Preview"
                            className="max-h-24 sm:max-h-32 rounded-lg border border-gray-300"
                        />
                        <button
                            onClick={handleRemoveImage}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                            aria-label="Eliminar imagen"
                        >
                            <X className="w-3 h-3 sm:w-4 sm:h-4" />
                        </button>
                    </div>
                </div>
            )}

            {/* Input - Altura fija */}
            <div className="flex-shrink-0 px-3 py-3 sm:px-4 sm:py-4 md:px-6 bg-white border-t border-gray-200">
                <form onSubmit={handleSubmit} className="flex items-end gap-2">
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleImageSelect}
                        accept="image/*"
                        className="hidden"
                    />
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex-shrink-0 p-2 sm:p-2.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                        aria-label="Adjuntar imagen"
                    >
                        <ImageIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                    </button>

                    <textarea
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSubmit();
                            }
                        }}
                        placeholder="Escribe un mensaje..."
                        className="flex-1 px-3 py-2 sm:px-4 sm:py-2.5 text-sm sm:text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 resize-none max-h-32 min-h-[40px]"
                        rows={1}
                        style={{
                            height: 'auto',
                            overflowY: text.split('\n').length > 3 ? 'auto' : 'hidden'
                        }}
                        onInput={(e) => {
                            const target = e.target as HTMLTextAreaElement;
                            target.style.height = 'auto';
                            target.style.height = `${Math.min(target.scrollHeight, 128)}px`;
                        }}
                    />

                    <button
                        type="submit"
                        disabled={!text.trim() && !selectedImage}
                        className="flex-shrink-0 p-2 sm:p-2.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg"
                        aria-label="Enviar mensaje"
                    >
                        <Send className="w-5 h-5 sm:w-6 sm:h-6" />
                    </button>
                </form>
            </div>

            <style>{`
                @keyframes slide-down {
                    from {
                        transform: translate(-50%, -100%);
                        opacity: 0;
                    }
                    to {
                        transform: translate(-50%, 0);
                        opacity: 1;
                    }
                }
                . animate-slide-down {
                    animation: slide-down 0.3s ease-out;
                }
            `}</style>
        </div>
    );
};

export default ChatWindow;