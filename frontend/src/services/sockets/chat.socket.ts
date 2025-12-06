import api from '../api.ts';
import type { Conversation, Message } from '../../types/chat.ts';

/**
 * Cache corto para /conversations para evitar ráfagas.
 * In-flight promise para evitar duplicar requests concurrentes.
 */
let _conversationsCache: { ts: number; data: Conversation[] } | null = null;
let _conversationsInFlight: Promise<Conversation[]> | null = null;
const CONVERSATIONS_CACHE_TTL = 5000; // 5 segundos


export interface NewMessagePayload {
    message: Message;
    conversationId: number;
}

export interface UserTypingPayload {
    userId: number;
    conversationId: number;
    isTyping: boolean;
}
/**
 * Obtener todas las conversaciones del usuario actual
 */
export async function getConversations(): Promise<Conversation[]> {
    // Si hay cache reciente, devuelve
    if (_conversationsCache && (Date.now() - _conversationsCache.ts) < CONVERSATIONS_CACHE_TTL) {
        console.log('[ChatSocket] Using cached conversations');
        return _conversationsCache.data;
    }

    // Si ya hay una petición en vuelo, devuelve la misma promesa
    if (_conversationsInFlight) {
        console. log('[ChatSocket] Request already in flight, waiting.. .');
        return _conversationsInFlight;
    }

    _conversationsInFlight = (async () => {
        try {
            console.log('[ChatSocket] Fetching conversations from API.. .');
            const res = await api.get<Conversation[]>('/chat/conversations');
            console.log('[ChatSocket] Conversations fetched successfully:', res.data?. length || 0);
            _conversationsCache = { ts: Date.now(), data: res.data };
            return res.data;
        } catch (error: any) {
            console.error('[ChatSocket] Error getting conversations:', error);
            console.error('[ChatSocket] Error details:', {
                message: error?. message,
                response: error?. response?.data,
                status: error?.response?.status,
                url: error?.config?.url
            });
            throw error;
        } finally {
            // reset inFlight después de que termine (success o error)
            _conversationsInFlight = null;
        }
    })();

    return _conversationsInFlight;
}

/**
 * Obtener una conversación específica por ID
 */
export async function getConversation(id: number): Promise<Conversation> {
    try {
        console.log('[ChatSocket] Getting conversation:', id);
        const res = await api.get<Conversation>(`/chat/conversations/${id}`);
        console. log('[ChatSocket] Conversation fetched:', res.data);
        return res.data;
    } catch (error: any) {
        console.error('[ChatSocket] Error getting conversation:', error);
        console. error('[ChatSocket] Error details:', {
            message: error?.message,
            response: error?.response?.data,
            status: error?.response?.status
        });
        throw error;
    }
}

/**
 * getMessages: paginación + in-flight por conversationId para evitar varios requests iguales simultáneos.
 */
const messagesInFlight: Record<number, Promise<{ messages: Message[]; hasMore: boolean }> | null> = {};

export async function getMessages(
    conversationId: number,
    page = 1,
    limit = 20,
    maxRetries = 3
): Promise<{ messages: Message[]; hasMore: boolean; }> {
    // Si ya hay una petición en vuelo para la misma conv + página -> devolverla
    if (messagesInFlight[conversationId]) {
        console.log('[ChatSocket] Messages request already in flight for conversation:', conversationId);
        return messagesInFlight[conversationId]!;
    }

    let attempt = 0;

    const doRequest = async (): Promise<{ messages: Message[]; hasMore: boolean; }> => {
        try {
            console.log(`[ChatSocket] Fetching messages for conversation ${conversationId}, page ${page}, attempt ${attempt + 1}`);
            const res = await api.get(`/chat/messages/conversation/${conversationId}`, {
                params: { page, limit },
            });
            const data = res.data as any;

            if (Array.isArray(data)) {
                console.log(`[ChatSocket] Received ${data.length} messages`);
                return {
                    messages: data,
                    hasMore: data. length === limit,
                };
            }

            console.log(`[ChatSocket] Received ${data.messages?. length || 0} messages, hasMore: ${data.hasMore}`);
            return {
                messages: data.messages ??  [],
                hasMore: data. hasMore ??  false,
            };
        } catch (err: any) {
            attempt++;
            const status = err?. response?.status;

            if (status === 429 && attempt <= maxRetries) {
                const backoffMs = 300 * Math.pow(2, attempt - 1);
                console.warn(`[ChatSocket] Rate limited (429), retrying in ${backoffMs}ms...   (attempt ${attempt}/${maxRetries})`);
                await new Promise((r) => setTimeout(r, backoffMs));
                return doRequest();
            }

            console.error('[ChatSocket] Error fetching messages:', err);
            console.error('[ChatSocket] Error details:', {
                message: err?. message,
                response: err?. response?.data,
                status: err?.response?.status
            });
            throw err;
        }
    };

    // Guard: marcar inFlight por conversationId (para evitar duplicados simultáneos)
    const p = doRequest(). finally(() => {
        messagesInFlight[conversationId] = null;
    });

    messagesInFlight[conversationId] = p;
    return p;
}

/**
 * POST a message (subida de archivos por FormData)
 */
export async function postMessage(formData: FormData) {
    try {
        console.log('[ChatSocket] Posting message.. .');
        const res = await api.post('/messages', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        console.log('[ChatSocket] Message posted successfully:', res. data);
        return res.data;
    } catch (error: any) {
        console.error('[ChatSocket] Error posting message:', error);
        console.error('[ChatSocket] Error details:', {
            message: error?.message,
            response: error?.response?.data,
            status: error?.response?.status
        });
        throw error;
    }
}

/**
 * Create conversation via REST
 */
export async function createConversation(participantIds: number[]) {
    try {
        console.log('[ChatSocket] Creating conversation with participants:', participantIds);
        const res = await api.post('/chat/conversations', { participantIds });
        console. log('[ChatSocket] Conversation created successfully:', res.data);

        // Invalidar cache de conversaciones
        _conversationsCache = null;

        return res. data;
    } catch (error: any) {
        console. error('[ChatSocket] Error creating conversation:', error);
        console.error('[ChatSocket] Error details:', {
            message: error?.message,
            response: error?.response?. data,
            status: error?. response?.status,
            url: error?.config?. url
        });
        throw error;
    }
}

/**
 * Invalidar cache de conversaciones (útil después de crear/eliminar)
 */
export function invalidateConversationsCache() {
    console.log('[ChatSocket] Invalidating conversations cache');
    _conversationsCache = null;
}

/**
 * Forzar recarga de conversaciones (útil para refresh manual)
 */
export async function refreshConversations(): Promise<Conversation[]> {
    invalidateConversationsCache();
    return getConversations();
}

// ==================== FUNCIONES DE SOCKET ====================

/**
 * Unirse a una conversación (WebSocket)
 */
export function joinConversation(conversationId: number, userId: number) {
    console.log('[ChatSocket] Joining conversation:', { conversationId, userId });
    // Implementación vacía por ahora - se puede implementar si necesitas room-based sockets
}

/**
 * Salir de una conversación (WebSocket)
 */
export function leaveConversation(conversationId: number, userId: number) {
    console.log('[ChatSocket] Leaving conversation:', { conversationId, userId });
    // Implementación vacía por ahora
}

/**
 * Enviar mensaje vía WebSocket
 */
export function sendMessage(
    conversationId: number,
    userId: number,
    text: string,
    imageUrl?: string,
    tempId?: string
) {
    console.log('[ChatSocket] Sending message via socket:', {
        conversationId,
        userId,
        text,
        imageUrl,
        tempId
    });

    // Por ahora redirige a postMessage (REST)
    const formData = new FormData();
    formData.append('conversationId', conversationId.toString());
    formData.append('content', text);

    if (imageUrl) {
        formData.append('imageUrl', imageUrl);
    }

    if (tempId) {
        formData.append('tempId', tempId);
    }

    return postMessage(formData);
}

/**
 * Marcar mensajes como vistos
 */
export function markAsSeen(conversationId: number, messageIds: number[], userId: number) {
    console.log('[ChatSocket] Marking messages as seen:', {
        conversationId,
        messageIds,
        userId
    });
    // Implementar cuando tengas el endpoint en el backend
    return Promise.resolve();
}

/**
 * Enviar indicador de "está escribiendo..."
 */
export function sendTypingIndicator(conversationId: number, userId: number, isTyping: boolean) {
    console.log('[ChatSocket] Typing indicator:', { conversationId, userId, isTyping });
    // Implementar cuando tengas WebSocket en el backend
    return Promise.resolve();
}

/**
 * Escuchar nuevos mensajes
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function onNewMessage(_callback: (payload: NewMessagePayload) => void) {
    console.log('[ChatSocket] Listening for new messages');
    // Implementar con socket.on('newMessage', callback) cuando esté disponible
}

/**
 * Dejar de escuchar nuevos mensajes
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function offNewMessage(_callback: (payload: NewMessagePayload) => void) {
    console.log('[ChatSocket] Stopped listening for new messages');
    // Implementar con socket.off('newMessage', callback)
}

/**
 * Escuchar indicador de "está escribiendo..."
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function onUserTyping(_callback: (payload: UserTypingPayload) => void) {
    console.log('[ChatSocket] Listening for typing indicators');
    // Implementar con socket.on('userTyping', callback)
}

/**
 * Dejar de escuchar indicador de "está escribiendo..."
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function offUserTyping(_callback: (payload: UserTypingPayload) => void) {
    console.log('[ChatSocket] Stopped listening for typing indicators');
    // Implementar con socket.off('userTyping', callback)
}
// ==================== EXPORT DEFAULT (PARA COMPATIBILIDAD) ====================

/**
 * Export por defecto para compatibilidad con imports antiguos
 * Permite: import chatSocket from './chat.socket'
 * O: import { chatSocket } from './chat.socket'
 */
export const chatSocket = {
    getConversations,
    getConversation,
    getMessages,
    postMessage,
    createConversation,
    invalidateConversationsCache,
    refreshConversations,
    joinConversation,
    leaveConversation,
    sendMessage,
    markAsSeen,
    sendTypingIndicator,
    onNewMessage,
    offNewMessage,
    onUserTyping,
    offUserTyping,
};

export default chatSocket;