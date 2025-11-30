import { socketService } from './socket';

export interface FriendRequestNotification {
    id: number;
    sender: {
        id: number;
        email: string;
        profile?: {
            name?: string;
            lastName?: string;
            avatar?: string;
        };
    };
    receiver: {
        id: number;
        email: string;
    };
    status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
    createdAt: string;
}

export interface FriendRequestAcceptedNotification {
    request: FriendRequestNotification;
    message?: string;
}

/**
 * Escuchar cuando SE RECIBE una nueva solicitud de amistad
 */
export function onFriendRequestSent(callback: (notification: FriendRequestNotification) => void): void {
    const socket = socketService.getSocket();
    if (socket) {
        socket.on('friendRequestSent', callback);
        console.log('[FriendSocket] 📩 Listening to friendRequestSent');
    }
}

/**
 * Dejar de escuchar solicitudes recibidas
 */
export function offFriendRequestSent(callback?: (notification: FriendRequestNotification) => void): void {
    const socket = socketService.getSocket();
    if (socket) {
        if (callback) {
            socket. off('friendRequestSent', callback);
        } else {
            socket.off('friendRequestSent');
        }
        console.log('[FriendSocket] 🔕 Stopped listening to friendRequestSent');
    }
}

/**
 * Escuchar cuando una solicitud que ENVIASTE fue aceptada
 */
export function onFriendRequestAccepted(callback: (notification: FriendRequestAcceptedNotification) => void): void {
    const socket = socketService.getSocket();
    if (socket) {
        socket.on('friendRequestAccepted', callback);
        console.log('[FriendSocket] ✅ Listening to friendRequestAccepted');
    }
}

/**
 * Dejar de escuchar aceptaciones
 */
export function offFriendRequestAccepted(callback?: (notification: FriendRequestAcceptedNotification) => void): void {
    const socket = socketService.getSocket();
    if (socket) {
        if (callback) {
            socket.off('friendRequestAccepted', callback);
        } else {
            socket.off('friendRequestAccepted');
        }
        console.log('[FriendSocket] 🔕 Stopped listening to friendRequestAccepted');
    }
}

/**
 * Escuchar notificaciones genéricas
 */
export function onNotification(callback: (notification: any) => void): void {
    const socket = socketService.getSocket();
    if (socket) {
        socket.on('notification', callback);
        console.log('[FriendSocket] 🔔 Listening to notifications');
    }
}

/**
 * Dejar de escuchar notificaciones genéricas
 */
export function offNotification(callback?: (notification: any) => void): void {
    const socket = socketService. getSocket();
    if (socket) {
        if (callback) {
            socket.off('notification', callback);
        } else {
            socket.off('notification');
        }
        console.log('[FriendSocket] 🔕 Stopped listening to notifications');
    }
}