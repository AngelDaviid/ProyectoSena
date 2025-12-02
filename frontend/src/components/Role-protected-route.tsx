import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import type { Role } from '../types/user.type';

type Props = {
    children: ReactNode;
    allowedRoles: Role[];
    redirectTo?: string;
};

const RoleProtectedRoute = ({ children, allowedRoles, redirectTo = '/' }: Props) => {
    const { user, token, loading } = useAuth();

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-green-600 mx-auto mb-4"></div>
                    <p className="text-lg text-gray-700 font-medium">Cargando... </p>
                </div>
            </div>
        );
    }

    if (!token) {
        return <Navigate to="/login" replace />;
    }

    if (! user?. role || !allowedRoles. includes(user.role)) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-red-50 to-orange-50 p-4">
                <div className="bg-white p-8 rounded-2xl shadow-2xl max-w-md text-center border-4 border-red-200">
                    <div className="text-7xl mb-6 animate-bounce">🚫</div>
                    <h2 className="text-3xl font-bold text-gray-900 mb-3">
                        Acceso Denegado
                    </h2>
                    <p className="text-gray-600 mb-2">
                        No tienes permisos para acceder a esta página.
                    </p>
                    <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4 my-4">
                        <p className="text-sm text-yellow-800 font-medium">
                            Se requiere rol: <strong className="text-yellow-900">{allowedRoles.join(' o ')}</strong>
                        </p>
                        <p className="text-sm text-yellow-700 mt-1">
                            Tu rol actual: <strong>{user?. role || 'Ninguno'}</strong>
                        </p>
                    </div>
                    <button
                        onClick={() => (window.location.href = redirectTo)}
                        className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white px-8 py-3 rounded-lg font-bold transition-all transform hover:scale-105 shadow-lg"
                    >
                        ← Volver al Inicio
                    </button>
                </div>
            </div>
        );
    }

    return <>{children}</>;
};

export default RoleProtectedRoute;