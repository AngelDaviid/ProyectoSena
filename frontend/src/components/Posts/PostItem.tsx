import React, { useState, useRef, useEffect } from 'react';
import type { Post, PostComment } from '../../types/post.ts';
import { useAuth } from '../../hooks/useAuth.ts';
import EditPostForm from './EditPostForm.tsx';
import { toggleLike as apiToggleLike, createComment as apiCreateComment, getComments as apiGetComments, deletePost } from '../../services/posts.ts';
import CommentForm from '../Comments/CommentForm.tsx';
import CommentItem from '../Comments/CommentItem.tsx';
import { Heart, MessageSquare } from 'lucide-react';

type Props = {
    post: Post;
    onUpdated?: (p: Post) => void;
    onDeleted?: (id: number) => void;
};

const API_BASE = import.meta.env.SENA_API_URL || 'http://localhost:3001';

const PostItem: React.FC<Props> = ({ post, onUpdated, onDeleted }) => {
    const initialLikes = Array.isArray((post as any).likes)
        ? (post as any).likes.length
        : (typeof post.likesCount === 'number' ? post.likesCount : 0);

    const { user } = useAuth();
    const [editing, setEditing] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement | null>(null);

    const [likesCount, setLikesCount] = useState<number>(initialLikes);
    const [liked, setLiked] = useState<boolean>(!!post.likedByUser);
    const [liking, setLiking] = useState<boolean>(false);

    const [comments, setComments] = useState<PostComment[]>(post.comments ?? []);
    const [showComments, setShowComments] = useState(false);
    const [loadingComments, setLoadingComments] = useState(false);

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

    // Sync comments if backend included them in the post payload
    useEffect(() => {
        setComments(post.comments ?? []);
    }, [post.comments]);

    // Preload comments on mount / when post.id changes so comments are available after refresh
    useEffect(() => {
        let mounted = true;

        const preload = async () => {
            try {
                // If backend already provided comments, use them
                if (post.comments && post.comments.length > 0) {
                    setComments(post.comments);
                    return;
                }

                // If we already loaded them locally, skip
                if (comments.length > 0) return;

                setLoadingComments(true);
                const data = await apiGetComments(post.id);
                if (!mounted) return;
                setComments(data);
            } catch (err) {
                // Non-blocking: failure to preload is ok, comments can still be loaded when user opens them
                console.error('Error pre-cargando comentarios', err);
            } finally {
                if (mounted) setLoadingComments(false);
            }
        };

        preload();

        return () => {
            mounted = false;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [post.id]);

    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setMenuOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Existing behavior: lazy load comments when user opens the comments panel.
    // This will not re-fetch if comments are already populated.
    useEffect(() => {
        if (!showComments) return;
        if (comments.length > 0) return;
        let mounted = true;
        const load = async () => {
            try {
                setLoadingComments(true);
                const data = await apiGetComments(post.id);
                if (!mounted) return;
                setComments(data);
            } catch (err) {
                console.error('Error cargando comentarios', err);
            } finally {
                if (mounted) setLoadingComments(false);
            }
        };
        load();
        return () => {
            mounted = false;
        };
    }, [showComments, post.id, comments.length]);

    const handleDeleted = async () => {
        if (!confirm('¿Eliminar esta publicación?')) return;
        setDeleting(true);
        try {
            await deletePost(post.id);
            onDeleted?.(post.id);
        } catch (err: any) {
            alert(err?.response?.data?.message || err?.message || 'Error al eliminar');
        } finally {
            setDeleting(false);
            setMenuOpen(false);
        }
    };

    const handleToggleLike = async () => {
        // require login
        if (!user || !user.id) {
            alert('Inicia sesión para dar like');
            return;
        }

        if (liking) return; // evitar múltiples clicks

        const prevLiked = liked;
        const prevCount = likesCount;

        // Optimistic update
        setLiked(!prevLiked);
        setLikesCount(prevCount + (prevLiked ? -1 : 1));
        setLiking(true);

        try {
            const res = await apiToggleLike(post.id);
            // Use server response to normalize state
            if (typeof res.liked === 'boolean') setLiked(res.liked);
            if (typeof res.likesCount === 'number') setLikesCount(res.likesCount);
        } catch (err) {
            console.error('Error toggling like', err);
            // revert optimistic update on error
            setLiked(prevLiked);
            setLikesCount(prevCount);
        } finally {
            setLiking(false);
        }
    };

    const handleCreateComment = async (content: string) => {
        try {
            const created = await apiCreateComment(post.id, content);
            // Ensure created has user.profile (backend should return it)
            setComments((prev) => [...prev, created]);
            setShowComments(true);
        } catch (err) {
            console.error(err);
            throw err;
        }
    };

    const handleCommentUpdated = (updated: PostComment) => {
        setComments((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    };

    const handleCommentDeleted = (id: number) => {
        setComments((prev) => prev.filter((c) => c.id !== id));
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

                        {/* Mostrar el contenido completo si existe, si no mostrar summary */}
                        {post.content ? (
                            <div className="text-gray-700 mt-1">{post.content}</div>
                        ) : post.summary ? (
                            <p className="text-gray-700 mt-1">{post.summary}</p>
                        ) : null}
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

                    <div className="mt-3 flex items-center gap-4">
                        <button
                            onClick={handleToggleLike}
                            className={`flex items-center gap-2 focus:outline-none transition ${
                                liked ? 'text-red-600' : 'text-gray-600'
                            } ${liking ? 'opacity-60 cursor-not-allowed' : 'hover:text-red-500'}`}
                            aria-pressed={liked}
                            aria-disabled={liking}
                            title={liked ? 'Quitar me gusta' : 'Me gusta'}
                            disabled={liking}
                        >
                            <Heart className="w-5 h-5" />
                            <span>{likesCount ?? 0}</span>
                        </button>

                        <button
                            onClick={() => setShowComments((s) => !s)}
                            className="flex items-center gap-2 text-gray-600"
                            aria-expanded={showComments}
                            title="Mostrar comentarios"
                        >
                            <MessageSquare className="w-5 h-5" />
                            <span>Comentarios ({comments.length})</span>
                        </button>
                    </div>

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

                    {showComments && (
                        <div className="mt-4 border-t border-gray-100 pt-4 space-y-3">
                            {loadingComments && <div className="text-sm text-gray-500">Cargando comentarios...</div>}

                            {!loadingComments && comments.length === 0 && (
                                <div className="text-sm text-gray-500">No hay comentarios aún</div>
                            )}

                            {!loadingComments &&
                                comments.map((c) => (
                                    <CommentItem
                                        key={c.id}
                                        postId={post.id}
                                        comment={c}
                                        onUpdated={handleCommentUpdated}
                                        onDeleted={handleCommentDeleted}
                                    />
                                ))
                            }

                            <CommentForm onSubmit={handleCreateComment} />
                        </div>
                    )}
                </div>
            </div>
        </article>
    );
};

export default PostItem;