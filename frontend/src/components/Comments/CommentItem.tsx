import React, { useState } from 'react';
import type { Comment as CommentType } from '../../types/post.ts';
import { useAuth } from '../../hooks/useAuth.ts';
import { useToast } from '../Toast-context.tsx';
import { updateComment as apiUpdateComment, deleteComment as apiDeleteComment } from '../../services/posts.ts';

type Props = {
    postId: number;
    comment: CommentType;
    onUpdated?: (c: CommentType) => void;
    onDeleted?: (id: number) => void;
};

const CommentItem: React. FC<Props> = ({ postId, comment, onUpdated, onDeleted }) => {
    const { user } = useAuth();
    const toast = useToast();

    const isAuthor = user?.id === comment.user?.id;
    const isDeveloper = user?.role === 'desarrollador';
    const canModifyComment = isAuthor || isDeveloper;

    const [editing, setEditing] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);
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
        if (!content.trim()) {
            toast.warning('El comentario no puede estar vacío');
            return;
        }

        try {
            setLoading(true);
            const updated = await apiUpdateComment(postId, comment.id, content.trim());
            onUpdated?.(updated);
            setEditing(false);
            toast.success('Comentario actualizado');
        } catch (err: any) {
            console.error(err);
            toast.error(err?.response?.data?.message || 'Error al actualizar comentario');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        try {
            setLoading(true);
            await apiDeleteComment(postId, comment.id);
            onDeleted?.(comment. id);
            toast.success('Comentario eliminado');
            setConfirmDelete(false);
        } catch (err: any) {
            console.error(err);
            toast.error(err?.response?.data?.message || 'Error al eliminar comentario');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex items-start gap-2 sm:gap-3 mb-3 bg-gray-50 rounded-lg p-3">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full overflow-hidden bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center text-white font-semibold flex-shrink-0 text-xs sm:text-sm shadow-sm">
                {authorAvatar ?  (
                    <img src={authorAvatar} alt={authorName} className="w-full h-full object-cover" />
                ) : (
                    authorName.charAt(0).toUpperCase()
                )}
            </div>

            <div className="flex-1 min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2">
                    <div className="min-w-0">
                        <div className="text-xs sm:text-sm font-semibold text-gray-900 truncate">{authorName}</div>
                        <div className="text-xs text-gray-500">
                            {comment.createdAt ? new Date(comment. createdAt).toLocaleDateString('es-ES', {
                                day: 'numeric',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit'
                            }) : ''}
                        </div>
                    </div>

                    {canModifyComment && !confirmDelete && (
                        <div className="flex items-center gap-2 flex-shrink-0">
                            {isAuthor && !editing && (
                                <button
                                    onClick={() => setEditing(true)}
                                    className="text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline transition-colors"
                                >
                                    Editar
                                </button>
                            )}
                            <button
                                onClick={() => setConfirmDelete(true)}
                                disabled={loading}
                                className="text-xs font-medium text-red-600 hover:text-red-700 hover:underline disabled:opacity-50 transition-colors"
                            >
                                Eliminar
                            </button>
                        </div>
                    )}
                </div>

                {confirmDelete && (
                    <div className="mt-2 bg-red-50 border-l-4 border-red-500 rounded-r p-2">
                        <p className="text-xs text-red-800 font-medium mb-2">
                            ¿Eliminar este comentario?
                        </p>
                        <div className="flex gap-2">
                            <button
                                onClick={handleDelete}
                                disabled={loading}
                                className="px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                {loading ? 'Eliminando.. .' : 'Confirmar'}
                            </button>
                            <button
                                onClick={() => setConfirmDelete(false)}
                                disabled={loading}
                                className="px-2 py-1 bg-white border border-gray-300 text-gray-700 text-xs rounded hover:bg-gray-50 transition-colors"
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                )}

                <div className="mt-2 text-xs sm:text-sm text-gray-800">
                    {!editing && ! confirmDelete && (
                        <div className="whitespace-pre-wrap break-words">{comment.content}</div>
                    )}

                    {editing && (
                        <div className="space-y-2">
                            <textarea
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                className="w-full border border-gray-300 rounded-lg p-2 text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-all"
                                rows={3}
                                placeholder="Escribe tu comentario..."
                            />
                            <div className="flex flex-col sm:flex-row gap-2">
                                <button
                                    onClick={handleSave}
                                    disabled={loading || !content.trim()}
                                    className="px-3 py-1. 5 rounded-lg bg-blue-600 text-white text-xs sm:text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {loading ? 'Guardando.. .' : 'Guardar'}
                                </button>
                                <button
                                    onClick={() => {
                                        setEditing(false);
                                        setContent(comment.content);
                                    }}
                                    disabled={loading}
                                    className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 text-xs sm:text-sm font-medium hover:bg-gray-200 transition-colors"
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