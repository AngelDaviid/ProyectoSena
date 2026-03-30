import { useEffect, useRef, useState } from 'react';
import { socketService } from '../services/sockets/socket';
import { useAuth } from './use-auth.ts';

/**
 * Hook para manejar la conexión del socket automáticamente
 * Solo debe usarse UNA VEZ en el árbol de componentes (en SocketProvider)
 */
export function useSocket() {
    const { user, token } = useAuth();
    const hasRegistered = useRef(false);
    const socketRef = useRef(socketService. getSocket());
    const [isConnected, setIsConnected] = useState(false);
    const registerTimeoutRef = useRef<number | null>(null); // ✅ Cambiar a number

    useEffect(() => {
        // Si no hay usuario, no conectar
        if (!user?. id) {
            hasRegistered.current = false;
            setIsConnected(false);
            return;
        }

        console.log('[useSocket] 🔌 Initializing socket for user:', user.id);

        // Conectar al socket con el token
        const socket = socketService.connect(token || undefined);
        socketRef.current = socket;

        // 🆕 Función para registrar usuario con retry
        const registerUser = (retryCount = 0) => {
            if (! user. id || hasRegistered.current) return;

            const maxRetries = 3;

            console.log(`[useSocket] 📝 Attempting to register user ${user.id} (attempt ${retryCount + 1}/${maxRetries})`);

            socketService.emit('register', { userId: user.id });

            // Si no recibimos confirmación en 2 segundos, reintentar
            if (retryCount < maxRetries) {
                if (registerTimeoutRef.current) {
                    clearTimeout(registerTimeoutRef.current);
                }

                registerTimeoutRef.current = setTimeout(() => {
                    if (! hasRegistered.current) {
                        console.warn(`[useSocket] ⚠️ No registration confirmation, retrying...`);
                        registerUser(retryCount + 1);
                    }
                }, 2000);
            } else {
                console.error(`[useSocket] ❌ Failed to register after ${maxRetries} attempts`);
            }
        };

        // 🆕 Handler para confirmación de registro
        const handleRegistered = (data: { userId: number; socketId: string }) => {
            console.log('[useSocket] ✅ Registration confirmed:', data);
            hasRegistered.current = true;

            if (registerTimeoutRef.current) {
                clearTimeout(registerTimeoutRef.current);
                registerTimeoutRef.current = null;
            }
        };

        // Registrar usuario cuando se conecte
        const handleConnect = () => {
            console. log('[useSocket] ✅ Socket connected:', socket.id);
            setIsConnected(true);

            if (user.id && ! hasRegistered.current) {
                registerUser();
            }
        };

        // Re-registrar en reconexión
        const handleReconnect = () => {
            console.log('[useSocket] 🔄 Reconnected, re-registering user:', user.id);
            hasRegistered.current = false;
            setIsConnected(true);

            if (user.id) {
                registerUser();
            }
        };

        const handleDisconnect = () => {
            console.log('[useSocket] ❌ Socket disconnected');
            hasRegistered.current = false;
            setIsConnected(false);

            if (registerTimeoutRef.current) {
                clearTimeout(registerTimeoutRef.current);
                registerTimeoutRef.current = null;
            }
        };

        // Suscribirse a eventos
        if (socket.connected) {
            handleConnect();
        }

        socket.on('connect', handleConnect);
        socket.on('reconnect', handleReconnect);
        socket.on('disconnect', handleDisconnect);
        socket.on('registered', handleRegistered); // 🆕 Escuchar confirmación

        // Cleanup
        return () => {
            socket.off('connect', handleConnect);
            socket.off('reconnect', handleReconnect);
            socket.off('disconnect', handleDisconnect);
            socket.off('registered', handleRegistered);

            if (registerTimeoutRef. current) {
                clearTimeout(registerTimeoutRef.current);
            }

            hasRegistered.current = false;
        };
    }, [user?.id, token]);

    return {
        socket: socketRef.current,
        isConnected, // 🆕 Usar estado local en lugar de socketService.isConnected()
    };
}