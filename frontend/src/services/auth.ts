import api from './api';
import type { AuthResponse, User } from '../types/type';

// ✅ Constante para la clave del token
const TOKEN_KEY = 'access_token';

/**
 * Establece el token de autenticación en localStorage y en los headers de axios
 */
export function setAuthToken(token: string | null) {
    if (token) {
        localStorage.setItem(TOKEN_KEY, token);
        api.defaults. headers.common.Authorization = `Bearer ${token}`;
        console.log('[Auth] Token set successfully');
    } else {
        localStorage.removeItem(TOKEN_KEY);
        delete api.defaults.headers.common.Authorization;
        console.log('[Auth] Token removed');
    }
}

/**
 * Obtiene el token de autenticación desde localStorage
 */
export function getAuthToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
}

/**
 * Verifica si el usuario está autenticado
 */
export function isAuthenticated(): boolean {
    const token = getAuthToken();
    return !!token;
}

/**
 * Inicializa el token en axios si existe en localStorage
 * Llamar al inicio de la aplicación
 */
export function initializeAuth() {
    const token = getAuthToken();
    if (token) {
        api.defaults.headers.common.Authorization = `Bearer ${token}`;
        console.log('[Auth] Token initialized from localStorage');
    }
}

/**
 * Registra un nuevo usuario
 */
export async function register(
    name: string,
    lastName: string,
    email: string,
    password: string,
    avatar?: string,
    role?: 'desarrollador' | 'instructor' | 'aprendiz',
): Promise<AuthResponse> {
    try {
        const payload: any = {
            password,
            email,
            profile: { name, lastName },
        };

        if (avatar) payload. profile.avatar = avatar;
        if (role) payload.role = role;

        console.log('[Auth] Registering user:', email);
        const res = await api.post<AuthResponse>('/auth/register', payload);

        // ✅ Guardar token automáticamente después de registro
        if (res.data.access_token) {
            setAuthToken(res.data.access_token);
        }

        return res. data;
    } catch (error: any) {
        console.error('[Auth] Register error:', error. response?.data || error.message);
        throw error;
    }
}

/**
 * Inicia sesión
 */
export async function login(email: string, password: string): Promise<AuthResponse> {
    try {
        console.log('[Auth] Logging in user:', email);
        const res = await api.post<AuthResponse>('/auth/login', { email, password });

        // ✅ Guardar token automáticamente después de login
        if (res.data. access_token) {
            setAuthToken(res.data.access_token);
        }

        console.log('[Auth] Login successful');
        return res.data;
    } catch (error: any) {
        console.error('[Auth] Login error:', error.response?. data || error.message);
        throw error;
    }
}

/**
 * Obtiene el perfil del usuario autenticado
 */
export async function getProfile(): Promise<User> {
    try {
        console.log('[Auth] Fetching user profile');
        const res = await api.get<User>('/auth/profile');
        return res.data;
    } catch (error: any) {
        console.error('[Auth] Get profile error:', error.response?.data || error.message);

        // ✅ Si falla por token inválido, limpiar autenticación
        if (error.response?.status === 401) {
            setAuthToken(null);
        }

        throw error;
    }
}

/**
 * Cierra sesión del usuario
 */
export async function logout(): Promise<void> {
    try {
        console. log('[Auth] Logging out');

        // ✅ Opcional: llamar endpoint de logout en el backend
        // await api.post('/auth/logout');

        setAuthToken(null);

        // ✅ Limpiar otros datos del localStorage si es necesario
        // localStorage.clear(); // Usar con cuidado, borra TODO

        console.log('[Auth] Logout successful');
    } catch (error) {
        console.error('[Auth] Logout error:', error);
        // Limpiar token aunque falle el backend
        setAuthToken(null);
    }
}

/**
 * Refresca el token de acceso
 * (Si tu backend soporta refresh tokens)
 */
export async function refreshToken(): Promise<string> {
    try {
        console.log('[Auth] Refreshing token');
        const res = await api.post<{ access_token: string }>('/auth/refresh');

        if (res.data.access_token) {
            setAuthToken(res.data.access_token);
            return res.data.access_token;
        }

        throw new Error('No token received');
    } catch (error) {
        console.error('[Auth] Refresh token error:', error);
        setAuthToken(null);
        throw error;
    }
}

/**
 * Actualiza el perfil del usuario
 */
export async function updateProfile(data: Partial<User>): Promise<User> {
    try {
        console.log('[Auth] Updating profile');
        const res = await api.put<User>('/auth/profile', data);
        return res.data;
    } catch (error: any) {
        console.error('[Auth] Update profile error:', error.response?.data || error.message);
        throw error;
    }
}

/**
 * Cambia la contraseña del usuario
 */
export async function changePassword(oldPassword: string, newPassword: string): Promise<void> {
    try {
        console.log('[Auth] Changing password');
        await api.post('/auth/change-password', { oldPassword, newPassword });
        console.log('[Auth] Password changed successfully');
    } catch (error: any) {
        console.error('[Auth] Change password error:', error.response?.data || error.message);
        throw error;
    }
}

/**
 * Solicita recuperación de contraseña
 */
export async function requestPasswordReset(email: string): Promise<void> {
    try {
        console.log('[Auth] Requesting password reset for:', email);
        await api. post('/auth/forgot-password', { email });
        console.log('[Auth] Password reset email sent');
    } catch (error: any) {
        console. error('[Auth] Password reset request error:', error.response?.data || error.message);
        throw error;
    }
}

/**
 * Restablece la contraseña con el token recibido por email
 */
export async function resetPassword(token: string, newPassword: string): Promise<void> {
    try {
        console.log('[Auth] Resetting password with token');
        await api.post('/auth/reset-password', { token, newPassword });
        console.log('[Auth] Password reset successful');
    } catch (error: any) {
        console.error('[Auth] Password reset error:', error.response?.data || error.message);
        throw error;
    }
}