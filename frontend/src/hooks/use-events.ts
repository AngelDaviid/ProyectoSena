import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { getEvents } from "../services/events";
import type { Event } from "../types/event";
import type { FilterEventsParams } from "../types/event";

export function useEvents(filters: FilterEventsParams) {
    const [events, setEvents] = useState<Event[]>([]);
    const [total, setTotal] = useState<number>(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // AbortController persistente por request
    const abortRef = useRef<AbortController | null>(null);

    // Memo de filtros para que solo dispare fetch cuando cambian
    const memoFilters = useMemo(() => filters, [
        filters.search,
        filters.eventType,
        filters.categoryId,
    ]);

    const fetchEvents = useCallback(async () => {
        try {
            // cancelar request previa
            if (abortRef.current) {
                abortRef.current.abort();
            }

            const controller = new AbortController();
            abortRef.current = controller;

            setLoading(true);
            setError(null);

            const res = await getEvents(memoFilters);

            if (!controller.signal.aborted) {
                setEvents(res.events);
                setTotal(res.total);
            }
        } catch (err: any) {
            if (err.name === "AbortError") return;

            console.error("Error loading events:", err);
            setError("No se pudieron cargar los eventos");
        } finally {
            setLoading(false);
        }
    }, [memoFilters]);

    // Ejecutar al montar y cada vez que cambien los filtros
    useEffect(() => {
        fetchEvents();

        return () => {
            if (abortRef.current) abortRef.current.abort();
        };
    }, [fetchEvents]);

    const reload = () => fetchEvents();

    return {
        events,
        total,
        loading,
        error,
        reload,
    };
}