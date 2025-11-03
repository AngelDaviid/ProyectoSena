import { io, Socket } from 'socket.io-client';

const API_BASE = import.meta.env.SENA_API_URL || 'http://localhost:3001';

let socket: Socket | null = null;
let refCount = 0;
let triedPolling = false;
let disconnectTimer: ReturnType<typeof setTimeout> | null = null;
const DISCONNECT_DELAY_MS = 300; // tiempo de gracia antes de desconectar (evita problemas con StrictMode)

/**
 * Crea la instancia socket (no la conecta automáticamente)
 */
function createSocket(transports: Array<'websocket' | 'polling'> = ['websocket', 'polling']): Socket {
    // Si ya existe, limpiamos listeners antiguos
    if (socket) {
        try {
            socket.removeAllListeners();
        } catch {}
    }

    socket = io(API_BASE, {
        transports,
        autoConnect: false,
        // auth: { token: localStorage.getItem('access_token') }, // opcional
    });

    socket.on('connect', () => {
        console.log('[socket] connected', socket?.id);
        triedPolling = false;
    });

    socket.on('connect_error', (err: any) => {
        console.error('[socket] connect_error', err?.message ?? err);
        // No recreamos siempre: if transports included polling the client will fallback automatically.
        // Dejamos log para depuración.
    });

    socket.on('disconnect', (reason) => {
        console.log('[socket] disconnected', reason);
    });

    socket.on('error', (err) => {
        console.error('[socket] error', err);
    });

    socket.io.on('reconnect_attempt', (attempt) => {
        console.log('[socket] reconnect attempt', attempt);
    });

    return socket;
}

/**
 * connectSocket:
 * - Incrementa refCount y conecta la instancia si es la primera petición.
 * - Cancela cualquier timer de desconexión pendiente (grace period).
 */
export function connectSocket(): Socket {
    refCount += 1;

    // Si había un timer de desconexión, lo cancelamos (remount rápido)
    if (disconnectTimer) {
        clearTimeout(disconnectTimer);
        disconnectTimer = null;
    }

    if (!socket) {
        createSocket();
    }

    if (socket && !socket.connected) {
        // conectar (si ya está conectando / connected no hace nada)
        try {
            socket.connect();
        } catch (err) {
            // en entornos TS/DOM esto normalmente existe; atrapamos error por si acaso
            console.warn('[socket] connect error (call)', err);
        }
    }

    return socket!;
}

/**
 * releaseSocket:
 * - Decrementa refCount y agenda la desconexión solo cuando llega a 0
 *   con un pequeño retraso (grace period). Esto evita desconexiones
 *   prematuras por doble mount/unmount en React StrictMode.
 */
export function releaseSocket(): void {
    refCount = Math.max(0, refCount - 1);

    if (refCount === 0) {
        // programar desconexión con delay
        if (disconnectTimer) {
            clearTimeout(disconnectTimer);
        }
        disconnectTimer = setTimeout(() => {
            try {
                if (socket) {
                    socket.disconnect();
                    // opcional: limpiar listeners si quieres liberar completamente
                    socket.removeAllListeners();
                }
            } catch (err) {
                console.warn('[socket] error on delayed disconnect', err);
            } finally {
                // mantener socket = null para permitir recreación limpia
                socket = null;
                disconnectTimer = null;
            }
        }, DISCONNECT_DELAY_MS);
    }
}

/**
 * forceDisconnectSocket:
 * - Desconexión inmediata y limpieza completa (ej. al hacer logout).
 */
export function forceDisconnectSocket(): void {
    refCount = 0;
    triedPolling = false;
    if (disconnectTimer) {
        clearTimeout(disconnectTimer);
        disconnectTimer = null;
    }
    if (socket) {
        try {
            socket.disconnect();
            socket.removeAllListeners();
            // socket.close() no es necesario normalmente, disconnect() basta
        } catch {}
        socket = null;
    }
}

/**
 * getSocket:
 * - Devuelve la instancia pero NO la conecta automáticamente.
 */
export function getSocket(): Socket {
    if (!socket) {
        createSocket();
    }
    return socket!;
}

/**
 * Compatibilidad / alias:
 * - Mantener disconnectSocket por compatibilidad con imports existentes.
 * - disconnectSocket hace releaseSocket() (desconexión con grace period).
 */
export function disconnectSocket(): void {
    releaseSocket();
}