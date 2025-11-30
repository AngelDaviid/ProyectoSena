import { useState, useEffect, useCallback, useRef } from 'react';
import type { Event, FilterEventsParams } from '../types/event';
import { getEvents, invalidateEventsCache } from '../services/events';
import  type { EventPublishedPayload} from '../services/sockets/evento.socket';
import { eventsSocket } from '../services/sockets/evento.socket';


export function useEvents(filters?: FilterEventsParams) {
    const [events, setEvents] = useState<Event[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const isMounted = useRef(true);

    const loadEvents = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await getEvents(filters);

            if (isMounted.current) {
                setEvents(data.events);
                setTotal(data. total);
            }
        } catch (err: any) {
            console.error('[useEvents] Error loading Events:', err);
            if (isMounted.current) {
                setError(err.message || 'Error al cargar eventos');
            }
        } finally {
            if (isMounted.current) {
                setLoading(false);
            }
        }
    }, [filters]);

    useEffect(() => {
        isMounted.current = true;
        loadEvents();

        return () => {
            isMounted.current = false;
        };
    }, [loadEvents]);

    // Escuchar eventos de WebSocket
    useEffect(() => {
        const handleEventPublished = (payload: EventPublishedPayload) => {
            console.log('[useEvents] New event published:', payload. event);

            if (! isMounted.current) return;

            // Agregar el nuevo evento al inicio de la lista
            setEvents(prev => {
                // Evitar duplicados
                if (prev.some(e => e.id === payload.event.id)) {
                    return prev;
                }
                return [payload.event, ...prev];
            });
            setTotal(prev => prev + 1);

            // Invalidar cache para próximas requests
            invalidateEventsCache();
        };

        const handleEventUpdated = (event: Event) => {
            console.log('[useEvents] Event updated:', event);

            if (!isMounted.current) return;

            setEvents(prev => prev.map(e => e.id === event.id ? event : e));
            invalidateEventsCache();
        };

        const handleEventDeleted = (data: { eventId: number }) => {
            console.log('[useEvents] Event deleted:', data.eventId);

            if (!isMounted.current) return;

            setEvents(prev => prev.filter(e => e.id !== data. eventId));
            setTotal(prev => Math.max(0, prev - 1));
            invalidateEventsCache();
        };

        eventsSocket.onEventPublished(handleEventPublished);
        eventsSocket.onEventUpdated(handleEventUpdated);
        eventsSocket.onEventDeleted(handleEventDeleted);

        return () => {
            eventsSocket.offEventPublished(handleEventPublished);
            eventsSocket.offEventUpdated(handleEventUpdated);
            eventsSocket.offEventDeleted(handleEventDeleted);
        };
    }, []);

    return {
        events,
        total,
        loading,
        error,
        reload: loadEvents,
    };
}