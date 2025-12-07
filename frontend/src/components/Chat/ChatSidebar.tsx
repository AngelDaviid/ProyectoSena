import React, { useMemo } from 'react';
import { MessageCircle, Search } from 'lucide-react';
import type { Conversation } from '../../types/chat';

interface Props {
    conversations: Conversation[];
    currentUserId: number;
    activeConversationId: number | null;
    onSelect: (conv: Conversation) => void;
    unreadCounts?: Record<number, number>;
}

const API_BASE = import.meta.env.VITE_SENA_API_URL || 'http://localhost:3001';

function participantName(conv: Conversation, currentUserId: number): string {
    const others = conv.participants?. filter((p) => p.id !== currentUserId) || [];
    if (others.length === 0) return 'Chat';
    return others
        .map((p) => {
            const fullName = `${p.profile?. name || ''} ${p.profile?.lastName || ''}`. trim();
            return fullName || p.email || 'Usuario';
        })
        .join(', ');
}

function getParticipantAvatar(conv: Conversation, currentUserId: number): string | null {
    const others = conv.participants?.filter((p) => p.id !== currentUserId) || [];
    if (others. length === 0 || !others[0]?.profile?.avatar) {
        return null;
    }

    const avatar = others[0]. profile.avatar;
    return avatar. startsWith('/')
        ? `${API_BASE}${avatar}`
        : avatar;
}

function lastMessageText(conv: Conversation): string {
    const lastMsg = conv. messages?.[conv.messages.length - 1];
    if (!lastMsg) return 'Sin mensajes';

    if (lastMsg.imageUrl && ! lastMsg.text) return '📷 Imagen';
    if (lastMsg.text) {
        return lastMsg.text. length > 50
            ? lastMsg.text.substring(0, 50) + '...'
            : lastMsg. text;
    }
    return 'Sin mensajes';
}

function lastMessageTime(conv: Conversation): string {
    const lastMsg = conv. messages?.[conv.messages.length - 1];
    if (! lastMsg?. createdAt) return '';

    const date = new Date(lastMsg.createdAt);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math. floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Ahora';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;

    return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });
}

const ChatSidebar: React.FC<Props> = ({
                                          conversations,
                                          currentUserId,
                                          activeConversationId,
                                          onSelect,
                                          unreadCounts = {},
                                      }) => {
    const [searchQuery, setSearchQuery] = React.useState('');

    const uniqueConversations = useMemo(() => {
        console.log('[ChatSidebar] Raw conversations count:', conversations.length);

        const conversationMap = new Map<number, Conversation>();

        conversations.forEach((conv) => {
            if (!conversationMap.has(conv.id)) {
                conversationMap.set(conv.id, conv);
            } else {
                console.warn('[ChatSidebar] Duplicate conversation detected:', conv.id);
            }
        });

        const unique = Array.from(conversationMap.values());
        console.log('[ChatSidebar] Unique conversations count:', unique.length);

        return unique;
    }, [conversations]);

    const sortedConversations = useMemo(() => {
        const filtered = uniqueConversations.filter((conv) => {
            if (!searchQuery) return true;
            const name = participantName(conv, currentUserId).toLowerCase();
            return name.includes(searchQuery.toLowerCase());
        });

        return filtered.sort((a, b) => {
            const aTime = a.messages?.[a.messages. length - 1]?.createdAt || '';
            const bTime = b.messages?.[b.messages.length - 1]?.createdAt || '';

            if (!aTime && !bTime) return 0;
            if (!aTime) return 1;
            if (!bTime) return -1;

            return new Date(bTime).getTime() - new Date(aTime).getTime();
        });
    }, [uniqueConversations, searchQuery, currentUserId]);

    return (
        <aside className="bg-gradient-to-b from-white to-green-50 border-r-2 border-green-100 flex flex-col h-full">
            <div className="p-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-md">
                <div className="flex items-center gap-2 mb-3">
                    <MessageCircle className="w-6 h-6" />
                    <h2 className="text-xl font-bold">Mensajes</h2>
                </div>

                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/60" />
                    <input
                        type="text"
                        placeholder="Buscar conversaciones..."
                        className="w-full bg-white/20 backdrop-blur-sm border border-white/30 rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-white/50 focus:bg-white/30 transition"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target. value)}
                    />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto">
                {sortedConversations.length === 0 ?  (
                    <div className="flex flex-col items-center justify-center h-full text-center p-6">
                        <MessageCircle className="w-16 h-16 text-green-200 mb-3" />
                        <p className="text-sm text-gray-600 font-medium">
                            {searchQuery ?  'No se encontraron conversaciones' : 'No hay conversaciones'}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                            {searchQuery ?  'Intenta con otro término' : 'Inicia una nueva conversación desde Amigos'}
                        </p>
                    </div>
                ) : (
                    sortedConversations.map((conv) => {
                        const name = participantName(conv, currentUserId);
                        const avatar = getParticipantAvatar(conv, currentUserId);
                        const lastMsg = lastMessageText(conv);
                        const time = lastMessageTime(conv);
                        const unread = unreadCounts[conv.id] || 0;
                        const isActive = conv.id === activeConversationId;

                        return (
                            <div
                                key={conv.id}
                                onClick={() => onSelect(conv)}
                                className={`
                                    flex items-center gap-3 p-4 cursor-pointer transition-all border-b border-green-100/50
                                    ${isActive
                                    ? 'bg-gradient-to-r from-green-100 to-emerald-50 border-l-4 border-l-green-600'
                                    : 'hover:bg-green-50/50'
                                }
                                `}
                            >
                                <div className="relative flex-shrink-0">
                                    {avatar ?  (
                                        <img
                                            src={avatar}
                                            alt={name}
                                            className={`
                                                w-12 h-12 rounded-full object-cover 
                                                ${isActive
                                                ? 'ring-2 ring-green-600'
                                                : 'ring-2 ring-gray-200'
                                            }
                                            `}
                                            onError={(e) => {
                                                const target = e.target as HTMLImageElement;
                                                target.style.display = 'none';

                                                const fallback = document.createElement('div');
                                                fallback.className = `w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg ${
                                                    isActive
                                                        ? 'bg-green-600 text-white ring-2 ring-green-600'
                                                        : 'bg-gray-300 text-gray-700 ring-2 ring-gray-200'
                                                }`;
                                                fallback.textContent = name[0]?.toUpperCase() || 'U';

                                                const parent = target.parentNode;
                                                if (parent) {
                                                    parent. insertBefore(fallback, target as Node);
                                                }
                                            }}
                                        />
                                    ) : (
                                        <div className={`
                                            w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg
                                            ${isActive
                                            ? 'bg-green-600 text-white ring-2 ring-green-600'
                                            : 'bg-gray-300 text-gray-700 ring-2 ring-gray-200'
                                        }
                                        `}>
                                            {name[0]?.toUpperCase() || 'U'}
                                        </div>
                                    )}

                                    {/* Indicador de en línea (opcional) */}
                                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></span>
                                </div>

                                {/* Información del chat */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-1">
                                        <h3 className={`
                                            font-semibold truncate
                                            ${isActive ?  'text-green-700' : 'text-gray-800'}
                                            ${unread > 0 ? 'font-bold' : ''}
                                        `}>
                                            {name}
                                        </h3>
                                        {time && (
                                            <span className={`
                                                text-xs flex-shrink-0 ml-2
                                                ${unread > 0 ? 'text-green-600 font-semibold' : 'text-gray-400'}
                                            `}>
                                                {time}
                                            </span>
                                        )}
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <p className={`
                                            text-sm truncate flex-1
                                            ${unread > 0 ? 'text-gray-700 font-medium' : 'text-gray-500'}
                                        `}>
                                            {lastMsg}
                                        </p>

                                        {unread > 0 && (
                                            <span className="ml-2 flex-shrink-0 bg-green-600 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1. 5">
                                                {unread > 99 ? '99+' : unread}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </aside>
    );
};

export default ChatSidebar;