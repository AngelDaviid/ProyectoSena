import { useState, useEffect, useRef } from "react";
import { searchUsers, sendFriendRequest } from "../../services/friends.ts";
import type { User } from "../../types/user.type.ts";

const API_BASE = import.meta.env.VITE_SENA_API_URL || "http://localhost:3001";

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
        if (!debouncedQ) {
            setResults([]);
            return;
        }
        let cancelled = false;
        setLoading(true);
        searchUsers(debouncedQ)
            .then((res) => {
                if (!cancelled) {
                    // Backend puede devolver users anotados con friendStatus (si lo implementaste).
                    // Si no, asumimos 'none'.
                    const mapped = (res || []).map((u: any) => ({
                        ...(u as User),
                        friendStatus: (u as any).friendStatus ?? "none",
                    })) as UserWithStatus[];
                    setResults(mapped);
                }
            })
            .catch((err) => {
                console.error("Error buscando usuarios", err);
            })
            .finally(() => {
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
            alert(e?.response?.data?.message || "Error al enviar solicitud");
        } finally {
            setSending((s) => ({ ...s, [id]: false }));
        }
    };

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (!wrapperRef.current) return;
            if (!wrapperRef.current.contains(e.target as Node)) {
                setResults([]);
            }
        }
        document.addEventListener("click", handleClick);
        return () => document.removeEventListener("click", handleClick);
    }, []);

    return (
        <div ref={wrapperRef} style={{ position: "relative" }}>
            <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar personas..."
                aria-label="Buscar personas"
                className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            {loading && <div className="absolute left-2 top-2 text-xs text-gray-500">Buscando...</div>}
            {results.length > 0 && (
                <ul className="search-dropdown" style={{ position: "absolute", zIndex: 50, background: "#fff", width: "100%", boxShadow: "0 2px 10px rgba(0,0,0,0.08)", maxHeight: 360, overflowY: "auto", borderRadius: 6 }}>
                    {results.map((u) => (
                        <li key={u.id} style={{ display: "flex", gap: 8, alignItems: "center", padding: 8, borderBottom: "1px solid #f0f0f0" }}>
                            <img
                                src={u.profile?.avatar ? (u.profile.avatar.startsWith("/") ? `${API_BASE}${u.profile.avatar}` : u.profile.avatar) : "/default.png"}
                                alt="avatar"
                                width={40}
                                height={40}
                                className="rounded-full object-cover"
                            />
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 600 }}>{u.profile?.name} {u.profile?.lastName}</div>
                                <div style={{ fontSize: 12, color: "#666" }}>{u.email}</div>
                            </div>
                            <div>
                                {u.friendStatus === "friend" && <button disabled className="px-3 py-1 rounded bg-gray-100">Amigos</button>}
                                {u.friendStatus === "request_sent" && <button disabled className="px-3 py-1 rounded bg-gray-100">Enviada</button>}
                                {u.friendStatus === "request_received" && <button className="px-3 py-1 rounded bg-yellow-50" onClick={() => {/* podrías abrir modal de solicitudes */}}>Responder</button>}
                                {u.friendStatus === "none" && (
                                    <button onClick={() => onSendRequest(u.id)} disabled={!!sending[u.id]} className="px-3 py-1 rounded bg-green-600 text-white">
                                        {sending[u.id] ? "Enviando..." : "Agregar"}
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