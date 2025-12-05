import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { Event } from '../../types/event';
import {
    getEventImageUrl,
    getEventStatus,
    getEventStatusLabel,
    getEventStatusColor,
    formatEventDateShort,
    formatTimeUntilEvent,
    getAvailableSpots,
    isEventFull,
    hasLimitedSpots,
    EventTypeLabels,
    EventTypeColors,
    EventTypeEmojis,
} from '../../types/event';

const API_BASE = import.meta.env.VITE_SENA_API_URL || 'http://localhost:3001';

type Props = {
    events: Event[];
    loading?: boolean;
    error?: string | null;
    onEventClick?: (event: Event) => void;
};

const EventList: React.FC<Props> = ({ events, loading = false, error = null, onEventClick }) => {
    const navigate = useNavigate();

    const handleEventClick = (event: Event) => {
        if (onEventClick) {
            onEventClick(event);
        } else {
            navigate(`/events/${event.id}`);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center p-8 sm:p-12">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
                    <p className="text-gray-500 text-sm sm:text-base">Cargando eventos...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 border border-red-200 text-red-600 p-4 sm:p-6 rounded-xl text-center">
                <p className="font-medium mb-2 text-sm sm:text-base">❌ Error al cargar eventos</p>
                <p className="text-xs sm:text-sm">{error}</p>
            </div>
        );
    }

    if (events.length === 0) {
        return (
            <div className="text-center py-12 sm:py-16 bg-white rounded-2xl shadow-sm">
                <div className="text-4xl sm:text-6xl mb-4">📅</div>
                <h3 className="text-lg sm:text-xl font-semibold text-gray-800 mb-2">
                    No hay eventos disponibles
                </h3>
                <p className="text-gray-500 text-sm sm:text-base">
                    Sé el primero en crear un evento para la comunidad
                </p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {events.map((event) => {
                const status = getEventStatus(event);
                const availableSpots = getAvailableSpots(event);
                const isLimited = hasLimitedSpots(event);
                const isFull = isEventFull(event);

                return (
                    <div
                        key={event.id}
                        onClick={() => handleEventClick(event)}
                        className="bg-white rounded-2xl shadow-md border border-gray-200 overflow-hidden transition-all hover:shadow-xl hover:-translate-y-1 cursor-pointer"
                    >
                        {/* Imagen del evento */}
                        <div className="h-40 sm:h-48 overflow-hidden bg-gradient-to-br from-green-50 to-blue-50 relative">
                            <img
                                src={getEventImageUrl(event, API_BASE)}
                                alt={event.title}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.src = 'https://via.placeholder.com/400x300/10b981/ffffff?text=Evento+SENA';
                                }}
                            />

                            {/* Badge de estado */}
                            <div className="absolute top-2 sm:top-3 left-2 sm:left-3">
                                <span
                                    className={`px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-xs font-semibold shadow-sm ${getEventStatusColor(
                                        status
                                    )}`}
                                >
                                    {getEventStatusLabel(status)}
                                </span>
                            </div>

                            {/* Badge de cupo lleno */}
                            {isFull && (
                                <div className="absolute top-2 sm:top-3 right-2 sm:right-3">
                                    <span className="px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800 shadow-sm">
                                        🔒 Cupo lleno
                                    </span>
                                </div>
                            )}

                            {/* Badge de cupos limitados */}
                            {isLimited && ! isFull && (
                                <div className="absolute top-2 sm:top-3 right-2 sm:right-3">
                                    <span className="px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-800 shadow-sm">
                                        ⚠️ Cupos limitados
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Contenido del evento */}
                        <div className="p-4 sm:p-5">
                            {/* Tipo de evento */}
                            <div className="mb-2 sm:mb-3">
                                <span
                                    className={`inline-flex items-center gap-1 text-xs font-semibold px-2 sm:px-3 py-0.5 sm:py-1 rounded-full border ${
                                        EventTypeColors[event.eventType]
                                    }`}
                                >
                                    <span>{EventTypeEmojis[event.eventType]}</span>
                                    <span>{EventTypeLabels[event.eventType]}</span>
                                </span>
                            </div>

                            {/* Título */}
                            <h3 className="text-base sm:text-lg font-bold text-gray-800 mb-2 line-clamp-2 min-h-[2.5rem] sm:min-h-[3. 5rem]">
                                {event.title}
                            </h3>

                            {/* Descripción */}
                            <p className="text-gray-600 text-xs sm:text-sm mb-3 sm:mb-4 line-clamp-2 min-h-[2. 5rem]">
                                {event.description}
                            </p>

                            {/* Fecha y ubicación */}
                            <div className="space-y-1. 5 sm:space-y-2 mb-3 sm:mb-4">
                                <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-700">
                                    <svg
                                        className="w-3. 5 h-3.5 sm:w-4 sm:h-4 text-green-600 flex-shrink-0"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                                        />
                                    </svg>
                                    <span className="font-medium truncate">
                                        {formatEventDateShort(event.startDate)}
                                    </span>
                                </div>

                                <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-700">
                                    <svg
                                        className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-600 flex-shrink-0"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M17. 657 16.657L13.414 20.9a1. 998 1.998 0 01-2.827 0l-4.244-4. 243a8 8 0 1111.314 0z"
                                        />
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                                        />
                                    </svg>
                                    <span className="truncate">{event.location}</span>
                                </div>
                            </div>

                            {/* Cupos disponibles */}
                            {availableSpots !== null && (
                                <div className="mb-3 sm:mb-4">
                                    <div className="flex justify-between items-center text-xs text-gray-600 mb-1">
                                        <span className="font-medium">Cupos disponibles</span>
                                        <span
                                            className={`font-semibold ${
                                                isFull
                                                    ? 'text-red-600'
                                                    : isLimited
                                                        ? 'text-orange-600'
                                                        : 'text-green-600'
                                            }`}
                                        >
                                            {availableSpots} / {event.maxAttendees}
                                        </span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-1. 5 sm:h-2 overflow-hidden">
                                        <div
                                            className={`h-1.5 sm:h-2 rounded-full transition-all ${
                                                isFull
                                                    ?  'bg-red-500'
                                                    : isLimited
                                                        ? 'bg-orange-500'
                                                        : 'bg-green-500'
                                            }`}
                                            style={{
                                                width: `${Math.min(
                                                    100,
                                                    ((event.attendeesCount || 0) / (event.maxAttendees || 1)) * 100
                                                )}%`,
                                            }}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Tiempo restante (solo para eventos próximos) */}
                            {status === 'upcoming' && (
                                <div className="flex items-center gap-1 text-xs text-blue-600 font-medium mb-3 sm:mb-4 bg-blue-50 px-2 sm:px-3 py-1. 5 sm:py-2 rounded-lg">
                                    <svg className="w-3. 5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                        />
                                    </svg>
                                    <span>{formatTimeUntilEvent(event)}</span>
                                </div>
                            )}

                            {/* Categorías */}
                            {event.categories && event.categories.length > 0 && (
                                <div className="flex flex-wrap gap-1 mb-3 sm:mb-4">
                                    {event.categories.slice(0, 2).map((cat) => (
                                        <span
                                            key={cat. id}
                                            className="inline-block bg-gray-100 text-gray-700 text-xs px-2 py-0.5 sm:py-1 rounded-md font-medium"
                                        >
                                            {cat.name}
                                        </span>
                                    ))}
                                    {event.categories.length > 2 && (
                                        <span className="inline-block bg-gray-100 text-gray-700 text-xs px-2 py-0.5 sm:py-1 rounded-md font-medium">
                                            +{event.categories.length - 2}
                                        </span>
                                    )}
                                </div>
                            )}

                            {/* Información del creador */}
                            {event.user && (
                                <div className="flex items-center gap-2 pt-3 sm:pt-4 border-t border-gray-100">
                                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-green-400 to-blue-500 overflow-hidden flex-shrink-0">
                                        {event.user.profile?. avatar ?  (
                                            <img
                                                src={
                                                    event.user. profile.avatar. startsWith('/')
                                                        ? `${API_BASE}${event.user.profile.avatar}`
                                                        : event.user.profile.avatar
                                                }
                                                alt={event.user.profile.name || event.user.email}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-white font-bold text-xs">
                                                {event.user.profile?.name?.[0] ||
                                                    event.user.email[0]. toUpperCase()}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs sm:text-sm font-medium text-gray-700 truncate">
                                            {event.user.profile?.name && event.user.profile?. lastName
                                                ? `${event. user.profile.name} ${event.user.profile.lastName}`
                                                : event.user. email}
                                        </p>
                                        <p className="text-xs text-gray-500">Organizador</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default EventList;