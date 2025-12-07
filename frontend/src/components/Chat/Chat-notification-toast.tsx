import React, { useEffect, useState, useRef } from 'react';
import { X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useChatNotifications } from "../../context/chat-notifications-context.tsx";
import { getConversations } from '../../services/sockets/chat.socket';
import type { Conversation } from '../../types/chat';

const API_BASE = import.meta.env.VITE_SENA_API_URL || 'http://localhost:3001';

const ChatNotificationToast: React. FC = () => {
    const navigate = useNavigate();
    const { notifications, clearNotification } = useChatNotifications();
    const [visibleNotifications, setVisibleNotifications] = useState<any[]>([]);
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const timersRef = useRef<Map<number, number>>(new Map());

    useEffect(() => {
        const loadConversations = async () => {
            try {
                const convs = await getConversations();
                setConversations(convs || []);
            } catch (error) {
                console.error('[ChatNotificationToast] Error loading conversations:', error);
            }
        };

        loadConversations();
    }, []);

    useEffect(() => {
        setVisibleNotifications(notifications. slice(-3));
    }, [notifications]);

    useEffect(() => {
        visibleNotifications.forEach((notif) => {
            const conversationId = notif.conversationId;

            if (timersRef.current.has(conversationId)) {
                return;
            }

            const timer = window.setTimeout(() => {
                clearNotification(conversationId);
                timersRef.current.delete(conversationId);
            }, 10000);

            timersRef.current.set(conversationId, timer);
        });

        const visibleConversationIds = new Set(visibleNotifications.map(n => n.conversationId));
        timersRef.current.forEach((timer, conversationId) => {
            if (!visibleConversationIds. has(conversationId)) {
                window.clearTimeout(timer);
                timersRef.current.delete(conversationId);
            }
        });

        return () => {
            timersRef.current.forEach((timer) => window.clearTimeout(timer));
            timersRef.current.clear();
        };
    }, [visibleNotifications, clearNotification]);

    const getSenderInfo = (notif: any): { name: string; avatar: string } => {
        const conversation = conversations.find(c => c.id === notif.conversationId);

        if (!conversation || !conversation.participants) {
            return { name: 'Usuario', avatar: '/default.png' };
        }

        const sender = conversation.participants.find(p => p.id === notif.message.senderId);

        if (!sender) {
            return { name: 'Usuario', avatar: '/default.png' };
        }

        const fullName = `${sender.profile?.name || ''} ${sender.profile?.lastName || ''}`. trim();
        const name = fullName || sender.email || 'Usuario';

        let avatar = '/default.png';
        if (sender.profile?.avatar) {
            avatar = sender.profile.avatar.startsWith('/')
                ?  `${API_BASE}${sender.profile.avatar}`
                : sender.profile.avatar;
        }

        return { name, avatar };
    };

    const handleClick = (notification: any) => {

        const timer = timersRef.current.get(notification.conversationId);
        if (timer) {
            window.clearTimeout(timer);
            timersRef.current.delete(notification.conversationId);
        }

        clearNotification(notification.conversationId);

        navigate('/chat', {
            state: {
                openConversationId: notification.conversationId
            }
        });
    };

    const handleClose = (e: React.MouseEvent, conversationId: number) => {
        e.stopPropagation();

        const timer = timersRef.current.get(conversationId);
        if (timer) {
            window.clearTimeout(timer);
            timersRef.current.delete(conversationId);
        }

        clearNotification(conversationId);
    };

    if (visibleNotifications.length === 0) return null;

    return (
        <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
            {visibleNotifications. map((notif, index) => {
                const senderInfo = getSenderInfo(notif);

                return (
                    <div
                        key={`${notif.conversationId}-${notif.message.id}-${index}`}
                        className="bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg shadow-2xl p-4 max-w-sm cursor-pointer transform transition-all hover:scale-105 animate-slide-in-right"
                        onClick={() => handleClick(notif)}
                    >
                        <div className="flex items-start gap-3">
                            <img
                                src={senderInfo.avatar}
                                alt={senderInfo.name}
                                className="w-10 h-10 rounded-full object-cover ring-2 ring-white/40 flex-shrink-0"
                                onError={(e) => {
                                    (e.target as HTMLImageElement).src = '/default.png';
                                }}
                            />
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-1">
                                    <p className="font-semibold text-sm">{senderInfo.name}</p>
                                    <button
                                        onClick={(e) => handleClose(e, notif.conversationId)}
                                        className="text-white/80 hover:text-white transition-colors"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                                <p className="text-sm text-green-50 line-clamp-2">
                                    {notif.message.text}
                                </p>
                                <p className="text-xs text-green-100 mt-1">
                                    Hace un momento
                                </p>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default ChatNotificationToast;