import React from 'react';
import { MessageCircle, Search } from 'lucide-react';
import type { Conversation } from '../../types/chat';

type Props = {
    conversations: Conversation[];
    currentUserId?: number | null;
    activeConversationId?: number | null;
    onSelect: (c: Conversation) => void;
    unreadCounts?: Record<number, number>; // conversationId -> unread count
};

const participantName = (conv: Conversation, currentUserId?: number | null) => {
    const others = (conv. participants || []).filter((p) => p. id !== currentUserId);
    if (others.length === 0) return 'Tú';
    return others
        .map((o) => `${o.profile?. name ?? ''} ${o.profile?.lastName ?? ''}`. trim() || o.email)
        .join(', ');
};

const getInitials = (name: string) => {
    const parts = name.split(' '). filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0][0]. toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]). toUpperCase();
};

const formatLastMessageTime = (dateStr?: string) => {
    if (! dateStr) return '';

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

const ChatSidebar: React.FC<Props> = ({
                                          conversations,
                                          currentUserId,
                                          activeConversationId,
                                          onSelect,
                                          unreadCounts = {},
                                      }) => {
    const [searchQuery, setSearchQuery] = React. useState('');

    const filteredConversations = conversations.filter((conv) => {
        const name = participantName(conv, currentUserId). toLowerCase();
        return name.includes(searchQuery.toLowerCase());
    });

    return (
        <aside className="bg-gradient-to-b from-white to-gray-50 border-r border-gray-200 flex flex-col h-full">
            {/* Header */}
            <div className="p-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                <div className="flex items-center gap-2 mb-3">
                    <MessageCircle className="w-6 h-6" />
                    <h2 className="text-xl font-bold">Mensajes</h2>
                </div>

                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Buscar conversaciones..."
                        className="w-full bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/30 transition"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            {/* Conversations List */}
            <div className="flex-1 overflow-y-auto">
                {filteredConversations.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center p-6">
                        <MessageCircle className="w-16 h-16 text-gray-300 mb-3" />
                        <p className="text-sm text-gray-500 font-medium">
                            {searchQuery ? 'No se encontraron conversaciones' : 'No hay conversaciones'}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                            {searchQuery ? 'Intenta con otro término' : 'Inicia una nueva conversación'}
                        </p>
                    </div>
                ) : (
                    filteredConversations.map((conv) => {
                        const name = participantName(conv, currentUserId);
                        const initials = getInitials(name);
                        const isActive = activeConversationId === conv.id;
                        const unreadCount = unreadCounts[conv.id] || 0;
                        const lastMessage = conv.messages?.[conv.messages. length - 1];
                        const lastMessageTime = lastMessage?.createdAt;

                        return (
                            <button
                                key={conv.id}
                                onClick={() => onSelect(conv)}
                                className={`w-full text-left px-4 py-3 border-b border-gray-100 hover:bg-blue-50 transition-all duration-200 flex items-center gap-3 ${
                                    isActive ?  'bg-blue-50 border-l-4 border-l-blue-600' : ''
                                }`}
                            >
                                {/* Avatar */}
                                <div className="relative flex-shrink-0">
                                    <div
                                        className={`w-12 h-12 rounded-full flex items-center justify-center font-semibold text-white ${
                                            isActive
                                                ? 'bg-gradient-to-br from-blue-600 to-purple-600'
                                                : 'bg-gradient-to-br from-gray-400 to-gray-500'
                                        }`}
                                    >
                                        {initials}
                                    </div>
                                    {/* Online indicator (puedes implementar lógica real) */}
                                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-1">
                    <span className={`font-semibold text-sm truncate ${
                        isActive ?  'text-blue-700' : 'text-gray-800'
                    }`}>
                      {name}
                    </span>
                                        {lastMessageTime && (
                                            <span className="text-xs text-gray-400 flex-shrink-0 ml-2">
                        {formatLastMessageTime(lastMessageTime)}
                      </span>
                                        )}
                                    </div>

                                    <div className="flex items-center justify-between gap-2">
                                        <p className="text-xs text-gray-500 truncate flex-1">
                                            {lastMessage?.text || 'Sin mensajes aún'}
                                        </p>
                                        {unreadCount > 0 && (
                                            <span className="flex-shrink-0 bg-blue-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
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

            {/* Footer Stats */}
            <div className="p-3 bg-gray-50 border-t border-gray-200">
                <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{filteredConversations.length} conversaciones</span>
                    {Object.values(unreadCounts).reduce((a, b) => a + b, 0) > 0 && (
                        <span className="text-blue-600 font-semibold">
              {Object.values(unreadCounts).reduce((a, b) => a + b, 0)} sin leer
            </span>
                    )}
                </div>
            </div>
        </aside>
    );
};

export default ChatSidebar;