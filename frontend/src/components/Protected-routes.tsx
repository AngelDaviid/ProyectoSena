import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { connectSocket, registerUser, releaseSocket, forceDisconnectSocket } from '../services/sockets/socket.ts';

type Props = { children: ReactNode };

const ProtectedRoute = ({ children }: Props) => {
    const { token, loading, user } = useAuth();

    useEffect(() => {
        // No conectar si no hay user ni token
        if (!user && !token) return;

        try {
            // Conectar el socket primero (el socket usa el token inter|mente)
            connectSocket(token ?? undefined);

            // Registrar usuario solo con el userId (el token ya está en el socket)
            if (user?.id) {
                registerUser(user.id);
                console.debug('[ProtectedRoute] socket registered for user', user.id);
            } else {
                console.debug('[ProtectedRoute] socket connected but user id not available yet');
            }
        } catch (e) {
            console.warn('[ProtectedRoute] socket init error', e);
        }

        return () => {
            try {
                releaseSocket();
            } catch (err) {
                console. warn('[ProtectedRoute] releaseSocket failed, forcing disconnect', err);
                try {
                    forceDisconnectSocket();
                } catch {}
            }
        };
    }, [token, user?.id]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Cargando...</p>
                </div>
            </div>
        );
    }

    if (!token) return <Navigate to="/login" replace />;

    return <>{children}</>;
};

export default ProtectedRoute;