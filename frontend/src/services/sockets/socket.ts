import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SENA_API_URL || 'http://localhost:3001';

class SocketService {
    private socket: Socket | null = null;
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;
    private eventQueue: Array<{ event: string; data: any }> = [];
    private isProcessingQueue = false;

    /**
     * Conectar al servidor WebSocket
     */
    connect(token?: string): Socket {
        if (this.socket?. connected) {
            console.log('[Socket] Already connected');
            return this.socket;
        }

        console.log('[Socket] Connecting to:', `${SOCKET_URL}/ws`);

        this.socket = io(`${SOCKET_URL}/ws`, {
            auth: token ? { token } : undefined,
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            reconnectionAttempts: this.maxReconnectAttempts,
        });

        this.setupEventListeners();

        return this.socket;
    }

    /**
     * Configurar listeners de eventos del socket
     */
    private setupEventListeners(): void {
        if (!this.socket) return;

        this.socket.on('connect', () => {
            console. log('[Socket] ✅ Connected:', this.socket?. id);
            this.reconnectAttempts = 0;
            this.processEventQueue();
        });

        this.socket.on('disconnect', (reason) => {
            console. log('[Socket] ❌ Disconnected:', reason);

            if (reason === 'io server disconnect') {
                // El servidor forzó la desconexión, reconectar manualmente
                this.socket?.connect();
            }
        });

        this.socket.on('connect_error', (error) => {
            console.error('[Socket] ⚠️ Connection error:', error);
            this.reconnectAttempts++;

            if (this.reconnectAttempts >= this.maxReconnectAttempts) {
                console.error('[Socket] Max reconnection attempts reached');
            }
        });

        this.socket. on('error', (error) => {
            console.error('[Socket] 🔴 Error:', error);
        });

        this.socket.on('reconnect', (attemptNumber) => {
            console.log('[Socket] 🔄 Reconnected after', attemptNumber, 'attempts');
            this.processEventQueue();
        });

        this.socket.on('reconnect_attempt', (attemptNumber) => {
            console.log('[Socket] 🔄 Reconnection attempt:', attemptNumber);
        });

        this.socket.on('reconnect_error', (error) => {
            console.error('[Socket] ⚠️ Reconnection error:', error);
        });

        this.socket.on('reconnect_failed', () => {
            console.error('[Socket] ❌ Reconnection failed');
        });
    }

    /**
     * Procesar cola de eventos pendientes
     */
    private async processEventQueue(): Promise<void> {
        if (this.isProcessingQueue || !this.socket?. connected || this.eventQueue.length === 0) {
            return;
        }

        this.isProcessingQueue = true;

        while (this.eventQueue.length > 0 && this.socket?.connected) {
            const { event, data } = this.eventQueue.shift()!;
            try {
                this.socket.emit(event, data);
                console.log(`[Socket] ✅ Queued event '${event}' sent`);
            } catch (error) {
                console.error(`[Socket] ❌ Error sending queued event '${event}':`, error);
            }
        }

        this.isProcessingQueue = false;
    }

    /**
     * Desconectar del servidor
     */
    disconnect(): void {
        if (this.socket) {
            console.log('[Socket] Disconnecting...');
            this.socket. disconnect();
            this.socket = null;
            this.reconnectAttempts = 0;
            this.eventQueue = [];
        }
    }

    /**
     * Obtener instancia del socket
     */
    getSocket(): Socket | null {
        return this.socket;
    }

    /**
     * Verificar si está conectado
     */
    isConnected(): boolean {
        return this.socket?.connected || false;
    }

    /**
     * Registrar usuario en el socket
     */
    registerUser(userId: number): void {
        if (this.socket && this.socket.connected) {
            this.socket.emit('register', { userId });
            console.log('[Socket] 👤 User registered:', userId);
        } else {
            console.warn('[Socket] Cannot register user: socket not connected');
            // Agregar a la cola para enviar cuando se conecte
            this.eventQueue.push({ event: 'register', data: { userId } });
        }
    }

    /**
     * Emitir evento personalizado
     */
    emit(event: string, data?: any): void {
        if (this.socket && this.socket.connected) {
            this.socket.emit(event, data);
        } else {
            console.warn(`[Socket] Cannot emit '${event}': socket not connected, adding to queue`);
            this. eventQueue.push({ event, data });
        }
    }

    /**
     * Escuchar evento
     */
    on(event: string, callback: (...args: any[]) => void): void {
        this.socket?.on(event, callback);
    }

    /**
     * Dejar de escuchar evento
     */
    off(event: string, callback?: (...args: any[]) => void): void {
        if (callback) {
            this.socket?. off(event, callback);
        } else {
            this.socket?.off(event);
        }
    }

    /**
     * Escuchar evento una sola vez
     */
    once(event: string, callback: (...args: any[]) => void): void {
        this.socket?.once(event, callback);
    }
}

// Exportar instancia única (singleton)
export const socketService = new SocketService();

export const connectSocket = (token?: string) => socketService.connect(token);
export const disconnectSocket = () => socketService.disconnect();
export const getSocket = () => socketService.getSocket();
export const registerUser = (userId: number) => socketService.registerUser(userId);
export const isSocketConnected = () => socketService. isConnected();

// ✨ Agregar estos exports para compatibilidad
export const releaseSocket = () => socketService.disconnect();
export const forceDisconnectSocket = () => {
    const socket = socketService.getSocket();
    if (socket) {
        socket.removeAllListeners();
        socket. disconnect();
    }
    socketService.disconnect();
};