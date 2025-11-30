import { io, Socket } from 'socket.io-client';

type EventHandler = (...args: any[]) => void;

const API_BASE = import.meta.env.VITE_SENA_API_URL || 'http://localhost:3001';
const NAMESPACE = '/ws';

let socket: Socket | null = null;
let refCount = 0;
let disconnectTimer: ReturnType<typeof setTimeout> | null = null;
const DISCONNECT_DELAY_MS = 300;
let currentAuthToken: string | null = null;

/**
 * Crea la instancia de socket (no la conecta automáticamente).
 */
function createSocket(authToken: string | null = null): Socket {
    if (socket) {
        // Si ya existe un socket, solo actualizamos el token sin recrear
        if (authToken && authToken !== currentAuthToken) {
            currentAuthToken = authToken;
            socket.auth = { token: currentAuthToken };
            console.debug('[socket] token updated, will reconnect if needed');
        }
        return socket;
    }

    currentAuthToken = authToken;

    socket = io(`${API_BASE}${NAMESPACE}`, {
        transports: ['websocket', 'polling'],
        autoConnect: false,
        auth: currentAuthToken ?  { token: currentAuthToken } : undefined,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 20000,
    });

    // Event listeners
    socket.on('connect', () => {
        console. debug('[socket] ✅ connected', socket?. id);
    });

    socket.on('connect_error', (err: any) => {
        console. warn('[socket] ❌ connect_error', err?. message || err);
    });

    socket.on('disconnect', (reason) => {
        console.debug('[socket] 🔌 disconnected', reason);
    });

    socket.on('error', (e: any) => {
        console. error('[socket] ⚠️ error', e);
    });

    socket.io.on('reconnect_attempt', (attempt) => {
        console.debug(`[socket] 🔄 reconnect attempt ${attempt}`);
    });

    socket.io.on('reconnect', (attempt) => {
        console.debug(`[socket] ✅ reconnected after ${attempt} attempts`);
    });

    socket.io.on('reconnect_failed', () => {
        console. error('[socket] ❌ reconnection failed');
    });

    return socket;
}

/**
 * Incrementa referencias y conecta el socket.
 * - token (opcional): autenticación JWT
 * - retorna la instancia conectada (o en proceso de conectar).
 */
export function connectSocket(token?: string): Socket {
    refCount += 1;
    console.debug(`[socket] connectSocket called, refCount=${refCount}`);

    if (disconnectTimer) {
        clearTimeout(disconnectTimer);
        disconnectTimer = null;
    }

    // Crear o actualizar socket
    const s = createSocket(token ??  currentAuthToken);

    // Actualizar token si cambió
    if (token && token !== currentAuthToken) {
        currentAuthToken = token;
        s.auth = { token: currentAuthToken };

        // Si ya está conectado, reconectar para usar el nuevo token
        if (s.connected) {
            s.disconnect(). connect();
        }
    }

    // Conectar si no está conectado
    if (! s.connected) {
        try {
            s.connect();
        } catch (e) {
            console.error('[socket] connect error', e);
        }
    }

    return s;
}

/**
 * Resta una referencia.  Si quedan 0 referencias, desconecta después de un delay.
 */
export function releaseSocket(): void {
    refCount = Math.max(0, refCount - 1);
    console. debug(`[socket] releaseSocket called, refCount=${refCount}`);

    if (refCount === 0) {
        if (disconnectTimer) clearTimeout(disconnectTimer);

        disconnectTimer = setTimeout(() => {
            console.debug('[socket] disconnecting due to zero refs');
            try {
                socket?.disconnect();
                socket?. removeAllListeners();
            } catch (e) {
                console. warn('[socket] error during disconnect', e);
            }
            socket = null;
            disconnectTimer = null;
            currentAuthToken = null;
        }, DISCONNECT_DELAY_MS);
    }
}

/**
 * Fuerza la desconexión inmediata y resetea referencias.
 */
export function forceDisconnectSocket(): void {
    console.debug('[socket] force disconnect');
    refCount = 0;

    if (disconnectTimer) {
        clearTimeout(disconnectTimer);
        disconnectTimer = null;
    }

    try {
        socket?.disconnect();
        socket?.removeAllListeners();
    } catch (e) {
        console.warn('[socket] error during force disconnect', e);
    }

    socket = null;
    currentAuthToken = null;
}

/**
 * Devuelve la instancia de socket (la crea si no existe, pero NO la conecta).
 */
export function getSocket(): Socket {
    if (!socket) {
        createSocket(currentAuthToken);
    }
    return socket! ;
}

/**
 * Alias semántico para releaseSocket
 */
export function disconnectSocket(): void {
    releaseSocket();
}

/**
 * Registra al usuario con payload { userId } vía evento 'register'.
 */
export function registerUser(userId?: number, token?: string) {
    if (token && token !== currentAuthToken) {
        currentAuthToken = token;
        const s = createSocket(token);

        if (! s.connected) {
            s.connect();
        } else {
            // Actualizar auth y reconectar
            s.auth = { token };
            s.disconnect().connect();
        }

        s.once('connect', () => {
            if (userId) {
                s.emit('register', { userId });
                console.debug(`[socket] registered user ${userId}`);
            }
        });
        return;
    }

    const s = getSocket();
    if (s.connected) {
        if (userId) {
            s. emit('register', { userId });
            console.debug(`[socket] registered user ${userId}`);
        }
    } else {
        s.once('connect', () => {
            if (userId) {
                s.emit('register', { userId });
                console.debug(`[socket] registered user ${userId}`);
            }
        });
    }
}

/**
 * Helper para subscribir/desuscribir eventos
 */
export function on(event: string, handler: EventHandler) {
    const s = getSocket();
    s.on(event, handler);
}

export function off(event: string, handler?: EventHandler) {
    if (! socket) return;
    if (handler) {
        socket.off(event, handler);
    } else {
        socket. removeAllListeners(event);
    }
}

/**
 * Eventos específicos de solicitudes de amistad
 */
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

/**
 * Export por defecto
 */
export default {
    connectSocket,
    releaseSocket,
    forceDisconnectSocket,
    getSocket,
    disconnectSocket,
    registerUser,
    on,
    off,
    onFriendRequestSent,
    offFriendRequestSent,
    onFriendRequestAccepted,
    offFriendRequestAccepted,
    onFriendRequestRejected,
    offFriendRequestRejected,
    onFriendRequestDeleted,
    offFriendRequestDeleted,
    onUserBlocked,
    offUserBlocked,
};