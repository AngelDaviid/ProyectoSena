import { createContext } from 'react';
import type { User } from '../types/type';

export type AuthContextType = {
    user: User | null;
    token: string | null;
    setUser: (u: User | null) => void;
    setToken: (t: string | null) => void;
    logout: () => void;
    loading: boolean;
};


export const AuthContext = createContext<AuthContextType | undefined>(undefined);