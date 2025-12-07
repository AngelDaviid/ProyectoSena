/**
 * Tipos de eventos (usando const object en lugar de enum)
 */
export const EventType = {
    CONFERENCE: 'conference',
    WORKSHOP: 'workshop',
    SEMINAR: 'seminar',
    SOCIAL: 'social',
    SPORTS: 'sports',
    CULTURAL: 'cultural',
    OTHER: 'other',
} as const;

export type EventType = typeof EventType[keyof typeof EventType];

/**
 * Interfaz de Perfil de Usuario
 */
export interface UserProfile {
    name?: string;
    lastName?: string;
    avatar?: string;
    bio?: string;
}

/**
 * Interfaz de Usuario
 */
export interface User {
    id: number;
    email: string;
    role?: 'desarrollador' | 'instructor' | 'aprendiz';
    profile?: UserProfile;
}

/**
 * Interfaz de Categoría
 */
export interface Category {
    id: number;
    name: string;
    description?: string;
}

/**
 * Interfaz principal de Evento
 */
export interface Event {
    id: number;
    title: string;
    description: string;
    imageUrl?: string;
    location: string;
    startDate: string;
    endDate: string;
    maxAttendees?: number;
    isDraft: boolean;
    eventType: EventType;
    createdAt: string;
    updatedAt: string;

    user?: User;
    attendees?: User[];
    categories?: Category[];

    attendeesCount?: number;
    isRegistered?: boolean;
}

/**
 * Parámetros para filtrar eventos
 */
export interface FilterEventsParams {
    eventType?: EventType;
    categoryId?: number;
    startDateFrom?: string;
    startDateTo?: string;
    search?: string;
    page?: number;
    limit?: number;
}

/**
 * DTO para crear evento
 */
export interface CreateEventDto {
    title: string;
    description: string;
    location: string;
    startDate: string;
    endDate: string;
    maxAttendees?: number;
    eventType?: EventType;
    categoryIds?: number[];
    isDraft?: boolean;
    image?: File;
}

/**
 * DTO para actualizar evento
 */
export interface UpdateEventDto {
    title?: string;
    description?: string;
    location?: string;
    startDate?: string;
    endDate?: string;
    maxAttendees?: number;
    eventType?: EventType;
    categoryIds?: number[];
    isDraft?: boolean;
    image?: File;
}

/**
 * Respuesta de la API
 */
export interface EventsListResponse {
    events: Event[];
    total: number;
}

/**
 * Labels en español
 */
export const EventTypeLabels: Record<EventType, string> = {
    [EventType.CONFERENCE]: 'Conferencia',
    [EventType.WORKSHOP]: 'Taller',
    [EventType.SEMINAR]: 'Seminario',
    [EventType.SOCIAL]: 'Social',
    [EventType. SPORTS]: 'Deportivo',
    [EventType. CULTURAL]: 'Cultural',
    [EventType.OTHER]: 'Otro',
};

/**
 * Colores para badges
 */
export const EventTypeColors: Record<EventType, string> = {
    [EventType.CONFERENCE]: 'bg-blue-100 text-blue-800 border-blue-200',
    [EventType. WORKSHOP]: 'bg-green-100 text-green-800 border-green-200',
    [EventType.SEMINAR]: 'bg-purple-100 text-purple-800 border-purple-200',
    [EventType.SOCIAL]: 'bg-pink-100 text-pink-800 border-pink-200',
    [EventType. SPORTS]: 'bg-orange-100 text-orange-800 border-orange-200',
    [EventType.CULTURAL]: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    [EventType.OTHER]: 'bg-gray-100 text-gray-800 border-gray-200',
};

/**
 * Emojis
 */
export const EventTypeEmojis: Record<EventType, string> = {
    [EventType.CONFERENCE]: '🎤',
    [EventType.WORKSHOP]: '🔧',
    [EventType. SEMINAR]: '🎓',
    [EventType. SOCIAL]: '🎉',
    [EventType. SPORTS]: '⚽',
    [EventType.CULTURAL]: '🎨',
    [EventType.OTHER]: '📅',
};

/**
 * Estado del evento
 */
export type EventStatus = 'upcoming' | 'ongoing' | 'past' | 'draft';

/**
 * HELPERS
 */
export function formatEventDate(dateString: string, locale: string = 'es-CO'): string {
    const date = new Date(dateString);
    return date.toLocaleDateString(locale, {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

export function formatEventDateShort(dateString: string, locale: string = 'es-CO'): string {
    const date = new Date(dateString);
    return date.toLocaleDateString(locale, {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

export function formatEventDateOnly(dateString: string, locale: string = 'es-CO'): string {
    const date = new Date(dateString);
    return date.toLocaleDateString(locale, {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });
}

export function formatEventTime(dateString: string, locale: string = 'es-CO'): string {
    const date = new Date(dateString);
    return date.toLocaleTimeString(locale, {
        hour: '2-digit',
        minute: '2-digit',
    });
}

export function isEventPast(event: Event): boolean {
    return new Date(event.endDate) < new Date();
}

export function isEventOngoing(event: Event): boolean {
    const now = new Date();
    return new Date(event.startDate) <= now && now <= new Date(event.endDate);
}

export function isEventUpcoming(event: Event): boolean {
    return new Date(event.startDate) > new Date();
}

export function getEventStatus(event: Event): EventStatus {
    if (event.isDraft) return 'draft';
    if (isEventPast(event)) return 'past';
    if (isEventOngoing(event)) return 'ongoing';
    return 'upcoming';
}

export function getEventStatusLabel(status: EventStatus): string {
    const labels: Record<EventStatus, string> = {
        upcoming: 'Próximamente',
        ongoing: 'En curso',
        past: 'Finalizado',
        draft: 'Borrador',
    };
    return labels[status];
}

export function getEventStatusColor(status: EventStatus): string {
    const colors: Record<EventStatus, string> = {
        upcoming: 'bg-blue-100 text-blue-800',
        ongoing: 'bg-green-100 text-green-800',
        past: 'bg-gray-100 text-gray-800',
        draft: 'bg-yellow-100 text-yellow-800',
    };
    return colors[status];
}

export function getAvailableSpots(event: Event): number | null {
    if (! event.maxAttendees) return null;
    return Math.max(0, event. maxAttendees - (event.attendeesCount || 0));
}

export function isEventFull(event: Event): boolean {
    const spots = getAvailableSpots(event);
    return spots !== null && spots <= 0;
}

export function getOccupancyPercentage(event: Event): number | null {
    if (!event. maxAttendees) return null;
    const attendees = event.attendeesCount || 0;
    return Math.min(100, Math.round((attendees / event.maxAttendees) * 100));
}

export function hasLimitedSpots(event: Event): boolean {
    const percentage = getOccupancyPercentage(event);
    return percentage !== null && percentage >= 80;
}

export function getTimeUntilEvent(event: Event): {
    days: number;
    hours: number;
    minutes: number;
    total: number;
} {
    const now = new Date(). getTime();
    const start = new Date(event.startDate).getTime();
    const diff = start - now;

    if (diff <= 0) {
        return { days: 0, hours: 0, minutes: 0, total: 0 };
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    return { days, hours, minutes, total: diff };
}

export function formatTimeUntilEvent(event: Event): string {
    const time = getTimeUntilEvent(event);

    if (time.total <= 0) return 'Evento en curso o finalizado';

    if (time.days > 0) {
        return `En ${time.days} día${time.days > 1 ? 's' : ''}`;
    }

    if (time.hours > 0) {
        return `En ${time.hours} hora${time.hours > 1 ? 's' : ''}`;
    }

    return `En ${time.minutes} minuto${time.minutes > 1 ? 's' : ''}`;
}

export function getEventDuration(event: Event): number {
    const start = new Date(event.startDate). getTime();
    const end = new Date(event.endDate). getTime();
    return Math.round((end - start) / (1000 * 60 * 60));
}

export function formatEventDuration(event: Event): string {
    const hours = getEventDuration(event);

    if (hours < 1) return 'Menos de 1 hora';
    if (hours === 1) return '1 hora';
    if (hours < 24) return `${hours} horas`;

    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;

    if (remainingHours === 0) {
        return `${days} día${days > 1 ? 's' : ''}`;
    }

    return `${days} día${days > 1 ? 's' : ''} y ${remainingHours} hora${remainingHours > 1 ? 's' : ''}`;
}

export function canEditEvent(event: Event, userId?: number): boolean {
    if (! userId) return false;
    return event.user?.id === userId;
}

export function canRegisterToEvent(event: Event, userId?: number): boolean {
    if (!userId) return false;
    if (event.isDraft) return false;
    if (event.isRegistered) return false;
    if (isEventPast(event)) return false;
    if (isEventFull(event)) return false;
    if (canEditEvent(event, userId)) return false;
    return true;
}

export function getEventImageUrl(event: Event, apiBase?: string): string {
    const base = apiBase || import.meta.env.VITE_SENA_API_URL || 'http://localhost:3001';

    if (event.imageUrl) {
        if (event.imageUrl.startsWith('http')) {
            return event.imageUrl;
        }
        return `${base}${event.imageUrl}`;
    }

    return '/default-event. png';
}

export interface EventValidationError {
    field: string;
    message: string;
}

// ... código anterior sin cambios ...

/**
 * ✅ Helper: Verificar si una fecha es de días pasados (ignora la hora)
 */
function isDateInPast(date: Date): boolean {
    const inputDate = new Date(date);
    const today = new Date();

    // Resetear horas para comparar solo fechas
    inputDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);

    return inputDate < today;
}

export function validateEvent(data: Partial<CreateEventDto>): EventValidationError[] {
    const errors: EventValidationError[] = [];

    if (!data.title || data.title.trim().length === 0) {
        errors. push({ field: 'title', message: 'El título es requerido' });
    } else if (data.title.length > 255) {
        errors.push({ field: 'title', message: 'El título no puede exceder 255 caracteres' });
    }

    if (!data.description || data.description.trim().length === 0) {
        errors.push({ field: 'description', message: 'La descripción es requerida' });
    }

    if (!data.location || data.location.trim().length === 0) {
        errors.push({ field: 'location', message: 'La ubicación es requerida' });
    }

    // ✅ Validación de fecha de inicio - ACTUALIZADO
    if (!data.startDate) {
        errors.push({ field: 'startDate', message: 'La fecha de inicio es requerida' });
    } else {
        const startDate = new Date(data.startDate);

        // ✅ Verificar que NO sea de días pasados (pero permite hoy)
        if (isDateInPast(startDate)) {
            errors.push({ field: 'startDate', message: 'La fecha de inicio no puede ser de días pasados' });
        }
    }

    // ✅ Validación de fecha de fin - ACTUALIZADO
    if (!data.endDate) {
        errors.push({ field: 'endDate', message: 'La fecha de fin es requerida' });
    } else {
        const endDate = new Date(data.endDate);

        // ✅ Verificar que NO sea de días pasados
        if (isDateInPast(endDate)) {
            errors.push({ field: 'endDate', message: 'La fecha de fin no puede ser de días pasados' });
        }

        // ✅ La fecha de fin debe ser igual o posterior a la de inicio
        if (data.startDate) {
            const startDate = new Date(data.startDate);

            if (endDate < startDate) {
                errors.push({ field: 'endDate', message: 'La fecha de fin debe ser igual o posterior a la de inicio' });
            }
        }
    }

    if (data.maxAttendees !== undefined && data.maxAttendees < 1) {
        errors.push({ field: 'maxAttendees', message: 'El máximo de asistentes debe ser al menos 1' });
    }

    return errors;
}