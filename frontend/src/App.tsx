import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Logins';
import Register from './pages/Register';
import Home from './pages/Home';
import Profile from './pages/Profile';
import ChatPage from './pages/Chat.tsx';
import NotificationsPage from './components/notifications.tsx';
import FriendsPage from './pages/Friends.tsx';
import EventsPage from './pages/Events.tsx';
import EventForm from './components/Events/event-form.tsx';
import EventDetail from './components/Events/events-details.tsx';
import AuthProvider from './context/auth-provider.tsx';
import { SocketProvider } from './context/socket-provider.tsx';
import { EventNotificationsProvider } from './context/event-notifications-context.tsx';
import { ChatNotificationsProvider } from './context/chat-notifications-context.tsx';
import ChatNotificationToast from './components/Chat/chat-notification-toast.tsx';
import ProtectedRoute from "./components/protected-routes.tsx";
import RoleProtectedRoute from "./components/role-protected-route.tsx";
import { ToastProvider } from "./components/toast-context.tsx";
import EditEvent from "./pages/Edit-events.tsx";

function App() {
    return (
        <AuthProvider>
            <SocketProvider>
                <EventNotificationsProvider>
                    <ChatNotificationsProvider>
                        <ChatNotificationToast />
                        <ToastProvider>
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
                                }
                            />

                            <Route
                                path="/events/:id"
                                element={
                                    <ProtectedRoute>
                                        <EventDetail />
                                    </ProtectedRoute>
                                }
                            />

                            <Route
                                path="/events/create"
                                element={
                                    <ProtectedRoute>
                                        <RoleProtectedRoute allowedRoles={['instructor', 'desarrollador']}>
                                            <EventForm />
                                        </RoleProtectedRoute>
                                    </ProtectedRoute>
                                }
                            />

                            <Route
                                path="/events/edit/:id"
                                element={
                                    <ProtectedRoute>
                                        <RoleProtectedRoute allowedRoles={['instructor', 'desarrollador']}>
                                            <EditEvent />
                                        </RoleProtectedRoute>
                                    </ProtectedRoute>
                                }
                            />

                            <Route path="/notifications" element={<NotificationsPage />} />
                            <Route path="/friends" element={<FriendsPage />} />

                            <Route path="*" element={<Navigate to="/" replace />} />
                        </Routes>
                        </ToastProvider>
                    </ChatNotificationsProvider>
                </EventNotificationsProvider>
            </SocketProvider>
        </AuthProvider>
    );
}

export default App;