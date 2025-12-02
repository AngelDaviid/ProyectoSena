import React, { useState } from 'react';
import type { PostComment } from '../../types/post';
import { useAuth } from '../../hooks/useAuth';
import { usePermissions } from '../../hooks/usePermissions';
import { deleteComment, updateComment } from '../../services/posts';

type Props = {
    comment: PostComment;
    postId: number;
    onDeleted?: (id: number) => void;
    onUpdated?: (updated: PostComment) => void;
};

const API_BASE = import.meta.env.VITE_SENA_API_URL || 'http://localhost:3001';

const CommentItem: React.FC<Props> = ({ comment, postId, onDeleted, onUpdated }) => {
    const { user } = useAuth();
    const permissions = usePermissions();
    const [editing, setEditing] = useState(false);
    const [content, setContent] = useState(comment.content);
    const [loading, setLoading] = useState(false);

    const canEdit = permissions.canEditComment(comment.user?.id);
    const canDelete = permissions.canDeleteComment(comment.user?.id);
    const isSuperAdmin = permissions.isSuperAdmin;
    const isOwnComment = user?.id === comment.user?.id;

    const handleDelete = async () => {
        const confirmMessage =
            isSuperAdmin && ! isOwnComment
                ? `👑 SUPER ADMIN: Vas a eliminar un comentario de ${comment.user?.profile?.name}.\n\n¿Continuar?`
                : '¿Eliminar este comentario?';

        if (!confirm(confirmMessage)) return;

        try {
            setLoading(true);
            await deleteComment(postId, comment.id);
            if (onDeleted) onDeleted(comment.id);
        } catch (err: any) {
            alert(err?.response?. data?.message || 'Error al eliminar');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdate = async () => {
        if (!content.trim()) {
            alert('El comentario no puede estar vacío');
            return;
        }

        try {
            setLoading(true);
            const updated = await updateComment(postId, comment.id, content);
            if (onUpdated) onUpdated(updated);
            setEditing(false);
        } catch (err: any) {
            alert(err?.response?. data?.message || 'Error al actualizar');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-gray-50 rounded-lg p-4 mb-2 relative">
            {/* ✅ Badge SUPER ADMIN para comentarios de otros */}
            {isSuperAdmin && !isOwnComment && (
                <div className="absolute -top-2 -right-2 z-10">
                    <div className="px-2 py-1 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full shadow-lg">
                        <span className="text-white text-[10px] font-bold">👑</span>
                    </div>
                </div>
            )}

            <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                    <img
                        src={
                            comment.user?.profile?.avatar
                                ? comment.user.profile.avatar.startsWith('/')
                                    ? `${API_BASE}${comment.user. profile.avatar}`
                                    : comment.user.profile.avatar
                                : '/default-avatar.png'
                        }
                        alt={comment.user?.profile?.name || 'Usuario'}
                        className="w-8 h-8 rounded-full object-cover border border-gray-300"
                    />
                    <div>
                        <p className="font-medium text-sm text-gray-900">
                            {comment.user?.profile?.name} {comment.user?. profile?.lastName}
                        </p>
                        <p className="text-xs text-gray-500">
                            {new Date(comment.createdAt || Date.now()).toLocaleDateString('es-CO')}
                        </p>
                    </div>
                </div>

                {(canEdit || canDelete) && ! editing && (
                    <div className="flex gap-2">
                        {canEdit && (
                            <button
                                onClick={() => setEditing(true)}
                                className="text-xs text-blue-600 hover:text-blue-800 hover:underline font-medium"
                            >
                                Editar
                            </button>
                        )}
                        {canDelete && (
                            <button
                                onClick={handleDelete}
                                disabled={loading}
                                className="text-xs text-red-600 hover:text-red-800 hover:underline font-medium disabled:opacity-50"
                            >
                                {isSuperAdmin && !isOwnComment && '👑 '}
                                {loading ? 'Eliminando...' : 'Eliminar'}
                            </button>
                        )}
                    </div>
                )}
            </div>

            {editing ? (
                <div className="mt-2 space-y-2">
          <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={3}
              disabled={loading}
          />
                    <div className="flex gap-2">
                        <button
                            onClick={handleUpdate}
                            disabled={loading}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition"
                        >
                            {loading ? 'Guardando...' : 'Guardar'}
                        </button>
                        <button
                            onClick={() => {
                                setEditing(false);
                                setContent(comment.content);
                            }}
                            disabled={loading}
                            className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-400 disabled:opacity-50 transition"
                        >
                            Cancelar
                        </button>
                    </div>
                </div>
            ) : (
                <p className="text-gray-700 text-sm mt-2">{comment.content}</p>
            )}

            {/* ✅ Badge de permisos especiales */}
            {isSuperAdmin && !isOwnComment && ! editing && (
                <div className="mt-3 pt-2 border-t border-purple-100">
                    <p className="text-[10px] text-purple-600 font-medium flex items-center gap-1">
                        <span>👑</span>
                        Permisos de Super Admin activos
                    </p>
                </div>
            )}
        </div>
    );
};

export default CommentItem;