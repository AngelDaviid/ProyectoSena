import api from './api';
import type { Conversation, Message } from '../types/chat';

/**
 * Cache corto para /conversations para evitar ráfagas.
 * In-flight promise para evitar duplicar requests concurrentes.
 */
let _conversationsCache: { ts: number; data: Conversation[] } | null = null;
let _conversationsInFlight: Promise<Conversation[]> | null = null;
const CONVERSATIONS_CACHE_TTL = 5000; // 5 segundos

export async function getConversations(): Promise<Conversation[]> {
    // Si hay cache reciente, devuelve
    if (_conversationsCache && (Date.now() - _conversationsCache.ts) < CONVERSATIONS_CACHE_TTL) {
        return _conversationsCache.data;
    }

    // Si ya hay una petición en vuelo, devuelve la misma promesa
    if (_conversationsInFlight) {
        return _conversationsInFlight;
    }

    _conversationsInFlight = (async () => {
        try {
            const res = await api.get<Conversation[]>('/conversations');
            _conversationsCache = { ts: Date.now(), data: res.data };
            return res.data;
        } finally {
            // reset inFlight después de que termine (success o error)
            _conversationsInFlight = null;
        }
    })();

    return _conversationsInFlight;
}

/**
 * getConversation sin cambios
 */
export async function getConversation(id: number): Promise<Conversation> {
    const res = await api.get<Conversation>(`/conversations/${id}`);
    return res.data;
}

/**
 * getMessages: paginación + in-flight por conversationId para evitar varios requests iguales simultáneos.
 */
const messagesInFlight: Record<number, Promise<{ messages: Message[]; hasMore: boolean }> | null> = {};

export async function getMessages(conversationId: number, page = 1, limit = 20, maxRetries = 3): Promise<{ messages: Message[]; hasMore: boolean; }> {
    // Si ya hay una petición en vuelo para la misma conv + página -> devolverla
    // (opcionalmente podrías indexar también por page si quieres)
    if (messagesInFlight[conversationId]) {
        return messagesInFlight[conversationId]!;
    }

    let attempt = 0;

    const doRequest = async (): Promise<{ messages: Message[]; hasMore: boolean; }> => {
        try {
            console.debug(`[chat.service] getMessages conv=${conversationId} page=${page} attempt=${attempt}`);
            const res = await api.get(`/messages/conversation/${conversationId}`, {
                params: { page, limit },
            });
            const data = res.data as any;
            if (Array.isArray(data)) {
                return {
                    messages: data,
                    hasMore: data.length === limit,
                };
            }
            return {
                messages: data.messages ?? [],
                hasMore: data.hasMore ?? false,
            };
        } catch (err: any) {
            attempt++;
            const status = err?.response?.status;
            if (status === 429 && attempt <= maxRetries) {
                const backoffMs = 300 * Math.pow(2, attempt - 1);
                await new Promise((r) => setTimeout(r, backoffMs));
                return doRequest();
            }
            throw err;
        }
    };

    // Guard: marcar inFlight por conversationId (para evitar duplicados simultáneos)
    const p = doRequest().finally(() => {
        messagesInFlight[conversationId] = null;
    });
    messagesInFlight[conversationId] = p;
    return p;
}

/**
 * POST a message (subida de archivos por FormData)
 */
export async function postMessage(formData: FormData) {
    const res = await api.post('/messages', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
}

/**
 * Create conversation via REST
 */
export async function createConversation(participantIds: number[]) {
    const res = await api.post('/conversations', { participantIds });
    return res.data;
}