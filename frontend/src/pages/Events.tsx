import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Filter, Calendar as CalendarIcon } from 'lucide-react';
import { useEvents } from '../hooks/useEvents.ts';
import { useAuth } from '../hooks/useAuth';
import EventList from '../components/Events/EventList';
import { EventType, EventTypeLabels } from '../types/event';
import type {FilterEventsParams} from '../types/event';
import { getCategories } from '../services/categories';
import type { Category } from '../types/post';

export default function EventsPage() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<'all' | 'my-Events' | 'registered'>('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedType, setSelectedType] = useState<EventType | ''>('');
    const [selectedCategory, setSelectedCategory] = useState<number | ''>('');
    const [showFilters, setShowFilters] = useState(false);
    const [categories, setCategories] = useState<Category[]>([]);

    // Cargar categorías
    React.useEffect(() => {
        loadCategories();
    }, []);

    const loadCategories = async () => {
        try {
            const data = await getCategories();
            setCategories(data);
        } catch (error) {
            console.error('Error loading categories:', error);
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
            alert('Debes iniciar sesión para crear un evento');
            navigate('/login');
            return;
        }
        navigate('/events/create');
    };

    const clearFilters = () => {
        setSearchTerm('');
        setSelectedType('');
        setSelectedCategory('');
    };

    return (
        <div className="min-h-screen bg-gray-50">
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

                        <button
                            onClick={handleCreateEvent}
                            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium transition-colors shadow-lg"
                        >
                            <Plus className="w-5 h-5" />
                            Crear Evento
                        </button>
                    </div>

                    {/* Tabs */}
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
                        {user && (
                            <>
                                <button
                                    onClick={() => setActiveTab('my-Events')}
                                    className={`px-4 py-2 font-medium transition-colors border-b-2 ${
                                        activeTab === 'my-Events'
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
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 py-6">
                {/* Barra de búsqueda y filtros */}
                <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
                    <div className="flex flex-col md:flex-row gap-4">
                        {/* Búsqueda */}
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

                        {/* Botón de filtros */}
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

                    {/* Panel de filtros expandible */}
                    {showFilters && (
                        <div className="mt-4 pt-4 border-t grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Tipo de evento */}
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

                            {/* Categoría */}
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

                            {/* Botón limpiar filtros */}
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

                {/* Mensajes de error */}
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

                {/* Lista de eventos */}
                <EventList events={events} loading={loading} error={error} />

                {/* Estado vacío con filtros activos */}
                {!loading && events.length === 0 && (searchTerm || selectedType || selectedCategory) && (
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
            </div>
        </div>
    );
}