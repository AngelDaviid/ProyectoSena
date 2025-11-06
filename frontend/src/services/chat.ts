import api from './api';
import type { Conversation, Message } from '../types/chat';

export async function getConversations(): Promise<Conversation[]> {
    const res = await api.get<Conversation[]>('/conversations');
    return res.data;
}

export async function getConversation(id: number): Promise<Conversation> {
    const res = await api.get<Conversation>(`/conversations/${id}`);
    return res.data;
}

/**
 * Ahora soporta paginación: page (1..n) y limit.
 * También implementa retry/backoff para status 429.
 */
export async function getMessages(conversationId: number, page = 1, limit = 20, maxRetries = 3): Promise<{ messages: Message[]; hasMore: boolean; }> {
    let attempt = 0;

    const doRequest = async (): Promise<{ messages: Message[]; hasMore: boolean; }> => {
        try {
            const res = await api.get<Message[]>(`/messages/conversation/${conversationId}`, {
                params: { page, limit },
            });
            // Ajusta según la forma en que el backend devuelva la paginación.
            // Aquí asumimos que el cuerpo es { messages: [...], hasMore: boolean } OR un array (en ese caso, calculas hasMore por length).
            const data = res.data as any;
            if (Array.isArray(data)) {
                return {
                    messages: data,
                    hasMore: data.length === limit, // heurística
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
                const backoffMs = 300 * Math.pow(2, attempt - 1); // 300ms, 600ms, 1200ms...
                await new Promise((r) => setTimeout(r, backoffMs));
                return doRequest();
            }
            throw err;
        }
    };

    return doRequest();
}

/**
 * Optional: use REST endpoint to POST a message (with image upload via FormData)
 * Backend requires auth for POST /messages, api instance already attaches Authorization header.
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