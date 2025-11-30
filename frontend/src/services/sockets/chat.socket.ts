import { socketService } from './socket';
import axios from 'axios';

const API_URL = import.meta.env.VITE_SENA_API_URL || 'http://localhost:3001';

// ==================== TYPES ====================

export interface NewMessagePayload {
    id: number;
    text: string;
    imageUrl: string | null;
    createdAt: string;
    senderId: number;
    conversationId: number;
    tempId?: string | null;
}

export interface MessageSeenPayload {
    conversationId: number;
    messageIds: number[];
    userId: number;
    timestamp: string;
}

export interface UserTypingPayload {
    conversationId: number;
    userId: number;
    typing: boolean;
    timestamp: string;
}

export interface NewMessageNotificationPayload {
    conversationId: number;
    message: NewMessagePayload;
    timestamp: string;
}

// ==================== API CALLS ====================

export async function getConversations() {
    try {
        const token = localStorage.getItem('access_token');
        const response = await axios.get(`${API_URL}/chat/conversations`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        return response.data;
    } catch (err) {
        console.error('[ChatSocket] Error getting conversations:', err);
        throw err;
    }
}

export async function getMessages(conversationId: number, page = 1, limit = 50) {
    try {
        const token = localStorage.getItem('access_token');
        const response = await axios.get(
            `${API_URL}/chat/conversations/${conversationId}/messages`,
            {
                params: { page, limit },
                headers: { Authorization: `Bearer ${token}` },
            },
        );
        return response.data;
    } catch (err) {
        console.error('[ChatSocket] Error getting messages:', err);
        throw err;
    }
}

/**
 * Create conversation via REST API
 */
export async function createConversation(participantIds: number[]) {
    try {
        const token = localStorage.getItem('access_token');
        const response = await axios.post(
            `${API_URL}/chat/conversations`,
            { participantIds },
            {
                headers: { Authorization: `Bearer ${token}` },
            }
        );
        return response.data;
    } catch (err) {
        console.error('[ChatSocket] Error creating conversation:', err);
        throw err;
    }
}

// ==================== CHAT SOCKET SERVICE ====================

export class ChatSocketService {
    /**
     * Unirse a una conversación
     */
    joinConversation(conversationId: number): void {
        console.log('[ChatSocket] 👥 Joining conversation:', conversationId);
        socketService.emit('joinConversation', { conversationId: String(conversationId) });
    }

    /**
     * Salir de una conversación
     */
    leaveConversation(conversationId: number): void {
        console.log('[ChatSocket] 👋 Leaving conversation:', conversationId);
        socketService.emit('leaveConversation', { conversationId: String(conversationId) });
    }

    /**
     * Enviar un mensaje
     */
    sendMessage(
        conversationId: number,
        senderId: number,
        text: string,
        imageUrl?: string,
        tempId?: string,
    ): void {
        console.log('[ChatSocket] 💬 Sending message to conversation:', conversationId);
        socketService.emit('sendMessage', {
            conversationId: String(conversationId),
            senderId: String(senderId),
            text,
            imageUrl,
            tempId,
        });
    }

    /**
     * Marcar mensajes como vistos
     */
    markAsSeen(conversationId: number, messageIds: number[], userId: number): void {
        console.log('[ChatSocket] 👁️ Marking messages as seen:', messageIds. length);
        socketService.emit('messageSeen', {
            conversationId: String(conversationId),
            messageIds,
            userId,
        });
    }

    /**
     * Notificar que estás escribiendo
     */
    sendTypingIndicator(conversationId: number, userId: number, typing: boolean): void {
        socketService.emit('typing', {
            conversationId: String(conversationId),
            senderId: String(userId),
            typing,
        });
    }

    // ==================== LISTENERS ====================

    /**
     * Escuchar nuevos mensajes
     */
    onNewMessage(callback: (payload: NewMessagePayload) => void): void {
        socketService.on('newMessage', callback);
    }

    offNewMessage(callback?: (payload: NewMessagePayload) => void): void {
        socketService.off('newMessage', callback);
    }

    /**
     * Escuchar notificaciones de mensajes (GLOBALES)
     */
    onNewMessageNotification(callback: (payload: NewMessageNotificationPayload) => void): void {
        socketService.on('newMessageNotification', callback);
    }

    offNewMessageNotification(callback?: (payload: NewMessageNotificationPayload) => void): void {
        socketService.off('newMessageNotification', callback);
    }

    /**
     * Escuchar cuando alguien marca mensajes como vistos
     */
    onMessageSeen(callback: (payload: MessageSeenPayload) => void): void {
        socketService.on('messageSeen', callback);
    }

    offMessageSeen(callback?: (payload: MessageSeenPayload) => void): void {
        socketService.off('messageSeen', callback);
    }

    /**
     * Escuchar cuando alguien está escribiendo
     */
    onUserTyping(callback: (payload: UserTypingPayload) => void): void {
        socketService. on('userTyping', callback);
    }

    offUserTyping(callback?: (payload: UserTypingPayload) => void): void {
        socketService.off('userTyping', callback);
    }



    /**
     * Escuchar confirmación de unirse
     */
    onJoinedConversation(callback: (data: any) => void): void {
        socketService.on('joinedConversation', callback);
    }

    offJoinedConversation(callback?: (data: any) => void): void {
        socketService.off('joinedConversation', callback);
    }
}

// Exportar instancia única
export const chatSocket = new ChatSocketService();