import { useNavigate } from 'react-router-dom';
import { useAuth } from "../hooks/useAuth.ts";
import "./Home.css"

const Home = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <div className="home-container">
            <header className="home-header">
                <h1>Bienvenido{user?.name ? `, ${user.name}` : ''}!</h1>
                <div className="home-actions">
                    <button className="btn btn-logout" onClick={handleLogout}>
                        Cerrar sesión
                    </button>
                </div>
            </header>

            <main className="home-main">
                <section className="card welcome-card">
                    <h2>Inicio</h2>
                    <p>
                        Esta es la página principal de la aplicación. Aquí puedes ver accesos
                        rápidos a las secciones principales y la información básica de tu cuenta.
                    </p>
                </section>

                <section className="cards-grid">
                    <article className="card">
                        <h3>Mi perfil</h3>
                        <p>Ver y editar la información de tu cuenta.</p>
                        <button className="btn" onClick={() => navigate('/profile')}>
                            Ir al perfil
                        </button>
                    </article>

                    <article className="card">
                        <h3>Registros</h3>
                        <p>Gestiona registros, entradas o lo que necesites en tu proyecto.</p>
                        <button className="btn" onClick={() => navigate('/register')}>
                            Registrar
                        </button>
                    </article>

                    <article className="card">
                        <h3>Productos / Servicios</h3>
                        <p>Accede a la lista principal de elementos de la app.</p>
                        <button className="btn" onClick={() => navigate('/items')}>
                            Ver lista
                        </button>
                    </article>
                </section>
            </main>

            <footer className="home-footer">
                <small>Proyecto SENA · Frontend</small>
            </footer>
        </div>
    );
};

export default Home;