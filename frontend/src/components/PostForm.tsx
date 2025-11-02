import React, { useState } from 'react';
import { useAuth } from "../hooks/useAuth.ts";
import type { Post } from '../types/post.ts'
import '../components/post.css';

type Props = {
    onCreated?: (p: Post) => void;
};

const NewPostForm: React.FC<Props> = ({ onCreated }) => {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [summary, setSummary] = useState('');
    const [categories, setCategories] = useState(''); // "1,2"
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const { token } = useAuth();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        if (!title.trim()) {
            setError('El título es obligatorio');
            return;
        }

        const fd = new FormData();
        fd.append('title', title);
        if (content) fd.append('content', content);
        if (summary) fd.append('summary', summary);
        if (file) fd.append('image', file);
        const ids = categories
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean);
        ids.forEach((id) => fd.append('categoryIds[]', id));

        try {
            setLoading(true);
            const { createPost } = await import('../services/posts.ts');
            const created = await createPost(fd);
            setTitle('');
            setContent('');
            setSummary('');
            setFile(null);
            setCategories('');
            onCreated?.(created);
        } catch (err: any) {
            setError(err?.message || 'Error al crear la publicación');
        } finally {
            setLoading(false);
        }
    };

    return (
        <form className="post-form" onSubmit={handleSubmit}>
            <h3>Crear publicación</h3>
            {error && <div className="post-error">{error}</div>}
            <input placeholder="Título" value={title} onChange={(e) => setTitle(e.target.value)} />
            <textarea placeholder="Contenido (opcional)" value={content} onChange={(e) => setContent(e.target.value)} />
            <input placeholder="Resumen (opcional)" value={summary} onChange={(e) => setSummary(e.target.value)} />
            <input placeholder="IDs de categorías (ej: 1,2)" value={categories} onChange={(e) => setCategories(e.target.value)} />
            <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            <div style={{ display: 'flex', gap: 8 }}>
                <button type="submit" disabled={loading || !token}>
                    {loading ? 'Publicando...' : 'Publicar'}
                </button>
                {!token && <small style={{ alignSelf: 'center' }}>Inicia sesión para publicar</small>}
            </div>
        </form>
    );
};

export default NewPostForm;