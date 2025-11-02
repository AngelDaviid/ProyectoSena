import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { AuthContextType } from './auth.context';
import { AuthContext } from './auth.context';
import type { User } from '../types/type';
import { getAuthToken, setAuthToken, getProfile } from '../services/auth';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [token, setTokenState] = useState<string | null>(() => getAuthToken());
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState<boolean>(!!getAuthToken());
    const navigate = useNavigate();

    useEffect(() => {
        setAuthToken(token);

        if (!token) {
            setUser(null);
            setLoading(false);
            return;
        }

        let mounted = true;

        const loadProfile = async () => {
            setLoading(true);
            try {
                const profile = await getProfile();
                if (!mounted) return;
                setUser(profile);
            } catch (err) {
                console.warn('Fallo al obtener perfil, cerrando sesión', err);
                setTokenState(null);
                setUser(null);
            } finally {
                if (mounted) setLoading(false);
            }
        };

        if (!user) loadProfile();
        else setLoading(false);

        return () => {
            mounted = false;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token]);

    const setToken = (t: string | null) => {
        setTokenState(t);
    };

    const logout = () => {
        setToken(null);
        setUser(null);
        try {
            navigate('/login');
        } catch {
            // do nothing
        }
    };

    const value: AuthContextType = {
        user,
        token,
        setUser,
        setToken,
        logout,
        loading,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthProvider;