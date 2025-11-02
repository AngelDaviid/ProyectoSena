import React from 'react';
import NewPostForm from './PostForm.tsx';
import PostItem from './PostItem.tsx';
import { usePosts } from '../hooks/usePosts';
import '../components/post.css';

const PostList: React.FC = () => {
    const { posts, loading, error, update, remove, reload } = usePosts();

    const handleCreated = () => {
        reload();
    };

    const handleUpdated = (updated: any) => {
        if (update) update(updated.id, updated);
    };

    const handleDeleted = (id: number) => {
        if (remove) remove(id);
    };

    return (
        <div className="posts-container">
            <NewPostForm onCreated={handleCreated} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3>Publicaciones</h3>
                <div>
                    <button onClick={reload}>Recargar</button>
                </div>
            </div>

            {loading && <div>Cargando...</div>}
            {error && <div className="post-error">{error}</div>}
            {!loading && posts.length === 0 && <div>No hay publicaciones</div>}
            <div className="posts-list">
                {posts.map((p) => (
                    <PostItem
                        key={p.id}
                        post={p}
                        onUpdated={(u) => handleUpdated(u)}
                        onDeleted={(id) => handleDeleted(id)}
                    />
                ))}
            </div>
        </div>
    );
};

export default PostList;