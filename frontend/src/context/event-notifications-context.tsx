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
            console.log('[EventNotifications] ⏸️ Socket not connected');
            return;
        }

        console.log('[EventNotifications] 🎧 Setting up listeners');

        const handleEventPublished = (payload: EventPublishedPayload) => {
            console.log('========== 🔔 EVENT RECEIVED ==========');
            console.log('Event:', payload.event. title);
            console.log('Message:', payload.message);
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

            // Sonido
            try {
                const audio = new Audio('/Notidficacion-sound.mp3');
                audio. volume = 0.5;
                audio.play()
                    .then(() => console.log('🔊 Sound played'))
                    .catch(err => console.warn('🔇 Sound failed:', err));
            } catch (err) {
                console.warn('🔇 Audio error:', err);
            }
        };

        eventsSocket.onEventPublished(handleEventPublished);

        return () => {
            console.log('[EventNotifications] 🔌 Cleanup');
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

    console.log('🎨 Rendering provider, notifications:', notifications.length);

    return (
        <EventNotificationsContext.Provider value={{ notifications, removeNotification, clearNotifications }}>
            {children}
            <div className="fixed top-20 right-4 z-[99999] pointer-events-none" style={{ maxWidth: '400px' }}>
                {notifications.map(notification => {
                    console.log('🎨 Rendering toast:', notification.event.title);
                    return (
                        <div key={notification.id} className="pointer-events-auto">
                            <EventToast
                                event={notification.event}
                                message={notification.message}
                                onClose={() => removeNotification(notification.id)}
                            />
                        </div>
                    );
                })}
            </div>
        </EventNotificationsContext.Provider>
    );
}