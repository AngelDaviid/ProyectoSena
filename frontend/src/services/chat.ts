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

export async function getMessages(conversationId: number): Promise<Message[]> {
    const res = await api.get<Message[]>(`/messages/conversation/${conversationId}`);
    return res.data;
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