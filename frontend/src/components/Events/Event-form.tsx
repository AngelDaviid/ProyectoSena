import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { EventType } from '../../types/event';
import type { Event } from '../../types/event';
import { createEvent, updateEvent } from '../../services/events';
import { getCategories } from '../../services/categories';
import type { Category } from '../../types/post';
import { Calendar, MapPin, Users, Image as ImageIcon, X, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

interface EventFormProps {
    event?: Event;
    onSuccess?: () => void;
}

const eventTypeOptions = [
    { value: EventType.CONFERENCE, label: 'Conferencia' },
    { value: EventType. WORKSHOP, label: 'Taller' },
    { value: EventType.SEMINAR, label: 'Seminario' },
    { value: EventType.SOCIAL, label: 'Social' },
    { value: EventType.SPORTS, label: 'Deportivo' },
    { value: EventType.CULTURAL, label: 'Cultural' },
    { value: EventType.OTHER, label: 'Otro' },
];

export default function EventForm({ event, onSuccess }: EventFormProps) {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [categories, setCategories] = useState<Category[]>([]);
    const [imagePreview, setImagePreview] = useState<string | null>(null);

    // ✅ NUEVO: Estado para mensajes de éxito/error (toast interno)
    const [notification, setNotification] = useState<{
        type: 'success' | 'error';
        message: string;
    } | null>(null);

    const [formData, setFormData] = useState({
        title: event?.title || '',
        description: event?.description || '',
        location: event?.location || '',
        startDate: event?.startDate ?  new Date(event.startDate). toISOString().slice(0, 16) : '',
        endDate: event?.endDate ? new Date(event.endDate).toISOString().slice(0, 16) : '',
        maxAttendees: event?.maxAttendees || '',
        eventType: event?.eventType || EventType.OTHER,
        categoryIds: event?.categories?.map(c => c.id) || [] as number[],
        image: null as File | null,
    });

    useEffect(() => {
        loadCategories();
        if (event?. imageUrl) {
            const API_BASE = import.meta.env.VITE_SENA_API_URL || 'http://localhost:3001';
            setImagePreview(`${API_BASE}${event.imageUrl}`);
        }
    }, [event]);

    const loadCategories = async () => {
        try {
            const data = await getCategories();
            setCategories(data);
        } catch (error) {
            console.error('Error loading categories:', error);
        }
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setFormData(prev => ({ ...prev, image: file }));
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const removeImage = () => {
        setFormData(prev => ({ ...prev, image: null }));
        setImagePreview(null);
    };

    // ✅ NUEVO: Función para mostrar notificación
    const showNotification = (type: 'success' | 'error', message: string) => {
        setNotification({ type, message });
        setTimeout(() => setNotification(null), 5000);
    };

    const handleSubmit = async (isDraft: boolean) => {
        try {
            setLoading(true);

            // Validaciones (sin alert, con notificación)
            if (!formData.title.trim()) {
                showNotification('error', 'El título es requerido');
                return;
            }

            if (!formData.description.trim()) {
                showNotification('error', 'La descripción es requerida');
                return;
            }

            if (!formData.location.trim()) {
                showNotification('error', 'La ubicación es requerida');
                return;
            }

            if (!formData.startDate) {
                showNotification('error', 'La fecha de inicio es requerida');
                return;
            }

            if (! formData.endDate) {
                showNotification('error', 'La fecha de fin es requerida');
                return;
            }

            const data = new FormData();
            data.append('title', formData.title);
            data.append('description', formData.description);
            data.append('location', formData. location);
            data.append('startDate', new Date(formData.startDate). toISOString());
            data.append('endDate', new Date(formData.endDate).toISOString());
            data.append('eventType', formData.eventType);
            data.append('isDraft', String(isDraft));

            if (formData.maxAttendees) {
                data.append('maxAttendees', String(formData.maxAttendees));
            }

            if (formData.categoryIds. length > 0) {
                formData.categoryIds.forEach(id => {
                    data.append('categoryIds[]', String(id));
                });
            }

            if (formData. image) {
                data.append('image', formData.image);
            }

            if (event) {
                await updateEvent(event.id, data);
                showNotification('success', 'Evento actualizado exitosamente');
            } else {
                await createEvent(data);
                // ✅ NO mostrar notificación aquí - el WebSocket lo hará
                console.log('✅ Evento creado, el WebSocket mostrará la notificación');
            }

            // Esperar un momento para que se vea la notificación antes de redirigir
            setTimeout(() => {
                if (onSuccess) {
                    onSuccess();
                } else {
                    navigate('/events');
                }
            }, isDraft ? 1500 : 500); // Si es publicado, redirigir rápido para ver el toast global

        } catch (error: any) {
            console.error('Error saving event:', error);
            showNotification('error', error.response?.data?.message || 'Error al guardar el evento');
        } finally {
            setLoading(false);
        }
    };

    const toggleCategory = (categoryId: number) => {
        setFormData(prev => ({
            ...prev,
            categoryIds: prev.categoryIds.includes(categoryId)
                ? prev.categoryIds.filter(id => id !== categoryId)
                : [...prev.categoryIds, categoryId],
        }));
    };

    return (
        <div className="max-w-4xl mx-auto p-6">
            {/* ✅ NUEVO: Notificación de éxito/error */}
            {notification && (
                <div
                    className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-6 py-4 rounded-lg shadow-lg animate-in slide-in-from-right ${
                        notification.type === 'success'
                            ?  'bg-green-500 text-white'
                            : 'bg-red-500 text-white'
                    }`}
                >
                    {notification.type === 'success' ? (
                        <CheckCircle className="w-5 h-5" />
                    ) : (
                        <AlertCircle className="w-5 h-5" />
                    )}
                    <span className="font-medium">{notification.message}</span>
                    <button
                        onClick={() => setNotification(null)}
                        className="ml-4 hover:opacity-80"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            <div className="bg-white rounded-lg shadow-lg p-8">
                <h2 className="text-2xl font-bold mb-6 text-gray-900">
                    {event ? 'Editar Evento' : 'Crear Nuevo Evento'}
                </h2>

                <div className="space-y-6">
                    {/* Imagen */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Imagen del Evento
                        </label>
                        {imagePreview ? (
                            <div className="relative">
                                <img
                                    src={imagePreview}
                                    alt="Preview"
                                    className="w-full h-64 object-cover rounded-lg"
                                />
                                <button
                                    type="button"
                                    onClick={removeImage}
                                    className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full hover:bg-red-600"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        ) : (
                            <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                    <ImageIcon className="w-12 h-12 mb-3 text-gray-400" />
                                    <p className="mb-2 text-sm text-gray-500">
                                        <span className="font-semibold">Click para subir</span> o arrastra una imagen
                                    </p>
                                    <p className="text-xs text-gray-500">PNG, JPG, GIF hasta 5MB</p>
                                </div>
                                <input
                                    type="file"
                                    className="hidden"
                                    accept="image/*"
                                    onChange={handleImageChange}
                                />
                            </label>
                        )}
                    </div>

                    {/* Título */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Título *
                        </label>
                        <input
                            type="text"
                            value={formData.title}
                            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                            placeholder="Ej: Conferencia de Inteligencia Artificial"
                            required
                        />
                    </div>

                    {/* Descripción */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Descripción *
                        </label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                            rows={4}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                            placeholder="Describe tu evento..."
                            required
                        />
                    </div>

                    {/* Ubicación */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            <MapPin className="w-4 h-4 inline mr-1" />
                            Ubicación *
                        </label>
                        <input
                            type="text"
                            value={formData.location}
                            onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                            placeholder="Ej: Auditorio Principal SENA"
                            required
                        />
                    </div>

                    {/* Fechas */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                <Calendar className="w-4 h-4 inline mr-1" />
                                Fecha de Inicio *
                            </label>
                            <input
                                type="datetime-local"
                                value={formData.startDate}
                                onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                <Calendar className="w-4 h-4 inline mr-1" />
                                Fecha de Fin *
                            </label>
                            <input
                                type="datetime-local"
                                value={formData.endDate}
                                onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                required
                            />
                        </div>
                    </div>

                    {/* Tipo de Evento y Cupos */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Tipo de Evento
                            </label>
                            <select
                                value={formData.eventType}
                                onChange={(e) => setFormData(prev => ({ ...prev, eventType: e.target.value as EventType }))}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                            >
                                {eventTypeOptions.map(option => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                <Users className="w-4 h-4 inline mr-1" />
                                Máximo de Asistentes (Opcional)
                            </label>
                            <input
                                type="number"
                                min="1"
                                value={formData.maxAttendees}
                                onChange={(e) => setFormData(prev => ({ ... prev, maxAttendees: e.target.value }))}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                placeholder="Ilimitado"
                            />
                        </div>
                    </div>

                    {/* Categorías */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Categorías
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {categories.map(category => (
                                <button
                                    key={category.id}
                                    type="button"
                                    onClick={() => toggleCategory(category.id)}
                                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                                        formData. categoryIds.includes(category.id)
                                            ? 'bg-green-600 text-white'
                                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                    }`}
                                >
                                    {category.name}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Botones */}
                    <div className="flex gap-4 pt-6">
                        {/* Botón Publicar */}
                        <button
                            type="button"
                            onClick={() => handleSubmit(false)}
                            disabled={loading}
                            className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Publicando...
                                </>
                            ) : (
                                <>
                                    {event ? 'Actualizar y Publicar' : 'Publicar Evento'}
                                </>
                            )}
                        </button>

                        {/* Botón Guardar como Borrador */}
                        {! event && (
                            <button
                                type="button"
                                onClick={() => handleSubmit(true)}
                                disabled={loading}
                                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? 'Guardando...' : 'Guardar como Borrador'}
                            </button>
                        )}

                        {/* Botón Cancelar */}
                        <button
                            type="button"
                            onClick={() => navigate('/events')}
                            disabled={loading}
                            className="px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Cancelar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}