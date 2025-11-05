import api from './api';
import { getAuthToken } from './auth';
import type { Post, PostComment } from '../types/post';

/**
 * Nota: No fijar Content-Type al enviar FormData. El navegador/axios añade
 * automáticamente el boundary necesario. Solo añadir Authorization cuando sea necesario.
 */

export async function getPosts(): Promise<Post[]> {
    const token = getAuthToken();
    const res = await api.get<Post[]>('/posts', {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
    return res.data;
}

export async function getPost(id: number): Promise<Post> {
    const token = getAuthToken();
    const res = await api.get<Post>(`/posts/${id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
    return res.data;
}

export async function createPost(formData: FormData): Promise<Post> {
    const token = getAuthToken();
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await api.post<Post>('/posts', formData, { headers });
    return res.data;
}

/**
 * updatePost acepta FormData (multipart) o un payload JSON (obj)
 * - Si payload es FormData: NO fijar Content-Type (dejar que axios lo añada)
 * - Si es JSON: filtrar las propiedades permitidas antes de enviar
 */
export async function updatePost(id: number, payload: Partial<Post> | FormData): Promise<Post> {
    if (payload instanceof FormData) {
        const res = await api.put<Post>(`/posts/${id}`, payload);
        return res.data;
    }

    const allowed = ['title', 'content', 'summary', 'categoryIds', 'isDraft', 'removeImage'];
    const body: Record<string, any> = {};

    for (const key of allowed) {
        if (payload[key as keyof Post] !== undefined) {
            body[key] = payload[key as keyof Post];
        }
    }

    const res = await api.put<Post>(`/posts/${id}`, body);
    return res.data;
}

export async function deletePost(id: number): Promise<{ message: string }> {
    const token = getAuthToken();
    const res = await api.delete<{ message: string }>(`/posts/${id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
    return res.data;
}

export async function getComments(postId: number): Promise<PostComment[]> {
    const res = await api.get<PostComment[]>(`/posts/${postId}/comments`);
    return res.data;
}

export async function createComment(postId: number, content: string): Promise<PostComment> {
    const token = getAuthToken();
    const res = await api.post<PostComment>(`/posts/${postId}/comments`, { content }, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
    return res.data;
}

export async function updateComment(postId: number, commentId: number, content: string): Promise<PostComment> {
    const token = getAuthToken();
    const res = await api.put<PostComment>(`/posts/${postId}/comments/${commentId}`, { content }, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
    return res.data;
}

export async function deleteComment(postId: number, commentId: number): Promise<{ message: string }> {
    const token = getAuthToken();
    const res = await api.delete<{ message: string }>(`/posts/${postId}/comments/${commentId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
    return res.data;
}

/* ---- Likes ---- */
export async function toggleLike(postId: number): Promise<{ liked: boolean; likesCount: number }> {
    const token = getAuthToken();
    const res = await api.post(`/posts/${postId}/like`, null, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
    const data = res.data || {};
    const likesCount = typeof data.likesCount === 'number' ? data.likesCount : data.likeCount ?? 0;
    return { liked: !!data.liked, likesCount };
}