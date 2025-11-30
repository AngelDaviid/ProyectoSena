import { socketService } from './socket';
import type { Event } from '../../types/event';

export interface EventPublishedPayload {
    event: Event;
    message: string;
    timestamp: string;
}

export interface EventRegistrationPayload {
    event: Event;
    attendee: {
        id: number;
        name?: string;
        email?: string;
    };
    message: string;
    timestamp: string;
}

export interface EventDeletedPayload {
    eventId: number;
}

export interface EventUnregistrationPayload {
    eventId: number;
}

/**
 * Módulo para manejar eventos relacionados con Events
 */
export class EventsSocketService {
    /**
     * Escuchar cuando se publica un nuevo evento
     */
    onEventPublished(callback: (payload: EventPublishedPayload) => void): void {
        socketService.on('eventPublished', callback);
    }

    /**
     * Dejar de escuchar evento publicado
     */
    offEventPublished(callback?: (payload: EventPublishedPayload) => void): void {
        socketService.off('eventPublished', callback);
    }
}

// Exportar instancia única
export const eventsSocket = new EventsSocketService();