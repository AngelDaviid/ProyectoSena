import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Logins';
import Register from './pages/Register';
import ProtectedRoute from './components/Protected-routes.tsx';
import Home from './pages/Home';
import Profile from './pages/Profile';
import ChatPage from "./pages/Chat.tsx";
import NotificationsPage from "./components/Notifications.tsx";
import FriendsPage from "./pages/Friends.tsx";
import EventsPage from "./pages/Events.tsx";

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

            <Route
                path="/profile"
                element={
                    <ProtectedRoute>
                        <Profile />
                    </ProtectedRoute>
                }
            />

            <Route
                path="/chat"
                element={
                    <ProtectedRoute>
                        <ChatPage />
                    </ProtectedRoute>
                }
            />

            <Route
                path="/events"
                element={
                    <ProtectedRoute>
                        <EventsPage />
                    </ProtectedRoute>
            } />
            <Route
                path="/events/:id"
                element={
                <ProtectedRoute>
                    <EventDetail />
                </ProtectedRoute>}
            />

            <Route
                path="/events/create"
                element={
                <ProtectedRoute>
                    <EventForm />
                </ProtectedRoute>}
            />
            <Route
                path="/events/edit/:id"
                element={
                <ProtectedRoute>
                    <EventForm />
                </ProtectedRoute>}
            />

            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/friends" element={<FriendsPage />} />

            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}

export default App;