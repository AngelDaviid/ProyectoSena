import React, {useEffect, useRef, useState} from "react";
import {Save, X, Image as ImageIcon, Trash, Search} from "lucide-react";
import type {Post, Category} from "../../types/post.ts";
import api from "../../services/api.ts";

type Props = {
    post: Post;
    onCancel?: () => void;
    onSaved?: (p: Post) => void;
};

const EditPostForm: React.FC<Props> = ({post, onCancel, onSaved}) => {
    const API_BASE = import.meta.env.SENA_API_URL || "http://localhost:3001";

    const initialPreview =
        post.imageUrl && post.imageUrl.startsWith("/")
            ? `${API_BASE}${post.imageUrl}`
            : post.imageUrl ?? null;

    const [title, setTitle] = useState(post.title ?? "");
    const [content, setContent] = useState(post.content ?? "");
    const [summary, setSummary] = useState(post.summary ?? "");
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(initialPreview);
    const [removeImage, setRemoveImage] = useState<boolean>(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [categories, setCategories] = useState<Category[]>([]);
    const [openDropdown, setOpenDropdown] = useState(false);
    const [filter, setFilter] = useState("");
    const [selectedIds, setSelectedIds] = useState<number[]>(
        (post.categories ?? []).map((c) => c.id)
    );
    const dropdownRef = useRef<HTMLDivElement | null>(null);

    // Close dropdown on outside click
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

    // Load categories
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

    // File input handling
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0] ?? null;
        setFile(f);
        setRemoveImage(false);
        if (f) {
            const reader = new FileReader();
            reader.onload = () => setPreview(reader.result as string);
            reader.readAsDataURL(f);
        } else {
            setPreview(null);
        }
    };

    const handleRemoveImageClick = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        setFile(null);
        setPreview(null);
        setRemoveImage(true);
    };

    // Category selection helpers
    const toggleSelect = (id: number) => {
        setSelectedIds((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
        );
    };

    const removeSelected = (id: number) => {
        setSelectedIds((prev) => prev.filter((x) => x !== id));
    };

    // Form submit
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!title.trim()) {
            setError("El título es obligatorio");
            return;
        }

        try {
            setLoading(true);

            if (file) {
                const fd = new FormData();
                fd.append("title", title.trim());
                if (content) fd.append("content", content);
                if (summary) fd.append("summary", summary);
                fd.append("image", file);
                fd.append("categoryIds", JSON.stringify(selectedIds.map(Number)));
                if (removeImage) {
                    fd.append("removeImage", "true");
                }

                const {updatePost} = await import("../../services/posts.ts");
                const updated = await updatePost(post.id, fd);
                onSaved?.(updated);
                return;
            }

            const payload: any = {
                title: title.trim(),
                categoryIds: selectedIds.map(Number),
            };
            if (content) payload.content = content;
            if (summary) payload.summary = summary;
            if (removeImage) payload.removeImage = true;

            const {updatePost} = await import("../../services/posts.ts");
            const updated = await updatePost(post.id, payload);
            onSaved?.(updated);
        } catch (err: any) {
            setError(
                err?.response?.data?.message ||
                err?.message ||
                "Error al actualizar la publicación"
            );
        } finally {
            setLoading(false);
        }
    };

    // Filtered categories
    const filtered = categories.filter((c) =>
        c.name?.toLowerCase().includes(filter.trim().toLowerCase())
    );

    const toggleDropdown = () => setOpenDropdown((s) => !s);

    const onKeyToggle = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            toggleDropdown();
        }
    };

    return (
        <div
            className="bg-white rounded-2xl sm:rounded-3xl shadow-md border border-gray-200 p-3 sm:p-5 mb-4 transition hover:shadow-lg">
            <form onSubmit={handleSubmit} className="flex flex-col space-y-3 sm:space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <h4 className="text-base sm:text-lg font-semibold text-gray-800">✏️ Editar publicación</h4>
                    <div className="text-xs sm:text-sm text-gray-500">ID: {post.id}</div>
                </div>

                {error && (
                    <div className="text-red-600 text-xs sm:text-sm bg-red-50 border border-red-100 p-2 rounded-md">
                        {error}
                    </div>
                )}

                <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Título"
                    className="w-full text-base sm:text-lg font-medium border border-gray-200 rounded-xl px-3 sm:px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none placeholder-gray-500 bg-transparent"
                    aria-label="Título"
                />

                <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Contenido de la publicación..."
                    className="w-full resize-none border border-gray-200 rounded-xl px-3 sm:px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none transition min-h-[100px] sm:min-h-[120px] text-sm sm:text-base"
                    rows={6}
                    aria-label="Contenido"
                />

                <textarea
                    value={summary}
                    onChange={(e) => setSummary(e.target.value)}
                    placeholder="Resumen breve (opcional)"
                    className="w-full resize-none border border-gray-200 rounded-xl px-3 sm:px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none transition text-xs sm:text-sm text-gray-600"
                    rows={2}
                    aria-label="Resumen"
                />

                {/* Imagen y Categorías */}
                <div className="flex flex-col lg:flex-row lg:items-start lg:gap-6 gap-4">
                    <div className="flex-1">
                        <label
                            htmlFor={`image-upload-edit-${post.id}`}
                            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 cursor-pointer transition font-medium text-sm sm:text-base"
                        >
                            <ImageIcon className="w-4 h-4 sm:w-5 sm:h-5"/>
                            Cambiar imagen
                        </label>
                        <input
                            id={`image-upload-edit-${post.id}`}
                            type="file"
                            accept="image/*"
                            onChange={handleFileChange}
                            className="hidden"
                        />

                        <div className="mt-3 flex items-center gap-3">
                            {preview ? (
                                <div
                                    className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-xl overflow-hidden border border-gray-200">
                                    <img src={preview} alt="preview" className="w-full h-full object-cover"/>
                                    <button
                                        type="button"
                                        onClick={handleRemoveImageClick}
                                        className="absolute top-1 right-1 bg-white/90 rounded-full p-1 hover:bg-white transition"
                                        aria-label="Quitar imagen"
                                    >
                                        <X className="w-3. 5 h-3.5 sm:w-4 sm:h-4 text-gray-700"/>
                                    </button>
                                </div>
                            ) : post.imageUrl && !file && !removeImage ? (
                                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                                    <img
                                        src={initialPreview ?? undefined}
                                        alt="imagen actual"
                                        className="w-20 h-20 sm:w-24 sm:h-24 object-cover rounded-xl border border-gray-200"
                                    />
                                    <button
                                        type="button"
                                        onClick={handleRemoveImageClick}
                                        className="text-xs sm:text-sm text-red-600 underline"
                                    >
                                        Quitar imagen
                                    </button>
                                </div>
                            ) : (
                                <div className="text-xs sm:text-sm text-gray-500">No hay imagen seleccionada</div>
                            )}
                        </div>
                    </div>

                    {/* Categorías */}
                    <div className="w-full lg:w-96 relative" ref={dropdownRef}>
                        <div
                            role="button"
                            tabIndex={0}
                            onClick={toggleDropdown}
                            onKeyDown={onKeyToggle}
                            aria-haspopup="listbox"
                            aria-expanded={openDropdown}
                            className="w-full text-left px-3 sm:px-4 py-2 border border-gray-300 rounded-2xl bg-white flex items-center justify-between cursor-pointer focus:ring-2 focus:ring-blue-300"
                        >
                            <div className="flex flex-wrap gap-1. 5 sm:gap-2">
                                {selectedIds.length === 0 ? (
                                    <span className="text-xs sm:text-sm text-gray-500">Seleccionar categorías</span>
                                ) : (
                                    selectedIds.map((id) => {
                                        const cat = categories.find((c) => c.id === id);
                                        return (
                                            <span
                                                key={id}
                                                className="inline-flex items-center gap-1 sm:gap-2 bg-blue-50 text-blue-800 text-xs px-2 py-0.5 rounded-full"
                                            >
                                                {cat?.name ?? id}
                                                <button
                                                    type="button"
                                                    onClick={(ev) => {
                                                        ev.stopPropagation();
                                                        removeSelected(id);
                                                    }}
                                                    className="ml-1 text-blue-600 hover:text-blue-800"
                                                    aria-label={`Quitar categoría ${id}`}
                                                >
                                                    ×
                                                </button>
                                            </span>
                                        );
                                    })
                                )}
                            </div>
                            <svg
                                className="w-4 h-4 ml-2 text-gray-600 flex-shrink-0"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                                aria-hidden
                            >
                                <path
                                    fillRule="evenodd"
                                    d="M5.23 7.21a. 75.75 0 011. 06. 02L10 11.584l3.71-4.354a.75.75 0 011.14. 976l-4.25 5a.75.75 0 01-1.14 0l-4.25-5a.75.75 0 01.02-1.06z"
                                    clipRule="evenodd"
                                />
                            </svg>
                        </div>

                        {openDropdown && (
                            <div
                                className="absolute z-50 left-0 right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-lg max-h-64 overflow-auto">
                                <div className="p-2 border-b flex items-center gap-2">
                                    <Search className="w-3. 5 h-3.5 sm:w-4 sm:h-4 text-gray-400 flex-shrink-0"/>
                                    <input
                                        value={filter}
                                        onChange={(e) => setFilter(e.target.value)}
                                        placeholder="Buscar categoría..."
                                        className="w-full px-2 sm:px-3 py-1. 5 sm:py-2 border border-gray-100 rounded-md text-xs sm:text-sm focus:outline-none"
                                        aria-label="Buscar categorías"
                                    />
                                </div>

                                <ul className="p-2 space-y-1">
                                    {filtered.length === 0 ? (
                                        <li className="text-xs sm:text-sm text-gray-500 px-2 py-1">No hay
                                            categorías</li>
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
                                                            className="h-3. 5 w-3.5 sm:h-4 sm:w-4"
                                                            aria-checked={checked}
                                                        />
                                                        <span className="text-xs sm:text-sm">{c.name}</span>
                                                    </label>
                                                </li>
                                            );
                                        })
                                    )}
                                </ul>
                                <div className="p-2 border-t text-right text-xs text-gray-500">
                                    {selectedIds.length} seleccionada(s)
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Botones */}
                <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 pt-2">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="flex items-center justify-center gap-2 px-4 py-2 rounded-full border border-gray-300 text-gray-700 hover:bg-gray-50 transition text-sm sm:text-base"
                    >
                        <X className="w-4 h-4"/>
                        Cancelar
                    </button>

                    <button
                        type="submit"
                        disabled={loading}
                        className={`flex items-center justify-center gap-2 px-4 sm:px-5 py-2 rounded-full text-white font-medium transition text-sm sm:text-base ${
                            loading ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
                        }`}
                    >
                        <Save className="w-4 h-4"/>
                        {loading ? "Guardando..." : "Guardar cambios"}
                    </button>
                </div>

                {/* Extra info */}
                <div
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-gray-500 pt-1">
                    <button
                        type="button"
                        onClick={() => setSelectedIds([])}
                        className="flex items-center gap-2 text-red-600 hover:underline"
                        aria-label="Quitar todas las categorías"
                    >
                        <Trash className="w-3 h-3"/> Quitar todas las categorías
                    </button>
                    <div>{removeImage ? "Imagen marcada para quitar" : "Imagen conservada"}</div>
                </div>
            </form>
        </div>
    );
};

export default EditPostForm;