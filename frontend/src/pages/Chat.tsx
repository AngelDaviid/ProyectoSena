import React, { useEffect, useState, useCallback } from 'react';
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
    const [messages, setMessages] = useState<Message[]>([]);

    const loadConversations = useCallback(async () => {
        try {
            const data = await getConversations();
            setConversations(data);
        } catch (err) {
            console.error('No se pudieron cargar conversaciones', err);
        }
    }, []);

    useEffect(() => {
        loadConversations();
        const s = connectSocket();

        const handleNewMessage = (msg: Message) => {
            // si el mensaje pertenece a la conversación activa, agregarlo
            if (activeConversation && msg.conversation?.id === activeConversation.id) {
                setMessages((prev) => [...prev, msg]);
            }
            // además podrías actualizar conversaciones (último mensaje) recargando
            // loadConversations();
        };

        s.on('newMessage', handleNewMessage);

        return () => {
            s.off('newMessage', handleNewMessage);
            disconnectSocket();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [loadConversations, activeConversation?.id]);

    const openConversation = async (conv: Conversation) => {
        setActiveConversation(conv);
        try {
            const msgs = await getMessages(conv.id);
            setMessages(msgs);
        } catch (err) {
            console.error('Error al cargar mensajes', err);
            setMessages([]);
        }

        const s = getSocket();
        s.emit('joinConversation', { conversationId: String(conv.id) });
    };

    const handleSend = (text: string, imageUrl?: string) => {
        if (!activeConversation || !user) return;
        const s = getSocket();
        s.emit('sendMessage', {
            conversationId: String(activeConversation.id),
            senderId: String(user.id),
            text,
            imageUrl,
        });
        // optimista: agregar localmente (opcional)
        setMessages((prev) => [
            ...prev,
            {
                id: Date.now(),
                text,
                imageUrl,
                createdAt: new Date().toISOString(),
                sender: { id: user.id, profile: user.profile, email: user.email },
                conversation: { id: activeConversation.id },
            } as Message,
        ]);
    };

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