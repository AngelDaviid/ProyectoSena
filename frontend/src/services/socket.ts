import { io, Socket } from 'socket.io-client';

const API_BASE = import.meta.env.VITE_SENA_API_URL || 'http://localhost:3001';

let socket: Socket | null = null;
let refCount = 0;
let disconnectTimer: ReturnType<typeof setTimeout> | null = null;
const DISCONNECT_DELAY_MS = 300;
let triedPolling = false;

function createSocket(transports: Array<'websocket' | 'polling'> = ['websocket','polling']): Socket {
    if (socket) {
        try { socket.removeAllListeners(); } catch {}
    }

    socket = io(API_BASE, { transports, autoConnect: false });

    socket.on('connect', () => {
        console.log('[socket] connected', socket?.id);
        triedPolling = false;
    });

    socket.on('connect_error', (err: any) => {
        console.error('[socket] connect_error', err?.message ?? err);
        // Si fallo por websocket y no intentamos polling, recreamos con polling
        if (!triedPolling && transports.indexOf('polling') === -1) {
            triedPolling = true;
            try { socket?.removeAllListeners(); socket?.close(); } catch {}
            socket = null;
            socket = createSocket(['polling']);
            socket.on('connect', () => console.log('[socket] connected via polling', socket?.id));
            socket.connect();
        }
    });

    socket.on('disconnect', (reason) => console.log('[socket] disconnected', reason));
    socket.on('error', (e) => console.error('[socket] error', e));

    socket.io.on('reconnect_attempt', (a) => console.log('[socket] reconnect attempt', a));

    return socket;
}

export function connectSocket(): Socket {
    refCount += 1;
    if (disconnectTimer) { clearTimeout(disconnectTimer); disconnectTimer = null; }
    if (!socket) createSocket();
    if (socket && !socket.connected) try { socket.connect(); } catch {}
    return socket!;
}

export function releaseSocket(): void {
    refCount = Math.max(0, refCount - 1);
    if (refCount === 0) {
        if (disconnectTimer) clearTimeout(disconnectTimer);
        disconnectTimer = setTimeout(() => {
            try { socket?.disconnect(); socket?.removeAllListeners(); } catch {}
            socket = null;
            disconnectTimer = null;
        }, DISCONNECT_DELAY_MS);
    }
}

export function forceDisconnectSocket(): void {
    refCount = 0;
    if (disconnectTimer) { clearTimeout(disconnectTimer); disconnectTimer = null; }
    try { socket?.disconnect(); socket?.removeAllListeners(); } catch {}
    socket = null;
}

export function getSocket(): Socket {
    if (!socket) createSocket();
    return socket!;
}

export function disconnectSocket(): void { releaseSocket(); }