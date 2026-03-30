import { createContext, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { ReactNode } from 'react';
import { eventsSocket } from '../services/sockets/evento.socket';
import type { EventPublishedPayload } from '../services/sockets/evento.socket';
import { useSocketContext } from './socket-provider';
import EventToast from '../components/Events/EventsToast';
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
        if (!isConnected) {
            return;
        }

        const handleEventPublished = (payload: EventPublishedPayload) => {
            const notification: EventNotification = {
                id: `event-${payload.event.id}-${Date.now()}`,
                event: payload.event,
                message: payload.message,
                timestamp: Date.now(),
            };

            setNotifications(prev => [...prev, notification]);

            try {
                const audio = new Audio('/Notificacion-sound.mp3');
                audio.volume = 0.5;
                audio.play().catch(err => console.warn('Could not play sound:', err));
            } catch (err) {
                console.warn('Audio error:', err);
            }
        };

        eventsSocket.onEventPublished(handleEventPublished);

        return () => {
            eventsSocket.offEventPublished(handleEventPublished);
        };
    }, [isConnected]);

    const removeNotification = (id: string) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    };

    const clearNotifications = () => {
        setNotifications([]);
    };

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
            {notifications.map(notification => (
                <div key={notification.id} style={{ pointerEvents: 'auto' }}>
                    <EventToast
                        event={notification.event}
                        message={notification.message}
                        onClose={() => removeNotification(notification.id)}
                    />
                </div>
            ))}
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