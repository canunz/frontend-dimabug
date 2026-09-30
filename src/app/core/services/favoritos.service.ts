import { Injectable, computed, signal } from '@angular/core';

const KEY = 'dimabug.favoritos.v1';
const META = 'dimabug.favoritos.meta.v1';

export interface FavoritoItem {
  id: number;
  titulo: string;
}

@Injectable({ providedIn: 'root' })
export class FavoritosService {
  private readonly itemsSignal = signal<FavoritoItem[]>(this.leer());
  readonly items = computed(() => this.itemsSignal());
  readonly ids = computed(() => this.itemsSignal().map((item) => item.id));

  tiene(id: number): boolean {
    return this.itemsSignal().some((item) => item.id === id);
  }

  toggle(id: number, titulo = 'Conocimiento'): void {
    const actual = this.itemsSignal();
    const next = actual.some((item) => item.id === id)
      ? actual.filter((item) => item.id !== id)
      : [...actual, { id, titulo: titulo.trim() || 'Conocimiento' }];
    this.guardar(next);
  }

  private guardar(items: FavoritoItem[]): void {
    this.itemsSignal.set(items);
    localStorage.setItem(META, JSON.stringify(items));
    localStorage.setItem(KEY, JSON.stringify(items.map((item) => item.id)));
  }

  private leer(): FavoritoItem[] {
    try {
      const meta = localStorage.getItem(META);
      if (meta) {
        const parsed = JSON.parse(meta) as unknown;
        if (Array.isArray(parsed)) {
          return parsed
            .map((item) => {
              const row = item as { id?: unknown; titulo?: unknown };
              const id = Number(row.id);
              return Number.isInteger(id) ? { id, titulo: String(row.titulo || 'Conocimiento') } : null;
            })
            .filter((item): item is FavoritoItem => item != null);
        }
      }
      const raw = JSON.parse(localStorage.getItem(KEY) || '[]') as unknown;
      return Array.isArray(raw)
        ? raw.filter((id) => Number.isInteger(id)).map((id) => ({ id: Number(id), titulo: 'Conocimiento' }))
        : [];
    } catch {
      return [];
    }
  }
}
