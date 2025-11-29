import { useEffect, useRef } from 'react';
import { socketService, registerUser } from '../services/socket';
import { useAuth } from './useAuth';

/**
 * Hook para manejar la conexión del socket automáticamente
 */
export function useSocket() {
    const { user, token } = useAuth();
    const hasRegistered = useRef(false);

    useEffect(() => {
        if (!user) return;

        // Conectar al socket
        const socket = socketService.connect(token || undefined);

        // Registrar usuario cuando se conecte
        const handleConnect = () => {
            if (user. id && !hasRegistered.current) {
                registerUser(user.id);
                hasRegistered.current = true;
            }
        };

        // Re-registrar en reconexión
        const handleReconnect = () => {
            if (user.id) {
                registerUser(user. id);
            }
        };

        if (socket. connected) {
            handleConnect();
        }

        socket.on('connect', handleConnect);
        socket.on('reconnect', handleReconnect);

        return () => {
            socket. off('connect', handleConnect);
            socket.off('reconnect', handleReconnect);
        };
    }, [user, token]);

    return {
        socket: socketService. getSocket(),
        isConnected: socketService.isConnected(),
    };
}