export interface Profile {
    name: string;
    lastName: string;
    avatar?: string;
}

export interface User {
    id: number;
    email: string;
    profile?: Profile;
    role?: 'desarrollador' | 'instructor' | 'aprendiz';
}

export interface AuthResponse {
    access_token: string;
    user: User;
}