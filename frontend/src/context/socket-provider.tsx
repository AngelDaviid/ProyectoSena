import { createContext, useContext, useEffect, useState, useRef, type ReactNode } from 'react';
import { socketService } from '../services/sockets/socket';
import { useAuth } from '../hooks/useAuth';
import type { Socket } from 'socket.io-client';

export interface SocketContextType {
    socket: Socket | null;
    isConnected: boolean;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export { SocketContext };

function SocketProviderComponent({ children }: { children: ReactNode }) {
    const { user, token } = useAuth();
    const [isConnected, setIsConnected] = useState(false);
    const socketRef = useRef<Socket | null>(null);
    const hasRegisteredRef = useRef(false);
    const lastUserIdRef = useRef<number | null>(null);
    const listenersAttachedRef = useRef(false);

    useEffect(() => {
        console.log('[SocketProvider] 🔄 Effect triggered, user:', user?.id || 'NO USER');

        // Si no hay usuario, limpiar
        if (!user?.id) {
            console.log('[SocketProvider] ⚠️ No user - cleaning up');

            // Solo desconectar si había un usuario antes
            if (lastUserIdRef.current !== null && socketRef.current) {
                console.log('[SocketProvider] 🔌 User logged out, disconnecting');
                socketService.disconnect();
                socketRef.current = null;
                listenersAttachedRef.current = false;
            }

            setIsConnected(false);
            hasRegisteredRef.current = false;
            lastUserIdRef.current = null;
            return;
        }

        // Si el usuario cambió, reconectar
        if (lastUserIdRef.current !== null && lastUserIdRef.current !== user. id) {
            console.log('[SocketProvider] 🔄 User changed from', lastUserIdRef.current, 'to', user.id);
            socketService.disconnect();
            socketRef.current = null;
            hasRegisteredRef.current = false;
            listenersAttachedRef.current = false;
        }

        lastUserIdRef.current = user. id;

        // Obtener o crear socket
        let socket = socketService.getSocket();

        if (!socket || !socket.connected) {
            console.log('[SocketProvider] 🔌 Connecting socket for user:', user.id);
            socket = socketService.connect(token || undefined);
            socketRef.current = socket;
            listenersAttachedRef.current = false; // Resetear para adjuntar listeners
        } else {
            console.log('[SocketProvider] ♻️ Socket already exists and connected');
            socketRef.current = socket;
        }

        // Solo adjuntar listeners UNA VEZ
        if (! listenersAttachedRef. current) {
            console.log('[SocketProvider] 🎧 Attaching socket listeners');

            const handleConnect = () => {
                console.log('[SocketProvider] ✅ Socket connected, ID:', socket?.id);
                setIsConnected(true);

                if (user.id && !hasRegisteredRef.current) {
                    console.log('[SocketProvider] 📝 Registering user:', user.id);
                    socketService.emit('register', { userId: user.id });
                    hasRegisteredRef.current = true;
                }
            };

            const handleDisconnect = (reason: string) => {
                console. log('[SocketProvider] ❌ Disconnected, reason:', reason);
                setIsConnected(false);
                hasRegisteredRef.current = false;
            };

            const handleReconnect = () => {
                console.log('[SocketProvider] 🔄 Reconnected');
                setIsConnected(true);

                if (user.id) {
                    console.log('[SocketProvider] 📝 Re-registering user:', user.id);
                    socketService.emit('register', { userId: user. id });
                    hasRegisteredRef.current = true;
                }
            };

            // Si ya está conectado, ejecutar inmediatamente
            if (socket. connected) {
                handleConnect();
            }

            // Adjuntar listeners
            socket.on('connect', handleConnect);
            socket.on('disconnect', handleDisconnect);
            socket.on('reconnect', handleReconnect);

            listenersAttachedRef. current = true;
        } else {
            console.log('[SocketProvider] ⏭️ Listeners already attached, skipping');

            // Si ya está conectado pero no registrado, registrar
            if (socket.connected && !hasRegisteredRef.current && user.id) {
                console. log('[SocketProvider] 📝 Registering user on route change:', user.id);
                socketService.emit('register', { userId: user.id });
                hasRegisteredRef.current = true;
            }
        }

        // ✅ Cleanup: NO hacer nada para mantener la conexión activa
        return () => {
            console.log('[SocketProvider] 🧹 Cleanup called (keeping connection alive)');
            // NO remover listeners
            // NO desconectar socket
            // Solo loggear que el cleanup fue llamado
        };
    }, [user?. id, token]);

    return (
        <SocketContext.Provider value={{ socket: socketRef.current, isConnected }}>
            {children}
        </SocketContext.Provider>
    );
}

export { SocketProviderComponent as SocketProvider };

export function useSocketContext(): SocketContextType {
    const context = useContext(SocketContext);
    if (!context) {
        throw new Error('useSocketContext must be used within SocketProvider');
    }
    return context;
}