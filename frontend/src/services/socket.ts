import { io, Socket } from 'socket.io-client';

type Transport = 'websocket' | 'polling';
type EventHandler = (...args: any[]) => void;

const API_BASE = import.meta.env.VITE_SENA_API_URL || 'http://localhost:3001';
const NAMESPACE = '/ws';

let socket: Socket | null = null;
let refCount = 0;
let disconnectTimer: ReturnType<typeof setTimeout> | null = null;
const DISCONNECT_DELAY_MS = 300;
let triedPolling = false;
let currentAuthToken: string | null = null;

/**
 * Crea la instancia de socket (no la conecta automáticamente).
 * authToken puede ser string | null (acepta explícitamente null).
 */
function createSocket(transports: Transport[] = ['websocket', 'polling'], authToken: string | null = null): Socket {
    // si existe socket y el token cambió, cerramos y recreamos
    if (socket) {
        const prevToken = currentAuthToken;
        if (authToken !== prevToken) {
            try { socket.removeAllListeners(); socket.close(); } catch {}
            socket = null;
        } else {
            try { socket.removeAllListeners(); } catch {}
        }
    }

    currentAuthToken = authToken ?? currentAuthToken;

    if (!socket) {
        socket = io(`${API_BASE}${NAMESPACE}`, {
            transports,
            autoConnect: false,
            // si currentAuthToken es null -> no enviamos auth, si es string lo enviamos
            auth: currentAuthToken ? { token: currentAuthToken } : undefined,
        });

        socket.on('connect', () => {
            console.debug('[socket] connected', socket?.id);
            triedPolling = false;
        });

        socket.on('connect_error', (err: any) => {
            console.warn('[socket] connect_error', err?.message ?? err);
            // Si fallo por websocket y no intentamos polling, recreamos con polling
            if (!triedPolling && transports.indexOf('polling') === -1) {
                triedPolling = true;
                try { socket?.removeAllListeners(); socket?.close(); } catch {}
                socket = null;
                socket = createSocket(['polling'], currentAuthToken);
                socket.on('connect', () => console.debug('[socket] connected via polling', socket?.id));
                socket.connect();
            }
        });

        socket.on('disconnect', (reason) => console.debug('[socket] disconnected', reason));
        socket.on('error', (e) => console.error('[socket] error', e));
        socket.io.on('reconnect_attempt', (n) => console.debug('[socket] reconnect attempt', n));
    }

    return socket;
}

/**
 * Incrementa referencias y conecta el socket.
 * - token (opcional): si lo pasas, se usará para la autenticación en el handshake.
 * - retorna la instancia conectada (o en proceso de conectar).
 */
export function connectSocket(token?: string): Socket {
    refCount += 1;
    if (disconnectTimer) { clearTimeout(disconnectTimer); disconnectTimer = null; }

    // Si socket no existe o token cambió, crear/recrear con token
    if (!socket) {
        createSocket(['websocket','polling'], token ?? currentAuthToken);
    } else if (token && token !== currentAuthToken) {
        try { socket.removeAllListeners(); socket.close(); } catch {}
        socket = null;
        createSocket(['websocket','polling'], token);
    }

    if (socket && !socket.connected) {
        try { socket.connect(); } catch (e) { console.error('[socket] connect error', e); }
    }

    return socket!;
}

/**
 * Resta una referencia. Si quedan 0 referencias, desconecta después de un pequeño delay.
 */
export function releaseSocket(): void {
    refCount = Math.max(0, refCount - 1);
    if (refCount === 0) {
        if (disconnectTimer) clearTimeout(disconnectTimer);
        disconnectTimer = setTimeout(() => {
            try { socket?.disconnect(); socket?.removeAllListeners(); } catch {}
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
    refCount = 0;
    if (disconnectTimer) { clearTimeout(disconnectTimer); disconnectTimer = null; }
    try { socket?.disconnect(); socket?.removeAllListeners(); } catch {}
    socket = null;
    currentAuthToken = null;
}

/**
 * Devuelve la instancia de socket (la crea si no existe, pero NO la conecta).
 * Garantiza que siempre retorne un Socket (no-null) creando uno si es necesario.
 */
export function getSocket(): Socket {
    if (!socket) {
        // crea con el token actual (puede ser null)
        createSocket(['websocket','polling'], currentAuthToken);
    }
    return socket!;
}

/**
 * Alias semántico para releaseSocket (útil en componentes: connectSocket/releaseSocket)
 */
export function disconnectSocket(): void { releaseSocket(); }

/**
 * Helper: registra al usuario con payload { userId } vía evento 'register'.
 * - Se asume conexión ya establecida o se espera al connect.
 * - Siempre usa getSocket() para evitar errores de "possibly null".
 */
export function registerUser(userId?: number, token?: string) {
    // Si se proporciona token distinto, recreamos la instancia con token y conectamos
    if (token && token !== currentAuthToken) {
        try { socket?.removeAllListeners(); socket?.close(); } catch {}
        // createSocket devuelve siempre un Socket, así que capturamos su valor
        const s = createSocket(['websocket','polling'], token);
        s.connect();
        s.once('connect', () => {
            if (userId) s.emit('register', { userId });
        });
        return;
    }

    // Si no hay token nuevo, usamos getSocket() que garantiza una instancia no-null
    const s = getSocket();
    if (s.connected) {
        if (userId) s.emit('register', { userId });
    } else {
        s.once('connect', () => {
            if (userId) s.emit('register', { userId });
        });
    }
}

/**
 * Conveniencia para subscribir/desuscribir a eventos.
 * Usar getSocket() o connectSocket() desde componentes para evitar variables no usadas.
 */
export function on(event: string, handler: EventHandler) {
    const s = socket ?? getSocket(); // getSocket() asegura creación si es necesario
    s.on(event, handler);
}
export function off(event: string, handler?: EventHandler) {
    // si socket es null no hay nada que quitar
    if (!socket) return;
    if (handler) socket.off(event, handler);
    else socket.removeAllListeners(event);
}

/**
 * Funciones utilitarias específicas para los eventos que usas en la app.
 */
export function onFriendRequestSent(handler: (payload: any) => void) {
    on('friendRequestSent', handler);
}
export function offFriendRequestSent(handler?: (payload: any) => void) {
    off('friendRequestSent', handler as EventHandler | undefined);
}

export function onFriendRequestAccepted(handler: (payload: any) => void) {
    on('friendRequestAccepted', handler);
}
export function offFriendRequestAccepted(handler?: (payload: any) => void) {
    off('friendRequestAccepted', handler as EventHandler | undefined);
}

/**
 * Export por defecto (opcional)
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
};