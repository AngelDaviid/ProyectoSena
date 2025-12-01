import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { Event } from '../../types/event';
import { getEvent, deleteEvent, registerToEvent, unregisterFromEvent, publishEvent } from '../../services/events';
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

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <Loader2 className="w-12 h-12 animate-spin text-green-600" />
            </div>
        );
    }

    if (!event) {
        return (
            <div className="text-center py-12">
                <p className="text-gray-600">Evento no encontrado</p>
            </div>
        );
    }

    const isOwner = user?.id === event. user?. id;
    const spotsLeft = event.maxAttendees ?  event.maxAttendees - (event.attendeesCount || 0) : null;
    const isFull = spotsLeft !== null && spotsLeft <= 0;

    return (
        <div className="max-w-5xl mx-auto p-6">
            {/* Imagen de portada */}
            <div className="relative h-96 bg-gray-200 rounded-lg overflow-hidden mb-6">
                {event.imageUrl ?  (
                    <img
                        src={`${API_BASE}${event. imageUrl}`}
                        alt={event.title}
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-green-400 to-blue-500">
                        <Calendar className="w-32 h-32 text-white opacity-50" />
                    </div>
                )}

                {/* Badge Borrador */}
                {event. isDraft && (
                    <div className="absolute top-4 left-4 bg-yellow-500 text-white px-4 py-2 rounded-full font-semibold">
                        📝 Borrador
                    </div>
                )}

                {/* Badge Tipo */}
                <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full font-semibold text-gray-800">
                    {eventTypeLabels[event.eventType]}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Columna principal */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Título y acciones */}
                    <div>
                        <h1 className="text-4xl font-bold text-gray-900 mb-4">{event.title}</h1>

                        <div className="flex items-center gap-4 mb-4">
                            <img
                                src={event.user?. profile?. avatar || '/default. png'}
                                alt={event. user?.profile?.name || 'Organizador'}
                                className="w-12 h-12 rounded-full"
                            />
                            <div>
                                <p className="text-sm text-gray-500">Organizado por</p>
                                <p className="font-medium text-gray-900">
                                    {event.user?. profile?.name} {event.user?.profile?.lastName}
                                </p>
                            </div>
                        </div>

                        {/* Botones de acción */}
                        <div className="flex flex-wrap gap-3">
                            {isOwner ?  (
                                <>
                                    {event.isDraft && (
                                        <button
                                            onClick={handlePublish}
                                            disabled={actionLoading}
                                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                                        >
                                            <Eye className="w-4 h-4" />
                                            Publicar Evento
                                        </button>
                                    )}
                                    <button
                                        onClick={() => navigate(`/events/edit/${event.id}`)}
                                        disabled={actionLoading}
                                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                                    >
                                        <Edit className="w-4 h-4" />
                                        Editar
                                    </button>
                                    <button
                                        onClick={handleDelete}
                                        disabled={actionLoading}
                                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                        Eliminar
                                    </button>
                                </>
                            ) : (
                                <>
                                    {! event.isDraft && (
                                        <>
                                            {event.isRegistered ? (
                                                <button
                                                    onClick={handleUnregister}
                                                    disabled={actionLoading}
                                                    className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
                                                >
                                                    <UserMinus className="w-5 h-5" />
                                                    Cancelar Registro
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={handleRegister}
                                                    disabled={actionLoading || isFull}
                                                    className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                                >
                                                    <UserPlus className="w-5 h-5" />
                                                    {isFull ? 'Sin Cupos' : 'Registrarse'}
                                                </button>
                                            )}
                                        </>
                                    )}
                                </>
                            )}

                            <button
                                onClick={handleShare}
                                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 flex items-center gap-2"
                            >
                                <Share2 className="w-4 h-4" />
                                Compartir
                            </button>
                        </div>
                    </div>

                    {/* Descripción */}
                    <div className="bg-white rounded-lg shadow p-6">
                        <h2 className="text-2xl font-semibold mb-4">Acerca del Evento</h2>
                        <p className="text-gray-700 whitespace-pre-wrap">{event.description}</p>
                    </div>

                    {/* Categorías */}
                    {event.categories && event.categories. length > 0 && (
                        <div className="bg-white rounded-lg shadow p-6">
                            <h3 className="text-xl font-semibold mb-3">Categorías</h3>
                            <div className="flex flex-wrap gap-2">
                                {event.categories.map(category => (
                                    <span
                                        key={category.id}
                                        className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium"
                                    >
                    {category.name}
                  </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Asistentes */}
                    {event.attendees && event.attendees.length > 0 && (
                        <div className="bg-white rounded-lg shadow p-6">
                            <h3 className="text-xl font-semibold mb-4">
                                Asistentes ({event. attendeesCount})
                            </h3>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                {event.attendees.map(attendee => (
                                    <div key={attendee.id} className="flex items-center gap-2">
                                        <img
                                            src={attendee.profile?.avatar || '/default.png'}
                                            alt={attendee.profile?.name || attendee.email}
                                            className="w-10 h-10 rounded-full"
                                        />
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium truncate">
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

                {/* Sidebar */}
                <div className="space-y-4">
                    {/* Info del evento */}
                    <div className="bg-white rounded-lg shadow p-6 sticky top-4">
                        <h3 className="text-lg font-semibold mb-4">Información</h3>

                        <div className="space-y-4">
                            {/* Fecha inicio */}
                            <div className="flex items-start gap-3">
                                <Calendar className="w-5 h-5 text-green-600 mt-0.5" />
                                <div>
                                    <p className="text-sm text-gray-500">Inicia</p>
                                    <p className="font-medium">{formatDate(event.startDate)}</p>
                                </div>
                            </div>

                            {/* Fecha fin */}
                            <div className="flex items-start gap-3">
                                <Clock className="w-5 h-5 text-green-600 mt-0.5" />
                                <div>
                                    <p className="text-sm text-gray-500">Termina</p>
                                    <p className="font-medium">{formatDate(event.endDate)}</p>
                                </div>
                            </div>

                            {/* Ubicación */}
                            <div className="flex items-start gap-3">
                                <MapPin className="w-5 h-5 text-green-600 mt-0.5" />
                                <div>
                                    <p className="text-sm text-gray-500">Ubicación</p>
                                    <p className="font-medium">{event.location}</p>
                                </div>
                            </div>

                            {/* Asistentes */}
                            <div className="flex items-start gap-3">
                                <Users className="w-5 h-5 text-green-600 mt-0.5" />
                                <div>
                                    <p className="text-sm text-gray-500">Asistentes</p>
                                    <p className="font-medium">
                                        {event.attendeesCount || 0}
                                        {event.maxAttendees && ` / ${event.maxAttendees}`}
                                    </p>
                                    {spotsLeft !== null && (
                                        <p className={`text-sm ${spotsLeft > 0 ?  'text-green-600' : 'text-red-600'}`}>
                                            {spotsLeft > 0 ? `${spotsLeft} cupos disponibles` : 'Sin cupos'}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Estado de registro */}
                        {event.isRegistered && ! isOwner && (
                            <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                                <p className="text-sm text-green-800 font-medium">
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