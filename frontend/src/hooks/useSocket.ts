import { useEffect, useRef } from 'react';
import { socketService } from '../services/sockets/socket';
import { useAuth } from './useAuth';

/**
 * Hook para manejar la conexión del socket automáticamente
 * Solo debe usarse UNA VEZ en el árbol de componentes (en SocketProvider)
 */
export function useSocket() {
    const { user, token } = useAuth();
    const hasRegistered = useRef(false);
    const socketRef = useRef(socketService.getSocket());

    useEffect(() => {
        // Si no hay usuario, no conectar
        if (!user?. id) {
            hasRegistered.current = false;
            return;
        }

        console.log('[useSocket] 🔌 Initializing socket for user:', user.id);

        // Conectar al socket con el token
        const socket = socketService.connect(token || undefined);
        socketRef.current = socket;

        // Registrar usuario cuando se conecte
        const handleConnect = () => {
            if (user. id && !hasRegistered.current) {
                console.log('[useSocket] ✅ Socket connected, registering user:', user.id);
                socketService.emit('register', { userId: user. id });
                hasRegistered. current = true;
            }
        };

        // Re-registrar en reconexión
        const handleReconnect = () => {
            if (user.id) {
                console.log('[useSocket] 🔄 Reconnected, re-registering user:', user.id);
                socketService. emit('register', { userId: user.id });
                hasRegistered.current = true;
            }
        };

        const handleDisconnect = () => {
            console.log('[useSocket] ❌ Socket disconnected');
            hasRegistered.current = false;
        };

        // Suscribirse a eventos
        if (socket. connected) {
            handleConnect();
        }

        socket.on('connect', handleConnect);
        socket.on('reconnect', handleReconnect);
        socket.on('disconnect', handleDisconnect);

        // Cleanup
        return () => {
            socket.off('connect', handleConnect);
            socket.off('reconnect', handleReconnect);
            socket.off('disconnect', handleDisconnect);
            hasRegistered.current = false;
        };
    }, [user?. id, token]);

    return {
        socket: socketRef.current,
        isConnected: socketService.isConnected(),
    };
}