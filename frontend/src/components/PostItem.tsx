import React, { useState, useRef, useEffect } from 'react';
import type { Post } from '../types/post';
import { useAuth } from '../hooks/useAuth';
import EditPostForm from './EditPostForm';

type Props = {
    post: Post;
    onUpdated?: (p: Post) => void;
    onDeleted?: (id: number) => void;
};

const API_BASE = import.meta.env.SENA_API_URL || 'http://localhost:3001';

const PostItem: React.FC<Props> = ({ post, onUpdated, onDeleted }) => {
    const { user } = useAuth();
    const [editing, setEditing] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement | null>(null);

    const authorName =
        post.user?.profile?.name ||
        post.user?.profile?.lastName ||
        post.user?.email ||
        'Usuario';

    const imageSrc = post.imageUrl
        ? post.imageUrl.startsWith('/')
            ? `${API_BASE}${post.imageUrl}`
            : post.imageUrl
        : null;

    const authorAvatar =
        post.user?.profile?.avatar
            ? post.user!.profile!.avatar!.startsWith('/')
                ? `${API_BASE}${post.user!.profile!.avatar}`
                : post.user!.profile!.avatar
            : null;

    const isOwner = !!(user && post.user && user.id === post.user.id);

    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setMenuOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleDeleted = async () => {
        if (!confirm('¿Eliminar esta publicación?')) return;
        setDeleting(true);
        try {
            const { deletePost } = await import('../services/posts');
            await deletePost(post.id);
            onDeleted?.(post.id);
        } catch (err: any) {
            alert(err?.response?.data?.message || err?.message || 'Error al eliminar');
        } finally {
            setDeleting(false);
            setMenuOpen(false);
        }
    };

    return (
        <article className="border-b border-gray-200 hover:bg-gray-50 transition-colors duration-150 px-4 py-5">
            <div className="flex items-start space-x-3">
                <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center text-gray-600 font-semibold flex-shrink-0">
                    {authorAvatar ? (
                        <img src={authorAvatar} alt={authorName} className="w-full h-full object-cover" />
                    ) : (
                        authorName.charAt(0).toUpperCase()
                    )}
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center space-x-2">
                            <span className="font-semibold text-gray-900">{authorName}</span>
                            <span className="text-sm text-gray-500">
                {post.createdAt ? new Date(post.createdAt).toLocaleDateString() : ''}
              </span>
                        </div>

                        {isOwner && (
                            <div className="relative" ref={menuRef}>
                                <button
                                    onClick={() => setMenuOpen((s) => !s)}
                                    aria-haspopup="menu"
                                    aria-expanded={menuOpen}
                                    className="p-1.5 rounded-full hover:bg-gray-100 transition cursor-pointer"
                                    title="Opciones"
                                >
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        className="w-5 h-5 text-gray-600"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                        strokeWidth={2}
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 12h.01M12 12h.01M18 12h.01" />
                                    </svg>
                                </button>

                                {menuOpen && (
                                    <div className="absolute right-0 mt-2 w-40 bg-white border border-gray-200 rounded-xl shadow-lg z-20 overflow-hidden">
                                        <button
                                            onClick={() => {
                                                setEditing(true);
                                                setMenuOpen(false);
                                            }}
                                            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition"
                                        >
                                            Editar
                                        </button>
                                        <button
                                            onClick={handleDeleted}
                                            disabled={deleting}
                                            className={`block w-full text-left px-4 py-2 text-sm transition ${
                                                deleting ? 'text-red-300 cursor-not-allowed' : 'text-red-600 hover:bg-red-50'
                                            }`}
                                        >
                                            {deleting ? 'Eliminando...' : 'Eliminar'}
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="mt-2 text-gray-800 whitespace-pre-wrap break-words">
                        {post.title && <p className="text-base font-medium">{post.title}</p>}
                        {post.summary && <p className="text-gray-700">{post.summary}</p>}
                    </div>

                    {imageSrc && (
                        <div className="mt-3 rounded-2xl overflow-hidden border border-gray-200">
                            <img
                                src={imageSrc}
                                alt={post.title ?? 'Imagen'}
                                className="w-full max-h-96 object-cover transition-transform duration-300 hover:scale-[1.02]"
                            />
                        </div>
                    )}

                    {editing && (
                        <div className="mt-4 border-t border-gray-200 pt-4">
                            <EditPostForm
                                post={post}
                                onSaved={(updated) => {
                                    setEditing(false);
                                    onUpdated?.(updated);
                                }}
                                onCancel={() => setEditing(false)}
                            />
                        </div>
                    )}
                </div>
            </div>
        </article>
    );
};

export default PostItem;