import React, { useMemo } from 'react';
import { MessageCircle, Search } from 'lucide-react';
import type { Conversation } from '../../types/chat';

type Props = {
    conversations: Conversation[];
    currentUserId?: number | null;
    activeConversationId?: number | null;
    onSelect: (c: Conversation) => void;
    unreadCounts?: Record<number, number>;
};

const participantName = (conv: Conversation, currentUserId?: number | null): string => {
    const others = (conv.participants || []).filter((p) => p. id !== currentUserId);
    if (others.length === 0) return 'Tú';
    return others
        .map((o) => `${o.profile?. name ??  ''} ${o.profile?.lastName ?? ''}`. trim() || o.email)
        .join(', ');
};

const getInitials = (name: string): string => {
    const parts = name.split(' '). filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0][0]. toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]). toUpperCase();
};

const formatLastMessageTime = (dateStr?: string): string => {
    if (!dateStr) return '';

    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Ahora';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;

    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
};

const formatLastMessageText = (message: any): string => {
    if (! message) return 'Sin mensajes aún';

    if (message.imageUrl) {
        if (message.text && message.text.trim()) {
            return `${message.text}`;
        }
        return 'Imagen';
    }

    return message.text || 'Sin mensajes aún';
};

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
        console. log('[ChatSidebar] Unique conversations count:', unique.length);

        return unique;
    }, [conversations]);

    const sortedConversations = useMemo(() => {
        const filtered = uniqueConversations.filter((conv) => {
            if (!searchQuery) return true;
            const name = participantName(conv, currentUserId).toLowerCase();
            return name.includes(searchQuery.toLowerCase());
        });

        return filtered.sort((a, b) => {
            const aTime = a.messages?.[a.messages.length - 1]?.createdAt || '';
            const bTime = b. messages?.[b.messages.length - 1]?.createdAt || '';

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
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto">
                {sortedConversations.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center p-6">
                        <MessageCircle className="w-16 h-16 text-green-200 mb-3" />
                        <p className="text-sm text-gray-600 font-medium">
                            {searchQuery ? 'No se encontraron conversaciones' : 'No hay conversaciones'}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                            {searchQuery ?  'Intenta con otro término' : 'Inicia una nueva conversación desde Amigos'}
                        </p>
                    </div>
                ) : (
                    sortedConversations.map((conv) => {
                        const name = participantName(conv, currentUserId);
                        const initials = getInitials(name);
                        const isActive = activeConversationId === conv.id;
                        const unreadCount = unreadCounts[conv.id] || 0;
                        const lastMessage = conv. messages?.[conv.messages.length - 1];
                        const lastMessageTime = lastMessage?.createdAt;
                        const lastMessageText = formatLastMessageText(lastMessage);

                        return (
                            <button
                                key={conv.id}
                                onClick={() => onSelect(conv)}
                                className={`w-full text-left px-4 py-3 border-b border-gray-100 hover:bg-green-50 transition-all duration-200 flex items-center gap-3 ${
                                    isActive ?  'bg-green-50 border-l-4 border-l-green-600' : ''
                                }`}
                            >
                                <div className="relative flex-shrink-0">
                                    <div
                                        className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-white shadow-md transition-all ${
                                            isActive
                                                ? 'bg-gradient-to-br from-green-600 to-emerald-600 scale-105'
                                                : 'bg-gradient-to-br from-green-500 to-emerald-500'
                                        }`}
                                    >
                                        {initials}
                                    </div>
                                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 border-2 border-white rounded-full shadow-sm" />
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-1">
                                        <span
                                            className={`font-semibold text-sm truncate ${
                                                isActive ?  'text-green-700' : 'text-gray-800'
                                            }`}
                                        >
                                            {name}
                                        </span>
                                        {lastMessageTime && (
                                            <span className={`text-xs flex-shrink-0 ml-2 font-medium ${
                                                isActive ? 'text-green-600' : 'text-gray-400'
                                            }`}>
                                                {formatLastMessageTime(lastMessageTime)}
                                            </span>
                                        )}
                                    </div>

                                    <div className="flex items-center justify-between gap-2">
                                        <p className={`text-xs truncate flex-1 ${
                                            unreadCount > 0 ? 'text-gray-700 font-medium' : 'text-gray-500'
                                        }`}>
                                            {lastMessageText}
                                        </p>
                                        {unreadCount > 0 && (
                                            <span className="flex-shrink-0 bg-gradient-to-br from-green-600 to-emerald-600 text-white text-xs font-bold rounded-full min-w-[20px] h-5 px-1. 5 flex items-center justify-center shadow-md">
                                                {unreadCount > 9 ? '9+' : unreadCount}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </button>
                        );
                    })
                )}
            </div>

            <div className="p-3 bg-gradient-to-r from-green-50 to-emerald-50 border-t-2 border-green-100 shadow-inner">
                <div className="flex items-center justify-between text-xs text-gray-600">
                    <span className="font-medium">
                        {sortedConversations.length}{' '}
                        {sortedConversations.length === 1 ? 'conversación' : 'conversaciones'}
                    </span>
                    {Object.values(unreadCounts).reduce((a, b) => a + b, 0) > 0 && (
                        <span className="text-green-700 font-bold flex items-center gap-1">
                            <span className="w-2 h-2 bg-green-600 rounded-full animate-pulse"></span>
                            {Object.values(unreadCounts).reduce((a, b) => a + b, 0)} sin leer
                        </span>
                    )}
                </div>
            </div>
        </aside>
    );
};

export default ChatSidebar;