import React from 'react';
import type { Comment } from '../../types/post.ts';

type Props = {
    comments?: Comment[];
};

const CommentList: React.FC<Props> = ({ comments = [] }) => {
    const API_BASE = import.meta.env.SENA_API_URL || 'http://localhost:3001';

    return (
        <div className="space-y-2 sm:space-y-3 mt-3">
            {comments.length === 0 ? (
                <div className="text-center text-xs sm:text-sm text-gray-500 py-4">
                    No hay comentarios todavía
                </div>
            ) : (
                comments. map((c) => {
                    const authorName =
                        c.user?.profile?.name ||
                        c.user?. profile?.lastName ||
                        c.user?.email ||
                        'Usuario';

                    const authorAvatar = c.user?.profile?.avatar
                        ? c.user. profile.avatar. startsWith('/')
                            ?  `${API_BASE}${c.user.profile.avatar}`
                            : c.user.profile.avatar
                        : null;

                    return (
                        <div key={c.id} className="bg-white border border-gray-100 rounded-xl p-2. 5 sm:p-3">
                            <div className="flex items-start gap-2 sm:gap-3">
                                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center text-gray-600 font-semibold flex-shrink-0 text-xs sm:text-sm">
                                    {authorAvatar ? (
                                        <img src={authorAvatar} alt={authorName} className="w-full h-full object-cover" />
                                    ) : (
                                        authorName.charAt(0).toUpperCase()
                                    )}
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="text-xs sm:text-sm font-medium truncate">{authorName}</div>
                                    <div className="text-gray-700 text-xs sm:text-sm whitespace-pre-wrap break-words mt-1">
                                        {c.content}
                                    </div>
                                    <div className="text-xs text-gray-400 mt-1">
                                        {new Date(c.createdAt || ''). toLocaleString()}
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })
            )}
        </div>
    );
};

export default CommentList;