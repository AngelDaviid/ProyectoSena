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

    /**
     * Escuchar cuando se actualiza un evento
     */
    onEventUpdated(callback: (event: Event) => void): void {
        socketService. on('eventUpdated', callback);
    }

    /**
     * Dejar de escuchar evento actualizado
     */
    offEventUpdated(callback?: (event: Event) => void): void {
        socketService.off('eventUpdated', callback);
    }

    /**
     * Escuchar cuando se elimina un evento
     */
    onEventDeleted(callback: (payload: EventDeletedPayload) => void): void {
        socketService. on('eventDeleted', callback);
    }

    /**
     * Dejar de escuchar evento eliminado
     */
    offEventDeleted(callback?: (payload: EventDeletedPayload) => void): void {
        socketService.off('eventDeleted', callback);
    }

    /**
     * Escuchar cuando alguien se registra a tu evento
     */
    onEventRegistration(callback: (payload: EventRegistrationPayload) => void): void {
        socketService. on('eventRegistration', callback);
    }

    /**
     * Dejar de escuchar registro de evento
     */
    offEventRegistration(callback?: (payload: EventRegistrationPayload) => void): void {
        socketService.off('eventRegistration', callback);
    }

    /**
     * Escuchar cuando te desregistran de un evento
     */
    onEventUnregistration(callback: (payload: EventUnregistrationPayload) => void): void {
        socketService. on('eventUnregistration', callback);
    }

    /**
     * Dejar de escuchar desregistro de evento
     */
    offEventUnregistration(callback?: (payload: EventUnregistrationPayload) => void): void {
        socketService.off('eventUnregistration', callback);
    }

    /**
     * Escuchar cuando se crea un evento (solo para el creador)
     */
    onEventCreated(callback: (event: Event) => void): void {
        socketService.on('eventCreated', callback);
    }

    /**
     * Dejar de escuchar evento creado
     */
    offEventCreated(callback?: (event: Event) => void): void {
        socketService.off('eventCreated', callback);
    }
}

// Exportar instancia única
export const eventsSocket = new EventsSocketService();