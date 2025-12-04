import { useAuth } from './useAuth';

export function usePermissions() {
    const { user } = useAuth();

    return {
        canCreatePost: !!user,
        canEditPost: (postOwnerId?: number) =>
            user?.role === 'desarrollador' || user?.id === postOwnerId,
        canDeletePost: (postOwnerId?: number) =>
            user?.role === 'desarrollador' || user?.id === postOwnerId,

        canCreateEvent: user?.role === 'instructor' || user?.role === 'desarrollador',
        canEditEvent: (eventOwnerId?: number) =>
            user?.role === 'desarrollador' || user?.id === eventOwnerId,
        canDeleteEvent: (eventOwnerId?: number) =>
            user?.role === 'desarrollador' || user?.id === eventOwnerId,

        canEditComment: (commentOwnerId?: number) =>
            user?.role === 'desarrollador' || user?.id === commentOwnerId,
        canDeleteComment: (commentOwnerId?: number) =>
            user?.role === 'desarrollador' || user?.id === commentOwnerId,

        canDeleteAnyPost: user?.role === 'desarrollador',
        canDeleteAnyComment: user?.role === 'desarrollador',
        canDeleteAnyEvent: user?.role === 'desarrollador',

        isSuperAdmin: user?.role === 'desarrollador',
        isInstructor: user?.role === 'instructor',
        isAprendiz: user?.role === 'aprendiz',

        getRoleName: () => {
            switch (user?.role) {
                case 'desarrollador':
                    return 'Desarrollador';
                case 'instructor':
                    return 'Instructor';
                case 'aprendiz':
                    return 'Aprendiz';
                default:
                    return 'Usuario';
            }
        },

        getRoleColor: () => {
            switch (user?.role) {
                case 'desarrollador':
                    return 'bg-gradient-to-r from-purple-600 to-pink-600 text-white';
                case 'instructor':
                    return 'bg-blue-100 text-blue-800';
                case 'aprendiz':
                    return 'bg-green-100 text-green-800';
                default:
                    return 'bg-gray-100 text-gray-800';
            }
        },

        getRoleIcon: () => {
            switch (user?.role) {
                case 'desarrollador':
                    return '👑';
                case 'instructor':
                    return '👨‍🏫';
                case 'aprendiz':
                    return '🎓';
                default:
                    return '👤';
            }
        },

        getRoleBadgeClass: () => {
            switch (user?.role) {
                case 'desarrollador':
                    return 'inline-flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-full text-xs font-bold shadow-lg animate-pulse';
                case 'instructor':
                    return 'inline-flex items-center gap-1.5 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium';
                case 'aprendiz':
                    return 'inline-flex items-center gap-1.5 px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium';
                default:
                    return 'inline-flex items-center gap-1.5 px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-medium';
            }
        },
    };
}