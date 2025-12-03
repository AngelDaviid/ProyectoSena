import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Filter, Calendar as CalendarIcon, Eye, Edit, Trash2, ArrowLeft } from 'lucide-react';
import { useEvents } from '../hooks/useEvents.ts';
import { useAuth } from '../hooks/useAuth';
import EventList from "../components/Events/Event-list.tsx";
import { EventType, EventTypeLabels } from '../types/event';
import type {FilterEventsParams, Event} from '../types/event';
import { getCategories } from '../services/categories';
import type { Category } from '../types/post';
import { getMyEvents, deleteEvent, publishEvent } from '../services/events';
import { formatEventDateShort, getEventImageUrl } from '../types/event';
import {useToast} from "../components/Toast-context.tsx";
import ConfirmModal from "../components/Modal/Confirm-modal.tsx";

export default function EventsPage() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const toast = useToast();
    const [activeTab, setActiveTab] = useState<'all' | 'my-events' | 'registered'>('all');
    const [myEventsTab, setMyEventsTab] = useState<'published' | 'drafts'>('published');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedType, setSelectedType] = useState<EventType | ''>('');
    const [selectedCategory, setSelectedCategory] = useState<number | ''>('');
    const [showFilters, setShowFilters] = useState(false);
    const [categories, setCategories] = useState<Category[]>([]);

    // Estados para "Mis Eventos"
    const [myEvents, setMyEvents] = useState<Event[]>([]);
    const [myEventsLoading, setMyEventsLoading] = useState(false);
    const [myEventsError, setMyEventsError] = useState<string | null>(null);
    const [actionLoading, setActionLoading] = useState<number | null>(null);

    // ✅ Estados para modal
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [eventToDelete, setEventToDelete] = useState<number | null>(null);

    // Cargar categorías
    React.useEffect(() => {
        loadCategories();
    }, []);

    // Cargar mis eventos cuando se cambia a ese tab
    React.useEffect(() => {
        if (activeTab === 'my-events' && user) {
            loadMyEvents();
        }
    }, [activeTab, user]);

    const loadCategories = async () => {
        try {
            const data = await getCategories();
            setCategories(data);
        } catch (error) {
            console.error('Error loading categories:', error);
        }
    };

    const loadMyEvents = async () => {
        try {
            setMyEventsLoading(true);
            setMyEventsError(null);
            const data = await getMyEvents();
            setMyEvents(data);
        } catch (err: any) {
            setMyEventsError(err.message || 'Error al cargar eventos');
        } finally {
            setMyEventsLoading(false);
        }
    };

    const handleDelete = async (id: number) => {
        try {
            setActionLoading(id);
            await deleteEvent(id);
            setMyEvents(prev => prev.filter(e => e.id !== id));
            toast.success('Evento eliminado correctamente');
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Error al eliminar');
        } finally {
            setActionLoading(null);
            setShowDeleteModal(false);
            setEventToDelete(null);
        }
    };

    const handlePublish = async (id: number) => {
        try {
            setActionLoading(id);
            await publishEvent(id);
            await loadMyEvents();
            toast. success('Evento publicado exitosamente');
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Error al publicar');
        } finally {
            setActionLoading(null);
        }
    };

    // Construir filtros
    const filters: FilterEventsParams = {
        search: searchTerm || undefined,
        eventType: selectedType || undefined,
        categoryId: selectedCategory || undefined,
    };

    const { events, total, loading, error, reload } = useEvents(filters);

    const handleCreateEvent = () => {
        if (! user) {
            toast.warning('Debes iniciar sesión para crear un evento');
            navigate('/login');
            return;
        }

        // ✅ RESTRICCIÓN: Solo instructores y desarrolladores
        if (user.role === 'aprendiz') {
            toast.warning('Solo instructores pueden crear eventos');
            return;
        }

        navigate('/events/create');
    };

    const clearFilters = () => {
        setSearchTerm('');
        setSelectedType('');
        setSelectedCategory('');
    };

    // Filtrar mis eventos
    const publishedEvents = myEvents.filter(e => ! e.isDraft);
    const draftEvents = myEvents.filter(e => e.isDraft);
    const currentMyEvents = myEventsTab === 'published' ? publishedEvents : draftEvents;

    // ✅ Verificar permisos
    const canManageEvents = user && user.role !== 'aprendiz';

    const renderMyEventCard = (event: Event) => (
        <div key={event.id} className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow overflow-hidden">
            {/* Imagen */}
            <div className="relative h-48 bg-gray-200">
                <img
                    src={getEventImageUrl(event)}
                    alt={event.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                        e.currentTarget.src = '/default-event.png';
                    }}
                />
                {event.isDraft && (
                    <div className="absolute top-2 right-2 bg-yellow-500 text-white px-3 py-1 rounded-full text-xs font-bold">
                        BORRADOR
                    </div>
                )}
            </div>

            {/* Contenido */}
            <div className="p-4">
                <h3 className="font-bold text-lg mb-2 line-clamp-1">{event.title}</h3>
                <p className="text-sm text-gray-600 mb-3 line-clamp-2">{event.description}</p>

                <div className="flex items-center gap-2 text-sm text-gray-700 mb-2">
                    <CalendarIcon className="w-4 h-4" />
                    <span>{formatEventDateShort(event.startDate)}</span>
                </div>

                {! event.isDraft && (
                    <div className="flex items-center gap-2 text-sm text-gray-700 mb-3">
                        <span>👥</span>
                        <span>{event.attendeesCount || 0} inscritos</span>
                        {event.maxAttendees && <span>/ {event.maxAttendees}</span>}
                    </div>
                )}

                {/* Botones */}
                <div className="flex gap-2 mt-4">
                    {event.isDraft && (
                        <button
                            onClick={() => handlePublish(event.id)}
                            disabled={actionLoading === event.id}
                            className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-3 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
                        >
                            <Eye className="w-4 h-4" />
                            Publicar
                        </button>
                    )}
                    <button
                        onClick={() => navigate(`/events/edit/${event.id}`)}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-3 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1"
                    >
                        <Edit className="w-4 h-4" />
                        Editar
                    </button>
                    <button
                        onClick={() => {
                            setEventToDelete(event.id);
                            setShowDeleteModal(true);
                        }}
                        disabled={actionLoading === event.id}
                        className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 px-3 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
                    >
                        <Trash2 className="w-4 h-4" />
                        Eliminar
                    </button>
                </div>
            </div>
        </div>
    );

    return (
        <>
            <div className="min-h-screen bg-gray-50">
                {/* ✅ NUEVO: Botón para volver atrás */}
                <div className="max-w-7xl mx-auto px-4 pt-6 pb-2">
                    <button
                        onClick={() => navigate('/')}
                        className="text-gray-600 hover:text-gray-900 flex items-center gap-1"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Volver
                    </button>
                </div>

                {/* Header */}
                <div className="bg-white shadow-sm border-b sticky top-0 z-40">
                    <div className="max-w-7xl mx-auto px-4 py-4">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                                    <CalendarIcon className="w-8 h-8 text-green-600" />
                                    Eventos SENA
                                </h1>
                                <p className="text-gray-600 mt-1">
                                    Descubre y participa en eventos de la comunidad
                                </p>
                            </div>

                            {/* ✅ Solo mostrar si puede gestionar eventos */}
                            {canManageEvents && (
                                <button
                                    onClick={handleCreateEvent}
                                    className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium transition-colors shadow-lg"
                                >
                                    <Plus className="w-5 h-5" />
                                    Crear Evento
                                </button>
                            )}
                        </div>

                        {/* Tabs principales */}
                        <div className="flex gap-2 border-b">
                            <button
                                onClick={() => setActiveTab('all')}
                                className={`px-4 py-2 font-medium transition-colors border-b-2 ${
                                    activeTab === 'all'
                                        ? 'text-green-600 border-green-600'
                                        : 'text-gray-600 border-transparent hover:text-gray-900'
                                }`}
                            >
                                Todos los Eventos ({total})
                            </button>

                            {/* ✅ Solo mostrar si puede gestionar eventos */}
                            {canManageEvents && (
                                <>
                                    <button
                                        onClick={() => setActiveTab('my-events')}
                                        className={`px-4 py-2 font-medium transition-colors border-b-2 ${
                                            activeTab === 'my-events'
                                                ? 'text-green-600 border-green-600'
                                                : 'text-gray-600 border-transparent hover:text-gray-900'
                                        }`}
                                    >
                                        Mis Eventos
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('registered')}
                                        className={`px-4 py-2 font-medium transition-colors border-b-2 ${
                                            activeTab === 'registered'
                                                ? 'text-green-600 border-green-600'
                                                : 'text-gray-600 border-transparent hover:text-gray-900'
                                        }`}
                                    >
                                        Inscritos
                                    </button>
                                </>
                            )}
                        </div>

                        {/* Sub-tabs para "Mis Eventos" */}
                        {activeTab === 'my-events' && (
                            <div className="flex gap-2 mt-3 border-b pb-2">
                                <button
                                    onClick={() => setMyEventsTab('published')}
                                    className={`px-3 py-1 text-sm font-medium rounded-t-lg transition-colors ${
                                        myEventsTab === 'published'
                                            ?  'bg-green-100 text-green-700'
                                            : 'text-gray-600 hover:bg-gray-100'
                                    }`}
                                >
                                    Publicados ({publishedEvents.length})
                                </button>
                                <button
                                    onClick={() => setMyEventsTab('drafts')}
                                    className={`px-3 py-1 text-sm font-medium rounded-t-lg transition-colors ${
                                        myEventsTab === 'drafts'
                                            ? 'bg-yellow-100 text-yellow-700'
                                            : 'text-gray-600 hover:bg-gray-100'
                                    }`}
                                >
                                    Borradores ({draftEvents.length})
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                <div className="max-w-7xl mx-auto px-4 py-6">
                    {/* Contenido según tab activo */}
                    {activeTab === 'all' && (
                        <>
                            {/* Barra de búsqueda y filtros */}
                            <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
                                <div className="flex flex-col md:flex-row gap-4">
                                    <div className="flex-1 relative">
                                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                                        <input
                                            type="text"
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            placeholder="Buscar eventos por título, descripción o ubicación..."
                                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                        />
                                    </div>

                                    <button
                                        onClick={() => setShowFilters(!showFilters)}
                                        className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                                    >
                                        <Filter className="w-4 h-4" />
                                        Filtros
                                        {(selectedType || selectedCategory) && (
                                            <span className="bg-green-600 text-white px-2 py-0.5 rounded-full text-xs">
                                                {[selectedType, selectedCategory].filter(Boolean).length}
                                            </span>
                                        )}
                                    </button>
                                </div>

                                {showFilters && (
                                    <div className="mt-4 pt-4 border-t grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Tipo de Evento
                                            </label>
                                            <select
                                                value={selectedType}
                                                onChange={(e) => setSelectedType(e.target.value as EventType | '')}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                            >
                                                <option value="">Todos los tipos</option>
                                                {Object.entries(EventTypeLabels).map(([key, label]) => (
                                                    <option key={key} value={key}>
                                                        {label}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Categoría
                                            </label>
                                            <select
                                                value={selectedCategory}
                                                onChange={(e) => setSelectedCategory(e.target.value ?  Number(e.target.value) : '')}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                            >
                                                <option value="">Todas las categorías</option>
                                                {categories.map(category => (
                                                    <option key={category.id} value={category.id}>
                                                        {category.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        {(selectedType || selectedCategory || searchTerm) && (
                                            <div className="md:col-span-2">
                                                <button
                                                    onClick={clearFilters}
                                                    className="text-sm text-gray-600 hover:text-gray-900 underline"
                                                >
                                                    Limpiar filtros
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {error && (
                                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                                    <p className="text-red-600">❌ {error}</p>
                                    <button
                                        onClick={reload}
                                        className="mt-2 text-sm text-red-600 underline hover:text-red-800"
                                    >
                                        Intentar de nuevo
                                    </button>
                                </div>
                            )}

                            <EventList events={events} loading={loading} error={error} />

                            {! loading && events.length === 0 && (searchTerm || selectedType || selectedCategory) && (
                                <div className="text-center py-12">
                                    <p className="text-gray-600 mb-4">
                                        No se encontraron eventos con los filtros seleccionados
                                    </p>
                                    <button
                                        onClick={clearFilters}
                                        className="text-green-600 hover:text-green-700 font-medium"
                                    >
                                        Limpiar filtros
                                    </button>
                                </div>
                            )}
                        </>
                    )}

                    {activeTab === 'my-events' && (
                        <>
                            {myEventsError && (
                                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                                    <p className="text-red-600">❌ {myEventsError}</p>
                                </div>
                            )}

                            {myEventsLoading ?  (
                                <div className="text-center py-12">
                                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
                                </div>
                            ) : currentMyEvents.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {currentMyEvents.map(renderMyEventCard)}
                                </div>
                            ) : (
                                <div className="text-center py-12">
                                    <CalendarIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                                    <p className="text-gray-600">
                                        {myEventsTab === 'published'
                                            ? 'No tienes eventos publicados'
                                            : 'No tienes borradores'}
                                    </p>
                                </div>
                            )}
                        </>
                    )}

                    {activeTab === 'registered' && (
                        <EventList events={events} loading={loading} error={error} />
                    )}
                </div>
            </div>

            <ConfirmModal
                isOpen={showDeleteModal}
                onClose={() => {
                    setShowDeleteModal(false);
                    setEventToDelete(null);
                }}
                onConfirm={() => {
                    if (eventToDelete) {
                        handleDelete(eventToDelete);
                    }
                }}
                title="Eliminar evento"
                message="¿Estás seguro de eliminar este evento? Esta acción no se puede deshacer."
                confirmText="Eliminar"
                cancelText="Cancelar"
                type="danger"
            />
        </>
    );
}