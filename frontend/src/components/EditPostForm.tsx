import React, { useEffect, useRef, useState } from "react";
import { Save, X, Image as ImageIcon } from "lucide-react";
import type { Post, Category } from "../types/post";
import api from "../services/api";

type Props = {
    post: Post;
    onCancel?: () => void;
    onSaved?: (p: Post) => void;
};

const EditPostForm: React.FC<Props> = ({ post, onCancel, onSaved }) => {
    const [title, setTitle] = useState(post.title ?? "");
    const [content, setContent] = useState(post.content ?? "");
    const [summary, setSummary] = useState(post.summary ?? "");
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(post.imageUrl ?? null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [categories, setCategories] = useState<Category[]>([]);
    const [openDropdown, setOpenDropdown] = useState(false);
    const [filter, setFilter] = useState("");
    const [selectedIds, setSelectedIds] = useState<number[]>(
        (post.categories ?? []).map((c) => c.id)
    );
    const dropdownRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        function onDoc(e: MouseEvent) {
            if (!dropdownRef.current) return;
            if (!dropdownRef.current.contains(e.target as Node)) {
                setOpenDropdown(false);
            }
        }

        document.addEventListener("click", onDoc);
        return () => document.removeEventListener("click", onDoc);
    }, []);

    useEffect(() => {
        (async () => {
            try {
                const res = await api.get<Category[]>("/categories");
                setCategories(res.data ?? res);
            } catch {
                console.warn("No se pudieron cargar categorías");
            }
        })();
    }, []);

    const toggleSelect = (id: number) => {
        setSelectedIds((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
        );
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

        if (!title.trim()) {
            setError("El título es obligatorio");
            return;
        }

        try {
            setLoading(true);

            // Si hay archivo nuevo -> enviar FormData (multipart)
            if (file) {
                const fd = new FormData();
                fd.append("title", title);
                if (content) fd.append("content", content);
                if (summary) fd.append("summary", summary);
                fd.append("imageUrl", file);
                if (selectedIds.length > 0)
                    fd.append("categoryIds", JSON.stringify(selectedIds.map(Number)));

                const { updatePost } = await import("../services/posts");
                const updated = await updatePost(post.id, fd);
                onSaved?.(updated);
                return;
            }

            // Si NO hay archivo -> enviar JSON (backend espera JSON en PUT)
            const payload: any = {
                title: title.trim(),
            };
            if (content) payload.content = content;
            if (summary) payload.summary = summary;
            if (selectedIds.length > 0) payload.categoryIds = selectedIds.map(Number);

            const { updatePost } = await import("../services/posts");
            const updated = await updatePost(post.id, payload);
            onSaved?.(updated);
        } catch (err: any) {
            setError(err?.response?.data?.message || err?.message || "Error al actualizar");
        } finally {
            setLoading(false);
        }
    };

    const filtered = categories.filter((c) =>
        c.name?.toLowerCase().includes(filter.trim().toLowerCase())
    );

    return (
        <div className="bg-white rounded-3xl shadow-md border border-gray-200 p-5 mb-4 transition hover:shadow-lg">
            <form onSubmit={handleSubmit} className="flex flex-col space-y-4">
                <h4 className="text-lg font-semibold text-gray-800 mb-1">
                    ✏️ Editar publicación
                </h4>

                {error && (
                    <div className="text-red-500 text-sm bg-red-50 border border-red-200 p-2 rounded-md">
                        {error}
                    </div>
                )}

                <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Título"
                    className="flex-1 text-lg font-medium border border-gray-200 rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none placeholder-gray-500 bg-transparent"
                />

                <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Contenido de la publicación..."
                    className="w-full resize-none border border-gray-200 rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
                    rows={4}
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
                        <ImageIcon className="w-5 h-5" />
                        <span className="text-sm font-medium">Cambiar imagen</span>
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
                            <img src={preview} alt="preview" className="w-full h-full object-cover" />
                            <button
                                type="button"
                                onClick={() => {
                                    setFile(null);
                                    setPreview(null);
                                }}
                                className="absolute top-1 right-1 bg-white/80 rounded-full p-1 hover:bg-white transition"
                            >
                                <X className="w-4 h-4 text-gray-700" />
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
                        <div className="absolute z-50 left-0 right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-lg max-h-64 overflow-auto">
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
                                    <li className="text-sm text-gray-500 px-2 py-1">
                                        No hay categorías
                                    </li>
                                ) : (
                                    filtered.map((c) => {
                                        const checked = selectedIds.includes(c.id);
                                        return (
                                            <li key={c.id}>
                                                <label className="flex items-center gap-2 px-2 py-1 rounded hover:bg-gray-50 cursor-pointer">
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

                {/* Botones */}
                <div className="flex justify-end gap-3 pt-2">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="flex items-center gap-2 px-4 py-2 rounded-full border border-gray-300 text-gray-700 hover:bg-gray-100 transition"
                    >
                        <X className="w-4 h-4" />
                        Cancelar
                    </button>

                    <button
                        type="submit"
                        disabled={loading}
                        className={`flex items-center gap-2 px-4 py-2 rounded-full text-white font-medium transition ${
                            loading
                                ? "bg-gray-400 cursor-not-allowed"
                                : "bg-blue-500 hover:bg-blue-600"
                        }`}
                    >
                        <Save className="w-4 h-4" />
                        {loading ? "Guardando..." : "Guardar cambios"}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default EditPostForm;