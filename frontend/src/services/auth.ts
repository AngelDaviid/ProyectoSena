import api from './api';
import type { AuthResponse, User } from '../types/type';

export function setAuthToken(token: string | null) {
    if (token) {
        localStorage.setItem('access_token', token);
        api.defaults.headers.common.Authorization = `Bearer ${token}`;
    } else {
        localStorage.removeItem('access_token');
        delete api.defaults.headers.common.Authorization;
    }
}

export function getAuthToken(): string | null {
    return localStorage.getItem('access_token');
}

export async function register(
    name: string,
    lastName: string,
    email: string,
    password: string,
    avatar?: string,
    role?: 'desarrollador' | 'instructor' | 'aprendiz',
): Promise<AuthResponse> {
    const payload: any = {
        password,
        email,
        profile: { name, lastName },
    };

    if (avatar) payload.profile.avatar = avatar;
    if (role) payload.role = role;

    const res = await api.post<AuthResponse>('/auth/register', payload);
    return res.data;
}

export async function login(email: string, password: string): Promise<AuthResponse> {
    const res = await api.post<AuthResponse>('/auth/login', { email, password });
    return res.data;
}

export async function getProfile(): Promise<User> {
    const res = await api.get<User>('/auth/profile');
    return res.data;
}