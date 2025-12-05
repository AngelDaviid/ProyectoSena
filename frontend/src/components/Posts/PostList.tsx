import React, { useEffect, useState } from 'react';
import NewPostForm from './PostForm.tsx';
import PostItem from './PostItem.tsx';
import { usePosts } from '../../hooks/usePosts.ts';
import type { Post } from '../../types/post.ts';

const PostList: React.FC = () => {
    const { posts, loading, error, remove } = usePosts();
    const [localPosts, setLocalPosts] = useState<Post[]>(posts);

    useEffect(() => {
        setLocalPosts(posts);
    }, [posts]);

    const handleCreated = (newPost: Post) => {
        setLocalPosts((prev) => [newPost, ...prev]);
    };

    const handleUpdated = (updated: Post) => {
        setLocalPosts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    };

    const handleDeleted = (id: number) => {
        setLocalPosts((prev) => prev.filter((p) => p.id !== id));
        if (remove) remove(id);
    };

    useEffect(() => {
        if (! loading && !error) {
            setLocalPosts(posts);
        }
    }, [loading, error, posts]);

    return (
        <div className="max-w-2xl mx-auto mt-6 sm:mt-8 bg-gray-50 rounded-2xl sm:rounded-3xl shadow-sm border border-gray-200 p-4 sm:p-6">
            <div className="mb-6 sm:mb-8">
                <NewPostForm onCreated={handleCreated} />
            </div>

            {loading && (
                <div className="text-center py-6 text-gray-500 animate-pulse text-sm sm:text-base">
                    Cargando publicaciones...
                </div>
            )}
            {error && (
                <div className="text-red-600 bg-red-50 border border-red-200 rounded-xl p-3 text-xs sm:text-sm mb-4">
                    {error}
                </div>
            )}
            {! loading && localPosts.length === 0 && (
                <div className="text-center text-gray-500 py-8 text-sm sm:text-base">
                    No hay publicaciones todavía 📝
                </div>
            )}

            <div className="space-y-4 sm:space-y-6">
                {localPosts.map((p) => (
                    <PostItem
                        key={p. id}
                        post={p}
                        onUpdated={handleUpdated}
                        onDeleted={handleDeleted}
                    />
                ))}
            </div>
        </div>
    );
};

export default PostList;