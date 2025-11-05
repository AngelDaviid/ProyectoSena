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

export interface Comment {
    id: number;
    content: string;
    createdAt?: string;
    user?: User;
}

export interface PostComment {
    id: number;
    content: string;
    createdAt?: string;
    user?: User;
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
    comments?: PostComment[];
    likesCount?: number;
    likedByUser?: boolean;
    user?: User;
    categories?: Category[];
}