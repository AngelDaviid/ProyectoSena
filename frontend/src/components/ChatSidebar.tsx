import React from 'react';
import type { Conversation } from '../types/chat';

type Props = {
    conversations: Conversation[];
    currentUserId?: number | null;
    onSelect: (c: Conversation) => void;
};

function participantName(conv: Conversation, currentUserId?: number | null) {
    const others = (conv.participants || []).filter((p) => p.id !== currentUserId);
    if (others.length === 0) {
        return 'Tú';
    }
    return others.map((o) => `${o.profile?.name ?? ''} ${o.profile?.lastName ?? ''}`.trim() || o.email).join(', ');
}

const ChatSidebar: React.FC<Props> = ({ conversations, currentUserId, onSelect }) => {
    return (
        <aside className="w-80 bg-white border-r">
            <div className="p-4 font-semibold border-b">Conversaciones</div>
            <div className="overflow-auto h-[calc(100vh-64px)]">
                {conversations.length === 0 && <div className="p-4 text-sm text-gray-500">No hay conversaciones</div>}
                {conversations.map((c) => (
                    <button
                        key={c.id}
                        className="w-full text-left p-3 border-b hover:bg-gray-50 flex items-start gap-3"
                        onClick={() => onSelect(c)}
                    >
                        <div className="flex-1">
                            <div className="font-medium">{participantName(c, currentUserId)}</div>
                            <div className="text-xs text-gray-500 mt-1">
                                {c.messages && c.messages.length > 0 ? c.messages[c.messages.length - 1].text : 'Sin mensajes aún'}
                            </div>
                        </div>
                        <div className="text-xs text-gray-400">{/* fecha, count unread, etc */}</div>
                    </button>
                ))}
            </div>
        </aside>
    );
};

export default ChatSidebar;