import { useEffect, useCallback } from 'react';
import { chatSocket, type NewMessagePayload, type UserTypingPayload } from '../services/sockets/chat.socket';
import { useAuth } from './useAuth';
import { useSocketContext } from '../context/socket-provider';

interface UseChatOptions {
    conversationId: number;
    onNewMessage?: (message: NewMessagePayload) => void;
    onUserTyping?: (payload: UserTypingPayload) => void;
}

export function useChat({ conversationId, onNewMessage, onUserTyping }: UseChatOptions) {
    const { user } = useAuth();
    const { isConnected } = useSocketContext();

    // Unirse a la conversación cuando se monta
    useEffect(() => {
        if (! isConnected || !user?. id || !conversationId) return;

        console.log('[useChat] 👥 Joining conversation:', conversationId);
        chatSocket.joinConversation(conversationId, user.id);

        return () => {
            console.log('[useChat] 👋 Leaving conversation:', conversationId);
            chatSocket.leaveConversation(conversationId, user.id);
        };
    }, [isConnected, user?.id, conversationId]);

    // Escuchar nuevos mensajes
    useEffect(() => {
        if (!onNewMessage) return;

        chatSocket.onNewMessage(onNewMessage);

        return () => {
            chatSocket.offNewMessage(onNewMessage);
        };
    }, [onNewMessage]);

    // Escuchar typing indicator
    useEffect(() => {
        if (!onUserTyping) return;

        chatSocket. onUserTyping(onUserTyping);

        return () => {
            chatSocket.offUserTyping(onUserTyping);
        };
    }, [onUserTyping]);

    // Enviar mensaje
    const sendMessage = useCallback(
        (text: string, imageUrl?: string, tempId?: string) => {
            if (!user?.id) {
                console.warn('[useChat] Cannot send message: no user');
                return;
            }

            chatSocket.sendMessage(conversationId, user.id, text, imageUrl, tempId);
        },
        [conversationId, user?.id]
    );

    // Marcar como visto
    const markAsSeen = useCallback(
        (messageIds: number[]) => {
            if (!user?.id) return;

            chatSocket.markAsSeen(conversationId, messageIds, user.id);
        },
        [conversationId, user?.id]
    );

    // Indicador de escritura
    const sendTyping = useCallback(
        (typing: boolean) => {
            if (!user?.id) return;

            chatSocket.sendTypingIndicator(conversationId, user. id, typing);
        },
        [conversationId, user?. id]
    );

    return {
        sendMessage,
        markAsSeen,
        sendTyping,
        isConnected,
    };
}