import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useSocketContext } from '../hooks/useSocketContext';
import { getConversations, getMessages } from '../services/sockets/chat.socket';
import type { Conversation, Message } from '../types/chat';
import ChatSidebar from '../components/Chat/ChatSidebar';
import ChatWindow from '../components/Chat/ChatWindow';

/**
 * Local message type that allows id to be optional because incoming socket payloads
 * or optimistic messages may not have the final numeric id yet.
 */
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
    const { user } = useAuth();
    const { socket, isConnected } = useSocketContext();

    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
    const [messages, setMessages] = useState<MsgWithMeta[]>([]);

    // pagination / guards
    const conversationsLoadedRef = useRef(false);

    // socket refs
    const prevConversationRef = useRef<number | null>(null);

    // seen batching refs
    const seenBufferRef = useRef<Set<number>>(new Set());
    const seenTimerRef = useRef<number | null>(null);

    // Keep a ref to activeConversation. id to use inside callbacks without re-registering listeners
    const activeConvIdRef = useRef<number | null>(null);

    useEffect(() => {
        activeConvIdRef.current = activeConversation?.id ??  null;
    }, [activeConversation]);

    // Load conversations once
    const loadConversations = useCallback(async () => {
        if (conversationsLoadedRef.current) return;
        try {
            const data = await getConversations();
            setConversations(data ??  []);
            conversationsLoadedRef.current = true;
        } catch (err) {
            console.error('[chat] No se pudieron cargar conversaciones', err);
        }
    }, []);

    useEffect(() => {
        void loadConversations();
    }, [loadConversations]);

    // Helper: normalize messages returned by API or socket
    const normalizeIncoming = useCallback((m: any): MsgWithMeta => {
        const msg: Partial<MsgWithMeta> = { ...m };

        // ensure id is numeric if present
        if (typeof m.id !== 'undefined' && m.id !== null) {
            const n = Number(m.id);
            if (!Number.isNaN(n)) msg.id = n;
        }

        // map sender object to senderId if necessary
        if ((typeof m.senderId === 'undefined' || m.senderId === null) && m.sender && typeof m.sender.id !== 'undefined') {
            msg.senderId = Number(m.sender.id);
        } else if (typeof m.senderId !== 'undefined' && m. senderId !== null) {
            msg.senderId = Number(m.senderId);
        }

        // conversation id
        if (typeof m. conversationId !== 'undefined' && m.conversationId !== null) {
            msg.conversationId = Number(m.conversationId);
        }

        msg.text = m.text ??  '';
        msg.imageUrl = m.imageUrl ?? null;
        msg.createdAt = m.createdAt ?  String(m.createdAt) : new Date().toISOString();
        msg.tempId = m.tempId ?? undefined;
        msg.sending = !!m.sending;
        msg.seenBy = Array.isArray(m.seenBy) ? m.seenBy. slice() : [];

        // Keep _inferred flag if provided
        if (m._inferred) msg._inferred = true;

        return msg as MsgWithMeta;
    }, []);

    // Utility: report seen in batch (debounced)
    const scheduleReportSeenIfNeeded = useCallback(
        (m: MsgWithMeta | null) => {
            if (! socket || !isConnected) return;

            try {
                if (! m || typeof m. id === 'undefined' || m.id === null) return;
                if (! user?.id) return;

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
                        console.debug('[chat] emitting messageSeen', { conversationId: activeId, messageIds: ids, userId: user?. id });
                        socket?. emit('messageSeen', { conversationId: String(activeId), messageIds: ids, userId: user?.id });
                    } catch (e) {
                        console.warn('[chat] could not emit messageSeen', e);
                    } finally {
                        seenBufferRef.current.clear();
                        if (seenTimerRef.current) {
                            window.clearTimeout(seenTimerRef. current);
                            seenTimerRef.current = null;
                        }
                    }
                }, REPORT_SEEN_DEBOUNCE_MS) as unknown as number;
            } catch (err) {
                console.error('[chat] scheduleReportSeenIfNeeded error', err);
            }
        },
        [socket, isConnected, user?.id],
    );

    // Socket setup: register listeners once, use refs for active conversation access
    useEffect(() => {
        if (!socket || !isConnected || !user) return;

        console.debug('[chat] socket setup, id:', socket.id);

        const handleNotification = (payload: any) => {
            console.debug('[socket] notification', payload);
        };

        const handleNewMessage = (rawMsg: any) => {
            console.debug('[socket] newMessage raw', rawMsg);
            const normalized = normalizeIncoming(rawMsg);

            setMessages((prev) => {
                // replace optimistic by tempId if present
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
                        console.debug('[chat] replaced optimistic message with server message', copy[idx]);
                        scheduleReportSeenIfNeeded(copy[idx]);
                        return copy;
                    }
                }

                // avoid duplicates by id
                if (typeof normalized.id !== 'undefined' && prev.some((m) => m.id === normalized.id)) {
                    scheduleReportSeenIfNeeded(normalized);
                    return prev;
                }

                // if belongs to another conversation, ignore for current UI
                if (typeof normalized.conversationId !== 'undefined' && activeConversation && normalized.conversationId !== activeConversation.id) {
                    console.debug('[socket] newMessage for different conversation', normalized. conversationId);
                    scheduleReportSeenIfNeeded(normalized);
                    return prev;
                }

                scheduleReportSeenIfNeeded(normalized);
                return [...prev, normalized];
            });
        };

        const handleMessageSeen = (payload: { conversationId: string | number; messageIds: number[]; userId: number }) => {
            console.debug('[socket] messageSeen', payload);
            setMessages((prev) =>
                prev.map((m) => {
                    if (m.id && payload.messageIds.includes(m. id)) {
                        const seenSet = new Set<number>(m.seenBy ?? []);
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
            socket.off('notification', handleNotification);
            socket.off('newMessage', handleNewMessage);
            socket. off('messageSeen', handleMessageSeen);

            // cleanup seen timer/buffer
            if (seenTimerRef.current) {
                window.clearTimeout(seenTimerRef.current);
                seenTimerRef.current = null;
            }
            seenBufferRef.current.clear();
        };
    }, [socket, isConnected, user, normalizeIncoming, scheduleReportSeenIfNeeded, activeConversation]);

    // Open conversation: load first page, join room and report seen for loaded messages
    const openConversation = useCallback(async (conv: Conversation) => {
        if (!socket) return;

        try {
            if (prevConversationRef.current) {
                socket.emit('leaveConversation', { conversationId: String(prevConversationRef.current) });
            }

            setActiveConversation(conv);
            prevConversationRef.current = conv.id;
            activeConvIdRef.current = conv.id;

            const raw = await getMessages(conv.id, 1, MESSAGES_LIMIT);
            const msgs = Array.isArray(raw) ? raw : raw.messages ??  [];

            msgs.sort((a: any, b: any) => new Date(a.createdAt ??  0). getTime() - new Date(b.createdAt ?? 0). getTime());

            const normalized = msgs.map((m: any) => {
                const nm = normalizeIncoming(m);
                nm.conversationId = Number(conv.id);
                nm.seenBy = nm.seenBy ?? [];
                return nm;
            }) as MsgWithMeta[];

            setMessages(normalized);

            socket.emit('joinConversation', { conversationId: String(conv.id) });

            const unseenIds = normalized
                .filter((m) => Number(m.senderId) !== Number(user?.id))
                . map((m) => m.id)
                .filter((id): id is number => typeof id === 'number');

            if (unseenIds. length > 0) {
                console.debug('[chat] emitting messageSeen for loaded messages', { conversationId: conv.id, messageIds: unseenIds, userId: user?.id });
                socket.emit('messageSeen', { conversationId: String(conv.id), messageIds: unseenIds, userId: user?.id });
            }
        } catch (err) {
            console.error('[chat] Error cargando mensajes', err);
        }
    }, [socket, user?.id, normalizeIncoming]);

    // Send message (optimistic)
    const handleSend = useCallback((text: string, image?: string | File) => {
        if (!activeConversation || !user || !socket) return;

        const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
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

        setMessages((prev) => [...prev, tempMessage]);

        console.debug('[chat] emitting sendMessage', { conversationId: activeConversation.id, senderId: user.id, text, tempId, imageUrl });
        socket.emit('sendMessage', {
            conversationId: String(activeConversation.id),
            senderId: String(user.id),
            text,
            imageUrl,
            tempId,
        });
    }, [activeConversation, user, socket]);

    // Load more messages (pagination)
    const handleLoadMore = useCallback(async (): Promise<number> => {
        if (!activeConversation) return 0;

        try {
            const raw = await getMessages(activeConversation.id);
            const all: Message[] = Array.isArray(raw) ? raw : raw.messages ??  [];

            const normalized = all.map((m: any) => {
                const nm = normalizeIncoming(m);
                nm.conversationId = activeConversation.id;
                nm.seenBy = nm. seenBy ?? [];
                return nm;
            }) as MsgWithMeta[];

            normalized.sort((a, b) => +new Date(a.createdAt ?? 0) - +new Date(b.createdAt ??  0));

            const earliest = messages[0];
            if (!earliest) {
                setMessages(normalized);
                return normalized.length;
            }

            const older = normalized.filter((m) => new Date(m.createdAt ?? 0). getTime() < new Date(earliest.createdAt ??  0).getTime());
            if (older.length === 0) return 0;

            setMessages((prev) => [...older, ...prev]);
            return older.length;
        } catch (err) {
            console.error('[chat] Error cargando mensajes antiguos', err);
            return 0;
        }
    }, [activeConversation, messages, normalizeIncoming]);

    return (
        <div className="grid grid-cols-[300px_1fr] min-h-screen bg-gray-100">
            <ChatSidebar
                conversations={conversations}
                currentUserId={user?.id}
                onSelect={openConversation}
            />

            <div className="bg-white border-l flex flex-col">
                {activeConversation ? (
                    <ChatWindow
                        activeConversation={activeConversation}
                        messages={messages}
                        onSend={handleSend}
                        currentUserId={user?.id ?? null}
                        onLoadMore={handleLoadMore}
                    />
                ) : (
                    <div className="flex items-center justify-center flex-1 text-gray-500">
                        Selecciona una conversación
                    </div>
                )}
            </div>
        </div>
    );
};

export default ChatPage;