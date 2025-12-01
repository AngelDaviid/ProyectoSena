import { createContext, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { ReactNode } from 'react';
import { eventsSocket } from '../services/sockets/evento.socket';
import type { EventPublishedPayload } from '../services/sockets/evento.socket';
import { useSocketContext } from './socket-provider';
import EventToast from '../components/Events/Events-toast';
import type { Event } from '../types/event';

export interface EventNotification {
    id: string;
    event: Event;
    message: string;
    timestamp: number;
}

export interface EventNotificationsContextType {
    notifications: EventNotification[];
    removeNotification: (id: string) => void;
    clearNotifications: () => void;
}

// eslint-disable-next-line react-refresh/only-export-components
export const EventNotificationsContext = createContext<EventNotificationsContextType | undefined>(undefined);

export function EventNotificationsProvider({ children }: { children: ReactNode }) {
    const { isConnected } = useSocketContext();
    const [notifications, setNotifications] = useState<EventNotification[]>([]);

    useEffect(() => {
        if (! isConnected) {
            console.log('[EventNotifications] ⏸️ Socket not connected, waiting.. .');
            return;
        }

        console.log('[EventNotifications] 🎧 Setting up event listeners');

        const handleEventPublished = (payload: EventPublishedPayload) => {
            console.log('========== 🔔 EVENT RECEIVED ==========');
            console.log('📍 Current page:', window.location.pathname);
            console.log('📢 Event:', payload.event.title);
            console.log('📢 Message:', payload.message);
            console.log('=======================================');

            const notification: EventNotification = {
                id: `event-${payload.event.id}-${Date.now()}`,
                event: payload.event,
                message: payload.message,
                timestamp: Date.now(),
            };

            setNotifications(prev => {
                const updated = [...prev, notification];
                console.log('📊 Total notifications:', updated.length);
                return updated;
            });

            // Reproducir sonido
            try {
                const audio = new Audio('/Notidficacion-sound.mp3');
                audio. volume = 0.5;
                audio.play()
                    .then(() => console.log('🔊 Sound played'))
                    .catch(err => console.warn('🔇 Could not play sound:', err));
            } catch (err) {
                console.warn('🔇 Audio error:', err);
            }
        };

        eventsSocket.onEventPublished(handleEventPublished);

        return () => {
            console.log('[EventNotifications] 🔌 Cleaning up event listeners');
            eventsSocket.offEventPublished(handleEventPublished);
        };
    }, [isConnected]);

    const removeNotification = (id: string) => {
        console.log('🗑️ Removing notification:', id);
        setNotifications(prev => prev.filter(n => n.id !== id));
    };

    const clearNotifications = () => {
        console.log('🗑️ Clearing all notifications');
        setNotifications([]);
    };

    // Renderizar toasts usando Portal directamente en body
    const toastsPortal = typeof document !== 'undefined' ? createPortal(
        <div
            className="event-toasts-container"
            style={{
                position: 'fixed',
                top: '80px',
                right: '16px',
                zIndex: 999999,
                pointerEvents: 'none',
                maxWidth: '400px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
            }}
        >
            {notifications.map(notification => {
                console.log('🎨 Rendering toast:', notification. event.title);
                return (
                    <div key={notification.id} style={{ pointerEvents: 'auto' }}>
                        <EventToast
                            event={notification.event}
                            message={notification.message}
                            onClose={() => removeNotification(notification.id)}
                        />
                    </div>
                );
            })}
        </div>,
        document.body
    ) : null;

    return (
        <EventNotificationsContext.Provider value={{ notifications, removeNotification, clearNotifications }}>
            {children}
            {toastsPortal}
        </EventNotificationsContext.Provider>
    );
}