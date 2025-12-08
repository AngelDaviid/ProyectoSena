import { useState, useEffect, useRef } from "react";
import { searchUsers, sendFriendRequest } from "../../services/friends";
import type { User } from "../../types/user.type";

const API_BASE = import.meta.env.VITE_SENA_API_URL || "http://localhost:3001";

/* ----------------------------- utils ----------------------------- */
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

/* --------------------------- component --------------------------- */
export default function NavbarSearch() {
    const [q, setQ] = useState("");
    const [focused, setFocused] = useState(false);
    const [results, setResults] = useState<UserWithStatus[]>([]);
    const [loading, setLoading] = useState(false);
    const [sending, setSending] = useState<Record<number, boolean>>({});
    const wrapperRef = useRef<HTMLDivElement>(null);

    const debouncedQ = useDebounce(q, 300);

    const showDropdown =
        focused && (results.length > 0 || (!loading && debouncedQ));

    /* --------------------------- helpers --------------------------- */
    const getInitials = (name?: string, lastName?: string, email?: string) => {
        if (name && lastName)
            return `${name[0]}${lastName[0]}`.toUpperCase();
        return (name?.[0] || email?.[0] || "?").toUpperCase();
    };

    const getColorFromName = (seed = "") => {
        const colors = [
            "bg-blue-500",
            "bg-green-500",
            "bg-purple-500",
            "bg-pink-500",
            "bg-indigo-500",
            "bg-yellow-500",
            "bg-red-500",
            "bg-teal-500",
            "bg-orange-500",
            "bg-cyan-500",
        ];
        return colors[seed.charCodeAt(0) % colors.length];
    };

    /* ------------------------- search logic ------------------------- */
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
                    setResults(
                        (res || []).map((u: any) => ({
                            ...(u as User),
                            friendStatus: u.friendStatus ?? "none",
                        }))
                    );
                }
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [debouncedQ]);

    /* -------------------------- send request ------------------------- */
    const onSendRequest = async (id: number) => {
        setSending((s) => ({ ...s, [id]: true }));
        try {
            await sendFriendRequest(id);
            setResults((r) =>
                r.map((u) =>
                    u.id === id ? { ...u, friendStatus: "request_sent" } : u
                )
            );
        } finally {
            setSending((s) => ({ ...s, [id]: false }));
        }
    };

    /* ---------------------- click outside ---------------------- */
    useEffect(() => {
        const onClick = (e: MouseEvent) => {
            if (!wrapperRef.current?.contains(e.target as Node)) {
                setFocused(false);
            }
        };
        document.addEventListener("mousedown", onClick);
        return () => document.removeEventListener("mousedown", onClick);
    }, []);

    /* ----------------------------- JSX ----------------------------- */
    return (
        <div ref={wrapperRef} className="relative w-full max-w-md">
            {/* INPUT */}
            <div className="relative">
        <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </span>

                <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    onFocus={() => setFocused(true)}
                    placeholder="Buscar personas..."
                    className="w-full pl-10 pr-9 py-2 border rounded-lg bg-white  text-sm focus:ring-2 focus:ring-green-500 transition"
                />
            </div>

            {/* DROPDOWN */}
            <div
                className={`
          absolute inset-x-0 mt-2 z-50
          transition-all duration-200 ease-out origin-top
          ${showDropdown
                    ? "opacity-100 translate-y-0 scale-100"
                    : "opacity-0 -translate-y-2 scale-95 pointer-events-none"}
        `}
            >
                {/* RESULTS */}
                {results.length > 0 ? (
                    <div className="bg-white  rounded-xl shadow-2xl border overflow-hidden">
                        <ul className="max-h-96 overflow-y-auto divide-y">
                            {results.map((u) => {
                                const name = u.profile?.name || "";
                                const lastName = u.profile?.lastName || "";
                                const email = u.email || "";
                                const display = `${name} ${lastName}`.trim() || email;
                                const avatar = u.profile?.avatar;
                                const avatarUrl =
                                    avatar && avatar.startsWith("/")
                                        ? `${API_BASE}${avatar}`
                                        : avatar;

                                return (
                                    <li key={u.id} className="flex items-center gap-3 p-3 hover:bg-gray-50 transition">
                                        {avatarUrl ? (
                                            <img src={avatarUrl} className="w-10 h-10 rounded-full object-cover" />
                                        ) : (
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white ${getColorFromName(display)}`}>
                                                {getInitials(name, lastName, email)}
                                            </div>
                                        )}

                                        {/* INFO */}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold truncate">{display}</p>
                                            <p className="text-xs text-gray-500 truncate">{email}</p>
                                        </div>

                                        {/* ACTION */}
                                        {u.friendStatus === "none" && (
                                            <button
                                                onClick={() => onSendRequest(u.id)}
                                                disabled={sending[u.id]}
                                                className="px-3 py-1.5 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                                            >
                                                Agregar
                                            </button>
                                        )}

                                        {u.friendStatus === "request_sent" && (
                                            <span className="text-xs text-gray-400">Enviada</span>
                                        )}
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                ) : (
                    !loading && debouncedQ && (
                        <div className="bg-white  rounded-xl shadow p-6 text-center text-sm text-gray-500">
                            No se encontraron resultados
                        </div>
                    )
                )}
            </div>
        </div>
    );
}
