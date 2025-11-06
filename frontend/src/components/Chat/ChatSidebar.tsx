import React from 'react';
import type { Conversation } from '../../types/chat.ts';

type Props = {
    conversations: Conversation[];
    currentUserId?: number | null;
    onSelect: (c: Conversation) => void;
};

const participantName = (conv: Conversation, currentUserId?: number | null) => {
    const others = (conv.participants || []).filter((p) => p.id !== currentUserId);
    if (others.length === 0) return 'Tú';
    return others
        .map((o) => `${o.profile?.name ?? ''} ${o.profile?.lastName ?? ''}`.trim() || o.email)
        .join(', ');
};

const ChatSidebar: React.FC<Props> = ({ conversations, currentUserId, onSelect }) => {
    return (
        <aside className="bg-white border-r flex flex-col">
            <div className="p-4 text-lg font-semibold border-b text-green-700">
                Conversaciones
            </div>
            <div className="flex-1 overflow-auto">
                {conversations.length === 0 ? (
                    <div className="p-4 text-sm text-gray-500">
                        No hay conversaciones
                    </div>
                ) : (
                    conversations.map((c) => (
                        <button
                            key={c.id}
                            onClick={() => onSelect(c)}
                            className="w-full text-left px-4 py-3 border-b hover:bg-green-50 transition flex flex-col"
                        >
                            <span className="font-medium text-gray-800">
                                {participantName(c, currentUserId)}
                            </span>
                            <span className="text-xs text-gray-500 mt-1 truncate">
                                {c.messages && c.messages.length > 0
                                    ? c.messages[c.messages.length - 1].text
                                    : 'Sin mensajes aún'}
                            </span>
                        </button>
                    ))
                )}
            </div>
        </aside>
    );
};

export default ChatSidebar;
