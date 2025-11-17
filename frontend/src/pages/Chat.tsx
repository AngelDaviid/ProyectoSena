import React, { useEffect, useState, useCallback, useRef } from "react";
import { useAuth } from "../hooks/useAuth";
import {
    connectSocket,
    disconnectSocket,
    getSocket,
    registerUser,
} from "../services/socket";
import { getConversations, getMessages } from "../services/chat";
import type { Conversation, Message } from "../types/chat";
import ChatSidebar from "../components/Chat/ChatSidebar";
import ChatWindow from "../components/Chat/ChatWindow";

type MsgWithMeta = Message & {
    sending?: boolean;
    tempId?: string;
    imageUrl?: string | null;
};

const MESSAGES_LIMIT = 20;

export const ChatPage: React.FC = () => {
    const { user, token } = useAuth();

    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [activeConversation, setActiveConversation] =
        useState<Conversation | null>(null);
    const [messages, setMessages] = useState<MsgWithMeta[]>([]);

    const pagesRef = useRef<Record<number, { page: number; hasMore: boolean }>>(
        {}
    );

    const conversationsLoadedRef = useRef(false);

    const prevConversationRef = useRef<number | null>(null);

    const normalizeMessage = (msg: any): MsgWithMeta => ({
        ...msg,
        senderId:
            msg.senderId !== undefined ? Number(msg.senderId) : (undefined as any),
        conversationId:
            msg.conversationId !== undefined
                ? Number(msg.conversationId)
                : (undefined as any),
    });

    const loadConversations = useCallback(async () => {
        if (conversationsLoadedRef.current) return;

        try {
            const data = await getConversations();
            setConversations(data ?? []);
            conversationsLoadedRef.current = true;
        } catch (err) {
            console.error("No se pudieron cargar conversaciones", err);
        }
    }, []);

    useEffect(() => {
        loadConversations();
    }, [loadConversations]);

    useEffect(() => {
        if (!user) return;

        const s = connectSocket(token ?? undefined);
        registerUser(user.id, token ?? undefined);

        const handleNotification = (payload: any) =>
            console.debug("[socket] notification", payload);

        const handleNewMessage = (rawMsg: Message & { tempId?: string }) => {
            const msg = normalizeMessage(rawMsg);

            setMessages((prev) => {
                if (msg.tempId) {
                    const idx = prev.findIndex((m) => m.tempId === msg.tempId);
                    if (idx !== -1) {
                        const copy = [...prev];
                        copy[idx] = { ...copy[idx], ...msg, sending: false };
                        return copy;
                    }
                }

                if (msg.id && prev.some((m) => m.id === msg.id)) return prev;

                if (
                    msg.conversationId &&
                    activeConversation &&
                    msg.conversationId !== activeConversation.id
                ) {
                    console.debug(
                        "[socket] mensaje pertenece a otra conversación",
                        msg.conversationId
                    );
                    return prev;
                }

                return [...prev, msg];
            });
        };

        s.on("notification", handleNotification);
        s.on("newMessage", handleNewMessage);

        return () => {
            s.off("notification", handleNotification);
            s.off("newMessage", handleNewMessage);
            disconnectSocket();
        };
    }, [user?.id, token, activeConversation]);

    const openConversation = async (conv: Conversation) => {
        const socket = getSocket();

        if (prevConversationRef.current) {
            socket.emit("leaveConversation", {
                conversationId: String(prevConversationRef.current),
            });
        }

        socket.emit("joinConversation", {
            conversationId: String(conv.id),
        });

        prevConversationRef.current = conv.id;
        setActiveConversation(conv);
        pagesRef.current[conv.id] = { page: 1, hasMore: true };

        try {
            const { messages: rawMsgs } = await getMessages(
                conv.id,
                1,
                MESSAGES_LIMIT
            );

            const normalized = rawMsgs
                .map(normalizeMessage)
                .sort(
                    (a, b) =>
                        new Date(a.createdAt ?? 0).getTime() -
                        new Date(b.createdAt ?? 0).getTime()
                );

            setMessages(normalized);
        } catch (err) {
            console.error("Error cargando mensajes", err);
        }
    };


    const handleSend = (text: string, image?: string | File) => {
        if (!activeConversation || !user) return;

        const socket = getSocket();

        const tempId = `temp-${Date.now()}-${Math.random()
            .toString(36)
            .slice(2, 8)}`;

        // Preparar imagen (si es File o es url)
        let imageUrl: string | null = null;
        let fileToUpload: File | undefined;

        if (image instanceof File) {
            fileToUpload = image;
            imageUrl = URL.createObjectURL(image);
        } else if (typeof image === "string") {
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
        };

        // Insertar mensaje temporal
        setMessages((prev) => [...prev, tempMessage]);

        socket.emit("sendMessage", {
            conversationId: String(activeConversation.id),
            senderId: String(user.id),
            text,
            imageUrl,
            tempId,
            imageFilePresent: !!fileToUpload,
        });
    };

    const handleLoadMore = useCallback(async (): Promise<number> => {
        if (!activeConversation) return 0;

        try {
            const pageInfo = pagesRef.current[activeConversation.id] ?? {
                page: 1,
                hasMore: true,
            };

            if (!pageInfo.hasMore) return 0;

            const nextPage = pageInfo.page + 1;

            const { messages: rawMsgs, hasMore } = await getMessages(
                activeConversation.id,
                nextPage,
                MESSAGES_LIMIT
            );

            pagesRef.current[activeConversation.id] = {
                page: nextPage,
                hasMore,
            };

            const newMessages = rawMsgs.map(normalizeMessage);

            setMessages((prev) => [...newMessages, ...prev]);

            return newMessages.length;
        } catch {
            return 0;
        }
    }, [activeConversation]);

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
