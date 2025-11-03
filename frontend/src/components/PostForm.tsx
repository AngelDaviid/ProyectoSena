import React, {useEffect, useRef, useState} from 'react';
import {useAuth} from "../hooks/useAuth.ts";
import api from '../services/api';
import type {Post, Category} from '../types/post.ts';
import {Image as ImageIcon, X} from 'lucide-react';

type Props = {
    onCreated?: (p: Post) => void;
};

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
        const file = e.target.files?.[0] ?? null;
        setFile(file);
        if (file) {
            const reader = new FileReader();
            reader.onload = () => setPreview(reader.result as string);
            reader.readAsDataURL(file);
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
        if (file) fd.append('imageUrl', file);
        if (selectedIds.length > 0) {
            fd.append('categoryIds', JSON.stringify(selectedIds.map(Number)));
        }

        try {
            setLoading(true);
            const {createPost} = await import('../services/posts.ts');
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

    if (!token)
        return <div className="text-center text-gray-500 p-4">Inicia sesión para publicar</div>;

    const filtered = categories.filter((c) =>
        c.name?.toLowerCase().includes(filter.trim().toLowerCase())
    );

    return (
        <div className="bg-white rounded-3xl shadow-md border border-gray-200 p-5 mb-8 transition hover:shadow-lg">
            <form onSubmit={handleSubmit} className="flex flex-col space-y-4">
                {/* Avatar y título */}
                <div className="flex space-x-3">
                    <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-300 flex-shrink-0">
                        {user?.profile?.avatar ? (
                            <img
                                src={user.profile.avatar}
                                alt={user.profile.name}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <div
                                className="w-full h-full flex items-center justify-center text-white font-bold bg-gray-500">
                                {user?.profile?.name?.[0] || 'U'}
                            </div>
                        )}
                    </div>
                    <input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="¿Qué estás pensando?"
                        className="flex-1 text-lg font-medium border-none focus:ring-0 outline-none placeholder-gray-500 bg-transparent"
                    />
                </div>

                {/* Campos adicionales */}
                <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Escribe el contenido de tu publicación..."
                    className="w-full resize-none border border-gray-200 rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
                    rows={3}
                />

                <textarea
                    value={summary}
                    onChange={(e) => setSummary(e.target.value)}
                    placeholder="Resumen breve (opcional)"
                    className="w-full resize-none border border-gray-200 rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none transition text-sm text-gray-600"
                    rows={2}
                />

                {/* Imagen */}
                <div className="flex items-center gap-4">
                    <label
                        htmlFor="image-upload"
                        className="flex items-center gap-2 text-blue-600 hover:text-blue-700 cursor-pointer transition"
                    >
                        <ImageIcon className="w-5 h-5"/>
                        <span className="text-sm font-medium">Agregar imagen</span>
                    </label>
                    <input
                        id="image-upload"
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="hidden"
                    />
                    {preview && (
                        <div className="relative w-24 h-24 rounded-xl overflow-hidden border border-gray-200">
                            <img src={preview} alt="preview" className="w-full h-full object-cover"/>
                            <button
                                type="button"
                                onClick={() => {
                                    setFile(null);
                                    setPreview(null);
                                }}
                                className="absolute top-1 right-1 bg-white/80 rounded-full p-1 hover:bg-white transition"
                            >
                                <X className="w-4 h-4 text-gray-700"/>
                            </button>
                        </div>
                    )}
                </div>

                {/* Categorías */}
                <div ref={dropdownRef} className="relative">
                    <button
                        type="button"
                        onClick={() => setOpenDropdown((s) => !s)}
                        className="w-full text-left px-4 py-2 border border-gray-300 rounded-2xl bg-white flex items-center justify-between"
                    >
                        <div className="flex flex-wrap gap-2">
                            {selectedIds.length === 0 ? (
                                <span className="text-sm text-gray-500">Seleccionar categorías</span>
                            ) : (
                                selectedIds.map((id) => {
                                    const cat = categories.find((c) => c.id === id);
                                    return (
                                        <span
                                            key={id}
                                            className="inline-flex items-center bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full"
                                        >
                                          {cat?.name ?? id}
                                                                <button
                                                                    type="button"
                                                                    onClick={(ev) => {
                                                                        ev.stopPropagation();
                                                                        removeSelected(id);
                                                                    }}
                                                                    className="ml-2 text-blue-600 hover:text-blue-800"
                                                                >
                                            ×
                                          </button>
                                        </span>
                                    );
                                })
                            )}
                        </div>
                        <svg
                            className="w-4 h-4 ml-2 text-gray-600"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                        >
                            <path
                                fillRule="evenodd"
                                d="M5.23 7.21a.75.75 0 011.06.02L10 11.584l3.71-4.354a.75.75 0 011.14.976l-4.25 5a.75.75 0 01-1.14 0l-4.25-5a.75.75 0 01.02-1.06z"
                                clipRule="evenodd"
                            />
                        </svg>
                    </button>

                    {openDropdown && (
                        <div
                            className="absolute z-50 left-0 right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-lg max-h-64 overflow-auto">
                            <div className="p-2 border-b">
                                <input
                                    value={filter}
                                    onChange={(e) => setFilter(e.target.value)}
                                    placeholder="Buscar categoría..."
                                    className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none"
                                />
                            </div>

                            <ul className="p-2 space-y-1">
                                {filtered.length === 0 ? (
                                    <li className="text-sm text-gray-500 px-2 py-1">No hay categorías</li>
                                ) : (
                                    filtered.map((c) => {
                                        const checked = selectedIds.includes(c.id);
                                        return (
                                            <li key={c.id}>
                                                <label
                                                    className="flex items-center gap-2 px-2 py-1 rounded hover:bg-gray-50 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={checked}
                                                        onChange={() => toggleSelect(c.id)}
                                                        className="h-4 w-4"
                                                    />
                                                    <span className="text-sm">{c.name}</span>
                                                </label>
                                            </li>
                                        );
                                    })
                                )}
                            </ul>
                        </div>
                    )}
                </div>

                {/* Error */}
                {error && <div className="text-red-500 text-sm">{error}</div>}

                {/* Botón */}
                <div className="flex justify-end">
                    <button
                        type="submit"
                        disabled={loading || !title.trim()}
                        className={`px-5 py-2 rounded-full font-semibold text-white transition ${
                            loading || !title.trim()
                                ? 'bg-gray-400 cursor-not-allowed'
                                : 'bg-blue-500 hover:bg-blue-600'
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
