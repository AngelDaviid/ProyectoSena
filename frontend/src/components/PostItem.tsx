import React, { useState } from 'react';
import type { Post } from '../types/post';
import { useAuth } from '../hooks/useAuth';
import EditPostForm from './EditPostForm.tsx';
import '../components/post.css';

type Props = {
    post: Post;
    onUpdated?: (p: Post) => void;
    onDeleted?: (id: number) => void;
};

const PostItem: React.FC<Props> = ({ post, onUpdated, onDeleted }) => {
    const { user } = useAuth();
    const [editing, setEditing] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const authorName =
        post.user?.profile?.name ||
        post.user?.profile?.lastName ||
        post.user?.email ||
        'Usuario';

    // Usar la misma variable que services/api.ts
    const API_BASE = import.meta.env.SENA_API_URL || 'http://localhost:3001';

    const imageSrc = post.imageUrl
        ? post.imageUrl.startsWith('/')
            ? `${API_BASE}${post.imageUrl}`
            : post.imageUrl
        : null;

    // DEBUG: ver en consola la URL que intenta cargar
    if (imageSrc) {
        // eslint-disable-next-line no-console
        console.log('Post imageSrc ->', imageSrc);
    }

    const isOwner = !!(user && post.user && user.id === post.user.id);

    const handleDeleted = async () => {
        if (!confirm('¿Eliminar esta publicación?')) return;
        setDeleting(true);
        try {
            const { deletePost } = await import('../services/posts');
            await deletePost(post.id);
            onDeleted?.(post.id);
        } catch (err: any) {
            alert(err?.message || 'Error al eliminar');
        } finally {
            setDeleting(false);
        }
    };

    const handleSaved = (updated: Post) => {
        setEditing(false);
        onUpdated?.(updated);
    };

    return (
        <article className="post-item">
            <div className="post-header">
                <div className="post-author">
                    <div className="avatar">
                        {post.user?.profile?.avatar ? (
                            <img src={post.user.profile.avatar} alt={authorName} />
                        ) : (
                            <div className="avatar-placeholder">{authorName.charAt(0)}</div>
                        )}
                    </div>
                    <div>
                        <div className="author-name">{authorName}</div>
                        <div className="post-date">{post.createdAt ? new Date(post.createdAt).toLocaleString() : ''}</div>
                    </div>
                </div>
                {isOwner && (
                    <div className="post-actions">
                        <button onClick={() => setEditing(true)}>Editar</button>
                        <button onClick={handleDeleted} disabled={deleting}>{deleting ? 'Eliminando...' : 'Eliminar'}</button>
                    </div>
                )}
            </div>

            <div className="post-body">
                <h2>{post.title}</h2>
                {imageSrc && <img src={imageSrc} alt={post.title} className="post-image" />}
                {post.summary && <p>{post.summary}</p>}
                {editing && <EditPostForm post={post} onSaved={handleSaved} onCancel={() => setEditing(false)} />}
            </div>
        </article>
    );
};

export default PostItem;