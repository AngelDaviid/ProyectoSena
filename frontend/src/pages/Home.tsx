import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import PostList from "../components/Posts/PostList.tsx";
import NavbarSearch from "../components/Navbar/NavbarSearch.tsx";
import NavbarNotifications from '../components/Navbar/NavbarNotifications.tsx';
import { Calendar, ArrowRight, Sparkles, Users, MessageCircle } from 'lucide-react';

const API_BASE = import.meta.env.VITE_SENA_API_URL || "http://localhost:3001";

const Home: React.FC = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const [dropdownOpen, setDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const displayName = user?.profile?.name || user?.email?.split("@")[0] || "Usuario";
    const avatarSrc = user?.profile?.avatar
        ? user.profile.avatar. startsWith("/")
            ? `${API_BASE}${user.profile.avatar}`
            : user.profile.avatar
        : null;

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event. target as Node)) {
                setDropdownOpen(false);
            }
        };

        document. addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div className="min-h-screen grid grid-rows-[auto_1fr_auto] bg-gray-100">
            {/* HEADER */}
            <header className="flex items-center justify-between bg-white shadow-md px-8 py-4 sticky top-0 z-50">
                <h1
                    onClick={() => navigate("/")}
                    className="text-2xl font-bold text-green-600 cursor-pointer hover:text-green-700 transition-colors"
                >
                    Sena Conecta
                </h1>

                <div className="w-2/4">
                    <NavbarSearch />
                </div>

                <div className="flex items-center gap-4">
                    <NavbarNotifications />

                    <div ref={dropdownRef} className="relative">
                        <button
                            onClick={() => setDropdownOpen(!dropdownOpen)}
                            className="flex items-center gap-3 hover:bg-gray-50 px-3 py-2 rounded-lg transition-colors"
                        >
                            {avatarSrc ?  (
                                <img
                                    src={avatarSrc}
                                    alt={displayName}
                                    className="w-10 h-10 rounded-full object-cover ring-2 ring-green-500 ring-offset-2"
                                />
                            ) : (
                                <div className="w-10 h-10 rounded-full bg-green-200 flex items-center justify-center text-green-700 font-semibold ring-2 ring-green-500 ring-offset-2">
                                    {displayName.charAt(0). toUpperCase()}
                                </div>
                            )}
                            <span className="font-medium text-gray-700">{displayName}</span>
                            <svg
                                className={`w-4 h-4 text-gray-500 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`}
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>

                        {dropdownOpen && (
                            <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-xl overflow-hidden animate-fade-in">
                                <button
                                    onClick={() => {
                                        navigate("/profile", { state: { user } });
                                        setDropdownOpen(false);
                                    }}
                                    className="block w-full text-left px-4 py-3 hover:bg-green-50 transition-colors text-gray-700 font-medium"
                                >
                                    Ver perfil
                                </button>
                                <button
                                    onClick={() => logout()}
                                    className="block w-full text-left px-4 py-3 text-red-600 hover:bg-red-50 transition-colors font-medium border-t border-gray-100"
                                >
                                    Cerrar sesión
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            {/* MAIN GRID */}
            <main className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-8 px-4 lg:px-8 py-6">
                {/* SIDEBAR */}
                <aside className="space-y-6">
                    {/* Profile Card */}
                    <div className="bg-white rounded-xl shadow-lg p-6 h-fit sticky top-24 border border-gray-100">
                        <div className="flex items-center gap-4 mb-6">
                            {avatarSrc ? (
                                <img
                                    src={avatarSrc}
                                    alt={displayName}
                                    className="w-16 h-16 rounded-full object-cover ring-2 ring-green-500 ring-offset-2"
                                />
                            ) : (
                                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white font-bold text-2xl shadow-lg">
                                    {displayName.charAt(0).toUpperCase()}
                                </div>
                            )}
                            <div className="flex-1 min-w-0">
                                <strong className="text-lg block text-gray-900 truncate">{displayName}</strong>
                                <span className="text-gray-500 text-sm">{user?.role ??  "Aprendiz"}</span>
                            </div>
                        </div>

                        <div className="grid gap-3">
                            <button
                                onClick={() => navigate("/friends")}
                                className="w-full text-left cursor-pointer px-4 py-3 hover:bg-green-50 transition-all rounded-lg flex items-center gap-3 group border border-transparent hover:border-green-200"
                            >
                                <Users className="w-5 h-5 text-green-600 group-hover:scale-110 transition-transform" />
                                <span className="font-medium text-gray-700 group-hover:text-green-700">Amigos</span>
                            </button>
                            <button
                                onClick={() => navigate("/chat")}
                                className="w-full text-left cursor-pointer px-4 py-3 hover:bg-blue-50 transition-all rounded-lg flex items-center gap-3 group border border-transparent hover:border-blue-200"
                            >
                                <MessageCircle className="w-5 h-5 text-blue-600 group-hover:scale-110 transition-transform" />
                                <span className="font-medium text-gray-700 group-hover:text-blue-700">Chat</span>
                            </button>
                        </div>
                    </div>

                    {/* EVENTOS CARD */}
                    <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl shadow-xl p-6 text-white relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -mr-10 -mt-10"></div>
                        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white opacity-10 rounded-full -ml-8 -mb-8"></div>

                        <div className="relative z-10">
                            <div className="flex items-center justify-center w-16 h-16 bg-white bg-opacity-20 rounded-full mb-4 backdrop-blur-sm">
                                <Calendar className="w-8 h-8 text-white animate-pulse" />
                            </div>

                            <h3 className="text-xl font-bold mb-2 flex items-center gap-2">
                                Eventos SENA
                                <Sparkles className="w-5 h-5 animate-pulse" />
                            </h3>

                            <p className="text-green-50 text-sm mb-5 leading-relaxed">
                                Descubre talleres, conferencias y actividades exclusivas para la comunidad
                            </p>

                            <button
                                onClick={() => navigate("/events")}
                                className="w-full bg-white text-green-600 font-semibold py-3 px-4 rounded-xl hover:bg-green-50 transition-all transform hover:scale-105 hover:shadow-lg flex items-center justify-center gap-2 group"
                            >
                                <span>Explorar Eventos</span>
                                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </button>

                            <div className="mt-4 flex items-center justify-center gap-2 text-xs text-green-100">
                                <span className="w-2 h-2 bg-green-300 rounded-full animate-pulse"></span>
                                <span>Nuevos eventos disponibles</span>
                            </div>
                        </div>
                    </div>
                </aside>

                {/* POSTS SECTION */}
                <section className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
                    <PostList />
                </section>
            </main>
        </div>
    );
};

export default Home;