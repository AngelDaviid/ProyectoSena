export interface Category {
    id: number;
    name?: string;
}

export interface Profile {
    name?: string;
    lastName?: string;
    avatar?: string;
}

export interface User {
    id: number;
    email?: string;
    profile?: Profile;
    role?: 'desarrollador' | 'instructor' | 'aprendiz';
}

export interface Post {
    id: number;
    title: string;
    content?: string;
    summary?: string;
    imageUrl?: string;
    isDraft?: boolean;
    createdAt?: string;
    updatedAt?: string;
    user?: User;
    categories?: Category[];
}