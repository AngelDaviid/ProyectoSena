import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import PostList from '../components/PostList';

const API_BASE = import.meta.env.SENA_API_URL || 'http://localhost:3001';

const Home: React.FC = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const displayName =
        user?.profile?.name || user?.profile?.lastName
            ? `${user?.profile?.name ?? ''} ${user?.profile?.lastName ?? ''}`.trim()
            : user?.email ?? 'Usuario';

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const resolveAvatar = (avatar?: string | null) => {
        if (!avatar) return null;
        return avatar.startsWith('/') ? `${API_BASE}${avatar}` : avatar;
    };

    const avatarSrc = resolveAvatar(user?.profile?.avatar ?? null);

    return (
        <div className="flex flex-col min-h-screen bg-gray-100">
            <header className="flex items-center justify-between px-6 py-3 bg-white shadow-md sticky top-0 z-50">
                <div className="flex items-center cursor-pointer" onClick={() => navigate('/')}>
                    <h1 className="text-2xl font-bold text-green-600">Sena Conecta</h1>
                </div>

                <div className="flex-1 mx-6">
                    <input
                        type="text"
                        aria-label="Buscar"
                        placeholder="Buscar en Sena Conecta..."
                        className="w-full px-4 py-2 border rounded-full focus:outline-none focus:ring-2 focus:ring-green-500"
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                            }
                        }}
                    />
                </div>

                {/* Dropdown */}
                <div className="relative" ref={dropdownRef}>
                    <button
                        onClick={() => setDropdownOpen(!dropdownOpen)}
                        className="flex items-center space-x-2 focus:outline-none"
                    >
                        {avatarSrc ? (
                            <img
                                src={avatarSrc}
                                alt={displayName}
                                className="w-10 h-10 rounded-full object-cover"
                            />
                        ) : (
                            <div className="w-10 h-10 rounded-full bg-green-200 flex items-center justify-center text-green-700 font-bold">
                                {displayName.charAt(0)}
                            </div>
                        )}
                        <span className="font-medium">{displayName}</span>
                    </button>

                    {dropdownOpen && (
                        <div className="absolute right-0 mt-2 w-40 bg-white shadow-lg z-50 rounded-md overflow-hidden">
                            <button
                                onClick={() => {
                                    navigate('/profile', { state: { user } });
                                    setDropdownOpen(false);
                                }}
                                className="w-full text-left px-4 py-2 hover:bg-green-100 transition"
                            >
                                Ver perfil
                            </button>
                            <button
                                onClick={handleLogout}
                                className="w-full text-left px-4 py-2 hover:bg-red-100 text-red-600 transition"
                            >
                                Cerrar sesión
                            </button>
                        </div>
                    )}
                </div>
            </header>

            {/* Main Content */}
            <main className="flex flex-1 p-6 gap-6">
                {/* Sidebar */}
                <aside className="w-72 flex-shrink-0">
                    <div className="bg-white rounded-lg shadow p-4">
                        <div className="flex items-center mb-4 space-x-4">
                            {avatarSrc ? (
                                <img
                                    src={avatarSrc}
                                    alt={displayName}
                                    className="w-16 h-16 rounded-full object-cover"
                                />
                            ) : (
                                <div className="w-16 h-16 rounded-full bg-green-200 flex items-center justify-center text-green-700 font-bold text-xl">
                                    {displayName.charAt(0)}
                                </div>
                            )}
                            <div>
                                <strong className="block text-lg">{displayName}</strong>
                                <span className="text-sm text-gray-500">{user?.role ?? ''}</span>
                            </div>
                        </div>

                        <nav className="flex flex-col space-y-2">
                            <button
                                onClick={() => navigate('/profile', { state: { user } })}
                                className="w-full text-left px-3 py-2 rounded hover:bg-green-100 transition"
                            >
                                Ver perfil
                            </button>
                            <button
                                onClick={() => navigate('/friends')}
                                className="w-full text-left px-3 py-2 rounded hover:bg-green-100 transition"
                            >
                                Amigos
                            </button>
                            <button
                                onClick={() => navigate('/groups')}
                                className="w-full text-left px-3 py-2 rounded hover:bg-green-100 transition"
                            >
                                Grupos
                            </button>
                        </nav>
                    </div>
                </aside>

                {/* Feed */}
                <section className="flex-1">
                    <PostList />
                </section>
            </main>

            {/* Footer */}
            <footer className="h-16 bg-green-600 flex items-center justify-center text-white font-medium">
                © {new Date().getFullYear()} SenaBook
            </footer>
        </div>
    );
};

export default Home;