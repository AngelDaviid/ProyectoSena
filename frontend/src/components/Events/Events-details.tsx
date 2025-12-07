import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { Event } from '../../types/event';
import { getEvent, deleteEvent, registerToEvent, unregisterFromEvent, publishEvent } from '../../services/events';
import { getEventImageUrl } from '../../types/event';
import { useAuth } from '../../hooks/useAuth';
import {
    Calendar,
    MapPin,
    Users,
    Clock,
    Edit,
    Trash2,
    UserPlus,
    UserMinus,
    Share2,
    Eye,
    Loader2,
    ArrowLeft,
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_SENA_API_URL || 'http://localhost:3001';

const eventTypeLabels: Record<string, string> = {
    conference: 'Conferencia',
    workshop: 'Taller',
    seminar: 'Seminario',
    social: 'Social',
    sports: 'Deportivo',
    cultural: 'Cultural',
    other: 'Otro',
};

export default function EventDetail() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [event, setEvent] = useState<Event | null>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);

    useEffect(() => {
        if (id) {
            loadEvent();
        }
    }, [id]);

    const loadEvent = async () => {
        try {
            setLoading(true);
            const data = await getEvent(Number(id));
            setEvent(data);
        } catch (error) {
            console.error('Error loading event:', error);
            alert('Error al cargar el evento');
            navigate('/events');
        } finally {
            setLoading(false);
        }
    };

    const handleRegister = async () => {
        if (!event) return;
        try {
            setActionLoading(true);
            await registerToEvent(event.id);
            alert('¡Te has registrado exitosamente!');
            loadEvent();
        } catch (error: any) {
            alert(error.response?.data?.message || 'Error al registrarse');
        } finally {
            setActionLoading(false);
        }
    };

    const handleUnregister = async () => {
        if (!event) return;
        if (! confirm('¿Estás seguro de que quieres cancelar tu registro?')) return;

        try {
            setActionLoading(true);
            await unregisterFromEvent(event.id);
            alert('Te has desregistrado del evento');
            loadEvent();
        } catch (error: any) {
            alert(error.response?.data?.message || 'Error al desregistrarse');
        } finally {
            setActionLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!event) return;
        if (!confirm('¿Estás seguro de que quieres eliminar este evento?  Esta acción no se puede deshacer.')) return;

        try {
            setActionLoading(true);
            await deleteEvent(event.id);
            alert('Evento eliminado exitosamente');
            navigate('/events');
        } catch (error: any) {
            alert(error.response?.data?.message || 'Error al eliminar el evento');
        } finally {
            setActionLoading(false);
        }
    };

    const handlePublish = async () => {
        if (!event) return;
        if (!confirm('¿Publicar este evento para que todos lo vean?')) return;

        try {
            setActionLoading(true);
            await publishEvent(event.id);
            alert('Evento publicado exitosamente');
            loadEvent();
        } catch (error: any) {
            alert(error.response?.data?.message || 'Error al publicar el evento');
        } finally {
            setActionLoading(false);
        }
    };

    const handleShare = () => {
        const url = window.location.href;
        navigator.clipboard.writeText(url);
        alert('Enlace copiado al portapapeles');
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('es-CO', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    // ✅ Helper para obtener URL de avatar
    const getAvatarUrl = (avatar?: string): string => {
        if (!avatar) return '';
        if (avatar.startsWith('http://') || avatar.startsWith('https://')) {
            return avatar;
        }
        return `${API_BASE}${avatar}`;
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <Loader2 className="w-10 h-10 sm:w-12 sm:h-12 animate-spin text-green-600" />
            </div>
        );
    }

    if (!event) {
        return (
            <div className="text-center py-8 sm:py-12 px-4">
                <p className="text-gray-600">Evento no encontrado</p>
            </div>
        );
    }

    const isOwner = user?.id === event.user?.id;
    const spotsLeft = event.maxAttendees ?  event.maxAttendees - (event.attendeesCount || 0) : null;
    const isFull = spotsLeft !== null && spotsLeft <= 0;

    return (
        <div className="max-w-5xl mx-auto p-4 sm:p-6 lg:p-8">
            <button
                onClick={() => navigate('/events')}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 sm:mb-6 transition-colors"
            >
                <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="font-medium text-sm sm:text-base">Volver a Eventos</span>
            </button>

            <div className="relative h-64 sm:h-80 lg:h-96 bg-gray-200 rounded-lg overflow-hidden mb-4 sm:mb-6">
                {event.imageUrl ?  (
                    <img
                        src={getEventImageUrl(event, API_BASE)}
                        alt={event.title}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                            e.currentTarget.src = '/default-event.png';
                        }}
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-green-400 to-blue-500">
                        <Calendar className="w-24 h-24 sm:w-32 sm:h-32 text-white opacity-50" />
                    </div>
                )}

                {event.isDraft && (
                    <div className="absolute top-3 sm:top-4 left-3 sm:left-4 bg-yellow-500 text-white px-3 sm:px-4 py-1. 5 sm:py-2 rounded-full font-semibold text-xs sm:text-sm">
                        Borrador
                    </div>
                )}

                <div className="absolute top-3 sm:top-4 right-3 sm:right-4 bg-white/90 backdrop-blur-sm px-3 sm:px-4 py-1.5 sm:py-2 rounded-full font-semibold text-gray-800 text-xs sm:text-sm">
                    {eventTypeLabels[event.eventType]}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
                <div className="lg:col-span-2 space-y-4 sm:space-y-6">
                    <div>
                        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-3 sm:mb-4">{event.title}</h1>

                        <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
                            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-green-400 to-blue-500 overflow-hidden flex-shrink-0">
                                {event.user?.profile?.avatar ? (
                                    <img
                                        src={getAvatarUrl(event.user. profile.avatar)}
                                        alt={event.user.profile.name || event.user.email}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-white font-bold text-sm sm:text-lg">
                                        {event.user?.profile?.name?.[0] || event.user?.email[0].toUpperCase()}
                                    </div>
                                )}
                            </div>
                            <div>
                                <p className="text-xs sm:text-sm text-gray-500">Organizado por</p>
                                <p className="font-semibold text-gray-900 text-sm sm:text-base">
                                    {event.user?.profile?.name} {event.user?.profile?.lastName}
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-3">
                            {isOwner ?  (
                                <>
                                    {event.isDraft && (
                                        <button
                                            onClick={handlePublish}
                                            disabled={actionLoading}
                                            className="px-3 sm:px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2 text-sm sm:text-base"
                                        >
                                            <Eye className="w-4 h-4" />
                                            Publicar Evento
                                        </button>
                                    )}
                                    <button
                                        onClick={() => navigate(`/events/edit/${event.id}`)}
                                        disabled={actionLoading}
                                        className="px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2 text-sm sm:text-base"
                                    >
                                        <Edit className="w-4 h-4" />
                                        Editar
                                    </button>
                                    <button
                                        onClick={handleDelete}
                                        disabled={actionLoading}
                                        className="px-3 sm:px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2 text-sm sm:text-base"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                        Eliminar
                                    </button>
                                </>
                            ) : (
                                <>
                                    {!event.isDraft && (
                                        <>
                                            {event.isRegistered ?  (
                                                <button
                                                    onClick={handleUnregister}
                                                    disabled={actionLoading}
                                                    className="px-4 sm:px-6 py-2. 5 sm:py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2 text-sm sm:text-base flex-1 sm:flex-initial"
                                                >
                                                    <UserMinus className="w-4 h-4 sm:w-5 sm:h-5" />
                                                    Cancelar Registro
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={handleRegister}
                                                    disabled={actionLoading || isFull}
                                                    className="px-4 sm:px-6 py-2. 5 sm:py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm sm:text-base flex-1 sm:flex-initial"
                                                >
                                                    <UserPlus className="w-4 h-4 sm:w-5 sm:h-5" />
                                                    {isFull ? 'Sin Cupos' : 'Registrarse'}
                                                </button>
                                            )}
                                        </>
                                    )}
                                </>
                            )}

                            <button
                                onClick={handleShare}
                                className="px-3 sm:px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 flex items-center justify-center gap-2 text-sm sm:text-base"
                            >
                                <Share2 className="w-4 h-4" />
                                Copiar Link
                            </button>
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow p-4 sm:p-6">
                        <h2 className="text-xl sm:text-2xl font-semibold mb-3 sm:mb-4">Acerca del Evento</h2>
                        <p className="text-gray-700 whitespace-pre-wrap text-sm sm:text-base">{event.description}</p>
                    </div>

                    {event.categories && event.categories.length > 0 && (
                        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
                            <h3 className="text-lg sm:text-xl font-semibold mb-3">Categorías</h3>
                            <div className="flex flex-wrap gap-2">
                                {event.categories. map(category => (
                                    <span
                                        key={category.id}
                                        className="px-2 sm:px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs sm:text-sm font-medium"
                                    >
                                        {category.name}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {event.attendees && event.attendees.length > 0 && (
                        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
                            <h3 className="text-lg sm:text-xl font-semibold mb-4">
                                Asistentes ({event.attendeesCount})
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                                {event.attendees.map(attendee => (
                                    <div key={attendee. id} className="flex items-center gap-2">
                                        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-green-400 to-blue-500 overflow-hidden flex-shrink-0">
                                            {attendee.profile?.avatar ? (
                                                <img
                                                    src={getAvatarUrl(attendee.profile.avatar)}
                                                    alt={attendee.profile?.name || attendee.email}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-white font-bold text-xs sm:text-sm">
                                                    {attendee.profile?.name?.[0] || attendee.email[0].toUpperCase()}
                                                </div>
                                            )}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-xs sm:text-sm font-medium truncate">
                                                {attendee.profile?.name} {attendee.profile?.lastName}
                                            </p>
                                            <p className="text-xs text-gray-500 truncate">{attendee.email}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="space-y-4">
                    <div className="bg-white rounded-lg shadow p-4 sm:p-6 lg:sticky lg:top-4">
                        <h3 className="text-base sm:text-lg font-semibold mb-4">Información</h3>

                        <div className="space-y-3 sm:space-y-4">
                            <div className="flex items-start gap-2 sm:gap-3">
                                <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 mt-0.5 flex-shrink-0" />
                                <div>
                                    <p className="text-xs sm:text-sm text-gray-500">Inicia</p>
                                    <p className="font-medium text-sm sm:text-base">{formatDate(event.startDate)}</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-2 sm:gap-3">
                                <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 mt-0.5 flex-shrink-0" />
                                <div>
                                    <p className="text-xs sm:text-sm text-gray-500">Termina</p>
                                    <p className="font-medium text-sm sm:text-base">{formatDate(event.endDate)}</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-2 sm:gap-3">
                                <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 mt-0.5 flex-shrink-0" />
                                <div>
                                    <p className="text-xs sm:text-sm text-gray-500">Ubicación</p>
                                    <p className="font-medium text-sm sm:text-base">{event.location}</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-2 sm:gap-3">
                                <Users className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 mt-0.5 flex-shrink-0" />
                                <div>
                                    <p className="text-xs sm:text-sm text-gray-500">Asistentes</p>
                                    <p className="font-medium text-sm sm:text-base">
                                        {event.attendeesCount || 0}
                                        {event.maxAttendees && ` / ${event.maxAttendees}`}
                                    </p>
                                    {spotsLeft !== null && (
                                        <p className={`text-xs sm:text-sm ${spotsLeft > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                            {spotsLeft > 0 ? `${spotsLeft} cupos disponibles` : 'Sin cupos'}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {event.isRegistered && !isOwner && (
                            <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-green-50 border border-green-200 rounded-lg">
                                <p className="text-xs sm:text-sm text-green-800 font-medium">
                                    ✓ Estás registrado en este evento
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}