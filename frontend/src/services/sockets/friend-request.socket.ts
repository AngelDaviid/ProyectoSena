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

export function onFriendRequestSent(callback: (notification: FriendRequestNotification) => void): void {
    const socket = socketService.getSocket();
    if (socket) {
        socket.on('friendRequestSent', callback);
    }
}

export function offFriendRequestSent(callback?: (notification: FriendRequestNotification) => void): void {
    const socket = socketService.getSocket();
    if (socket) {
        if (callback) {
            socket.off('friendRequestSent', callback);
        } else {
            socket.off('friendRequestSent');
        }
    }
}

export function onFriendRequestAccepted(callback: (notification: FriendRequestAcceptedNotification) => void): void {
    const socket = socketService.getSocket();
    if (socket) {
        socket.on('friendRequestAccepted', callback);
    }
}

export function offFriendRequestAccepted(callback?: (notification: FriendRequestAcceptedNotification) => void): void {
    const socket = socketService.getSocket();
    if (socket) {
        if (callback) {
            socket.off('friendRequestAccepted', callback);
        } else {
            socket.off('friendRequestAccepted');
        }
    }
}

export function onNotification(callback: (notification: any) => void): void {
    const socket = socketService.getSocket();
    if (socket) {
        socket.on('notification', callback);
    }
}

export function offNotification(callback?: (notification: any) => void): void {
    const socket = socketService.getSocket();
    if (socket) {
        if (callback) {
            socket.off('notification', callback);
        } else {
            socket.off('notification');
        }
    }
}