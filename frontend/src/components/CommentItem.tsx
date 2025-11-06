import React, { useState } from 'react';
import type { Comment as CommentType } from '../types/post';
import { useAuth } from '../hooks/useAuth';
import { updateComment as apiUpdateComment, deleteComment as apiDeleteComment } from '../services/posts';

type Props = {
    postId: number;
    comment: CommentType;
    onUpdated?: (c: CommentType) => void;
    onDeleted?: (id: number) => void;
};

const CommentItem: React.FC<Props> = ({ postId, comment, onUpdated, onDeleted }) => {
    const { user } = useAuth();
    const isAuthor = user?.id === comment.user?.id;
    const [editing, setEditing] = useState(false);
    const [content, setContent] = useState(comment.content);
    const [loading, setLoading] = useState(false);

    const authorName =
        comment.user?.profile?.name ||
        comment.user?.profile?.lastName ||
        comment.user?.email ||
        'Usuario';

    const authorAvatar =
        comment.user?.profile?.avatar
            ? comment.user!.profile!.avatar!.startsWith('/')
                ? `${(import.meta.env.SENA_API_URL || 'http://localhost:3001')}${comment.user!.profile!.avatar}`
                : comment.user!.profile!.avatar
            : null;

    const handleSave = async () => {
        if (!content.trim()) return;
        try {
            setLoading(true);
            const updated = await apiUpdateComment(postId, comment.id, content.trim());
            onUpdated?.(updated);
            setEditing(false);
        } catch (err: any) {
            console.error(err);
            alert(err?.response?.data?.message || 'Error al actualizar comentario');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm('¿Eliminar este comentario?')) return;
        try {
            setLoading(true);
            await apiDeleteComment(postId, comment.id);
            onDeleted?.(comment.id);
        } catch (err: any) {
            console.error(err);
            alert(err?.response?.data?.message || 'Error al eliminar comentario');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center text-gray-600 font-semibold flex-shrink-0">
                {authorAvatar ? (
                    <img src={authorAvatar} alt={authorName} className="w-full h-full object-cover" />
                ) : (
                    authorName.charAt(0).toUpperCase()
                )}
            </div>

            <div className="flex-1">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="text-sm font-medium text-gray-900">{authorName}</div>
                        <div className="text-xs text-gray-500">
                            {comment.createdAt ? new Date(comment.createdAt).toLocaleString() : ''}
                        </div>
                    </div>

                    {isAuthor && (
                        <div className="flex items-center gap-2">
                            {!editing && (
                                <button
                                    onClick={() => setEditing(true)}
                                    className="text-xs text-blue-600 hover:underline"
                                >
                                    Editar
                                </button>
                            )}
                            <button
                                onClick={handleDelete}
                                disabled={loading}
                                className="text-xs text-red-600 hover:underline"
                            >
                                Eliminar
                            </button>
                        </div>
                    )}
                </div>

                <div className="mt-1 text-sm text-gray-800">
                    {!editing && <div className="whitespace-pre-wrap">{comment.content}</div>}
                    {editing && (
                        <div className="space-y-2">
                            <textarea
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                className="w-full border border-gray-200 rounded-md p-2 text-sm"
                                rows={3}
                            />
                            <div className="flex gap-2">
                                <button
                                    onClick={handleSave}
                                    disabled={loading}
                                    className="px-3 py-1 rounded bg-blue-600 text-white text-sm"
                                >
                                    {loading ? 'Guardando...' : 'Guardar'}
                                </button>
                                <button
                                    onClick={() => {
                                        setEditing(false);
                                        setContent(comment.content);
                                    }}
                                    className="px-3 py-1 rounded bg-gray-100 text-sm"
                                >
                                    Cancelar
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CommentItem;