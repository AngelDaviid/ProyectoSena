import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getIncomingRequests } from '../../services/friends';
import {
    onFriendRequestSent,
    offFriendRequestSent,
    onFriendRequestAccepted,
    offFriendRequestAccepted,
} from '../../services/socket';

type FriendRequestDTO = {
    id: number;
    sender?: {
        id?: number;
        email?: string;
        profile?: { name?: string; lastName?: string; avatar?: string | null };
    } | null;
    // otros campos opcionales...
    [key: string]: any;
};

export default function NavbarNotifications() {
    const [incomingCount, setIncomingCount] = useState<number>(0);
    const [preview, setPreview] = useState<FriendRequestDTO[]>([]);
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement | null>(null);
    const navigate = useNavigate();

    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                const data = await getIncomingRequests();
                if (!mounted) return;
                const arr = Array.isArray(data) ? (data as FriendRequestDTO[]) : [];
                setPreview(arr.slice(0, 4));
                setIncomingCount(arr.length);
            } catch (e) {
                console.error('Error fetching incoming requests', e);
            }
        })();

        const handleNew = (payload: any) => {
            setIncomingCount((c) => c + 1);
            setPreview((p) => {
                const next = [payload as FriendRequestDTO, ...p];
                return next.slice(0, 4);
            });
        };
        const handleAccepted = (payload: any) => {
            // payload puede tener request.id o requestId dependiendo del backend
            const reqId = payload?.request?.id ?? payload?.requestId;
            setPreview((p) => p.filter((r) => r.id !== reqId));
            setIncomingCount((c) => Math.max(0, c - 1));
        };

        onFriendRequestSent(handleNew);
        onFriendRequestAccepted(handleAccepted);

        return () => {
            mounted = false;
            offFriendRequestSent(handleNew);
            offFriendRequestAccepted(handleAccepted);
        };
    }, []);

    // Cerrar al hacer click afuera
    useEffect(() => {
        function onDoc(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        }
        document.addEventListener('mousedown', onDoc);
        return () => document.removeEventListener('mousedown', onDoc);
    }, []);

    return (
        <div ref={ref} className="relative">
            <button onClick={() => setOpen((v) => !v)} className="relative p-2">
                <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h11z" />
                </svg>
                {incomingCount > 0 && (
                    <span className="absolute -top-1 -right-1 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-600 rounded-full">
            {incomingCount}
          </span>
                )}
            </button>

            {open && (
                <div className="absolute right-0 mt-2 w-80 bg-white border rounded shadow-lg z-50">
                    <div className="p-3 border-b flex items-center justify-between">
                        <strong>Notificaciones</strong>
                        <button onClick={() => { setOpen(false); navigate('/notifications'); }} className="text-xs text-green-600">
                            Ver todo
                        </button>
                    </div>

                    <div className="max-h-64 overflow-auto">
                        {preview.length === 0 ? (
                            <div className="p-4 text-sm text-gray-500">No hay solicitudes nuevas.</div>
                        ) : (
                            preview.map((r) => (
                                <div key={r.id} className="p-3 flex gap-3 items-center border-b">
                                    <img src={r.sender?.profile?.avatar || '/default.png'} alt="avatar" className="w-10 h-10 rounded-full object-cover" />
                                    <div className="flex-1 text-sm">
                                        <div className="font-medium">{r.sender?.profile?.name} {r.sender?.profile?.lastName}</div>
                                        <div className="text-xs text-gray-500">Te ha enviado una solicitud</div>
                                    </div>
                                    <div>
                                        <button onClick={() => navigate('/notifications')} className="text-sm text-green-600">Ver</button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}