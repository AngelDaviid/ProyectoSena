import api from '../api.ts';
import type { Conversation, Message } from '../../types/chat.ts';

let _conversationsCache: { ts: number; data: Conversation[] } | null = null;
let _conversationsInFlight: Promise<Conversation[]> | null = null;
const CONVERSATIONS_CACHE_TTL = 5000;

export interface NewMessagePayload {
    message: Message;
    conversationId: number;
}

export interface UserTypingPayload {
    userId: number;
    conversationId: number;
    isTyping: boolean;
}

export async function getConversations(): Promise<Conversation[]> {
    if (_conversationsCache && (Date.now() - _conversationsCache.ts) < CONVERSATIONS_CACHE_TTL) {
        return _conversationsCache.data;
    }

    if (_conversationsInFlight) {
        return _conversationsInFlight;
    }

    _conversationsInFlight = (async () => {
        try {
            const res = await api.get<Conversation[]>('/chat/conversations');
            _conversationsCache = { ts: Date.now(), data: res.data };
            return res.data;
        } catch (error: any) {
            console.error('[ChatSocket] Error getting conversations:', error?.message);
            throw error;
        } finally {
            _conversationsInFlight = null;
        }
    })();

    return _conversationsInFlight;
}

export async function getConversation(id: number): Promise<Conversation> {
    try {
        const res = await api.get<Conversation>(`/chat/conversations/${id}`);
        return res.data;
    } catch (error: any) {
        console.error('[ChatSocket] Error getting conversation:', error?.message);
        throw error;
    }
}

const messagesInFlight: Record<number, Promise<{ messages: Message[]; hasMore: boolean }> | null> = {};

export async function getMessages(
    conversationId: number,
    page = 1,
    limit = 20,
    maxRetries = 3
): Promise<{ messages: Message[]; hasMore: boolean; }> {
    if (messagesInFlight[conversationId]) {
        return messagesInFlight[conversationId]!;
    }

    let attempt = 0;

    const doRequest = async (): Promise<{ messages: Message[]; hasMore: boolean; }> => {
        try {
            const res = await api.get(`/chat/messages/conversation/${conversationId}`, {
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

            console.error('[ChatSocket] Error fetching messages:', err?.message);
            throw err;
        }
    };

    const p = doRequest().finally(() => {
        messagesInFlight[conversationId] = null;
    });

    messagesInFlight[conversationId] = p;
    return p;
}

export async function postMessage(formData: FormData) {
    try {
        const res = await api.post('/messages', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return res.data;
    } catch (error: any) {
        console.error('[ChatSocket] Error posting message:', error?.message);
        throw error;
    }
}

export async function createConversation(participantIds: number[]) {
    try {
        const res = await api.post('/chat/conversations', { participantIds });
        _conversationsCache = null;
        return res.data;
    } catch (error: any) {
        console.error('[ChatSocket] Error creating conversation:', error?.message);
        throw error;
    }
}

export function invalidateConversationsCache() {
    _conversationsCache = null;
}

export async function refreshConversations(): Promise<Conversation[]> {
    invalidateConversationsCache();
    return getConversations();
}

export function joinConversation(conversationId: number, userId: number) {
    // Implementation: WebSocket room-based sockets
}

export function leaveConversation(conversationId: number, userId: number) {
    // Implementation: WebSocket room-based sockets
}

export function sendMessage(
    conversationId: number,
    userId: number,
    text: string,
    imageUrl?: string,
    tempId?: string
) {
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

export function markAsSeen(conversationId: number, messageIds: number[], userId: number) {
    // Implementation: Backend endpoint pending
    return Promise.resolve();
}

export function sendTypingIndicator(conversationId: number, userId: number, isTyping: boolean) {
    // Implementation: WebSocket pending
    return Promise.resolve();
}

export function onNewMessage(_callback: (payload: NewMessagePayload) => void) {
    // Implementation: socket.on('newMessage', callback)
}

export function offNewMessage(_callback: (payload: NewMessagePayload) => void) {
    // Implementation: socket.off('newMessage', callback)
}

export function onUserTyping(_callback: (payload: UserTypingPayload) => void) {
    // Implementation: socket.on('userTyping', callback)
}

export function offUserTyping(_callback: (payload: UserTypingPayload) => void) {
    // Implementation: socket.off('userTyping', callback)
}

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

