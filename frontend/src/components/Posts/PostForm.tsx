import React, {useEffect, useRef, useState} from 'react';
import {useAuth} from '../../hooks/useAuth.ts';
import api from '../../services/api.ts';
import type {Post, Category} from '../../types/post.ts';
import {Image as ImageIcon, X} from 'lucide-react';

type Props = {
    onCreated?: (p: Post) => void;
};

const API_BASE = import.meta.env.SENA_API_URL || 'http://localhost:3001';

const NewPostForm: React.FC<Props> = ({onCreated}) => {
    const {user, token} = useAuth();
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [summary, setSummary] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [categories, setCategories] = useState<Category[]>([]);
    const [openDropdown, setOpenDropdown] = useState(false);
    const [filter, setFilter] = useState('');
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const dropdownRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        function onDoc(e: MouseEvent) {
            if (!dropdownRef.current) return;
            if (!dropdownRef.current.contains(e.target as Node)) {
                setOpenDropdown(false);
            }
        }

        document.addEventListener('click', onDoc);
        return () => document.removeEventListener('click', onDoc);
    }, []);

    useEffect(() => {
        (async () => {
            try {
                const res = await api.get<Category[]>('/categories');
                setCategories(res.data ?? res);
            } catch {
                console.warn('No se pudieron cargar categorías');
            }
        })();
    }, []);

    const toggleSelect = (id: number) => {
        setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    };

    const removeSelected = (id: number) => {
        setSelectedIds((prev) => prev.filter((x) => x !== id));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0] ?? null;
        setFile(f);
        if (f) {
            const reader = new FileReader();
            reader.onload = () => setPreview(reader.result as string);
            reader.readAsDataURL(f);
        } else {
            setPreview(null);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        if (!title.trim()) return setError('El título es obligatorio');

        const fd = new FormData();
        fd.append('title', title);
        if (content) fd.append('content', content);
        if (summary) fd.append('summary', summary);
        if (file) fd.append('image', file);
        if (selectedIds.length > 0) {
            fd.append('categoryIds', JSON.stringify(selectedIds.map(Number)));
        }

        try {
            setLoading(true);
            const {createPost} = await import('../../services/posts.ts');
            const created = await createPost(fd);
            setTitle('');
            setContent('');
            setSummary('');
            setFile(null);
            setPreview(null);
            setSelectedIds([]);
            onCreated?.(created);
        } catch (err: any) {
            setError(err?.response?.data?.message || err?.message || 'Error al crear la publicación');
        } finally {
            setLoading(false);
        }
    };

    if (!token) return <div className="text-center text-gray-500 p-4 text-sm sm:text-base">Inicia sesión para
        publicar</div>;

    const filtered = categories.filter((c) => c.name?.toLowerCase().includes(filter.trim().toLowerCase()));

    const avatarSrc =
        user?.profile?.avatar && user.profile.avatar.startsWith('/')
            ? `${API_BASE}${user.profile.avatar}`
            : user?.profile?.avatar ?? null;

    return (
        <div
            className="bg-white rounded-2xl sm:rounded-3xl shadow-md border border-gray-200 p-3 sm:p-5 mb-6 sm:mb-8 transition hover:shadow-lg">
            <form onSubmit={handleSubmit} className="flex flex-col space-y-3 sm:space-y-4">
                <div className="flex space-x-2 sm:space-x-3">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full overflow-hidden bg-gray-300 flex-shrink-0">
                        {avatarSrc ? (
                            <img src={avatarSrc} alt={user?.profile?.name ?? user?.email}
                                 className="w-full h-full object-cover"/>
                        ) : (
                            <div
                                className="w-full h-full flex items-center justify-center text-white font-bold bg-gray-500 text-sm sm:text-base">
                                {user?.profile?.name?.[0] || 'U'}
                            </div>
                        )}
                    </div>
                    <input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="¿Qué estás pensando?"
                        className="flex-1 text-base sm:text-lg font-medium border-none focus:ring-0 outline-none placeholder-gray-500 bg-transparent"
                    />
                </div>

                <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Escribe el contenido de tu publicación..."
                    className="w-full resize-none border border-gray-200 rounded-xl px-3 sm:px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none transition text-sm sm:text-base"
                    rows={3}
                />

                <textarea
                    value={summary}
                    onChange={(e) => setSummary(e.target.value)}
                    placeholder="Resumen breve (opcional)"
                    className="w-full resize-none border border-gray-200 rounded-xl px-3 sm:px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none transition text-xs sm:text-sm text-gray-600"
                    rows={2}
                />

                <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                    <label htmlFor="image-upload"
                           className="flex items-center gap-2 text-blue-600 hover:text-blue-700 cursor-pointer transition">
                        <ImageIcon className="w-4 h-4 sm:w-5 sm:h-5"/>
                        <span className="text-xs sm:text-sm font-medium">Agregar imagen</span>
                    </label>
                    <input id="image-upload" type="file" accept="image/*" onChange={handleFileChange}
                           className="hidden"/>
                    {preview && (
                        <div
                            className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden border border-gray-200">
                            <img src={preview} alt="preview" className="w-full h-full object-cover"/>
                            <button
                                type="button"
                                onClick={() => {
                                    setFile(null);
                                    setPreview(null);
                                }}
                                className="absolute top-1 right-1 bg-white/80 rounded-full p-1 hover:bg-white transition"
                                aria-label="Quitar imagen"
                            >
                                <X className="w-3. 5 h-3.5 sm:w-4 sm:h-4 text-gray-700"/>
                            </button>
                        </div>
                    )}
                </div>

                <div ref={dropdownRef} className="relative">
                    <div
                        role="button"
                        tabIndex={0}
                        onClick={() => setOpenDropdown((s) => !s)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                setOpenDropdown((s) => !s);
                            }
                        }}
                        className="w-full text-left px-3 sm:px-4 py-2 border border-gray-300 rounded-2xl bg-white flex items-center justify-between cursor-pointer"
                    >
                        <div className="flex flex-wrap gap-1. 5 sm:gap-2">
                            {selectedIds.length === 0 ? (
                                <span className="text-xs sm:text-sm text-gray-500">Seleccionar categorías</span>
                            ) : (
                                selectedIds.map((id) => {
                                    const cat = categories.find((c) => c.id === id);
                                    return (
                                        <span key={id}
                                              className="inline-flex items-center bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full">
                                            {cat?.name ?? id}
                                            <button
                                                type="button"
                                                onClick={(ev) => {
                                                    ev.stopPropagation();
                                                    removeSelected(id);
                                                }}
                                                className="ml-2 text-blue-600 hover:text-blue-800"
                                                aria-label={`Quitar categoría ${id}`}
                                            >
                                                ×
                                            </button>
                                        </span>
                                    );
                                })
                            )}
                        </div>
                        <svg className="w-4 h-4 ml-2 text-gray-600 flex-shrink-0" viewBox="0 0 20 20"
                             fill="currentColor" aria-hidden>
                            <path
                                fillRule="evenodd"
                                d="M5.23 7.21a. 75.75 0 011. 06.02L10 11. 584l3.71-4. 354a.75.75 0 011.14.976l-4.25 5a.75.75 0 01-1.14 0l-4.25-5a.75.75 0 01.02-1.06z"
                                clipRule="evenodd"
                            />
                        </svg>
                    </div>

                    {openDropdown && (
                        <div
                            className="absolute z-50 left-0 right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-lg max-h-64 overflow-auto">
                            <div className="p-2 border-b">
                                <input
                                    value={filter}
                                    onChange={(e) => setFilter(e.target.value)}
                                    placeholder="Buscar categoría..."
                                    className="w-full px-2 sm:px-3 py-1. 5 sm:py-2 border border-gray-200 rounded-md text-xs sm:text-sm focus:outline-none"
                                />
                            </div>

                            <ul className="p-2 space-y-1">
                                {filtered.length === 0 ? (
                                    <li className="text-xs sm:text-sm text-gray-500 px-2 py-1">No hay categorías</li>
                                ) : (
                                    filtered.map((c) => {
                                        const checked = selectedIds.includes(c.id);
                                        return (
                                            <li key={c.id}>
                                                <label
                                                    className="flex items-center gap-2 px-2 py-1 rounded hover:bg-gray-50 cursor-pointer">
                                                    <input type="checkbox" checked={checked}
                                                           onChange={() => toggleSelect(c.id)}
                                                           className="h-3. 5 w-3.5 sm:h-4 sm:w-4"/>
                                                    <span className="text-xs sm:text-sm">{c.name}</span>
                                                </label>
                                            </li>
                                        );
                                    })
                                )}
                            </ul>
                        </div>
                    )}
                </div>

                {error && <div className="text-red-500 text-xs sm:text-sm">{error}</div>}

                <div className="flex justify-end">
                    <button
                        type="submit"
                        disabled={loading || !title.trim()}
                        className={`px-4 sm:px-5 py-2 rounded-full font-semibold text-white transition text-sm sm:text-base ${
                            loading || !title.trim() ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600'
                        }`}
                    >
                        {loading ? 'Publicando...' : 'Publicar'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default NewPostForm;