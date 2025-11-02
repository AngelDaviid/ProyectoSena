import api from './api';
import { getAuthToken } from './auth';
import type { Post } from '../types/post';

/**
 * Nota: usamos getAuthToken() para tomar el token desde auth.ts
 * y lo añadimos manualmente al header de la petición que envía FormData,
 * porque muchas veces axios no combina interceptor + multipart/form-data boundary
 * de forma predecible si el interceptor no configura bien la cabecera.
 */

export async function getPosts(): Promise<Post[]> {
    const res = await api.get<Post[]>('/posts');
    return res.data;
}

export async function getPost(id: number): Promise<Post> {
    const res = await api.get<Post>(`/posts/${id}`);
    return res.data;
}

/**
 * Crea post con imagen opcional.
 * formData debe incluir:
 * - title (string)
 * - content? (string)
 * - summary? (string)
 * - image (File)  <-- backend usa FileInterceptor('image')
 * - categoryIds[] (append por cada id)
 */
export async function createPost(formData: FormData): Promise<Post> {
    const token = getAuthToken();
    const headers: any = { 'Content-Type': 'multipart/form-data' };
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await api.post<Post>('/posts', formData, { headers });
    return res.data;
}

/**
 * Actualiza post (PUT JSON). Si deseas permitir subir archivo al editar,
 * hay que cambiar backend PUT para aceptar multipart/form-data y usar FileInterceptor.
 */
export async function updatePost(id: number, payload: Partial<Post>): Promise<Post> {
    const res = await api.put<Post>(`/posts/${id}`, payload);
    return res.data;
}

export async function deletePost(id: number): Promise<{ message: string }> {
    const res = await api.delete<{ message: string }>(`/posts/${id}`);
    return res.data;
}