import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { connectSocket, registerUser, releaseSocket, forceDisconnectSocket } from '../services/socket';

type Props = { children: ReactNode };

const ProtectedRoute = ({ children }: Props) => {
    const { token, loading, user } = useAuth();

    useEffect(() => {
        // No conectar si no hay user ni token
        if (!user && !token) return;

        try {
            // Pasamos token ?? undefined para evitar error de tipos si token es null
            connectSocket(token ?? undefined);
            if (user?.id) {
                registerUser(user.id, token ?? undefined);
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
                console.warn('[ProtectedRoute] releaseSocket failed, forcing disconnect', err);
                try { forceDisconnectSocket(); } catch {}
            }
        };
    }, [token, user?.id]);

    if (loading) return <div>Cargando...</div>;
    if (!token) return <Navigate to="/login" replace />;

    return <>{children}</>;
};

export default ProtectedRoute;