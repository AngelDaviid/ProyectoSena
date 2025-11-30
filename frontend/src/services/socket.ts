export {
    socketService,
    connectSocket,
    disconnectSocket,
    getSocket,
    registerUser,
    isSocketConnected,
    releaseSocket,
    forceDisconnectSocket
} from './sockets/socket';

// Funciones helper para eventos de amistad
import { socketService } from './sockets/socket';

type EventHandler = (...args: any[]) => void;

export function on(event: string, handler: EventHandler) {
    const socket = socketService.getSocket();
    if (socket) socket.on(event, handler);
}

export function off(event: string, handler?: EventHandler) {
    const socket = socketService. getSocket();
    if (socket) {
        if (handler) {
            socket.off(event, handler);
        } else {
            socket.removeAllListeners(event);
        }
    }
}

export function onFriendRequestSent(handler: (payload: any) => void) {
    on('friendRequestSent', handler);
}

export function offFriendRequestSent(handler?: (payload: any) => void) {
    off('friendRequestSent', handler);
}

export function onFriendRequestAccepted(handler: (payload: any) => void) {
    on('friendRequestAccepted', handler);
}

export function offFriendRequestAccepted(handler?: (payload: any) => void) {
    off('friendRequestAccepted', handler);
}

export function onFriendRequestRejected(handler: (payload: any) => void) {
    on('friendRequestRejected', handler);
}

export function offFriendRequestRejected(handler?: (payload: any) => void) {
    off('friendRequestRejected', handler);
}

export function onFriendRequestDeleted(handler: (payload: any) => void) {
    on('friendRequestDeleted', handler);
}

export function offFriendRequestDeleted(handler?: (payload: any) => void) {
    off('friendRequestDeleted', handler);
}

export function onUserBlocked(handler: (payload: any) => void) {
    on('userBlocked', handler);
}

export function offUserBlocked(handler?: (payload: any) => void) {
    off('userBlocked', handler);
}