import api from './api';
import type { Event, FilterEventsParams } from '../types/event';

/**
 * Cache corto para /events para evitar ráfagas.
 * In-flight promise para evitar duplicar requests concurrentes.
 */
let _eventsCache: { ts: number; data: { events: Event[]; total: number } } | null = null;
let _eventsInFlight: Promise<{ events: Event[]; total: number }> | null = null;
const EVENTS_CACHE_TTL = 5000; // 5 segundos

const getAuthToken = () => localStorage.getItem('token');

/**
 * Obtener lista de eventos con filtros (paginado)
 */
export async function getEvents(filters?: FilterEventsParams): Promise<{ events: Event[]; total: number }> {
    // Si no hay filtros y hay cache reciente, devuelve
    if (! filters && _eventsCache && (Date.now() - _eventsCache.ts) < EVENTS_CACHE_TTL) {
        return _eventsCache.data;
    }

    // Si ya hay una petición en vuelo sin filtros, devuelve la misma promesa
    if (! filters && _eventsInFlight) {
        return _eventsInFlight;
    }

    const doRequest = async () => {
        try {
            const token = getAuthToken();
            const params = new URLSearchParams();

            if (filters) {
                Object.entries(filters).forEach(([key, value]) => {
                    if (value !== undefined && value !== null) {
                        params.append(key, String(value));
                    }
                });
            }

            const res = await api.get<{ events: Event[]; total: number }>(
                `/events?${params.toString()}`,
                {
                    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
                }
            );

            // Solo cachear si no hay filtros
            if (!filters) {
                _eventsCache = { ts: Date.now(), data: res.data };
            }

            return res.data;
        } finally {
            if (! filters) {
                _eventsInFlight = null;
            }
        }
    };

    if (! filters) {
        _eventsInFlight = doRequest();
        return _eventsInFlight;
    }

    return doRequest();
}

/**
 * Obtener un evento por ID
 */
export async function getEvent(id: number): Promise<Event> {
    const token = getAuthToken();
    const res = await api.get<Event>(`/events/${id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
    return res.data;
}

/**
 * Crear nuevo evento
 */
export async function createEvent(formData: FormData): Promise<Event> {
    const token = getAuthToken();
    if (!token) throw new Error('No autenticado');

    const res = await api.post<Event>('/events', formData, {
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
        },
    });

    // Invalidar cache
    _eventsCache = null;

    return res.data;
}

/**
 * Actualizar evento
 */
export async function updateEvent(id: number, formData: FormData): Promise<Event> {
    const token = getAuthToken();
    if (!token) throw new Error('No autenticado');

    const res = await api.patch<Event>(`/events/${id}`, formData, {
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
        },
    });

    // Invalidar cache
    _eventsCache = null;

    return res.data;
}

/**
 * Eliminar evento
 */
export async function deleteEvent(id: number): Promise<void> {
    const token = getAuthToken();
    if (! token) throw new Error('No autenticado');

    await api. delete(`/events/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
    });

    // Invalidar cache
    _eventsCache = null;
}

/**
 * Publicar evento (cambiar de borrador a público)
 */
export async function publishEvent(id: number): Promise<Event> {
    const token = getAuthToken();
    if (!token) throw new Error('No autenticado');

    const res = await api.post<Event>(`/events/${id}/publish`, {}, {
        headers: { Authorization: `Bearer ${token}` },
    });

    // Invalidar cache
    _eventsCache = null;

    return res. data;
}

/**
 * Registrarse a un evento
 */
export async function registerToEvent(id: number, maxRetries = 3): Promise<{ message: string }> {
    const token = getAuthToken();
    if (!token) throw new Error('No autenticado');

    let attempt = 0;

    const doRequest = async (): Promise<{ message: string }> => {
        try {
            console.debug(`[events.service] registerToEvent id=${id} attempt=${attempt}`);
            const res = await api. post<{ message: string }>(
                `/events/${id}/register`,
                {},
                {
                    headers: { Authorization: `Bearer ${token}` },
                }
            );
            return res. data;
        } catch (err: any) {
            attempt++;
            const status = err?.response?.status;

            // Retry en caso de 429 (Too Many Requests)
            if (status === 429 && attempt <= maxRetries) {
                const backoffMs = 300 * Math.pow(2, attempt - 1);
                console.warn(`[events.service] Rate limited, retrying in ${backoffMs}ms... `);
                await new Promise((r) => setTimeout(r, backoffMs));
                return doRequest();
            }

            throw err;
        }
    };

    return doRequest();
}

/**
 * Desregistrarse de un evento
 */
export async function unregisterFromEvent(id: number): Promise<{ message: string }> {
    const token = getAuthToken();
    if (!token) throw new Error('No autenticado');

    const res = await api.delete<{ message: string }>(`/events/${id}/unregister`, {
        headers: { Authorization: `Bearer ${token}` },
    });

    return res.data;
}

/**
 * Obtener eventos creados por el usuario actual
 */
let _myEventsCache: { ts: number; data: Event[] } | null = null;
let _myEventsInFlight: Promise<Event[]> | null = null;

export async function getMyEvents(): Promise<Event[]> {
    // Cache
    if (_myEventsCache && (Date.now() - _myEventsCache.ts) < EVENTS_CACHE_TTL) {
        return _myEventsCache.data;
    }

    // In-flight
    if (_myEventsInFlight) {
        return _myEventsInFlight;
    }

    _myEventsInFlight = (async () => {
        try {
            const token = getAuthToken();
            if (!token) throw new Error('No autenticado');

            const res = await api.get<Event[]>('/events/user/my-events', {
                headers: { Authorization: `Bearer ${token}` },
            });

            _myEventsCache = { ts: Date.now(), data: res.data };
            return res.data;
        } finally {
            _myEventsInFlight = null;
        }
    })();

    return _myEventsInFlight;
}

/**
 * Obtener eventos a los que el usuario está inscrito
 */
let _registeredEventsCache: { ts: number; data: Event[] } | null = null;
let _registeredEventsInFlight: Promise<Event[]> | null = null;

export async function getRegisteredEvents(): Promise<Event[]> {
    // Cache
    if (_registeredEventsCache && (Date.now() - _registeredEventsCache.ts) < EVENTS_CACHE_TTL) {
        return _registeredEventsCache.data;
    }

    // In-flight
    if (_registeredEventsInFlight) {
        return _registeredEventsInFlight;
    }

    _registeredEventsInFlight = (async () => {
        try {
            const token = getAuthToken();
            if (!token) throw new Error('No autenticado');

            const res = await api.get<Event[]>('/events/user/registered', {
                headers: { Authorization: `Bearer ${token}` },
            });

            _registeredEventsCache = { ts: Date. now(), data: res.data };
            return res.data;
        } finally {
            _registeredEventsInFlight = null;
        }
    })();

    return _registeredEventsInFlight;
}

/**
 * Invalidar todos los caches de eventos (útil después de crear/actualizar/eliminar)
 */
export function invalidateEventsCache(): void {
    _eventsCache = null;
    _myEventsCache = null;
    _registeredEventsCache = null;
}