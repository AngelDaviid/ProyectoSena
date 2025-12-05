import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import PostList from "../components/Posts/PostList.tsx";
import NavbarSearch from "../components/Navbar/NavbarSearch.tsx";
import NavbarNotifications from '../components/Navbar/NavbarNotifications.tsx';
import { Calendar, ArrowRight, Sparkles, Users, MessageCircle, Menu, X } from 'lucide-react';

const API_BASE = import.meta.env.VITE_SENA_API_URL || "http://localhost:3001";

const Home: React.FC = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const displayName = user?.profile?.name || user?.email?. split("@")[0] || "Usuario";
    const avatarSrc = user?.profile?.avatar
        ? user.profile.avatar. startsWith("/")
            ? `${API_BASE}${user.profile.avatar}`
            : user.profile.avatar
        : null;

    // ✅ Bloquear scroll cuando el sidebar está abierto
    useEffect(() => {
        if (mobileMenuOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style. overflow = 'unset';
        }

        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [mobileMenuOpen]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setDropdownOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div className="min-h-screen grid grid-rows-[auto_1fr_auto] bg-gray-100">
            {/* ✅ HEADER RESPONSIVE */}
            <header className="flex items-center justify-between bg-white shadow-md px-4 sm:px-6 lg:px-8 py-3 sm:py-4 sticky top-0 z-50">
                <h1
                    onClick={() => navigate("/")}
                    className="text-xl sm:text-2xl font-bold text-green-600 cursor-pointer hover:text-green-700 transition-colors"
                >
                    Sena Conecta
                </h1>

                {/* Search bar - Hidden on mobile, visible on tablet+ */}
                <div className="hidden md:block w-full md:w-2/5 lg:w-2/4 mx-4">
                    <NavbarSearch />
                </div>

                <div className="flex items-center gap-2 sm:gap-4">
                    {/* Notifications - visible on all screens */}
                    <NavbarNotifications />

                    {/* Desktop menu */}
                    <div ref={dropdownRef} className="hidden sm:block relative">
                        <button
                            onClick={() => setDropdownOpen(!dropdownOpen)}
                            className="flex items-center gap-2 sm:gap-3 hover:bg-gray-50 px-2 sm:px-3 py-2 rounded-lg transition-colors"
                        >
                            {avatarSrc ?  (
                                <img
                                    src={avatarSrc}
                                    alt={displayName}
                                    className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover ring-2 ring-green-500 ring-offset-2"
                                />
                            ) : (
                                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-green-200 flex items-center justify-center text-green-700 font-semibold ring-2 ring-green-500 ring-offset-2 text-sm sm:text-base">
                                    {displayName. charAt(0). toUpperCase()}
                                </div>
                            )}
                            <span className="hidden lg:block font-medium text-gray-700 text-sm sm:text-base">{displayName}</span>
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

                    {/* Mobile hamburger menu */}
                    <button
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        className="sm:hidden p-2 text-gray-700 hover:bg-gray-100 rounded-lg"
                    >
                        {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                    </button>
                </div>
            </header>

            {/* ✅ MOBILE SIDEBAR - SIN TÍTULO */}
            {mobileMenuOpen && (
                <div className="fixed inset-0 z-50 sm:hidden">
                    {/* ✅ Sidebar desde la derecha, sin overlay negro */}
                    <div
                        className="absolute right-0 top-0 h-full w-80 max-w-[85vw] bg-white shadow-2xl flex flex-col"
                    >
                        {/* Header fijo - SOLO BOTÓN CERRAR */}
                        <div className="flex items-center justify-end p-6 border-b border-gray-200 flex-shrink-0">
                            <button
                                onClick={() => setMobileMenuOpen(false)}
                                className="p-2 hover:bg-gray-100 rounded-full transition"
                            >
                                <X className="w-6 h-6 text-gray-600" />
                            </button>
                        </div>

                        {/* Contenido scrolleable */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            {/* User info */}
                            <div className="flex items-center gap-3 pb-6 border-b border-gray-200">
                                {avatarSrc ? (
                                    <img src={avatarSrc} alt={displayName} className="w-14 h-14 rounded-full object-cover ring-2 ring-green-500 ring-offset-2" />
                                ) : (
                                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white font-bold text-xl ring-2 ring-green-500 ring-offset-2">
                                        {displayName. charAt(0).toUpperCase()}
                                    </div>
                                )}
                                <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-gray-900 truncate">{displayName}</p>
                                    <p className="text-sm text-gray-500">{user?.role || "Aprendiz"}</p>
                                </div>
                            </div>

                            {/* ✅ SOLO VER PERFIL Y CERRAR SESIÓN */}
                            <div className="space-y-2">
                                <button
                                    onClick={() => {
                                        navigate("/profile", { state: { user } });
                                        setMobileMenuOpen(false);
                                    }}
                                    className="w-full text-left px-4 py-3 hover:bg-gray-50 rounded-lg transition-colors text-gray-700 font-medium flex items-center gap-3"
                                >
                                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                    </svg>
                                    Ver perfil
                                </button>

                                <button
                                    onClick={() => {
                                        logout();
                                        setMobileMenuOpen(false);
                                    }}
                                    className="w-full text-left px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium flex items-center gap-3 border-t border-gray-200 mt-4 pt-4"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                    </svg>
                                    Cerrar sesión
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* ✅ Overlay transparente para cerrar al hacer click fuera */}
                    <div
                        className="absolute inset-0 -z-10"
                        onClick={() => setMobileMenuOpen(false)}
                    />
                </div>
            )}

            {/* ✅ MAIN GRID RESPONSIVE */}
            <main className="grid grid-cols-1 lg:grid-cols-[280px_1fr] xl:grid-cols-[320px_1fr] gap-4 sm:gap-6 lg:gap-8 px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
                {/* ✅ SIDEBAR - Hidden on mobile, sticky on desktop */}
                <aside className="hidden lg:block space-y-6">
                    <div className="sticky top-24 space-y-6">
                        {/* Profile Card */}
                        <div className="bg-white rounded-xl shadow-lg p-4 lg:p-6 border border-gray-100">
                            <div className="flex items-center gap-3 lg:gap-4 mb-4 lg:mb-6">
                                {avatarSrc ? (
                                    <img
                                        src={avatarSrc}
                                        alt={displayName}
                                        className="w-12 h-12 lg:w-16 lg:h-16 rounded-full object-cover ring-2 ring-green-500 ring-offset-2"
                                    />
                                ) : (
                                    <div className="w-12 h-12 lg:w-16 lg:h-16 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white font-bold text-lg lg:text-2xl shadow-lg">
                                        {displayName.charAt(0).toUpperCase()}
                                    </div>
                                )}
                                <div className="flex-1 min-w-0">
                                    <strong className="text-base lg:text-lg block text-gray-900 truncate">{displayName}</strong>
                                    <span className="text-gray-500 text-xs lg:text-sm">{user?.role || "Aprendiz"}</span>
                                </div>
                            </div>

                            <div className="grid gap-2 lg:gap-3">
                                <button
                                    onClick={() => navigate("/friends")}
                                    className="w-full text-left cursor-pointer px-3 lg:px-4 py-2 lg:py-3 hover:bg-green-50 transition-all rounded-lg flex items-center gap-2 lg:gap-3 group border border-transparent hover:border-green-200"
                                >
                                    <Users className="w-4 h-4 lg:w-5 lg:h-5 text-green-600 group-hover:scale-110 transition-transform" />
                                    <span className="font-medium text-sm lg:text-base text-gray-700 group-hover:text-green-700">Amigos</span>
                                </button>
                                <button
                                    onClick={() => navigate("/chat")}
                                    className="w-full text-left cursor-pointer px-3 lg:px-4 py-2 lg:py-3 hover:bg-blue-50 transition-all rounded-lg flex items-center gap-2 lg:gap-3 group border border-transparent hover:border-blue-200"
                                >
                                    <MessageCircle className="w-4 h-4 lg:w-5 lg:h-5 text-blue-600 group-hover:scale-110 transition-transform" />
                                    <span className="font-medium text-sm lg:text-base text-gray-700 group-hover:text-blue-700">Chat</span>
                                </button>
                            </div>
                        </div>

                        {/* EVENTOS CARD */}
                        <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl shadow-xl p-4 lg:p-6 text-white relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -mr-10 -mt-10"></div>
                            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white opacity-10 rounded-full -ml-8 -mb-8"></div>

                            <div className="relative z-10">
                                <div className="flex items-center justify-center w-12 h-12 lg:w-16 lg:h-16 bg-white bg-opacity-20 rounded-full mb-3 lg:mb-4 backdrop-blur-sm">
                                    <Calendar className="w-6 h-6 lg:w-8 lg:h-8 text-white animate-pulse" />
                                </div>

                                <h3 className="text-lg lg:text-xl font-bold mb-2 flex items-center gap-2">
                                    Eventos SENA
                                    <Sparkles className="w-4 h-4 lg:w-5 lg:h-5 animate-pulse" />
                                </h3>

                                <p className="text-green-50 text-xs lg:text-sm mb-4 lg:mb-5 leading-relaxed">
                                    Descubre talleres, conferencias y actividades exclusivas para la comunidad
                                </p>

                                <button
                                    onClick={() => navigate("/events")}
                                    className="w-full bg-white text-green-600 font-semibold py-2 lg:py-3 px-3 lg:px-4 rounded-xl hover:bg-green-50 transition-all transform hover:scale-105 hover:shadow-lg flex items-center justify-center gap-2 group text-sm lg:text-base"
                                >
                                    <span>Explorar Eventos</span>
                                    <ArrowRight className="w-4 h-4 lg:w-5 lg:h-5 group-hover:translate-x-1 transition-transform" />
                                </button>

                                <div className="mt-3 lg:mt-4 flex items-center justify-center gap-2 text-xs text-green-100">
                                    <span className="w-2 h-2 bg-green-300 rounded-full animate-pulse"></span>
                                    <span>Nuevos eventos disponibles</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </aside>

                {/* ✅ POSTS SECTION - Full width on mobile, adjusted on desktop */}
                <section className="bg-white rounded-xl shadow-lg p-4 sm:p-6 border border-gray-100">
                    <PostList />
                </section>
            </main>

            {/* ✅ FLOATING ACTION BUTTONS - Only visible on mobile */}
            <div className="lg:hidden fixed bottom-4 right-4 flex flex-col gap-3 z-30">
                <button
                    onClick={() => navigate("/events")}
                    className="w-14 h-14 bg-green-600 rounded-full shadow-lg flex items-center justify-center text-white hover:bg-green-700 transition-all hover:scale-110 active:scale-95"
                    aria-label="Eventos"
                >
                    <Calendar className="w-6 h-6" />
                </button>
                <button
                    onClick={() => navigate("/chat")}
                    className="w-14 h-14 bg-blue-600 rounded-full shadow-lg flex items-center justify-center text-white hover:bg-blue-700 transition-all hover:scale-110 active:scale-95"
                    aria-label="Chat"
                >
                    <MessageCircle className="w-6 h-6" />
                </button>
                <button
                    onClick={() => navigate("/friends")}
                    className="w-14 h-14 bg-purple-600 rounded-full shadow-lg flex items-center justify-center text-white hover:bg-purple-700 transition-all hover:scale-110 active:scale-95"
                    aria-label="Amigos"
                >
                    <Users className="w-6 h-6" />
                </button>
            </div>
        </div>
    );
};

export default Home;