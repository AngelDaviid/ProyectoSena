import api from './api';
import type { User } from '../types/type';

/**
 * Actualizar profile completo (incluye profile: { name, lastName, avatar })
 * usa PUT /users/:id
 */
export async function updateUser(userId: number, payload: Partial<User> | FormData): Promise<User> {
    if (payload instanceof FormData) {
        const res = await api.put<User>(`/users/${userId}`, payload);
        return res.data;
    }
    const res = await api.put<User>(`/users/${userId}`, payload);
    return res.data;
}

/**
 * Subir avatar (multipart). Endpoint propuesto: PUT /users/:id/avatar
 * Devuelve usuario actualizado o perfil.
 */
export async function uploadAvatar(userId: number, file: File): Promise<User> {
    const fd = new FormData();
    fd.append('avatar', file);
    const res = await api.put<User>(`/users/${userId}/avatar`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
}