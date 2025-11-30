import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useSocketContext } from '../hooks/useSocketContext';
import {
    chatSocket,
    getConversations,
    getMessages,
    type NewMessagePayload,
    type UserTypingPayload,
    type MessageSeenPayload,
} from '../services/sockets/chat.socket';
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

const MESSAGES_LIMIT = 50;

const ChatPage: React.FC = () => {
    const { user } = useAuth();
    const { socket, isConnected } = useSocketContext();

    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
    const [messages, setMessages] = useState<MsgWithMeta[]>([]);
    const [typingUsers, setTypingUsers] = useState<number[]>([]);
    const [unreadCounts, setUnreadCounts] = useState<Record<number, number>>({});

    const conversationsLoadedRef = useRef(false);
    const prevConvRef = useRef<number | null>(null);
    const activeConvIdRef = useRef<number | null>(null);

    useEffect(() => {
        activeConvIdRef.current = activeConversation?.id ??  null;
    }, [activeConversation]);

    // Load conversations
    const loadConversations = useCallback(async () => {
        if (conversationsLoadedRef.current) return;

        try {
            const data = await getConversations();
            setConversations(data ??  []);
            conversationsLoadedRef.current = true;
        } catch (err) {
            console.error('[Chat] Error loading conversations:', err);
        }
    }, []);

    useEffect(() => {
        void loadConversations();
    }, [loadConversations]);

    // Normalize incoming messages
    const normalizeIncoming = useCallback((m: NewMessagePayload): MsgWithMeta => {
        return {
            id: m.id ?  Number(m.id) : undefined,
            text: m.text ??  '',
            imageUrl: m.imageUrl ?? null,
            createdAt: m.createdAt ? String(m.createdAt) : new Date().toISOString(),
            senderId: Number(m.senderId),
            conversationId: Number(m. conversationId),
            tempId: m.tempId ??  undefined,
            sending: false,
            seenBy: [],
            _inferred: false,
        };
    }, []);

    // Socket listeners
    useEffect(() => {
        if (!socket || !isConnected || !user) return;

        console.log('[Chat] 🎧 Setting up socket listeners');

        const handleNewMessage = (payload: NewMessagePayload) => {
            console. log('[Chat] 💬 New message received:', payload);
            const normalized = normalizeIncoming(payload);

            setMessages((prev) => {
                // Replace optimistic message
                if (normalized. tempId) {
                    const idx = prev.findIndex((m) => m.tempId === normalized. tempId);
                    if (idx !== -1) {
                        const copy = [...prev];
                        copy[idx] = { ...normalized, sending: false };
                        return copy;
                    }
                }

                // Avoid duplicates
                if (normalized.id && prev. some((m) => m.id === normalized.id)) {
                    return prev;
                }

                // Not active conversation → unread count
                if (normalized. conversationId !== activeConvIdRef.current) {
                    const convId = normalized.conversationId;

                    // Solo actualizar si convId es un número válido
                    if (typeof convId === 'number') {
                        setUnreadCounts((counts: Record<number, number>) => {
                            return {
                                ...counts,
                                [convId]: (counts[convId] ??  0) + 1,
                            };
                        });
                    }

                    return prev;
                }

                return [... prev, normalized];
            });
        };

        const handleUserTyping = (payload: UserTypingPayload) => {
            console.log('[Chat] ⌨️ User typing:', payload);
            const convId = Number(payload.conversationId);
            const userId = Number(payload.userId);

            if (convId === activeConvIdRef. current && payload.typing) {
                setTypingUsers((prev) =>
                    prev.includes(userId) ? prev : [...prev, userId],
                );

                setTimeout(() => {
                    setTypingUsers((prev) => prev.filter((id) => id !== userId));
                }, 3000);
            } else {
                setTypingUsers((prev) => prev.filter((id) => id !== userId));
            }
        };

        const handleMessageSeen = (payload: MessageSeenPayload) => {
            console.log('[Chat] 👁️ Message seen:', payload);
            const userId = Number(payload.userId);
            const messageIds = payload.messageIds. map((id) => Number(id));

            setMessages((prev) =>
                prev. map((m: MsgWithMeta) => {
                    if (m.id && messageIds.includes(m.id)) {
                        const seen = new Set(m.seenBy ??  []);
                        seen.add(userId);
                        return { ...m, seenBy: Array.from(seen) };
                    }
                    return m;
                }),
            );
        };

        chatSocket.onNewMessage(handleNewMessage);
        chatSocket.onUserTyping(handleUserTyping);
        chatSocket.onMessageSeen(handleMessageSeen);

        return () => {
            console.log('[Chat] 🔌 Cleaning up socket listeners');
            chatSocket.offNewMessage(handleNewMessage);
            chatSocket.offUserTyping(handleUserTyping);
            chatSocket.offMessageSeen(handleMessageSeen);
        };
    }, [socket, isConnected, user, normalizeIncoming]);

    // Open conversation
    const openConversation = useCallback(
        async (conv: Conversation) => {
            if (!socket) return;

            try {
                if (prevConvRef.current !== null) {
                    chatSocket.leaveConversation(prevConvRef.current);
                }

                setActiveConversation(conv);
                prevConvRef.current = conv.id;
                activeConvIdRef.current = conv.id;

                setUnreadCounts((prev) => ({ ...prev, [conv.id]: 0 }));

                const response = await getMessages(conv.id, 1, MESSAGES_LIMIT);
                const msgs = Array.isArray(response) ? response : response.messages ?? [];

                const normalized = msgs.map((m: unknown) => normalizeIncoming(m as NewMessagePayload));

                normalized.sort((a: MsgWithMeta, b: MsgWithMeta) => {
                    const dateA = new Date(a. createdAt || 0).getTime();
                    const dateB = new Date(b.createdAt || 0).getTime();
                    return dateA - dateB;
                });

                setMessages(normalized);

                chatSocket.joinConversation(conv.id);

                const unseen = normalized
                    .filter((m: MsgWithMeta) => m.senderId !== user?.id && m.id !== undefined)
                    .map((m: MsgWithMeta) => m.id as number);

                if (unseen.length > 0 && user?.id) {
                    chatSocket.markAsSeen(conv.id, unseen, user.id);
                }
            } catch (err) {
                console.error('[Chat] Error loading messages:', err);
            }
        },
        [socket, user?. id, normalizeIncoming]
    );

    // Send message
    const handleSend = useCallback(
        (text: string, image?: string | File) => {
            if (!activeConversation || !user || !socket) return;

            const tempId = `temp-${Date.now()}-${Math.random(). toString(36).slice(2, 8)}`;

            const tempMessage: MsgWithMeta = {
                id: Date.now(),
                text,
                imageUrl: image instanceof File ? URL.createObjectURL(image) : image ??  null,
                createdAt: new Date().toISOString(),
                senderId: user.id,
                conversationId: activeConversation.id,
                sending: true,
                tempId,
                seenBy: [],
            };

            setMessages((prev) => [...prev, tempMessage]);

            chatSocket.sendMessage(
                activeConversation.id,
                user.id,
                text,
                typeof image === 'string' ? image : undefined,
                tempId
            );
        },
        [activeConversation, user, socket]
    );

    // Load older messages
    const handleLoadMore = useCallback(async (): Promise<number> => {
        if (!activeConversation) return 0;

        try {
            const response = await getMessages(activeConversation.id);
            const all = Array.isArray(response) ? response : (response. messages ?? []);

            const normalized = all.map((m: unknown) => normalizeIncoming(m as NewMessagePayload));

            normalized.sort((a: MsgWithMeta, b: MsgWithMeta) => {
                const dateA = new Date(a. createdAt || 0).getTime();
                const dateB = new Date(b.createdAt || 0).getTime();
                return dateA - dateB;
            });

            const earliest = messages[0];
            if (! earliest) {
                setMessages(normalized);
                return normalized.length;
            }

            const older = normalized.filter((m: MsgWithMeta) => {
                const msgDate = new Date(m.createdAt || 0).getTime();
                const earliestDate = new Date(earliest. createdAt || 0).getTime();
                return msgDate < earliestDate;
            });

            if (older.length === 0) return 0;

            setMessages((prev) => [...older, ...prev]);
            return older.length;
        } catch (err) {
            console.error('[Chat] Error loading more messages:', err);
            return 0;
        }
    }, [activeConversation, messages, normalizeIncoming]);

    return (
        <div className="grid grid-cols-[350px_1fr] h-screen bg-gray-100">
            <ChatSidebar
                conversations={conversations}
                currentUserId={user?.id ??  null}
                activeConversationId={activeConversation?.id ?? null}
                onSelect={openConversation}
                unreadCounts={unreadCounts}
            />

            <div className="bg-white flex flex-col">
                {activeConversation ? (
                    <ChatWindow
                        activeConversation={activeConversation}
                        messages={messages}
                        onSend={handleSend}
                        currentUserId={user?.id ?? null}
                        onLoadMore={handleLoadMore}
                        typingUsers={typingUsers}
                    />
                ) : (
                    <div className="flex flex-col items-center justify-center flex-1 text-gray-500 bg-gradient-to-br from-gray-50 to-white">
                        <div className="w-32 h-32 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center mb-6 shadow-2xl">
                            <svg
                                className="w-16 h-16 text-white"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4. 03 8-9 8a9.863 9.863 0 01-4.255-. 949L3 20l1. 395-3.72C3. 512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                                />
                            </svg>
                        </div>
                        <h3 className="text-xl font-semibold text-gray-700 mb-2">
                            Selecciona una conversación
                        </h3>
                        <p className="text-sm text-gray-500">
                            Elige un chat de la lista para comenzar a conversar
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ChatPage;