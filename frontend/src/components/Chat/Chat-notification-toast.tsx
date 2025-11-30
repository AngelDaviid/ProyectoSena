import { useEffect, useState } from 'react';
import { X, MessageCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { ChatNotification } from '../../context/chat-notifications-context';

interface ChatNotificationToastProps {
    notification: ChatNotification;
    onClose: () => void;
    duration?: number;
}

export default function ChatNotificationToast({
                                                  notification,
                                                  onClose,
                                                  duration = 6000,
                                              }: ChatNotificationToastProps) {
    const navigate = useNavigate();
    const [progress, setProgress] = useState(100);

    useEffect(() => {
        const startTime = performance.now();
        let animationId: number;

        const updateProgress = (currentTime: number) => {
            const elapsed = currentTime - startTime;
            const remaining = Math.max(0, duration - elapsed);
            const newProgress = (remaining / duration) * 100;

            setProgress(newProgress);

            if (remaining > 0) {
                animationId = requestAnimationFrame(updateProgress);
            } else {
                onClose();
            }
        };

        animationId = requestAnimationFrame(updateProgress);

        return () => {
            if (animationId) {
                cancelAnimationFrame(animationId);
            }
        };
    }, [duration, onClose]);

    const handleClick = () => {
        navigate('/chat');
        onClose();
    };

    return (
        <div className="w-full max-w-md mb-2 chat-toast-slide-in">
            <div className="bg-white rounded-xl shadow-2xl overflow-hidden border-2 border-blue-500">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-500 to-purple-500 px-4 py-2. 5 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-white">
                        <MessageCircle className="w-5 h-5" />
                        <span className="font-bold text-sm">💬 Nuevo Mensaje</span>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-white hover:bg-white/20 p-1. 5 rounded-full transition-all"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Contenido */}
                <div
                    onClick={handleClick}
                    className="cursor-pointer hover:bg-gray-50 transition-colors p-4"
                >
                    <p className="text-sm text-gray-700 font-medium mb-2">Nuevo mensaje recibido</p>
                    <p className="text-sm text-gray-600 line-clamp-2">{notification.message.text}</p>

                    <div className="mt-3 pt-3 border-t">
                        <button className="w-full bg-gradient-to-r from-blue-600 to-purple-500 hover:from-blue-700 hover:to-purple-600 text-white py-2 px-4 rounded-lg text-sm font-semibold">
                            Ver Chat →
                        </button>
                    </div>
                </div>

                {/* Barra de progreso */}
                <div className="h-1 bg-gray-200">
                    <div
                        className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-100"
                        style={{ width: `${progress}%` }}
                    />
                </div>
            </div>
        </div>
    );
}