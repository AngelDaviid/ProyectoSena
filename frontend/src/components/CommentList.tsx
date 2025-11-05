import React from 'react';
import type { Comment } from '../types/post';

type Props = {
    comments?: Comment[];
};

const CommentList: React.FC<Props> = ({ comments = [] }) => {
    return (
        <div className="space-y-3 mt-3">
            {comments.map((c) => (
                <div key={c.id} className="bg-white border border-gray-100 rounded-xl p-3">
                    <div className="text-sm font-medium">{c.user?.profile?.name ?? c.user?.email ?? 'Usuario'}</div>
                    <div className="text-gray-700 text-sm whitespace-pre-wrap">{c.content}</div>
                    <div className="text-xs text-gray-400 mt-1">{new Date(c.createdAt || '').toLocaleString()}</div>
                </div>
            ))}
        </div>
    );
};

export default CommentList;