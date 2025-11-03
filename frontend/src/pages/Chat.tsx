import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { connectSocket, disconnectSocket, getSocket } from '../services/socket';
import { getConversations, getMessages } from '../services/chat';
import type { Conversation, Message } from '../types/chat';
import ChatSidebar from '../components/ChatSidebar';
import ChatWindow from '../components/ChatWindow';

const ChatPage: React.FC = () => {
    const { user } = useAuth();
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
    const [messages, setMessages] = useState<Array<Message & { sending?: boolean; tempId?: string }>>([]);
    const socketRef = useRef<any>(null);

    // === Cargar conversaciones ===
    const loadConversations = useCallback(async () => {
        try {
            const data = await getConversations();
            setConversations(data);
        } catch (err) {
            console.error('No se pudieron cargar conversaciones', err);
        }
    }, []);

    // === Conectar socket y escuchar nuevos mensajes ===
    useEffect(() => {
        loadConversations();
        const s = connectSocket();
        socketRef.current = s;

        const handleNewMessage = (msg: Message) => {
            if (activeConversation && msg.conversationId === activeConversation.id) {
                setMessages((prev) => {
                    // Buscar y reemplazar un mensaje temporal si coincide texto + remitente
                    const tempIdx = prev.findIndex(
                        (m) =>
                            m.sending &&
                            m.senderId === msg.senderId &&
                            String(m.text || '').trim() === String(msg.text || '').trim()
                    );
                    if (tempIdx !== -1) {
                        const copy = [...prev];
                        copy.splice(tempIdx, 1);
                        return [...copy, msg];
                    }
                    return [...prev, msg];
                });
            }
        };

        s.on('newMessage', handleNewMessage);

        return () => {
            s.off('newMessage', handleNewMessage);
            disconnectSocket();
            socketRef.current = null;
        };
    }, [loadConversations, activeConversation?.id, user?.id]);

    // === Abrir conversación ===
    const openConversation = async (conv: Conversation) => {
        setActiveConversation(conv);
        try {
            const msgs = await getMessages(conv.id);
            msgs.sort(
                (a, b) =>
                    new Date(a.createdAt || 0).getTime() -
                    new Date(b.createdAt || 0).getTime()
            );
            setMessages(msgs);
        } catch (err) {
            console.error('Error al cargar mensajes', err);
            setMessages([]);
        }

        const s = getSocket();
        s.emit('joinConversation', { conversationId: String(conv.id) });
    };

    // === Enviar mensaje (corregido) ===
    const handleSend = (text: string, imageUrl?: string | File | undefined): void => {
        if (!activeConversation || !user) return;
        const s = getSocket();

        // Si el usuario envía una imagen (File), crear una URL temporal para mostrarla
        const image =
            imageUrl instanceof File ? URL.createObjectURL(imageUrl) : imageUrl ?? null;

        s.emit('sendMessage', {
            conversationId: String(activeConversation.id),
            senderId: String(user.id),
            text,
            imageUrl: image,
        });

        setMessages((prev) => [
            ...prev,
            {
                id: Date.now(),
                text,
                imageUrl: image,
                createdAt: new Date().toISOString(),
                senderId: user.id,
                conversationId: activeConversation.id,
                sending: true,
                tempId: `temp-${Date.now()}`,
            } as Message & { sending?: boolean; tempId?: string },
        ]);
    };

    // === Cargar mensajes antiguos ===
    const handleLoadMore = async (): Promise<number> => {
        if (!activeConversation) return 0;
        try {
            const all = await getMessages(activeConversation.id);
            all.sort(
                (a, b) =>
                    new Date(a.createdAt || 0).getTime() -
                    new Date(b.createdAt || 0).getTime()
            );

            if (messages.length === 0) {
                setMessages(all);
                return all.length;
            }

            const earliest = messages[0];
            const earliestTime = new Date(earliest.createdAt || 0).getTime();
            const older = all.filter(
                (m) => new Date(m.createdAt || 0).getTime() < earliestTime
            );
            if (older.length === 0) return 0;

            setMessages((prev) => [...older, ...prev]);
            return older.length;
        } catch (err) {
            console.error('Error cargando mensajes antiguos', err);
            return 0;
        }
    };

    // === Render ===
    return (
        <div className="flex h-full min-h-screen">
            <ChatSidebar
                conversations={conversations}
                currentUserId={user?.id}
                onSelect={openConversation}
            />
            <div className="flex-1 bg-gray-50">
                {activeConversation ? (
                    <ChatWindow
                        conversation={activeConversation}
                        messages={messages}
                        onSend={handleSend}
                        currentUserId={user?.id}
                        onLoadMore={handleLoadMore}
                    />
                ) : (
                    <div className="flex items-center justify-center h-full text-gray-500">
                        Selecciona una conversación
                    </div>
                )}
            </div>
        </div>
    );
};

export default ChatPage;
