import { useState, useEffect, useRef } from "react";
import { searchUsers, sendFriendRequest } from "../../services/friends.ts";
import type { User } from "../../types/user.type.ts";

const API_BASE = import.meta. env.VITE_SENA_API_URL || "http://localhost:3001";

function useDebounce(value: string, delay = 300) {
    const [debounced, setDebounced] = useState(value);
    useEffect(() => {
        const t = setTimeout(() => setDebounced(value), delay);
        return () => clearTimeout(t);
    }, [value, delay]);
    return debounced;
}

type FriendStatus = "friend" | "request_sent" | "request_received" | "none";

interface UserWithStatus extends User {
    friendStatus?: FriendStatus;
}

export default function NavbarSearch() {
    const [q, setQ] = useState("");
    const debouncedQ = useDebounce(q, 300);
    const [results, setResults] = useState<UserWithStatus[]>([]);
    const [loading, setLoading] = useState(false);
    const [sending, setSending] = useState<Record<number, boolean>>({});
    const wrapperRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (! debouncedQ) {
            setResults([]);
            return;
        }
        let cancelled = false;
        setLoading(true);
        searchUsers(debouncedQ)
            .then((res) => {
                if (!cancelled) {
                    const mapped = (res || []).map((u: any) => ({
                        ...(u as User),
                        friendStatus: (u as any).friendStatus ??  "none",
                    })) as UserWithStatus[];
                    setResults(mapped);
                }
            })
            .catch((err) => {
                console.error("Error buscando usuarios", err);
            })
            . finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [debouncedQ]);

    const onSendRequest = async (id: number) => {
        setSending((s) => ({ ...s, [id]: true }));
        try {
            await sendFriendRequest(id);
            setResults((r) => r.map((u) => (u.id === id ? { ...u, friendStatus: "request_sent" } : u)));
        } catch (e: any) {
            console.error("Error enviando solicitud", e);
            alert(e?. response?.data?.message || "Error al enviar solicitud");
        } finally {
            setSending((s) => ({ ...s, [id]: false }));
        }
    };

    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (!wrapperRef. current) return;
            if (! wrapperRef.current.contains(e.target as Node)) {
                setResults([]);
            }
        }
        document. addEventListener("click", handleClick);
        return () => document.removeEventListener("click", handleClick);
    }, []);

    return (
        <div ref={wrapperRef} className="relative w-full">
            <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar personas..."
                aria-label="Buscar personas"
                className="w-full px-3 sm:px-4 py-1. 5 sm:py-2 text-sm sm:text-base border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            {loading && (
                <div className="absolute left-2 top-2 text-xs text-gray-500">Buscando... </div>
            )}
            {results.length > 0 && (
                <ul className="absolute left-0 right-0 mt-2 bg-white border rounded-lg shadow-lg z-50 max-h-60 sm:max-h-96 overflow-y-auto">
                    {results.map((u) => (
                        <li key={u.id} className="flex gap-2 sm:gap-3 items-center p-2 sm:p-3 border-b hover:bg-gray-50 transition">
                            <img
                                src={u.profile?. avatar ?  (u.profile.avatar.startsWith("/") ? `${API_BASE}${u.profile.avatar}` : u.profile.avatar) : "/default.png"}
                                alt="avatar"
                                className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover flex-shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                                <div className="font-semibold text-xs sm:text-sm truncate">{u.profile?.name} {u.profile?.lastName}</div>
                                <div className="text-xs text-gray-600 truncate">{u.email}</div>
                            </div>
                            <div className="flex-shrink-0">
                                {u.friendStatus === "friend" && (
                                    <button disabled className="px-2 sm:px-3 py-1 text-xs sm:text-sm rounded bg-gray-100 text-gray-600">
                                        Amigos
                                    </button>
                                )}
                                {u.friendStatus === "request_sent" && (
                                    <button disabled className="px-2 sm:px-3 py-1 text-xs sm:text-sm rounded bg-gray-100 text-gray-600">
                                        Enviada
                                    </button>
                                )}
                                {u.friendStatus === "request_received" && (
                                    <button className="px-2 sm:px-3 py-1 text-xs sm:text-sm rounded bg-yellow-50 text-yellow-700 hover:bg-yellow-100">
                                        Responder
                                    </button>
                                )}
                                {u.friendStatus === "none" && (
                                    <button
                                        onClick={() => onSendRequest(u.id)}
                                        disabled={!! sending[u.id]}
                                        className="px-2 sm:px-3 py-1 text-xs sm:text-sm rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 transition"
                                    >
                                        {sending[u.id] ? "..." : "Agregar"}
                                    </button>
                                )}
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}