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

    const handleSave = async () => {
        if (!content.trim()) return;
        try {
            setLoading(true);
            const updated = await apiUpdateComment(postId, comment.id, content.trim());
            onUpdated?.(updated);
            setEditing(false);
        } catch (err) {
            console.error(err);
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
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white border border-gray-100 rounded-xl p-3">
            <div className="flex justify-between items-start gap-3">
                <div className="flex-1">
                    <div className="text-sm font-medium">{comment.user?.profile?.name ?? comment.user?.email ?? 'Usuario'}</div>
                    {!editing ? (
                        <div className="text-gray-700 text-sm whitespace-pre-wrap mt-1">{comment.content}</div>
                    ) : (
                        <textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            className="w-full border rounded-md p-2 mt-1"
                            rows={3}
                        />
                    )}
                    <div className="text-xs text-gray-400 mt-1">{comment.createdAt ? new Date(comment.createdAt).toLocaleString() : ''}</div>
                </div>

                {isAuthor && (
                    <div className="flex flex-col items-end gap-2">
                        {!editing ? (
                            <>
                                <button onClick={() => setEditing(true)} className="text-sm text-blue-600">Editar</button>
                                <button onClick={handleDelete} disabled={loading} className="text-sm text-red-600">Eliminar</button>
                            </>
                        ) : (
                            <>
                                <button onClick={handleSave} disabled={loading} className="text-sm text-green-600">Guardar</button>
                                <button onClick={() => { setEditing(false); setContent(comment.content); }} className="text-sm text-gray-600">Cancelar</button>
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default CommentItem;