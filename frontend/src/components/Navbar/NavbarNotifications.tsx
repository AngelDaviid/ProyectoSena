import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    getIncomingRequests,
} from '../../services/friends';

import type { FriendRequestDTO } from '../../services/friends';
import {
    onFriendRequestSent,
    offFriendRequestSent,
    onFriendRequestAccepted,
    offFriendRequestAccepted,
} from '../../services/sockets/socket.ts';

export default function NavbarNotifications() {
    const [incomingCount, setIncomingCount] = useState(0);
    const [preview, setPreview] = useState<FriendRequestDTO[]>([]);
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();

    /**
     * 🔄 Fetch inicial de solicitudes
     */
    useEffect(() => {
        let active = true;

        const loadRequests = async () => {
            try {
                const data = await getIncomingRequests();
                if (!active) return;

                const requests = Array.isArray(data) ? data : [];
                setPreview(requests.slice(0, 4));
                setIncomingCount(requests.length);
            } catch (error) {
                console.error('Error fetching incoming requests:', error);
            }
        };

        loadRequests();

        return () => {
            active = false;
        };
    }, []);

    /**
     * ⚡ Handlers para eventos en tiempo real (sockets)
     */
    const handleNewRequest = useCallback((payload: FriendRequestDTO) => {
        setIncomingCount((count) => count + 1);
        setPreview((prev) => {
            const next = [payload, ...prev];
            return next.slice(0, 4);
        });
    }, []);

    const handleAcceptedRequest = useCallback((payload: any) => {
        const requestId = payload?.request?.id ?? payload?.requestId;
        setPreview((prev) => prev.filter((r) => r.id !== requestId));
        setIncomingCount((count) => Math.max(0, count - 1));
    }, []);

    /**
     * 🧩 Subscribir / desubscribir eventos socket
     */
    useEffect(() => {
        onFriendRequestSent(handleNewRequest);
        onFriendRequestAccepted(handleAcceptedRequest);
        return () => {
            offFriendRequestSent(handleNewRequest);
            offFriendRequestAccepted(handleAcceptedRequest);
        };
    }, [handleNewRequest, handleAcceptedRequest]);

    /**
     * 🖱️ Cerrar dropdown al hacer click afuera
     */
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (ref.current && !ref.current.contains(event.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    /**
     * 🎨 Render
     */
    return (
        <div ref={ref} className="relative">
            {/* 🔔 Botón del ícono */}
            <button
                onClick={() => setOpen((v) => !v)}
                className="relative p-2 focus:outline-none"
            >
                <svg
                    className="w-6 h-10 text-gray-700"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h11z"
                    />
                </svg>

                {incomingCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex items-center justify-center px-2 py-1 text-xs font-bold text-white bg-red-600 rounded-full">
            {incomingCount}
          </span>
                )}
            </button>

            {/* 🧭 Dropdown de notificaciones */}
            {open && (
                <div className="absolute right-0 mt-2 w-80 bg-white border rounded shadow-lg z-50">
                    <div className="p-3 border-b flex items-center justify-between">
                        <strong>Notificaciones</strong>
                        <button
                            onClick={() => {
                                setOpen(false);
                                navigate('/notifications');
                            }}
                            className="text-xs text-green-600 hover:underline"
                        >
                            Ver todo
                        </button>
                    </div>

                    <div className="max-h-64 overflow-auto">
                        {preview.length === 0 ? (
                            <div className="p-4 text-sm text-gray-500">
                                No hay solicitudes nuevas.
                            </div>
                        ) : (
                            preview.map((req) => {
                                const { id, sender } = req;
                                const avatar = sender?.profile?.avatar || '/default.png';
                                const fullName = `${sender?.profile?.name ?? ''} ${
                                    sender?.profile?.lastName ?? ''
                                }`.trim();

                                return (
                                    <div
                                        key={id}
                                        className="p-3 flex gap-3 items-center border-b hover:bg-gray-50"
                                    >
                                        <img
                                            src={avatar}
                                            alt="avatar"
                                            className="w-10 h-10 rounded-full object-cover"
                                        />
                                        <div className="flex-1 text-sm">
                                            <div className="font-medium">{fullName || sender?.email}</div>
                                            <div className="text-xs text-gray-500">
                                                Te ha enviado una solicitud
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => navigate('/notifications')}
                                            className="text-sm text-green-600 hover:underline"
                                        >
                                            Ver
                                        </button>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
