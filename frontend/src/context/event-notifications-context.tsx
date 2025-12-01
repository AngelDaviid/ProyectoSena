import { createContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { eventsSocket } from '../services/sockets/evento.socket';
import type { EventPublishedPayload } from '../services/sockets/evento.socket';
import { useSocketContext } from '../hooks/useSocketContext';
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
            console.log('[EventNotifications] 📢 New event published:', payload);

            const notification: EventNotification = {
                id: `event-${payload.event.id}-${Date.now()}`,
                event: payload.event,
                message: payload.message,
                timestamp: Date.now(),
            };

            setNotifications(prev => [...prev, notification]);

            try {
                const audio = new Audio('/notification-sound.mp3');
                audio.volume = 0.5;
                audio.play(). catch(err => console.warn('Could not play sound:', err));
            } catch (err) {
                console.warn('Audio not available:', err);
            }
        };

        eventsSocket. onEventPublished(handleEventPublished);

        return () => {
            console.log('[EventNotifications] 🔌 Cleaning up event listeners');
            eventsSocket.offEventPublished(handleEventPublished);
        };
    }, [isConnected]);

    const removeNotification = (id: string) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    };

    const clearNotifications = () => {
        setNotifications([]);
    };

    return (
        <EventNotificationsContext.Provider value={{ notifications, removeNotification, clearNotifications }}>
            {children}

            <div className="fixed top-20 right-4 z-50 space-y-2">
                {notifications.map(notification => (
                    <EventToast
                        key={notification.id}
                        event={notification.event}
                        message={notification.message}
                        onClose={() => removeNotification(notification.id)}
                    />
                ))}
            </div>
        </EventNotificationsContext.Provider>
    );
}