import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Logins';
import Register from './pages/Register';
import ProtectedRoute from './components/protected-routes';
import Home from './pages/Home';

function App() {
    return (
        <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            <Route
                path="/"
                element={
                    <ProtectedRoute>
                        <Home />
                    </ProtectedRoute>
                }
            />

            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}

export default App;