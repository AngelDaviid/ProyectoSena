import React, { useEffect, useState } from 'react';
import { MessageCircle, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {useChatNotifications} from "../../context/chat-notifications-context.tsx";

const ChatNotificationToast: React. FC = () => {
    const navigate = useNavigate();
    const { notifications, clearNotification } = useChatNotifications();
    const [visibleNotifications, setVisibleNotifications] = useState<any[]>([]);

    useEffect(() => {
        // Mostrar solo las últimas 3 notificaciones
        setVisibleNotifications(notifications.slice(-3));
    }, [notifications]);

    const handleClick = (notification: any) => {
        navigate('/chat');
        clearNotification(notification. conversationId);
    };

    if (visibleNotifications.length === 0) return null;

    return (
        <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
            {visibleNotifications.map((notif, index) => (
                <div
                    key={`${notif.conversationId}-${notif.message.id}-${index}`}
                    className="bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg shadow-2xl p-4 max-w-sm cursor-pointer transform transition-all hover:scale-105 animate-slide-in-right"
                    onClick={() => handleClick(notif)}
                >
                    <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                            <MessageCircle className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                                <p className="font-semibold text-sm">Nuevo mensaje</p>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        clearNotification(notif.conversationId);
                                    }}
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
            ))}
        </div>
    );
};

export default ChatNotificationToast;