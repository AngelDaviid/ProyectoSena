import React, { useState } from 'react';
import type { Post } from '../types/post';
import '../components/post.css';

type Props = {
    post: Post;
    onCancel?: () => void;
    onSaved?: (p: Post) => void;
};

const EditPostForm: React.FC<Props> = ({ post, onCancel, onSaved }) => {
    const [title, setTitle] = useState(post.title ?? '');
    const [content, setContent] = useState(post.content ?? '');
    const [summary, setSummary] = useState(post.summary ?? '');
    const [imageUrl, setImageUrl] = useState(post.imageUrl ?? '');
    const [categoryIds, setCategoryIds] = useState((post.categories ?? []).map((c) => c.id).join(','));
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        const ids = categoryIds
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
            .map(Number);

        const payload: any = {
            title,
            content,
            summary,
            imageUrl,
            categoryIds: ids.length ? ids : undefined,
        };

        try {
            setLoading(true);
            const { updatePost } = await import('../services/posts');
            const updated = await updatePost(post.id, payload);
            onSaved?.(updated);
        } catch (err: any) {
            setError(err?.message || 'Error al actualizar');
        } finally {
            setLoading(false);
        }
    };

    return (
        <form className="post-form" onSubmit={handleSubmit}>
            <h4>Editar publicación</h4>
            {error && <div className="post-error">{error}</div>}
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Título" />
            <textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Contenido" />
            <input value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="Resumen" />
            <input value={categoryIds} onChange={(e) => setCategoryIds(e.target.value)} placeholder="IDs de categorías (ej: 1,2)" />
            <input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="URL de la imagen (opcional)" />
            <div style={{ display: 'flex', gap: 8 }}>
                <button type="submit" disabled={loading}>{loading ? 'Guardando...' : 'Guardar'}</button>
                <button type="button" onClick={onCancel}>Cancelar</button>
            </div>
        </form>
    );
};

export default EditPostForm;