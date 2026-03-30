import { useContext } from 'react';
import { AuthContext } from '../context/auth.context';
import type { AuthContextType } from '../context/auth.context';

export function useAuth(): AuthContextType {
    const ctx = useContext(AuthContext) as AuthContextType | undefined;
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
}