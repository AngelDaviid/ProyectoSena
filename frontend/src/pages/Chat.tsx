import React, {useEffect, useState, useCallback, useRef} from 'react';
import {useNavigate, useLocation} from 'react-router-dom';
import {ArrowLeft, MessageCircle, ChevronLeft} from 'lucide-react';
import {useAuth} from '../hooks/useAuth';
import {useSocketContext} from '../hooks/useSocketContext';
import {useChatNotifications} from '../context/chat-notifications-context';
import {useToast} from '../components/Toast-context';
import {getConversations, getMessages} from '../services/sockets/chat.socket';
import type {Conversation, Message} from '../types/chat';
import ChatSidebar from '../components/Chat/ChatSidebar';
import ChatWindow from '../components/Chat/ChatWindow';

type MsgWithMeta = Omit<Message, 'id'> & {
    id?: number;
    sending?: boolean;
    tempId?: string;
    seenBy?: number[];
    _inferred?: boolean;
};

const MESSAGES_LIMIT = 20;
const REPORT_SEEN_DEBOUNCE_MS = 500;

const ChatPage: React. FC = () => {
    const {user} = useAuth();
    const {socket, isConnected} = useSocketContext();
    const {setActiveConversation: setActiveConversationNotif} = useChatNotifications();
    const toast = useToast();
    const navigate = useNavigate();
    const location = useLocation();

    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
    const [messages, setMessages] = useState<MsgWithMeta[]>([]);
    const [showSidebar, setShowSidebar] = useState(true);

    const conversationsLoadedRef = useRef(false);
    const prevConversationRef = useRef<number | null>(null);
    const seenBufferRef = useRef<Set<number>>(new Set());
    const seenTimerRef = useRef<number | null>(null);
    const activeConvIdRef = useRef<number | null>(null);
    const openedFromNotificationRef = useRef(false);

    useEffect(() => {
        activeConvIdRef.current = activeConversation?.id || null;
    }, [activeConversation]);

    useEffect(() => {
        if (activeConversation?.id) {
            setActiveConversationNotif(activeConversation.id);
        }
    }, [activeConversation, setActiveConversationNotif]);

    useEffect(() => {
        return () => {
            setActiveConversationNotif(null);
            openedFromNotificationRef.current = false;
        };
    }, [setActiveConversationNotif]);

    const loadConversations = useCallback(async () => {
        if (conversationsLoadedRef.current) {
            return;
        }

        try {
            const data = await getConversations();
            setConversations(data || []);
            conversationsLoadedRef.current = true;
        } catch (err: any) {
            console.error('[Chat] Error loading conversations:', err);
            toast.error('Error al cargar conversaciones');
            setConversations([]);
        }
    }, [toast]);

    const updateConversationWithNewMessage = useCallback((conversationId: number, message: MsgWithMeta) => {
        setConversations(prev => {
            const updated = prev.map(conv => {
                if (conv.id === conversationId) {
                    const existingMessages = conv.messages || [];
                    const messageExists = existingMessages.some(m => m.id === message.id);

                    if (!messageExists && message.id) {
                        return {
                            ...conv,
                            messages: [...existingMessages, message as Message]
                        };
                    }
                }
                return conv;
            });

            return updated. sort((a, b) => {
                const aTime = a.messages?.[a.messages.length - 1]?.createdAt || '';
                const bTime = b. messages?.[b.messages.length - 1]?.createdAt || '';

                if (! aTime && !bTime) return 0;
                if (!aTime) return 1;
                if (!bTime) return -1;

                return new Date(bTime).getTime() - new Date(aTime).getTime();
            });
        });
    }, []);

    useEffect(() => {
        void loadConversations();
    }, [loadConversations]);

    useEffect(() => {
        const openConversationFromNotification = async () => {
            const state = location.state as { openConversationId?: number };

            if (! state?.openConversationId ||
                conversations.length === 0 ||
                activeConversation ||
                openedFromNotificationRef.current) {
                return;
            }

            const conversation = conversations.find(c => c.id === state.openConversationId);

            if (conversation) {
                openedFromNotificationRef.current = true;
                await openConversation(conversation);
                navigate(location.pathname, {replace: true, state: {}});
            } else {
                console.warn('[Chat] Conversation not found:', state.openConversationId);
            }
        };

        void openConversationFromNotification();
    }, [conversations, location.state, activeConversation]);

    const normalizeIncoming = useCallback((m: any): MsgWithMeta => {
        const msg: Partial<MsgWithMeta> = {... m};

        if (typeof m.id !== 'undefined' && m.id !== null) {
            const n = Number(m.id);
            if (!Number.isNaN(n)) msg.id = n;
        }

        if ((typeof m.senderId === 'undefined' || m.senderId === null) && m.sender && typeof m.sender.id !== 'undefined') {
            msg.senderId = Number(m.sender.id);
        } else if (typeof m.senderId !== 'undefined' && m.senderId !== null) {
            msg.senderId = Number(m. senderId);
        }

        if (typeof m.conversationId !== 'undefined' && m.conversationId !== null) {
            msg.conversationId = Number(m.conversationId);
        }

        msg.text = m.text || '';
        msg.imageUrl = m.imageUrl || null;
        msg.createdAt = m.createdAt ?  String(m.createdAt) : new Date().toISOString();
        msg.tempId = m.tempId || undefined;
        msg.sending = !!m.sending;
        msg.seenBy = Array.isArray(m.seenBy) ? m.seenBy.slice() : [];

        if (m._inferred) msg._inferred = true;

        return msg as MsgWithMeta;
    }, []);

    const scheduleReportSeenIfNeeded = useCallback(
        (m: MsgWithMeta | null) => {
            if (!socket || !isConnected) return;

            try {
                if (!m || typeof m.id === 'undefined' || m.id === null) return;
                if (!user?.id) return;

                const isMine = Number(m.senderId) === Number(user.id) || !!m._inferred;
                if (isMine) return;

                const activeId = activeConvIdRef.current;
                if (!activeId || Number(activeId) !== Number(m.conversationId)) return;

                seenBufferRef.current.add(Number(m.id));

                if (seenTimerRef.current) {
                    window.clearTimeout(seenTimerRef.current);
                }

                seenTimerRef.current = window.setTimeout(() => {
                    const ids = Array.from(seenBufferRef.current);
                    if (ids.length === 0) return;

                    try {
                        console.debug('[Chat] Emitting messageSeen', {
                            conversationId: activeId,
                            messageIds: ids,
                            userId: user?.id
                        });
                        socket?. emit('messageSeen', {
                            conversationId: String(activeId),
                            messageIds: ids,
                            userId: user?.id
                        });
                    } catch (e) {
                        console.warn('[Chat] Could not emit messageSeen', e);
                    } finally {
                        seenBufferRef.current.clear();
                        if (seenTimerRef.current) {
                            window.clearTimeout(seenTimerRef.current);
                            seenTimerRef.current = null;
                        }
                    }
                }, REPORT_SEEN_DEBOUNCE_MS) as unknown as number;
            } catch (err) {
                console.error('[Chat] scheduleReportSeenIfNeeded error', err);
            }
        },
        [socket, isConnected, user?.id],
    );

    useEffect(() => {
        if (!socket || !isConnected || !user) return;

        console.debug('[Chat] Socket setup, socket id:', socket.id);

        const handleNotification = (payload: any) => {
            console.debug('[Socket] notification received', payload);
        };

        const handleNewMessage = (rawMsg: any) => {
            console.debug('[Socket] newMessage received', rawMsg);
            const normalized = normalizeIncoming(rawMsg);

            if (normalized.conversationId && normalized.id) {
                updateConversationWithNewMessage(normalized.conversationId, normalized);
            }

            setMessages((prev) => {
                if (normalized.tempId) {
                    const idx = prev.findIndex((m) => String(m.tempId) === String(normalized.tempId));
                    if (idx !== -1) {
                        const copy = [...prev];
                        copy[idx] = {
                            ...copy[idx],
                            ...normalized,
                            senderId: normalized.senderId ?? copy[idx].senderId,
                            sending: false,
                        };
                        console.debug('[Chat] Replaced optimistic message with server message', copy[idx]);
                        scheduleReportSeenIfNeeded(copy[idx]);
                        return copy;
                    }
                }

                if (typeof normalized.id !== 'undefined' && normalized.id !== null) {
                    const exists = prev.some((m) => m.id === normalized.id);
                    if (exists) {
                        console.debug('[Chat] ⚠️ Message already exists, skipping duplicate', normalized.id);
                        scheduleReportSeenIfNeeded(normalized);
                        return prev;
                    }
                }

                if (typeof normalized.conversationId !== 'undefined' && activeConversation && normalized.conversationId !== activeConversation.id) {
                    console.debug('[Socket] newMessage for different conversation', normalized.conversationId);
                    scheduleReportSeenIfNeeded(normalized);
                    return prev;
                }

                const recentDuplicate = prev.find((m) =>
                    m.senderId === normalized.senderId &&
                    m.text === normalized.text &&
                    m.imageUrl === normalized.imageUrl &&
                    Math.abs(new Date(m.createdAt || 0).getTime() - new Date(normalized.createdAt || 0).getTime()) < 5000
                );

                if (recentDuplicate) {
                    console.debug('[Chat] ⚠️ Recent duplicate detected, skipping');
                    return prev;
                }

                console.debug('[Chat] Adding new message to state', normalized);
                scheduleReportSeenIfNeeded(normalized);
                return [...prev, normalized];
            });
        };

        const handleMessageSeen = (payload: {
            conversationId: string | number;
            messageIds: number[];
            userId: number
        }) => {
            console. debug('[Socket] messageSeen received', payload);
            setMessages((prev) =>
                prev.map((m) => {
                    if (m.id && payload.messageIds.includes(m.id)) {
                        const seenSet = new Set<number>(m.seenBy || []);
                        seenSet.add(payload.userId);
                        return {... m, seenBy: Array.from(seenSet)};
                    }
                    return m;
                }),
            );
        };

        socket.on('notification', handleNotification);
        socket.on('newMessage', handleNewMessage);
        socket.on('messageSeen', handleMessageSeen);

        return () => {
            console.debug('[Chat] Cleaning up socket listeners');
            socket.off('notification', handleNotification);
            socket.off('newMessage', handleNewMessage);
            socket.off('messageSeen', handleMessageSeen);

            if (seenTimerRef.current) {
                window.clearTimeout(seenTimerRef.current);
                seenTimerRef.current = null;
            }
            seenBufferRef.current.clear();
        };
    }, [socket, isConnected, user, normalizeIncoming, scheduleReportSeenIfNeeded, activeConversation, updateConversationWithNewMessage]);

    const openConversation = useCallback(async (conv: Conversation) => {
        if (!socket) {
            console.warn('[Chat] Cannot open conversation: socket not available');
            toast.warning('No hay conexión disponible');
            return;
        }

        try {

            setActiveConversationNotif(conv.id);

            if (prevConversationRef.current) {
                console.log('[Chat] Leaving previous conversation:', prevConversationRef.current);
                socket.emit('leaveConversation', { conversationId: String(prevConversationRef.current) });
            }

            setActiveConversation(conv);
            setShowSidebar(false);
            prevConversationRef.current = conv.id;
            activeConvIdRef.current = conv.id;

            const raw = await getMessages(conv.id, 1, MESSAGES_LIMIT);
            const msgs = Array.isArray(raw) ? raw : raw. messages || [];

            msgs.sort((a: any, b: any) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime());

            const normalized = msgs.map((m: any) => {
                const nm = normalizeIncoming(m);
                nm.conversationId = Number(conv.id);
                nm.seenBy = nm.seenBy || [];
                return nm;
            }) as MsgWithMeta[];

            setMessages(normalized);

            socket.emit('joinConversation', { conversationId: String(conv.id) });

            const unseenIds = normalized
                .filter((m) => Number(m.senderId) !== Number(user?.id))
                .map((m) => m.id)
                .filter((id): id is number => typeof id === 'number');

            if (unseenIds.length > 0) {
                console.debug('[Chat] Emitting messageSeen for loaded messages', {
                    conversationId: conv.id,
                    messageIds: unseenIds,
                    userId: user?.id
                });
                socket. emit('messageSeen', {
                    conversationId: String(conv.id),
                    messageIds: unseenIds,
                    userId: user?.id
                });
            }
        } catch (err) {
            console.error('[Chat] Error opening conversation', err);
            toast.error('Error al abrir la conversación');
        }
    }, [socket, user?.id, normalizeIncoming, setActiveConversationNotif, toast]);

    const handleSend = useCallback(async (text: string, image?: string | File) => {
        if (!activeConversation || !user || !socket) {
            console.warn('[Chat] Cannot send message: missing activeConversation, user, or socket');
            toast.warning('No se puede enviar el mensaje en este momento');
            return;
        }

        const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

        if (image instanceof File) {
            const localPreview = URL.createObjectURL(image);

            const tempMessage: MsgWithMeta = {
                id: Date.now(),
                text,
                imageUrl: localPreview,
                createdAt: new Date().toISOString(),
                senderId: Number(user.id),
                conversationId: activeConversation.id,
                sending: true,
                tempId,
                seenBy: [],
            };

            setMessages((prev) => [...prev, tempMessage]);
            updateConversationWithNewMessage(activeConversation.id, tempMessage);

            try {
                const formData = new FormData();
                formData.append('conversationId', String(activeConversation.id));
                formData.append('text', text || '');
                formData.append('image', image);
                formData.append('tempId', tempId);


                const token = localStorage.getItem('access_token');

                if (!token) {
                    throw new Error('No authentication token found');
                }

                const response = await fetch(`${import.meta.env.VITE_SENA_API_URL || 'http://localhost:3001'}/chat/messages`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                    },
                    body: formData,
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    console.error('[Chat] Upload failed:', response.status, errorData);
                    throw new Error(errorData.message || 'Failed to upload image');
                }

                URL.revokeObjectURL(localPreview);
                toast.success('Imagen enviada');

            } catch (error) {
                console.error('[Chat] Error uploading image:', error);

                setMessages((prev) =>
                    prev.map((m) =>
                        m.tempId === tempId
                            ?  { ...m, sending: false }
                            : m
                    )
                );

                URL.revokeObjectURL(localPreview);
                toast.error(`Error al subir la imagen: ${error instanceof Error ? error.message : 'Error desconocido'}`);
            }

            return;
        }

        const tempMessage: MsgWithMeta = {
            id: Date.now(),
            text,
            imageUrl: null,
            createdAt: new Date().toISOString(),
            senderId: Number(user.id),
            conversationId: activeConversation.id,
            sending: true,
            tempId,
            seenBy: [],
        };

        setMessages((prev) => [...prev, tempMessage]);
        updateConversationWithNewMessage(activeConversation.id, tempMessage);

        socket.emit('sendMessage', {
            conversationId: String(activeConversation.id),
            senderId: String(user.id),
            text,
            imageUrl: null,
            tempId,
        });
    }, [activeConversation, user, socket, updateConversationWithNewMessage, toast]);

    const handleLoadMore = useCallback(async (): Promise<number> => {
        if (!activeConversation) {
            console.warn('[Chat] Cannot load more: no active conversation');
            return 0;
        }

        try {
            const raw = await getMessages(activeConversation. id);
            const all: Message[] = Array.isArray(raw) ? raw : raw.messages || [];

            const normalized = all.map((m: any) => {
                const nm = normalizeIncoming(m);
                nm.conversationId = activeConversation.id;
                nm.seenBy = nm.seenBy || [];
                return nm;
            }) as MsgWithMeta[];

            normalized.sort((a, b) => +new Date(a.createdAt ??  0) - +new Date(b.createdAt ?? 0));

            const earliest = messages[0];
            if (! earliest) {
                setMessages(normalized);
                return normalized.length;
            }

            const older = normalized.filter((m) => new Date(m.createdAt || 0).getTime() < new Date(earliest.createdAt || 0).getTime());
            if (older.length === 0) {
                return 0;
            }

            setMessages((prev) => [...older, ...prev]);
            return older.length;
        } catch (err) {
            console.error('[Chat] Error loading more messages', err);
            toast.error('Error al cargar más mensajes');
            return 0;
        }
    }, [activeConversation, messages, normalizeIncoming, toast]);

    const handleCloseConversation = useCallback(() => {
        console.log('[Chat] Closing active conversation');
        setShowSidebar(true);
        setActiveConversation(null);
        setActiveConversationNotif(null);
    }, [setActiveConversationNotif]);

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="bg-gradient-to-r from-green-600 to-emerald-600 shadow-lg">
                <div className="max-w-7xl mx-auto px-4 py-3 sm:py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 sm:gap-4">
                            <button
                                onClick={() => {

                                    if (activeConversation) {
                                        setActiveConversationNotif(null);
                                        setActiveConversation(null);
                                    }

                                    setMessages([]);
                                    openedFromNotificationRef.current = false;
                                    navigate('/', {replace: true, state: {}});
                                }}
                                className="flex items-center gap-1 sm:gap-2 bg-white/20 hover:bg-white/30 text-white px-2 sm:px-4 py-2 rounded-lg transition-all backdrop-blur-sm"
                            >
                                <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5"/>
                                <span className="hidden sm:inline font-medium">Volver</span>
                            </button>
                            <div className="flex items-center gap-2 sm:gap-3">
                                <div
                                    className="w-8 h-8 sm:w-10 sm:h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                                    <MessageCircle className="w-4 h-4 sm:w-6 sm:h-6 text-white"/>
                                </div>
                                <div>
                                    <h1 className="text-lg sm:text-2xl font-bold text-white">Mensajes</h1>
                                    <p className="text-xs sm:text-sm text-green-50">
                                        {isConnected ? '● Conectado' : '○ Desconectado'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto p-2 sm:p-4">
                <div
                    className="grid grid-cols-1 md:grid-cols-[320px_1fr] lg:grid-cols-[380px_1fr] gap-2 sm:gap-4 h-[calc(100vh-120px)] sm:h-[calc(100vh-140px)]">
                    <div
                        className={`${showSidebar ? 'block' : 'hidden md:block'} bg-white rounded-lg sm:rounded-xl shadow-md border-2 border-green-100 overflow-hidden min-h-0`}>
                        <ChatSidebar
                            conversations={conversations}
                            currentUserId={user?.id}
                            activeConversationId={activeConversation?.id || null}
                            onSelect={openConversation}
                        />
                    </div>

                    <div
                        className={`${!showSidebar || activeConversation ? 'block' : 'hidden md:block'} bg-white rounded-lg sm:rounded-xl shadow-md border-2 border-green-100 overflow-hidden flex flex-col min-h-0`}>
                        {activeConversation ?  (
                            <>
                                <button
                                    onClick={handleCloseConversation}
                                    className="md:hidden flex items-center gap-2 p-3 bg-green-50 border-b border-green-100"
                                >
                                    <ChevronLeft className="w-5 h-5 text-green-600"/>
                                    <span className="text-sm font-medium text-green-700">Conversaciones</span>
                                </button>

                                <ChatWindow
                                    activeConversation={activeConversation}
                                    messages={messages}
                                    onSend={handleSend}
                                    currentUserId={user?.id || null}
                                    onLoadMore={handleLoadMore}
                                />
                            </>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full flex-1 text-gray-400 p-4">
                                <MessageCircle className="w-16 h-16 sm:w-20 sm:h-20 mb-4 text-green-200"/>
                                <p className="text-lg sm:text-xl font-medium text-gray-500 text-center">Selecciona una
                                    conversación</p>
                                <p className="text-xs sm:text-sm text-gray-400 mt-2 text-center">Elige un contacto para
                                    comenzar a chatear</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ChatPage;