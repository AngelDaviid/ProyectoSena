import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { connectSocket, registerUser, releaseSocket } from '../services/socket';

type Props = { children: ReactNode };

const ProtectedRoute = ({ children }: Props) => {
    const { token, loading, user } = useAuth();

    useEffect(() => {
        // Solo conectar si tenemos token
        if (! token) return;

        console.debug('[ProtectedRoute] Connecting socket.. .');

        try {
            // Conectar socket con el token
            connectSocket(token);

            // Registrar usuario si está disponible
            if (user?.id) {
                registerUser(user.id, token);
                console.debug('[ProtectedRoute] Socket connected and user registered:', user.id);
            }
        } catch (e) {
            console.warn('[ProtectedRoute] Socket connection error:', e);
        }

        // Cleanup: reducir refCount cuando el componente se desmonte
        return () => {
            console.debug('[ProtectedRoute] Releasing socket...');
            releaseSocket();
        };
    }, [token, user?.id]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-lg">Cargando...</div>
            </div>
        );
    }

    if (!token) {
        return <Navigate to="/login" replace />;
    }

    return <>{children}</>;
};

export default ProtectedRoute;