import { createContext, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { ReactNode } from 'react';
import { chatSocket, type NewMessageNotificationPayload } from '../services/sockets/chat.socket';
import { useSocketContext } from './socket-provider';
import ChatNotificationToast from "../components/Chat/Chat-notification-toast.tsx";

export interface ChatNotification {
    id: string;
    conversationId: number;
    message: {
        id: number;
        text: string;
        senderId: number;
        senderName?: string;
    };
    timestamp: number;
}

export interface ChatNotificationsContextType {
    notifications: ChatNotification[];
    removeNotification: (id: string) => void;
    clearNotifications: () => void;
}

// eslint-disable-next-line react-refresh/only-export-components
export const ChatNotificationsContext = createContext<
    ChatNotificationsContextType | undefined
>(undefined);

export function ChatNotificationsProvider({ children }: { children: ReactNode }) {
    const { isConnected } = useSocketContext();
    const [notifications, setNotifications] = useState<ChatNotification[]>([]);

    useEffect(() => {
        if (! isConnected) {
            console.log('[ChatNotifications] ⏸️ Socket not connected');
            return;
        }

        console.log('[ChatNotifications] 🎧 Setting up listeners');

        const handleNewMessageNotification = (payload: NewMessageNotificationPayload) => {
            console.log('========== 💬 NEW MESSAGE NOTIFICATION ==========');
            console.log('📍 Current page:', window.location.pathname);
            console.log('💬 Conversation:', payload.conversationId);
            console.log('💬 Message:', payload.message. text);
            console.log('================================================');

            // No mostrar notificación si estás en la página de chat
            if (window.location.pathname === '/chat') {
                console.log('[ChatNotifications] ⏭️ User is on chat page, skipping notification');
                return;
            }

            const notification: ChatNotification = {
                id: `chat-${payload.message.id}-${Date.now()}`,
                conversationId: payload.conversationId,
                message: {
                    id: payload.message. id,
                    text: payload. message.text,
                    senderId: payload.message.senderId,
                },
                timestamp: Date.now(),
            };

            setNotifications((prev) => [... prev, notification]);

            // Sonido
            try {
                const audio = new Audio('/Notidficacion-sound.mp3');
                audio. volume = 0.5;
                audio
                    .play()
                    .then(() => console.log('🔊 Sound played'))
                    .catch((err) => console.warn('🔇 Could not play sound:', err));
            } catch (err) {
                console.warn('🔇 Audio error:', err);
            }
        };

        chatSocket.onNewMessageNotification(handleNewMessageNotification);

        return () => {
            console. log('[ChatNotifications] 🔌 Cleanup');
            chatSocket.offNewMessageNotification(handleNewMessageNotification);
        };
    }, [isConnected]);

    const removeNotification = (id: string) => {
        console.log('🗑️ Removing notification:', id);
        setNotifications((prev) => prev.filter((n) => n.id !== id));
    };

    const clearNotifications = () => {
        console.log('🗑️ Clearing all notifications');
        setNotifications([]);
    };

    // Renderizar toasts usando Portal
    const toastsPortal =
        typeof document !== 'undefined'
            ? createPortal(
                <div
                    className="chat-toasts-container"
                    style={{
                        position: 'fixed',
                        top: '80px',
                        right: '16px',
                        zIndex: 999999,
                        pointerEvents: 'none',
                        maxWidth: '400px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                    }}
                >
                    {notifications.map((notification) => (
                        <div key={notification.id} style={{ pointerEvents: 'auto' }}>
                            <ChatNotificationToast
                                notification={notification}
                                onClose={() => removeNotification(notification. id)}
                            />
                        </div>
                    ))}
                </div>,
                document.body,
            )
            : null;

    return (
        <ChatNotificationsContext.Provider
            value={{ notifications, removeNotification, clearNotifications }}
        >
            {children}
            {toastsPortal}
        </ChatNotificationsContext.Provider>
    );
}