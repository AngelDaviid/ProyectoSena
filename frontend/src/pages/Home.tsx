import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import PostList from '../components/PostList';
import '../components/post.css';
import './Home.css';

const Home: React.FC = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const displayName =
        user?.profile?.name || user?.profile?.lastName
            ? `${user?.profile?.name ?? ''} ${user?.profile?.lastName ?? ''}`.trim()
            : user?.email ?? 'Usuario';

    return (
        <div className="home-container facebook-layout">
            <header className="home-header fb-header">
                <div className="fb-left">
                    <h1 className="fb-logo" onClick={() => navigate('/')}>SenaBook</h1>
                </div>

                <div className="fb-center">
                    <input
                        aria-label="Buscar"
                        className="fb-search"
                        placeholder="Buscar en SenaBook"
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                // por ahora búsqueda local / futura
                                // navigate('/search?q=' + encodeURIComponent((e.target as HTMLInputElement).value));
                            }
                        }}
                    />
                </div>

                <div className="fb-right">
                    <div className="fb-user">
                        <div className="avatar">
                            {user?.profile?.avatar ? (
                                <img src={user.profile.avatar} alt={displayName} />
                            ) : (
                                <div className="avatar-placeholder">{displayName.charAt(0)}</div>
                            )}
                        </div>
                        <span className="fb-username">{displayName}</span>
                        <button className="btn btn-logout" onClick={handleLogout}>
                            Cerrar sesión
                        </button>
                    </div>
                </div>
            </header>

            <main className="home-main fb-main">
                <aside className="fb-sidebar left-sidebar">
                    <div className="card profile-card">
                        <div className="profile-top">
                            <div className="avatar large">
                                {user?.profile?.avatar ? (
                                    <img src={user.profile.avatar} alt={displayName} />
                                ) : (
                                    <div className="avatar-placeholder large">{displayName.charAt(0)}</div>
                                )}
                            </div>
                            <div className="profile-info">
                                <strong>{displayName}</strong>
                                <div className="profile-role">{user?.role ?? ''}</div>
                            </div>
                        </div>

                        <nav className="profile-nav">
                            <button className="btn" onClick={() => navigate('/profile')}>Ver perfil</button>
                            <button className="btn" onClick={() => navigate('/friends')}>Amigos</button>
                            <button className="btn" onClick={() => navigate('/groups')}>Grupos</button>
                        </nav>
                    </div>
                </aside>

                <section className="fb-feed">
                    {/* Aquí insertamos el feed: el componente PostList ya incluye el form para crear posts */}
                    <PostList />
                </section>
            </main>

            <footer className="home-footer">
                <small>Proyecto SENA · Frontend — SenaBook</small>
            </footer>
        </div>
    );
};

export default Home;