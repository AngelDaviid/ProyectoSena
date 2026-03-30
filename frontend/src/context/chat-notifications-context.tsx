import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from '../hooks/use-auth.ts';
import { useSocketContext } from '../hooks/use-socket-context.ts';

interface ChatNotification {
    conversationId: number;
    message: {
        id: number;
        text: string;
        senderId: number;
        createdAt: string;
    };
    timestamp: string;
}

interface ChatNotificationsContextType {
    notifications: ChatNotification[];
    unreadCount: number;
    clearNotification: (conversationId: number) => void;
    clearAllNotifications: () => void;
    setActiveConversation: (conversationId: number | null) => void;
}

const ChatNotificationsContext = createContext<ChatNotificationsContextType | undefined>(undefined);

export const ChatNotificationsProvider: React.FC<{ children: React. ReactNode }> = ({ children }) => {
    const { user } = useAuth();
    const { socket, isConnected } = useSocketContext();
    const [notifications, setNotifications] = useState<ChatNotification[]>([]);
    const [activeConversationId, setActiveConversationId] = useState<number | null>(null);

    useEffect(() => {
        if (! socket || !isConnected || ! user) {
            return;
        }

        const handleNewMessageNotification = (payload: ChatNotification) => {
            if (payload.message.senderId === user.id) {
                return;
            }

            if (activeConversationId === payload.conversationId) {
                return;
            }

            setNotifications((prev) => {
                const exists = prev.some(
                    (n) => n. conversationId === payload.conversationId && n.message.id === payload.message.id
                );
                if (exists) {
                    return prev;
                }

                return [...prev, payload];
            });
        };

        socket.on('newMessageNotification', handleNewMessageNotification);

        return () => {
            socket. off('newMessageNotification', handleNewMessageNotification);
        };
    }, [socket, isConnected, user, activeConversationId]);

    const clearNotification = useCallback((conversationId: number) => {
        setNotifications((prev) => prev.filter((n) => n.conversationId !== conversationId));
    }, []);

    const clearAllNotifications = useCallback(() => {
        setNotifications([]);
    }, []);

    const setActiveConversation = useCallback((conversationId: number | null) => {
        setActiveConversationId(conversationId);

        if (conversationId !== null) {
            clearNotification(conversationId);
        }
    }, [clearNotification]);

    const unreadCount = notifications.length;

    return (
        <ChatNotificationsContext.Provider
            value={{
                notifications,
                unreadCount,
                clearNotification,
                clearAllNotifications,
                setActiveConversation,
            }}
        >
            {children}
        </ChatNotificationsContext.Provider>
    );
};

export const useChatNotifications = () => {
    const context = useContext(ChatNotificationsContext);
    if (context === undefined) {
        throw new Error('useChatNotifications must be used within a ChatNotificationsProvider');
    }
    return context;
};