import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useSocketContext } from '../hooks/useSocketContext';

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
            console.log('[ChatNotifications] Socket not connected or user not authenticated');
            return;
        }

        console. log('[ChatNotifications] Setting up notification listener');

        const handleNewMessageNotification = (payload: ChatNotification) => {
            console.log('[ChatNotifications] New message notification received:', payload);

            if (payload.message.senderId === user.id) {
                console.log('[ChatNotifications] Ignoring own message');
                return;
            }

            if (activeConversationId === payload.conversationId) {
                console.log('[ChatNotifications] User is in active conversation, ignoring notification');
                return;
            }

            setNotifications((prev) => {
                // Evitar duplicados
                const exists = prev.some(
                    (n) => n. conversationId === payload.conversationId && n.message.id === payload.message.id
                );
                if (exists) {
                    console. log('[ChatNotifications] Notification already exists');
                    return prev;
                }

                console. log('[ChatNotifications] Adding new notification');
                return [...prev, payload];
            });
        };

        socket.on('newMessageNotification', handleNewMessageNotification);

        return () => {
            console.log('[ChatNotifications] Cleaning up notification listener');
            socket. off('newMessageNotification', handleNewMessageNotification);
        };
    }, [socket, isConnected, user, activeConversationId]);

    const clearNotification = useCallback((conversationId: number) => {
        console.log('[ChatNotifications] Clearing notifications for conversation:', conversationId);
        setNotifications((prev) => prev.filter((n) => n.conversationId !== conversationId));
    }, []);

    const clearAllNotifications = useCallback(() => {
        console.log('[ChatNotifications] Clearing all notifications');
        setNotifications([]);
    }, []);

    const setActiveConversation = useCallback((conversationId: number | null) => {
        console.log('[ChatNotifications] Setting active conversation:', conversationId);
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

// eslint-disable-next-line react-refresh/only-export-components
export const useChatNotifications = () => {
    const context = useContext(ChatNotificationsContext);
    if (context === undefined) {
        throw new Error('useChatNotifications must be used within a ChatNotificationsProvider');
    }
    return context;
};