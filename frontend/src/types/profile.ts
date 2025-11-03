export interface Profile {
    id?: number;
    name?: string;
    lastName?: string;
    // avatar puede ser ruta relativa (/uploads/xxx) o URL absoluta. Permitimos string o null si se elimina.
    avatar?: string | null;
    createdAt?: string;
    updatedAt?: string;
}