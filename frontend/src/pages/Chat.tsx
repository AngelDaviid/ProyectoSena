import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, MessageCircle, ChevronLeft } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useSocketContext } from '../hooks/useSocketContext';
import { getConversations, getMessages } from '../services/sockets/chat.socket';
import type { Conversation, Message } from '../types/chat';
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

const ChatPage: React.FC = () => {
    const { user } = useAuth();
    const { socket, isConnected } = useSocketContext();
    const navigate = useNavigate();

    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
    const [messages, setMessages] = useState<MsgWithMeta[]>([]);
    const [showSidebar, setShowSidebar] = useState(true); // Mobile sidebar toggle

    const conversationsLoadedRef = useRef(false);
    const prevConversationRef = useRef<number | null>(null);
    const seenBufferRef = useRef<Set<number>>(new Set());
    const seenTimerRef = useRef<number | null>(null);
    const activeConvIdRef = useRef<number | null>(null);

    useEffect(() => {
        activeConvIdRef.current = activeConversation?.id || null;
    }, [activeConversation]);

    const loadConversations = useCallback(async () => {
        if (conversationsLoadedRef.current) {
            console.log('[Chat] Conversations already loaded, skipping');
            return;
        }

        try {
            console.log('[Chat] Loading conversations.. .');
            const data = await getConversations();
            console.log('[Chat] Conversations loaded successfully:', data?. length || 0);
            setConversations(data || []);
            conversationsLoadedRef. current = true;
        } catch (err: any) {
            console.error('[Chat] Error loading conversations:', err);
            setConversations([]);
        }
    }, []);

    useEffect(() => {
        void loadConversations();
    }, [loadConversations]);

    const normalizeIncoming = useCallback((m: any): MsgWithMeta => {
        const msg: Partial<MsgWithMeta> = { ...m };

        if (typeof m.id !== 'undefined' && m.id !== null) {
            const n = Number(m.id);
            if (!Number.isNaN(n)) msg.id = n;
        }

        if ((typeof m.senderId === 'undefined' || m.senderId === null) && m.sender && typeof m.sender. id !== 'undefined') {
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
        msg.seenBy = Array.isArray(m.seenBy) ? m.seenBy. slice() : [];

        if (m._inferred) msg._inferred = true;

        return msg as MsgWithMeta;
    }, []);

    const scheduleReportSeenIfNeeded = useCallback(
        (m: MsgWithMeta | null) => {
            if (! socket || !isConnected) return;

            try {
                if (! m || typeof m.id === 'undefined' || m.id === null) return;
                if (! user?.id) return;

                const isMine = Number(m.senderId) === Number(user.id) || !!m._inferred;
                if (isMine) return;

                const activeId = activeConvIdRef.current;
                if (!activeId || Number(activeId) !== Number(m.conversationId)) return;

                seenBufferRef.current.add(Number(m.id));

                if (seenTimerRef.current) {
                    window.clearTimeout(seenTimerRef.current);
                }

                seenTimerRef.current = window. setTimeout(() => {
                    const ids = Array.from(seenBufferRef.current);
                    if (ids.length === 0) return;

                    try {
                        console.debug('[Chat] Emitting messageSeen', {
                            conversationId: activeId,
                            messageIds: ids,
                            userId: user?. id
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
                            window.clearTimeout(seenTimerRef. current);
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
        if (! socket || !isConnected || !user) return;

        console.debug('[Chat] Socket setup, socket id:', socket.id);

        const handleNotification = (payload: any) => {
            console.debug('[Socket] notification received', payload);
        };

        const handleNewMessage = (rawMsg: any) => {
            console.debug('[Socket] newMessage received', rawMsg);
            const normalized = normalizeIncoming(rawMsg);

            setMessages((prev) => {
                if (normalized.tempId) {
                    const idx = prev.findIndex((m) => String(m.tempId) === String(normalized.tempId));
                    if (idx !== -1) {
                        const copy = [...prev];
                        copy[idx] = {
                            ...copy[idx],
                            ...normalized,
                            senderId: normalized.senderId ??  copy[idx].senderId,
                            sending: false,
                        };
                        console.debug('[Chat] Replaced optimistic message with server message', copy[idx]);
                        scheduleReportSeenIfNeeded(copy[idx]);
                        return copy;
                    }
                }

                if (typeof normalized.id !== 'undefined' && prev.some((m) => m.id === normalized.id)) {
                    console.debug('[Chat] Message already exists, skipping duplicate', normalized.id);
                    scheduleReportSeenIfNeeded(normalized);
                    return prev;
                }

                if (typeof normalized.conversationId !== 'undefined' && activeConversation && normalized.conversationId !== activeConversation.id) {
                    console.debug('[Socket] newMessage for different conversation', normalized.conversationId);
                    scheduleReportSeenIfNeeded(normalized);
                    return prev;
                }

                console.debug('[Chat] Adding new message to state', normalized);
                scheduleReportSeenIfNeeded(normalized);
                return [...prev, normalized];
            });
        };

        const handleMessageSeen = (payload: { conversationId: string | number; messageIds: number[]; userId: number }) => {
            console.debug('[Socket] messageSeen received', payload);
            setMessages((prev) =>
                prev.map((m) => {
                    if (m.id && payload.messageIds.includes(m.id)) {
                        const seenSet = new Set<number>(m.seenBy || []);
                        seenSet.add(payload.userId);
                        return { ...m, seenBy: Array.from(seenSet) };
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
            socket. off('notification', handleNotification);
            socket.off('newMessage', handleNewMessage);
            socket.off('messageSeen', handleMessageSeen);

            if (seenTimerRef.current) {
                window.clearTimeout(seenTimerRef.current);
                seenTimerRef.current = null;
            }
            seenBufferRef.current.clear();
        };
    }, [socket, isConnected, user, normalizeIncoming, scheduleReportSeenIfNeeded, activeConversation]);

    const openConversation = useCallback(async (conv: Conversation) => {
        if (!socket) {
            console.warn('[Chat] Cannot open conversation: socket not available');
            return;
        }

        try {
            console. log('[Chat] Opening conversation:', conv.id);

            if (prevConversationRef.current) {
                console.log('[Chat] Leaving previous conversation:', prevConversationRef.current);
                socket.emit('leaveConversation', { conversationId: String(prevConversationRef.current) });
            }

            setActiveConversation(conv);
            setShowSidebar(false); // Hide sidebar on mobile when conversation selected
            prevConversationRef.current = conv. id;
            activeConvIdRef.current = conv.id;

            console.log('[Chat] Loading messages for conversation:', conv.id);
            const raw = await getMessages(conv.id, 1, MESSAGES_LIMIT);
            const msgs = Array.isArray(raw) ? raw : raw.messages || [];

            console.log('[Chat] Loaded messages:', msgs.length);

            msgs.sort((a: any, b: any) => new Date(a.createdAt || 0). getTime() - new Date(b.createdAt || 0). getTime());

            const normalized = msgs.map((m: any) => {
                const nm = normalizeIncoming(m);
                nm.conversationId = Number(conv.id);
                nm.seenBy = nm.seenBy || [];
                return nm;
            }) as MsgWithMeta[];

            setMessages(normalized);

            console.log('[Chat] Joining conversation room:', conv.id);
            socket. emit('joinConversation', { conversationId: String(conv. id) });

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
                socket.emit('messageSeen', {
                    conversationId: String(conv.id),
                    messageIds: unseenIds,
                    userId: user?.id
                });
            }
        } catch (err) {
            console.error('[Chat] Error opening conversation', err);
        }
    }, [socket, user?. id, normalizeIncoming]);

    const handleSend = useCallback((text: string, image?: string | File) => {
        if (! activeConversation || !user || !socket) {
            console.warn('[Chat] Cannot send message: missing activeConversation, user, or socket');
            return;
        }

        const tempId = `temp-${Date.now()}-${Math.random(). toString(36).slice(2, 8)}`;
        let imageUrl: string | null = null;

        if (image instanceof File) {
            imageUrl = URL.createObjectURL(image);
        } else if (typeof image === 'string') {
            imageUrl = image;
        }

        const tempMessage: MsgWithMeta = {
            id: Date.now(),
            text,
            imageUrl,
            createdAt: new Date().toISOString(),
            senderId: Number(user.id),
            conversationId: activeConversation.id,
            sending: true,
            tempId,
            seenBy: [],
        };

        console.log('[Chat] Adding optimistic message to UI', tempMessage);
        setMessages((prev) => [...prev, tempMessage]);

        console.debug('[Chat] Emitting sendMessage', {
            conversationId: activeConversation.id,
            senderId: user.id,
            text,
            tempId,
            imageUrl
        });

        socket.emit('sendMessage', {
            conversationId: String(activeConversation.id),
            senderId: String(user.id),
            text,
            imageUrl,
            tempId,
        });
    }, [activeConversation, user, socket]);

    const handleLoadMore = useCallback(async (): Promise<number> => {
        if (!activeConversation) {
            console.warn('[Chat] Cannot load more: no active conversation');
            return 0;
        }

        try {
            console.log('[Chat] Loading more messages for conversation:', activeConversation.id);
            const raw = await getMessages(activeConversation.id);
            const all: Message[] = Array.isArray(raw) ? raw : raw.messages || [];

            const normalized = all.map((m: any) => {
                const nm = normalizeIncoming(m);
                nm.conversationId = activeConversation.id;
                nm.seenBy = nm. seenBy || [];
                return nm;
            }) as MsgWithMeta[];

            normalized.sort((a, b) => +new Date(a.createdAt ??  0) - +new Date(b.createdAt ?? 0));

            const earliest = messages[0];
            if (! earliest) {
                console.log('[Chat] No messages in state, setting all loaded messages');
                setMessages(normalized);
                return normalized.length;
            }

            const older = normalized.filter((m) => new Date(m.createdAt || 0). getTime() < new Date(earliest.createdAt || 0).getTime());
            if (older.length === 0) {
                console. log('[Chat] No older messages found');
                return 0;
            }

            console.log('[Chat] Adding', older.length, 'older messages');
            setMessages((prev) => [...older, ...prev]);
            return older.length;
        } catch (err) {
            console.error('[Chat] Error loading more messages', err);
            return 0;
        }
    }, [activeConversation, messages, normalizeIncoming]);

    return (
        <div className="min-h-screen bg-gray-50">
            {/* ✅ Header Responsive */}
            <div className="bg-gradient-to-r from-green-600 to-emerald-600 shadow-lg">
                <div className="max-w-7xl mx-auto px-4 py-3 sm:py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 sm:gap-4">
                            <button
                                onClick={() => {
                                    if (activeConversation && !showSidebar) {
                                        setShowSidebar(true);
                                        setActiveConversation(null);
                                    } else {
                                        navigate('/');
                                    }
                                }}
                                className="flex items-center gap-1 sm:gap-2 bg-white/20 hover:bg-white/30 text-white px-2 sm:px-4 py-2 rounded-lg transition-all backdrop-blur-sm"
                            >
                                <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                                <span className="hidden sm:inline font-medium">Volver</span>
                            </button>
                            <div className="flex items-center gap-2 sm:gap-3">
                                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                                    <MessageCircle className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
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

            {/* ✅ Chat container Responsive */}
            <div className="max-w-7xl mx-auto p-2 sm:p-4">
                <div className="grid grid-cols-1 md:grid-cols-[320px_1fr] lg:grid-cols-[380px_1fr] gap-2 sm:gap-4 h-[calc(100vh-120px)] sm:h-[calc(100vh-140px)]">
                    {/* ✅ Sidebar - Conditional rendering on mobile */}
                    <div className={`${showSidebar ? 'block' : 'hidden md:block'} bg-white rounded-lg sm:rounded-xl shadow-md border-2 border-green-100 overflow-hidden min-h-0`}>
                        <ChatSidebar
                            conversations={conversations}
                            currentUserId={user?.id}
                            onSelect={openConversation}
                        />
                    </div>

                    <div className={`${!showSidebar || activeConversation ? 'block' : 'hidden md:block'} bg-white rounded-lg sm:rounded-xl shadow-md border-2 border-green-100 overflow-hidden flex flex-col min-h-0`}>
                        {activeConversation ?  (
                            <>
                                <button
                                    onClick={() => {
                                        setShowSidebar(true);
                                        setActiveConversation(null);
                                    }}
                                    className="md:hidden flex items-center gap-2 p-3 bg-green-50 border-b border-green-100"
                                >
                                    <ChevronLeft className="w-5 h-5 text-green-600" />
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
                            <div className="flex flex-col items-center justify-center flex-1 text-gray-400 p-4">
                                <MessageCircle className="w-16 h-16 sm:w-20 sm:h-20 mb-4 text-green-200" />
                                <p className="text-lg sm:text-xl font-medium text-gray-500 text-center">Selecciona una conversación</p>
                                <p className="text-xs sm:text-sm text-gray-400 mt-2 text-center">Elige un contacto para comenzar a chatear</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ChatPage;
