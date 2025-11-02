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

    const imageSrc = post.imageUrl
        ? post.imageUrl.startsWith('/') ? `${window.location.origin}${post.imageUrl}` : post.imageUrl
        : null;

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

                {isOwner && !editing && (
                    <div>
                        <button onClick={() => setEditing(true)}>Editar</button>
                        <button onClick={handleDeleted} disabled={deleting} style={{ marginLeft: 8 }}>
                            {deleting ? 'Eliminando...' : 'Eliminar'}
                        </button>
                    </div>
                )}
            </div>

            {!editing ? (
                <>
                    <h4 className="post-title">{post.title}</h4>
                    {imageSrc && (
                        <div className="post-image">
                            <img src={imageSrc} alt={post.title} />
                        </div>
                    )}
                    {post.summary && <p className="post-summary">{post.summary}</p>}
                    {post.content && <p className="post-content">{post.content}</p>}
                    {post.categories && post.categories.length > 0 && (
                        <div className="post-categories">
                            {post.categories.map((c) => (
                                <span key={c.id} className="category-pill">{c.name}</span>
                            ))}
                        </div>
                    )}
                </>
            ) : (
                <EditPostForm post={post} onCancel={() => setEditing(false)} onSaved={handleSaved} />
            )}
        </article>
    );
};

export default PostItem;