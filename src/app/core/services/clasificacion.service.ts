import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import {
  Observable,
  catchError,
  concat,
  from,
  map,
  mergeMap,
  of,
  scan,
  shareReplay,
  switchMap,
  tap,
  throwError,
} from 'rxjs';
import { apiUrl } from '../config/api';
import { mensajeApiError } from '../http/api-error';
import { HardwareItem } from '../models/catalogo.model';
import { CatalogoRef, FrecuenciaCatalogo } from '../models/conocimiento.model';

interface ClasificacionTree {
  hardwares: CatalogoRef[];
  sistemasByHardware: Record<string, CatalogoRef[]>;
  modulosBySistema: Record<string, CatalogoRef[]>;
  frecuencias: CatalogoRef[];
  frecuenciasDisponibles: boolean;
}

@Injectable({ providedIn: 'root' })
export class ClasificacionService {
  private readonly http = inject(HttpClient);
  private readonly storageKey = 'dimabug.hardware.detalle.v1';
  private readonly treeKey = 'dimabug.clasificacion.tree.v1';
  private hardwareDetalleCache$: Observable<HardwareItem[]> | null = null;
  private hardwareListaCache$: Observable<CatalogoRef[]> | null = null;
  private frecuenciasCache$: Observable<FrecuenciaCatalogo> | null = null;
  private readonly sistemasCache = new Map<number, Observable<CatalogoRef[]>>();
  private readonly modulosCache = new Map<number, Observable<CatalogoRef[]>>();
  private tree: ClasificacionTree = this.readTree() ?? {
    hardwares: [],
    sistemasByHardware: {},
    modulosBySistema: {},
    frecuencias: [],
    frecuenciasDisponibles: false,
  };

  /** Lectura síncrona desde caché local (instantánea para los selects). */
  snapshotHardware(): CatalogoRef[] {
    return this.tree.hardwares;
  }

  snapshotSistemas(hardwareId: number): CatalogoRef[] {
    return this.tree.sistemasByHardware[String(hardwareId)] ?? [];
  }

  snapshotModulos(sistemaId: number): CatalogoRef[] {
    return this.tree.modulosBySistema[String(sistemaId)] ?? [];
  }

  snapshotFrecuencias(): FrecuenciaCatalogo {
    return {
      items: this.tree.frecuencias,
      disponible: this.tree.frecuenciasDisponibles || this.tree.frecuencias.length > 0,
    };
  }

  listarHardware(force = false): Observable<CatalogoRef[]> {
    const stale = this.tree.hardwares;
    if (!force && this.hardwareListaCache$) {
      return this.hardwareListaCache$;
    }

    const network$ = this.getLista('/hardware', 'No fue posible cargar el hardware.').pipe(
      tap((items) => {
        this.tree = { ...this.tree, hardwares: items };
        this.writeTree();
      }),
      catchError((err) => {
        this.hardwareListaCache$ = null;
        if (stale.length) {
          return of(stale);
        }
        return throwError(() => err);
      }),
      shareReplay(1),
    );

    this.hardwareListaCache$ = stale.length && !force ? concat(of(stale), network$).pipe(shareReplay(1)) : network$;
    return this.hardwareListaCache$;
  }

  /**
   * 1) Caché de sesión al instante
   * 2) Lista base de /api/hardware (nombre + SO) enseguida
   * 3) Sistemas asociados en segundo plano (sin bloquear la tabla)
   */
  listarHardwareDetalle(force = false): Observable<HardwareItem[]> {
    if (!force && this.hardwareDetalleCache$) {
      return this.hardwareDetalleCache$;
    }

    const stale = !force ? this.readSession() : null;

    const network$ = this.http.get<unknown>(apiUrl('/hardware')).pipe(
      map((res) => this.asHardwareBase(res)),
      switchMap((bases) => {
        const initial: HardwareItem[] = bases.map((h) => ({
          id: h.id,
          nombre: h.nombre,
          so: h.so,
          sistemas: stale?.find((s) => s.id === h.id)?.sistemas ?? [],
        }));

        if (!bases.length) {
          return of(initial);
        }

        const enrich$ = from(bases).pipe(
          mergeMap(
            (h) =>
              this.sistemasDeHardware(h.id).pipe(
                map((sis) => ({
                  id: h.id,
                  sistemas: sis.map((s) => s.nombre).filter(Boolean),
                })),
                catchError(() => of({ id: h.id, sistemas: [] as string[] })),
              ),
            6,
          ),
          scan((acc, upd) => {
            const next = acc.map((item) =>
              item.id === upd.id ? { ...item, sistemas: upd.sistemas } : item,
            );
            return next;
          }, initial),
        );

        return concat(of(initial), enrich$);
      }),
      catchError((err: HttpErrorResponse) => {
        if (stale?.length) {
          return of(stale);
        }
        this.hardwareDetalleCache$ = null;
        return throwError(() => new Error(mensajeApiError(err, 'No fue posible cargar el hardware.')));
      }),
    );

    this.hardwareDetalleCache$ = (stale?.length ? concat(of(stale), network$) : network$).pipe(
      tap((items) => this.writeSession(items)),
      shareReplay(1),
    );

    return this.hardwareDetalleCache$;
  }

  sistemasDeHardware(hardwareId: number, force = false): Observable<CatalogoRef[]> {
    const stale = this.snapshotSistemas(hardwareId);
    if (!force) {
      const cached = this.sistemasCache.get(hardwareId);
      // No reutilizar caché vacía: puede ser un fallo temporal o datos nuevos en BD.
      if (cached && stale.length > 0) {
        return cached;
      }
    }

    const network$ = this.getLista(
      `/hardware/${hardwareId}/sistemas`,
      'No fue posible cargar los sistemas.',
    ).pipe(
      tap((items) => {
        this.tree = {
          ...this.tree,
          sistemasByHardware: { ...this.tree.sistemasByHardware, [String(hardwareId)]: items },
        };
        this.writeTree();
      }),
      catchError((err) => {
        this.sistemasCache.delete(hardwareId);
        if (stale.length) {
          return of(stale);
        }
        return throwError(() => err);
      }),
      shareReplay(1),
    );

    const req$ = stale.length && !force ? concat(of(stale), network$).pipe(shareReplay(1)) : network$;
    this.sistemasCache.set(hardwareId, req$);
    return req$;
  }

  listarSistemas(): Observable<CatalogoRef[]> {
    return this.getLista('/sistemas', 'No fue posible cargar los sistemas.');
  }

  obtenerSistema(id: number): Observable<CatalogoRef> {
    return this.http.get<unknown>(apiUrl(`/sistemas/${id}`)).pipe(
      map((res) => this.asItem(res)),
      catchError((err: HttpErrorResponse) =>
        throwError(() => new Error(mensajeApiError(err, 'No se encontró el sistema.'))),
      ),
    );
  }

  hardwareDeSistema(sistemaId: number): Observable<CatalogoRef[]> {
    return this.getLista(`/sistemas/${sistemaId}/hardware`, 'No fue posible cargar el hardware del sistema.');
  }

  modulosDeSistema(sistemaId: number, force = false): Observable<CatalogoRef[]> {
    const stale = this.snapshotModulos(sistemaId);
    if (!force) {
      const cached = this.modulosCache.get(sistemaId);
      // Si la caché quedó vacía (datos viejos), forzar recarga.
      if (cached && stale.length > 0) {
        return cached;
      }
      if (cached && stale.length === 0) {
        this.modulosCache.delete(sistemaId);
      }
    }

    const network$ = this.getLista(
      `/sistemas/${sistemaId}/modulos`,
      'No fue posible cargar los módulos.',
    ).pipe(
      tap((items) => {
        this.tree = {
          ...this.tree,
          modulosBySistema: { ...this.tree.modulosBySistema, [String(sistemaId)]: items },
        };
        this.writeTree();
      }),
      catchError((err) => {
        this.modulosCache.delete(sistemaId);
        if (stale.length) {
          return of(stale);
        }
        return throwError(() => err);
      }),
      shareReplay(1),
    );

    const req$ = stale.length && !force ? concat(of(stale), network$).pipe(shareReplay(1)) : network$;
    this.modulosCache.set(sistemaId, req$);
    return req$;
  }

  listarFrecuencias(force = false): Observable<FrecuenciaCatalogo> {
    const stale = this.snapshotFrecuencias();
    if (!force && this.frecuenciasCache$) {
      return this.frecuenciasCache$;
    }

    const network$ = this.http.get<unknown>(apiUrl('/frecuencias')).pipe(
      map((res) => ({ items: this.asLista(res), disponible: true })),
      tap((data) => {
        this.tree = {
          ...this.tree,
          frecuencias: data.items,
          frecuenciasDisponibles: data.disponible,
        };
        this.writeTree();
      }),
      catchError(() => {
        if (stale.items.length) {
          return of(stale);
        }
        return of({ items: [], disponible: false });
      }),
      shareReplay(1),
    );

    this.frecuenciasCache$ =
      stale.items.length && !force ? concat(of(stale), network$).pipe(shareReplay(1)) : network$;
    return this.frecuenciasCache$;
  }

  /** Precarga en segundo plano para que los selects respondan al instante. */
  precargarClasificacion(): void {
    this.listarHardware()
      .pipe(
        tap((hardwares) => {
          from(hardwares)
            .pipe(
              mergeMap(
                (h) =>
                  this.sistemasDeHardware(h.id).pipe(
                    tap((sistemas) => {
                      for (const s of sistemas) {
                        this.modulosDeSistema(s.id).subscribe({ error: () => undefined });
                      }
                    }),
                    catchError(() => of([] as CatalogoRef[])),
                  ),
                6,
              ),
            )
            .subscribe({ error: () => undefined });
        }),
        catchError(() => of([] as CatalogoRef[])),
      )
      .subscribe({ error: () => undefined });
    this.listarFrecuencias().subscribe({ error: () => undefined });
  }

  private asHardwareBase(res: unknown): Omit<HardwareItem, 'sistemas'>[] {
    return this.asArray(res)
      .map((item) => {
        const r = (item ?? {}) as Record<string, unknown>;
        const id = Number(r['id'] ?? r['hardwareId'] ?? 0);
        const nombre = String(r['nombre'] ?? r['hardwareNombre'] ?? '').trim();
        const soRaw = r['sistemaOperativo'] ?? r['so'] ?? r['hardwareSistemaOperativo'] ?? '';
        const so = soRaw == null ? '' : String(soRaw).trim();
        return { id, nombre, so };
      })
      .filter((item) => Number.isFinite(item.id) && item.id > 0 && item.nombre.length > 0);
  }

  private getLista(path: string, fallback: string): Observable<CatalogoRef[]> {
    return this.http.get<unknown>(apiUrl(path)).pipe(
      map((res) => this.asLista(res)),
      catchError((err: HttpErrorResponse) => throwError(() => new Error(mensajeApiError(err, fallback)))),
    );
  }

  private asLista(res: unknown): CatalogoRef[] {
    return this.asArray(res)
      .map((item) => this.asItem(item))
      .filter((item) => item.id > 0 && item.nombre);
  }

  private asItem(raw: unknown): CatalogoRef {
    const r = (raw ?? {}) as Record<string, unknown>;
    return {
      id: Number(r['id'] ?? r['hardwareId'] ?? r['sistemaId'] ?? r['moduloId'] ?? r['frecuenciaId'] ?? 0),
      nombre: String(r['nombre'] ?? r['descripcion'] ?? r['titulo'] ?? '').trim(),
    };
  }

  private asArray(res: unknown): unknown[] {
    if (Array.isArray(res)) {
      return res;
    }
    if (res && typeof res === 'object') {
      const obj = res as Record<string, unknown>;
      if (Array.isArray(obj['content'])) {
        return obj['content'];
      }
      if (Array.isArray(obj['data'])) {
        return obj['data'];
      }
      if (Array.isArray(obj['items'])) {
        return obj['items'];
      }
    }
    return [];
  }

  private readSession(): HardwareItem[] | null {
    try {
      const raw = sessionStorage.getItem(this.storageKey);
      if (!raw) {
        return null;
      }
      const parsed = JSON.parse(raw) as HardwareItem[];
      return Array.isArray(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }

  private writeSession(items: HardwareItem[]): void {
    try {
      sessionStorage.setItem(this.storageKey, JSON.stringify(items));
    } catch {
      // ignore
    }
  }

  private readTree(): ClasificacionTree | null {
    try {
      const raw = sessionStorage.getItem(this.treeKey);
      if (!raw) {
        return null;
      }
      const parsed = JSON.parse(raw) as ClasificacionTree;
      if (!parsed || !Array.isArray(parsed.hardwares)) {
        return null;
      }
      return {
        hardwares: parsed.hardwares ?? [],
        sistemasByHardware: parsed.sistemasByHardware ?? {},
        modulosBySistema: parsed.modulosBySistema ?? {},
        frecuencias: parsed.frecuencias ?? [],
        frecuenciasDisponibles: !!parsed.frecuenciasDisponibles,
      };
    } catch {
      return null;
    }
  }

  private writeTree(): void {
    try {
      sessionStorage.setItem(this.treeKey, JSON.stringify(this.tree));
    } catch {
      // ignore
    }
  }
}
