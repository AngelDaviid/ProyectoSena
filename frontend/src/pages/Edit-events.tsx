import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getEvent } from '../services/events';
import EventForm from '../components/Events/Event-form';
import type { Event } from '../types/event';
import { Loader2 } from 'lucide-react';

export default function EditEvent() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [event, setEvent] = useState<Event | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (id) {
            loadEvent();
        }
    }, [id]);

    const loadEvent = async () => {
        try {
            setLoading(true);
            setError(null);
            console.log('🔍 Cargando evento ID:', id);
            const data = await getEvent(Number(id));
            console.log('✅ Evento cargado:', data);
            setEvent(data);
        } catch (err: any) {
            console.error('❌ Error al cargar evento:', err);
            setError(err.response?.data?.message || 'Error al cargar el evento');
        } finally {
            setLoading(false);
        }
    };

    const handleSuccess = () => {
        navigate('/events');
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-screen px-4">
                <div className="text-center">
                    <Loader2 className="w-10 h-10 sm:w-12 sm:h-12 animate-spin text-green-600 mx-auto mb-4" />
                    <p className="text-gray-600 text-sm sm:text-base">Cargando evento...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="max-w-2xl mx-auto p-4 sm:p-6">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 sm:p-6 text-center">
                    <p className="text-red-600 font-medium mb-4 text-sm sm:text-base">{error}</p>
                    <button
                        onClick={() => navigate('/events')}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm sm:text-base"
                    >
                        Volver a Eventos
                    </button>
                </div>
            </div>
        );
    }

    if (!event) {
        return (
            <div className="max-w-2xl mx-auto p-4 sm:p-6">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 sm:p-6 text-center">
                    <p className="text-yellow-600 font-medium mb-4 text-sm sm:text-base">Evento no encontrado</p>
                    <button
                        onClick={() => navigate('/events')}
                        className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 text-sm sm:text-base"
                    >
                        Volver a Eventos
                    </button>
                </div>
            </div>
        );
    }

    return <EventForm event={event} onSuccess={handleSuccess} />;
}