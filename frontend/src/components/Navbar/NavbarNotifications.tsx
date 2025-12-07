import {useEffect, useState, useRef, useCallback} from 'react';
import {useNavigate} from 'react-router-dom';
import {type FriendRequestDTO, getIncomingRequests} from "../../services/friends.ts";
import {
    offFriendRequestAccepted,
    offFriendRequestSent,
    onFriendRequestAccepted,
    onFriendRequestSent
} from "../../services/socket.ts";
import {BellIcon} from "../Icon/Bell-icon.tsx";


const API_BASE =
    import.meta.env.VITE_SENA_API_URL || 'http://localhost:3001';

export default function NavbarNotifications() {
    const [incomingCount, setIncomingCount] = useState(0);
    const [preview, setPreview] = useState<FriendRequestDTO[]>([]);
    const [open, setOpen] = useState(false);

    const ref = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();

    const getInitials = (name: string, lastName: string, email: string) => {
        if (name && lastName) return `${name.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
        if (name) return name.charAt(0).toUpperCase();
        if (email) return email.charAt(0).toUpperCase();
        return '?';
    };

    const getColorFromName = (name: string) => {
        const colors = [
            'bg-blue-500',
            'bg-green-500',
            'bg-purple-500',
            'bg-pink-500',
            'bg-indigo-500',
            'bg-yellow-500',
            'bg-red-500',
            'bg-teal-500',
            'bg-orange-500',
            'bg-cyan-500',
        ];

        const charCode = name.charCodeAt(0) || 0;
        return colors[charCode % colors.length];
    };

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

    const handleNewRequest = useCallback((payload: FriendRequestDTO) => {
        setIncomingCount((count) => count + 1);
        setPreview((prev) => [payload, ...prev].slice(0, 4));
    }, []);

    const handleAcceptedRequest = useCallback((payload: any) => {
        const requestId = payload?.request?.id ?? payload?.requestId;
        setPreview((prev) => prev.filter((r) => r.id !== requestId));
        setIncomingCount((count) => Math.max(0, count - 1));
    }, []);

    useEffect(() => {
        onFriendRequestSent(handleNewRequest);
        onFriendRequestAccepted(handleAcceptedRequest);

        return () => {
            offFriendRequestSent(handleNewRequest);
            offFriendRequestAccepted(handleAcceptedRequest);
        };
    }, [handleNewRequest, handleAcceptedRequest]);

    /* =========================
       CLICK OUTSIDE
    ========================= */

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (ref.current && !ref.current.contains(event.target as Node)) {
                setOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () =>
            document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div ref={ref} className="relative">
            <button
                onClick={() => setOpen((v) => !v)}
                aria-label="Notificaciones"
                className="relative p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-all focus:outline-none focus:ring-2 focus:ring-green-500 active:scale-95"
            >
                <BellIcon size={24} className="text-gray-700 dark:text-gray-200  cursor-pointer"/>

                {incomingCount > 0 && (
                    <span
                        className="absolute top-0 right-0 flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-bold text-white bg-red-500 rounded-full border-2 border-white dark:border-gray-900">
            {incomingCount > 99 ? '99+' : incomingCount}
          </span>
                )}
            </button>

            {open && (
                <>
                    <div
                        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 sm:hidden"
                        onClick={() => setOpen(false)}
                    />

                    <div
                        className="fixed left-4 mt-4 right-4 top-20 sm:left-auto sm:right-4 sm:top-16 sm:w-96 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 z-50 overflow-hidden">
                        {/* HEADER */}
                        <div
                            className="px-4 py-3 bg-green-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                    <BellIcon
                                        size={20}
                                        variant="solid"
                                        className="text-green-600 dark:text-green-400"
                                    />
                                    <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                                        Notificaciones
                                    </h3>

                                    {incomingCount > 0 && (
                                        <span
                                            className="min-w-[20px] h-5 px-1.5 text-xs font-semibold text-green-700 bg-green-100 dark:bg-green-900/50 dark:text-green-300 rounded-full flex items-center justify-center">
                                  {incomingCount}
                                </span>
                                    )}
                                </div>

                                <button
                                    onClick={() => {
                                        setOpen(false);
                                        navigate('/friends');
                                    }}
                                    className="text-sm font-medium text-green-600 hover:text-green-700 dark:text-green-400 cursor-pointer"
                                >
                                    Ver todas
                                </button>
                            </div>
                        </div>

                        {/* BODY */}
                        <div className="max-h-[60vh] sm:max-h-96 overflow-y-auto">
                            {preview.length === 0 ? (
                                <div className="flex flex-col items-center py-12">
                                    <BellIcon size={32} className="text-gray-400 mb-2 cursor-pointer"/>
                                    <p className="font-medium">¡Todo al día!</p>
                                    <p className="text-sm text-gray-500">
                                        No tienes solicitudes nuevas
                                    </p>
                                </div>
                            ) : (
                                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                                    {preview.map((req) => {
                                        const {id, sender} = req;

                                        const name = sender?.profile?.name ?? '';
                                        const lastName = sender?.profile?.lastName ?? '';
                                        const email = sender?.email ?? '';
                                        const fullName = `${name} ${lastName}`.trim();
                                        const displayName = fullName || email;

                                        const avatar = sender?.profile?.avatar;
                                        const hasAvatar =
                                            avatar && avatar !== '' && avatar !== '/default.png';

                                        const avatarUrl = hasAvatar
                                            ? avatar.startsWith('/')
                                                ? `${API_BASE}${avatar}`
                                                : avatar
                                            : null;

                                        const initials = getInitials(name, lastName, email);
                                        const avatarColor = getColorFromName(displayName);

                                        return (
                                            <div
                                                key={id}
                                                onClick={() => {
                                                    setOpen(false);
                                                    navigate('/friends');
                                                }}
                                                className="p-4 flex gap-3 items-center hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer"
                                            >
                                                {/* AVATAR */}
                                                <div className="relative">
                                                    {avatarUrl ? (
                                                        <img
                                                            src={avatarUrl}
                                                            alt={displayName}
                                                            className="w-12 h-12 rounded-full object-cover border"
                                                        />
                                                    ) : (
                                                        <div
                                                            className={`w-12 h-12 rounded-full ${avatarColor} flex items-center justify-center`}
                                                        >
                              <span className="text-white font-semibold">
                                {initials}
                              </span>
                                                        </div>
                                                    )}
                                                    <span
                                                        className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full"/>
                                                </div>

                                                <div className="flex-1 min-w-0">
                                                    <p className="font-semibold truncate">
                                                        {displayName}
                                                    </p>
                                                    <p className="text-sm text-gray-600">
                                                        Te ha enviado una solicitud de amistad
                                                    </p>
                                                </div>

                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        navigate('/friends');
                                                    }}
                                                    className="px-3 py-1.5 text-sm text-green-700 bg-green-50 rounded-lg cursor-pointer"
                                                >
                                                    Ver solicitud
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
