import { useCallback, useEffect, useState } from 'react';
import type { Post } from '../types/post';
import * as postsService from '../services/posts';

/**
 * Hook para manejar un solo post (detalle).
 * - id?: id del post (si es undefined no carga)
 * - post, loading, error
 * - reload(): recarga desde API
 * - update(payload): actualiza el post y actualiza el estado local
 * - remove(): elimina el post (y limpia state)
 */
export function usePost(id?: number) {
    const [post, setPost] = useState<Post | null>(null);
    const [loading, setLoading] = useState<boolean>(!!id);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        if (id === undefined) return;
        try {
            setLoading(true);
            const data = await postsService.getPost(id);
            setPost(data);
        } catch (err: any) {
            setError(err?.message || 'Error al cargar post');
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        if (id !== undefined) load();
    }, [id, load]);

    const update = useCallback(
        async (payload: Partial<Post>) => {
            if (id === undefined) throw new Error('No post id provided');
            const updated = await postsService.updatePost(id, payload);
            setPost(updated);
            return updated;
        },
        [id],
    );

    const remove = useCallback(async () => {
        if (id === undefined) throw new Error('No post id provided');
        await postsService.deletePost(id);
        setPost(null);
    }, [id]);

    return { post, setPost, loading, error, reload: load, update, remove };
}

export default usePost;