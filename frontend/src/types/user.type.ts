export interface Profile {
    name?: string;
    lastName?: string;
    avatar?: string | null;
}

export type Role = 'desarrollador' | 'instructor' | 'aprendiz';

export interface User {
    id: number;
    email?: string;
    profile?: Profile;
    role?: Role;
    createdAt?: string;
    updatedAt?: string;

    // Opcional, útil para UI
    friends?: User[];        // lista de amigos (puede venir solo con id y profile)
    blockedUsers?: User[];   // lista de usuarios bloqueados (opcional)
}