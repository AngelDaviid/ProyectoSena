export type AuthContextType = {
    user: any | null;
    token: string | null;
    setUser: (u: any | null) => void;
    setToken: (t: string | null) => void;
    logout: () => void;
    loading: boolean;
};

import { createContext } from 'react';

export const AuthContext = createContext<AuthContextType | undefined>(undefined);