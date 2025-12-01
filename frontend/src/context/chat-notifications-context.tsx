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
}

const ChatNotificationsContext = createContext<ChatNotificationsContextType | undefined>(undefined);

export const ChatNotificationsProvider: React.FC<{ children: React. ReactNode }> = ({ children }) => {
    const { user } = useAuth();
    const { socket, isConnected } = useSocketContext();
    const [notifications, setNotifications] = useState<ChatNotification[]>([]);

    useEffect(() => {
        if (! socket || !isConnected || !user) {
            console.log('[ChatNotifications] Socket not connected or user not authenticated');
            return;
        }

        console.log('[ChatNotifications] Setting up notification listener');

        const handleNewMessageNotification = (payload: ChatNotification) => {
            console.log('[ChatNotifications] New message notification received:', payload);

            // No notificar mensajes propios
            if (payload.message.senderId === user.id) {
                console.log('[ChatNotifications] Ignoring own message');
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

                console.log('[ChatNotifications] Adding new notification');
                return [...prev, payload];
            });
        };

        socket.on('newMessageNotification', handleNewMessageNotification);

        return () => {
            console.log('[ChatNotifications] Cleaning up notification listener');
            socket. off('newMessageNotification', handleNewMessageNotification);
        };
    }, [socket, isConnected, user]);

    const clearNotification = useCallback((conversationId: number) => {
        console.log('[ChatNotifications] Clearing notifications for conversation:', conversationId);
        setNotifications((prev) => prev.filter((n) => n.conversationId !== conversationId));
    }, []);

    const clearAllNotifications = useCallback(() => {
        console.log('[ChatNotifications] Clearing all notifications');
        setNotifications([]);
    }, []);

    const unreadCount = notifications.length;

    return (
        <ChatNotificationsContext.Provider
            value={{
                notifications,
                unreadCount,
                clearNotification,
                clearAllNotifications,
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