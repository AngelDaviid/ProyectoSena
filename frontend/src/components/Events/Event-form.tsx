import React, {useEffect, useState} from 'react';
import {useNavigate} from 'react-router-dom';
import type {Event, Category, EventType} from '../../types/event';
import {EventType as EventTypeEnum, EventTypeLabels} from '../../types/event';
import {createEvent, updateEvent} from '../../services/events';
import {Calendar, MapPin, Users, Upload, X, FileText, Hash} from 'lucide-react';
import api from '../../services/api';
import { getEventImageUrl } from '../../types/event';

type EventFormProps = {
    event?: Event | null;
    onSuccess?: () => void;
};

const API_BASE = import.meta.env.VITE_SENA_API_URL || 'http://localhost:3001';

export default function EventForm({ event, onSuccess }: EventFormProps) {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [categories, setCategories] = useState<Category[]>([]);
    const [imagePreview, setImagePreview] = useState<string | null>(null);

    const [notification, setNotification] = useState<{
        type: 'success' | 'error';
        message: string;
    } | null>(null);

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        location: '',
        startDate: '',
        endDate: '',
        maxAttendees: '',
        eventType: EventTypeEnum.OTHER as EventType,
        categoryIds: [] as number[],
        image: null as File | null,
    });

    const today = new Date();
    const minDate = today.toISOString().slice(0, 16);

    useEffect(() => {
        loadCategories();
    }, []);

    useEffect(() => {
        console.log('🔍 Event prop changed:', event);

        if (event) {
            setFormData({
                title: event.title || '',
                description: event.description || '',
                location: event.location || '',
                startDate: event.startDate ?   new Date(event.startDate).toISOString().slice(0, 16) : '',
                endDate: event.endDate ?  new Date(event.endDate).toISOString().slice(0, 16) : '',
                maxAttendees: event.maxAttendees ? String(event.maxAttendees) : '',
                eventType: event.eventType ? (event.eventType as EventType) : EventTypeEnum.OTHER,
                categoryIds: event.categories?.map(c => c.id) || [],
                image: null,
            });

            if (event.imageUrl) {
                setImagePreview(getEventImageUrl(event, API_BASE));
            } else {
                setImagePreview(null);
            }
        }
    }, [event]);

    const loadCategories = async () => {
        try {
            const res = await api.get<Category[]>('/categories');
            setCategories(res.data || []);
        } catch (error) {
            console.error('Error loading categories:', error);
        }
    };

    const showNotification = (type: 'success' | 'error', message: string) => {
        setNotification({ type, message });
        setTimeout(() => setNotification(null), 5000);
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                showNotification('error', 'La imagen no debe superar los 5MB');
                return;
            }

            if (!file.type.match(/^image\/(jpeg|jpg|png|gif|webp)$/)) {
                showNotification('error', 'Solo se permiten imágenes (jpg, png, gif, webp)');
                return;
            }

            setFormData(prev => ({ ...prev, image: file }));

            const reader = new FileReader();
            reader.onload = () => setImagePreview(reader.result as string);
            reader.readAsDataURL(file);
        }
    };

    const removeImage = () => {
        setFormData(prev => ({ ...prev, image: null }));
        setImagePreview(null);
    };

    const handleSubmit = async (isDraft: boolean) => {
        try {
            setLoading(true);

            console.log('🚀 Submitting event, isDraft:', isDraft);

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

            if (!formData.endDate) {
                showNotification('error', 'La fecha de fin es requerida');
                return;
            }

            const startDate = new Date(formData.startDate);
            const endDate = new Date(formData.endDate);
            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);

            const startDateOnly = new Date(startDate);
            startDateOnly.setHours(0, 0, 0, 0);

            const endDateOnly = new Date(endDate);
            endDateOnly.setHours(0, 0, 0, 0);

            if (startDateOnly < todayStart) {
                showNotification('error', 'La fecha de inicio no puede ser de días pasados');
                return;
            }

            if (endDateOnly < todayStart) {
                showNotification('error', 'La fecha de fin no puede ser de días pasados');
                return;
            }

            if (endDate < startDate) {
                showNotification('error', 'La fecha de fin debe ser igual o posterior a la de inicio');
                return;
            }

            const data = new FormData();
            data.append('title', formData.title);
            data.append('description', formData.description);
            data.append('location', formData.location);
            data.append('startDate', new Date(formData.startDate). toISOString());
            data.append('endDate', new Date(formData.endDate).toISOString());
            data.append('eventType', formData.eventType);
            if (isDraft) {
                data.append('isDraft', 'true');
            }

            if (formData.maxAttendees) {
                data.append('maxAttendees', formData.maxAttendees);
            }

            if (formData.categoryIds.length > 0) {
                data.append('categoryIds', JSON.stringify(formData.categoryIds));
            }

            if (formData.image) {
                data.append('image', formData.image);
            }

            console.log('📦 FormData ready, calling API...');

            if (event) {
                await updateEvent(event.id, data);
                showNotification('success', 'Evento actualizado exitosamente');
            } else {
                await createEvent(data);
                showNotification('success', isDraft ? 'Borrador guardado exitosamente' : 'Evento publicado exitosamente');
            }

            console.log('✅ Event saved successfully');

            setTimeout(() => {
                if (onSuccess) {
                    onSuccess();
                } else {
                    navigate('/events');
                }
            }, 1500);

        } catch (error: any) {
            console.error(' Error submitting event:', error);
            const message = error.response?.data?.message || 'Error al guardar el evento';
            showNotification('error', message);
        } finally {
            setLoading(false);
        }
    };

    const toggleCategory = (categoryId: number) => {
        setFormData(prev => ({
            ...prev,
            categoryIds: prev.categoryIds.includes(categoryId)
                ? prev.categoryIds.filter(id => id !== categoryId)
                : [... prev.categoryIds, categoryId]
        }));
    };

    return (
        <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
            {notification && (
                <div
                    className={`mb-4 p-4 rounded-lg ${
                        notification.type === 'success'
                            ? 'bg-green-50 text-green-800 border border-green-200'
                            : 'bg-red-50 text-red-800 border border-red-200'
                    }`}
                >
                    {notification.message}
                </div>
            )}

            <button
                type="button"
                className="p-2 w-[80px] bg-gray-400/40 hover:bg-gray-400/60 rounded-lg mb-4 inline-flex items-center justify-center"
                onClick={() => navigate(-1)}
            >
                Volver
            </button>

            <div className="mb-6 sm:mb-8">
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-2">
                    {event ? 'Editar Evento' : 'Crear Nuevo Evento'}
                </h1>
                <p className="text-sm sm:text-base text-gray-600">
                    {event ? 'Modifica los detalles del evento' : 'Completa la información para crear un evento'}
                </p>
            </div>

            <div className="space-y-6 sm:space-y-8">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
                    <h2 className="text-lg sm:text-xl font-semibold mb-4 sm:mb-6 flex items-center gap-2">
                        <FileText className="w-5 h-5 text-green-600"/>
                        Información Básica
                    </h2>

                    <div className="mb-4 sm:mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Título del Evento *
                        </label>
                        <input
                            type="text"
                            value={formData.title}
                            onChange={(e) => setFormData(prev => ({...prev, title: e.target.value}))}
                            className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm sm:text-base"
                            placeholder="Ej: Conferencia de Desarrollo Web"
                            required
                        />
                    </div>

                    <div className="mb-4 sm:mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Descripción *
                        </label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData(prev => ({...prev, description: e.target.value}))}
                            rows={4}
                            className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm sm:text-base resize-none"
                            placeholder="Describe el evento, temas a tratar, objetivos, etc."
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            <MapPin className="w-4 h-4 inline mr-1"/>
                            Ubicación *
                        </label>
                        <input
                            type="text"
                            value={formData.location}
                            onChange={(e) => setFormData(prev => ({...prev, location: e.target.value}))}
                            className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm sm:text-base"
                            placeholder="Ej: Auditorio Principal SENA"
                            required
                        />
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
                    <h2 className="text-lg sm:text-xl font-semibold mb-4 sm:mb-6 flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-green-600"/>
                        Fechas y Detalles
                    </h2>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4 sm:mb-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                <Calendar className="w-4 h-4 inline mr-1"/>
                                Fecha de Inicio *
                            </label>
                            <input
                                type="datetime-local"
                                value={formData.startDate}
                                onChange={(e) => setFormData(prev => ({...prev, startDate: e.target.value}))}
                                min={minDate}
                                className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm sm:text-base"
                                required
                            />
                            <p className="text-xs text-gray-500 mt-1">Puede ser hoy o en el futuro</p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                <Calendar className="w-4 h-4 inline mr-1"/>
                                Fecha de Fin *
                            </label>
                            <input
                                type="datetime-local"
                                value={formData.endDate}
                                onChange={(e) => setFormData(prev => ({...prev, endDate: e.target.value}))}
                                min={formData.startDate || minDate}
                                className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm sm:text-base"
                                required
                            />
                            <p className="text-xs text-gray-500 mt-1">Puede ser el mismo día de inicio</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Tipo de Evento *
                            </label>
                            <select
                                value={formData.eventType}
                                onChange={(e) => setFormData(prev => ({
                                    ...prev,
                                    eventType: e.target.value as EventType
                                }))}
                                className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm sm:text-base"
                            >
                                {Object.entries(EventTypeLabels).map(([key, label]) => (
                                    <option key={key} value={key}>
                                        {label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                <Users className="w-4 h-4 inline mr-1"/>
                                Máximo de Asistentes
                            </label>
                            <input
                                type="number"
                                value={formData.maxAttendees}
                                onChange={(e) => setFormData(prev => ({...prev, maxAttendees: e.target.value}))}
                                min="1"
                                className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm sm:text-base"
                                placeholder="Opcional"
                            />
                            <p className="text-xs text-gray-500 mt-1">Dejar vacío para ilimitado</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
                    <h2 className="text-lg sm:text-xl font-semibold mb-4 sm:mb-6 flex items-center gap-2">
                        <Upload className="w-5 h-5 text-green-600"/>
                        Imagen del Evento
                    </h2>

                    <div className="space-y-4 sm:space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Imagen del Evento
                            </label>
                            {imagePreview ?  (
                                <div className="relative">
                                    <img
                                        src={imagePreview}
                                        alt="Preview"
                                        className="w-full h-48 sm:h-64 object-cover rounded-lg"
                                    />
                                    <button
                                        type="button"
                                        onClick={removeImage}
                                        className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full hover:bg-red-600"
                                    >
                                        <X className="w-4 h-4"/>
                                    </button>
                                </div>
                            ) : (
                                <label
                                    className="flex flex-col items-center justify-center w-full h-48 sm:h-64 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                        <Upload className="w-10 h-10 sm:w-12 sm:h-12 mb-3 text-gray-400"/>
                                        <p className="mb-2 text-xs sm:text-sm text-gray-500">
                                            <span className="font-semibold">Click para subir</span> o arrastra una imagen
                                        </p>
                                        <p className="text-xs text-gray-500">PNG, JPG, GIF, WEBP (máx. 5MB)</p>
                                    </div>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleImageChange}
                                        className="hidden"
                                    />
                                </label>
                            )}
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
                    <h2 className="text-lg sm:text-xl font-semibold mb-4 sm:mb-6 flex items-center gap-2">
                        <Hash className="w-5 h-5 text-green-600"/>
                        Categorías
                    </h2>

                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                        {categories.map(category => (
                            <button
                                key={category.id}
                                type="button"
                                onClick={() => toggleCategory(category.id)}
                                className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                                    formData.categoryIds.includes(category.id)
                                        ? 'bg-green-600 text-white shadow-md'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                            >
                                {category.name}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                    <button
                        type="button"
                        onClick={() => handleSubmit(false)}
                        disabled={loading}
                        className="flex-1 px-4 sm:px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-sm sm:text-base transition-colors"
                    >
                        {loading ? 'Guardando...' : event ? 'Actualizar y Publicar' : 'Publicar Evento'}
                    </button>

                    {!event && (
                        <button
                            type="button"
                            onClick={() => handleSubmit(true)}
                            disabled={loading}
                            className="px-4 sm:px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-sm sm:text-base transition-colors"
                        >
                             Guardar como Borrador
                        </button>
                    )}

                    <button
                        type="button"
                        onClick={() => navigate('/events')}
                        disabled={loading}
                        className="px-4 sm:px-6 py-3 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-sm sm:text-base transition-colors"
                    >
                        Cancelar
                    </button>
                </div>
            </div>
        </div>
    );
}