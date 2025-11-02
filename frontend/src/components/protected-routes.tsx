import type {ReactNode} from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth'

type Props = { children: ReactNode };

const ProtectedRoute = ({ children }: Props) => {
    const { token, loading } = useAuth();

    if (loading) return <div>Cargando...</div>;
    if (!token) return <Navigate to="/login" replace />;

    return <>{children}</>;
};

export default ProtectedRoute;