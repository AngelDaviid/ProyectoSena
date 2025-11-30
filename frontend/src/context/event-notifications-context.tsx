import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { eventsSocket } from '../services/sockets/evento.socket.ts';
import type { EventPublishedPayload } from '../services/sockets/evento.socket.ts';
import { useSocket } from '../hooks/useSocket';
import EventToast from '../components/Events/Events-toast.tsx';
import type { Event } from '../types/event';

interface EventNotification {
    id: string;
    event: Event;
    message: string;
    timestamp: number;
}

interface EventNotificationsContextType {
    notifications: EventNotification[];
    addNotification: (event: Event, message: string) => void;
    removeNotification: (id: string) => void;
    clearAllNotifications: () => void;
}

const EventNotificationsContext = createContext<EventNotificationsContextType | undefined>(undefined);

export function EventNotificationsProvider({ children }: { children: ReactNode }) {
    useSocket(); // Conectar socket automáticamente

    const [notifications, setNotifications] = useState<EventNotification[]>([]);

    useEffect(() => {
        // Escuchar cuando se publica un nuevo evento
        const handleEventPublished = (payload: EventPublishedPayload) => {
            console.log('[EventNotifications] New event published:', payload);

            // Crear notificación
            const notification: EventNotification = {
                id: `event-${payload.event.id}-${Date.now()}`,
                event: payload.event,
                message: payload.message,
                timestamp: Date.now(),
            };

            setNotifications(prev => [...prev, notification]);

            // Reproducir sonido (opcional)
            try {
                const audio = new Audio('/notification-sound. mp3');
                audio.volume = 0.5;
                audio.play(). catch(err => console.warn('Could not play sound:', err));
            } catch (err) {
                console.warn('Audio not available:', err);
            }
        };

        eventsSocket. onEventPublished(handleEventPublished);

        return () => {
            eventsSocket.offEventPublished(handleEventPublished);
        };
    }, []);

    const addNotification = (event: Event, message: string) => {
        const notification: EventNotification = {
            id: `event-${event.id}-${Date.now()}`,
            event,
            message,
            timestamp: Date.now(),
        };
        setNotifications(prev => [... prev, notification]);
    };

    const removeNotification = (id: string) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    };

    const clearAllNotifications = () => {
        setNotifications([]);
    };

    return (
        <EventNotificationsContext.Provider
            value={{ notifications, addNotification, removeNotification, clearAllNotifications }}
        >
            {children}

            {/* Renderizar toasts */}
            <div className="fixed top-0 right-0 z-50 pointer-events-none">
                <div className="flex flex-col gap-4 p-4 pointer-events-auto">
                    {notifications.map((notification, index) => (
                        <div
                            key={notification.id}
                            style={{
                                transform: `translateY(${index * 10}px)`,
                                zIndex: 50 - index,
                            }}
                        >
                            <EventToast
                                event={notification.event}
                                message={notification.message}
                                onClose={() => removeNotification(notification.id)}
                            />
                        </div>
                    ))}
                </div>
            </div>
        </EventNotificationsContext.Provider>
    );
}

export function useEventNotifications() {
    const context = useContext(EventNotificationsContext);
    if (! context) {
        throw new Error('useEventNotifications must be used within EventNotificationsProvider');
    }
    return context;
}