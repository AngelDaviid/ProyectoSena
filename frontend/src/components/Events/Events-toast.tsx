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
    const [isVisible, setIsVisible] = useState(false);
    const [progress, setProgress] = useState(100);

    useEffect(() => {
        // Animación de entrada
        setTimeout(() => setIsVisible(true), 10);

        // Barra de progreso
        const progressInterval = setInterval(() => {
            setProgress(prev => {
                const newProgress = prev - (100 / (duration / 100));
                if (newProgress <= 0) {
                    clearInterval(progressInterval);
                    return 0;
                }
                return newProgress;
            });
        }, 100);

        // Auto-cerrar
        const timer = setTimeout(() => {
            handleClose();
        }, duration);

        return () => {
            clearTimeout(timer);
            clearInterval(progressInterval);
        };
    }, [duration]);

    const handleClose = () => {
        setIsVisible(false);
        setTimeout(onClose, 300);
    };

    const handleClick = () => {
        navigate(`/events/${event.id}`);
        handleClose();
    };

    return (
        <div
            className={`fixed top-4 right-4 z-50 transition-all duration-300 transform ${
                isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
            }`}
            style={{ maxWidth: '400px' }}
        >
            <div className="bg-white rounded-lg shadow-2xl overflow-hidden border-2 border-green-500">
                {/* Header con gradiente */}
                <div className="bg-gradient-to-r from-green-500 to-blue-500 px-4 py-2 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-white">
                        <div className="bg-white/20 p-1 rounded-full animate-pulse">
                            <Calendar className="w-5 h-5" />
                        </div>
                        <span className="font-bold text-sm">🎉 Nuevo Evento Publicado</span>
                    </div>
                    <button
                        onClick={handleClose}
                        className="text-white hover:bg-white/20 p-1 rounded-full transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Contenido clickeable */}
                <div
                    onClick={handleClick}
                    className="cursor-pointer hover:bg-gray-50 transition-colors"
                >
                    {/* Imagen del evento */}
                    <div className="relative h-32 bg-gray-200">
                        <img
                            src={getEventImageUrl(event)}
                            alt={event.title}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                                e.currentTarget.src = '/default-event.png';
                            }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                    </div>

                    {/* Información del evento */}
                    <div className="p-4">
                        <h3 className="font-bold text-gray-900 text-lg mb-2 line-clamp-2">
                            {event.title}
                        </h3>

                        <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                            {event.description}
                        </p>

                        {/* Detalles */}
                        <div className="space-y-1">
                            <div className="flex items-center gap-2 text-xs text-gray-700">
                                <Clock className="w-3 h-3 text-green-600" />
                                <span>{formatEventDateShort(event.startDate)}</span>
                            </div>

                            <div className="flex items-center gap-2 text-xs text-gray-700">
                                <MapPin className="w-3 h-3 text-green-600" />
                                <span className="line-clamp-1">{event.location}</span>
                            </div>

                            {event.maxAttendees && (
                                <div className="flex items-center gap-2 text-xs text-gray-700">
                                    <span>👥</span>
                                    <span>{event.maxAttendees} cupos disponibles</span>
                                </div>
                            )}
                        </div>

                        {/* Botón de acción */}
                        <div className="mt-3 pt-3 border-t">
                            <button className="w-full bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg text-sm font-medium transition-colors">
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