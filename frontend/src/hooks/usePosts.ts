import { useCallback, useEffect, useState } from 'react';
import type { Post } from '../types/post';
import * as postsService from '../services/posts';

/**
 * Hook para manejar listado de posts y acciones CRUD sobre la colección.
 * - posts: lista actual
 * - loading / error
 * - reload(): recarga desde API
 * - create(formData): crea un post (FormData, admite subida de imagen)
 * - update(id, payload): actualiza un post (PUT JSON)
 * - remove(id): elimina un post
 */
export function usePosts() {
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await postsService.getPosts();
            setPosts(data);
        } catch (err: any) {
            setError(err?.message || 'Error al cargar publicaciones');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const create = useCallback(async (formData: FormData) => {
        try {
            setLoading(true);
            const created = await postsService.createPost(formData);
            // lo insertamos al inicio de la lista
            setPosts((prev) => [created, ...prev]);
            return created;
        } catch (err: any) {
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    const update = useCallback(async (id: number, payload: Partial<Post>) => {
        try {
            setLoading(true);
            const updated = await postsService.updatePost(id, payload);
            setPosts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
            return updated;
        } catch (err: any) {
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    const remove = useCallback(async (id: number) => {
        try {
            setLoading(true);
            await postsService.deletePost(id);
            setPosts((prev) => prev.filter((p) => p.id !== id));
        } catch (err: any) {
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    return { posts, loading, error, reload: load, create, update, remove };
}

export default usePosts;