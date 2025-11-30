import api from './api';
import type { Category } from '../types/event';

let _categoriesCache: { ts: number; data: Category[] } | null = null;
let _categoriesInFlight: Promise<Category[]> | null = null;
const CATEGORIES_CACHE_TTL = 60000; // 1 minuto

export async function getCategories(): Promise<Category[]> {
  // Cache
  if (_categoriesCache && (Date.now() - _categoriesCache.ts) < CATEGORIES_CACHE_TTL) {
    return _categoriesCache. data;
  }

  // In-flight
  if (_categoriesInFlight) {
    return _categoriesInFlight;
  }

  _categoriesInFlight = (async () => {
    try {
      const res = await api.get<Category[]>('/categories');
      _categoriesCache = { ts: Date.now(), data: res.data };
      return res.data;
    } finally {
      _categoriesInFlight = null;
    }
  })();

  return _categoriesInFlight;
}