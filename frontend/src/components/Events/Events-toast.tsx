import { useEffect, useState } from 'react';
import { X, Calendar, MapPin, Clock } from 'lucide-react';
import { formatEventDateShort, getEventImageUrl } from '../../types/event';
import type { Event } from '../../types/event';
import { useNavigate } from 'react-router-dom';

interface EventToastProps {
    event: Event;
    message: string;
    onClose: () => void;
    duration?: number;
}

export default function EventToast({ event, onClose, duration = 8000 }: EventToastProps) {
    const navigate = useNavigate();
    const [progress, setProgress] = useState(100);

    useEffect(() => {
        console.log('🎨 EventToast mounted for:', event.title);

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
                console.log('⏰ Toast time expired, closing');
                onClose();
            }
        };

        animationId = requestAnimationFrame(updateProgress);

        return () => {
            console.log('🗑️ EventToast unmounting');
            if (animationId) {
                cancelAnimationFrame(animationId);
            }
        };
    }, [duration, event.title, onClose]);

    const handleClose = () => {
        console. log('❌ Manual close');
        onClose();
    };

    const handleClick = () => {
        console.log('🖱️ Toast clicked, navigating to event');
        navigate(`/events/${event.id}`);
        handleClose();
    };

    return (
        <div className="w-full max-w-md mb-2 toast-slide-in">
            <div className="bg-white rounded-xl shadow-2xl overflow-hidden border-2 border-green-500">
                {/* Header */}
                <div className="bg-gradient-to-r from-green-500 to-blue-500 px-4 py-2. 5 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-white">
                        <Calendar className="w-5 h-5" />
                        <span className="font-bold text-sm">🎉 Nuevo Evento Publicado</span>
                    </div>
                    <button
                        onClick={handleClose}
                        className="text-white hover:bg-white/20 p-1. 5 rounded-full transition-all"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Contenido */}
                <div onClick={handleClick} className="cursor-pointer hover:bg-gray-50 transition-colors">
                    {/* Imagen */}
                    <div className="relative h-32 bg-gray-200">
                        <img
                            src={getEventImageUrl(event)}
                            alt={event.title}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                                e.currentTarget.src = '/default-event.png';
                            }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                        <div className="absolute top-2 left-2">
                            <span className="bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg">
                                ✨ Nuevo
                            </span>
                        </div>
                    </div>

                    {/* Info */}
                    <div className="p-4">
                        <h3 className="font-bold text-gray-900 text-lg mb-2 line-clamp-2">
                            {event.title}
                        </h3>
                        <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                            {event.description}
                        </p>

                        <div className="space-y-2">
                            <div className="flex items-center gap-2 text-xs text-gray-700">
                                <Clock className="w-3. 5 h-3.5 text-green-600" />
                                <span className="font-medium">{formatEventDateShort(event.startDate)}</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-gray-700">
                                <MapPin className="w-3.5 h-3.5 text-green-600" />
                                <span className="line-clamp-1">{event.location}</span>
                            </div>
                            {event.maxAttendees && (
                                <div className="flex items-center gap-2 text-xs text-gray-700">
                                    <span>👥</span>
                                    <span className="font-medium">{event.maxAttendees} cupos</span>
                                </div>
                            )}
                        </div>

                        <div className="mt-4 pt-3 border-t">
                            <button className="w-full bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white py-2. 5 px-4 rounded-lg text-sm font-semibold">
                                Ver Detalles →
                            </button>
                        </div>
                    </div>
                </div>

                {/* Barra de progreso */}
                <div className="h-1 bg-gray-200">
                    <div
                        className="h-full bg-gradient-to-r from-green-500 to-blue-500 transition-all duration-100"
                        style={{ width: `${progress}%` }}
                    />
                </div>
            </div>
        </div>
    );
}