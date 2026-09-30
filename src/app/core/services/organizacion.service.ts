import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import {
  Observable,
  catchError,
  concat,
  forkJoin,
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
import { DepartamentoContacto, DepartamentoItem, PruebaItem } from '../models/catalogo.model';
import { CatalogoRef, PruebaCatalogo, ResponsableRef } from '../models/conocimiento.model';

@Injectable({ providedIn: 'root' })
export class OrganizacionService {
  private readonly http = inject(HttpClient);
  private readonly departamentosDetalleKey = 'dimabug.departamentos.detalle.v1';
  private readonly pruebasKey = 'dimabug.pruebas.lista.v1';
  private pruebasCache$: Observable<PruebaCatalogo[]> | null = null;
  private departamentosCache$: Observable<CatalogoRef[]> | null = null;
  private departamentosDetalleCache$: Observable<DepartamentoItem[]> | null = null;
  private responsablesCache = new Map<number, ResponsableRef[]>();

  snapshotPruebas(): PruebaCatalogo[] {
    return this.readPruebasSession() ?? [];
  }

  listarPruebas(force = false): Observable<PruebaCatalogo[]> {
    if (!force && this.pruebasCache$) {
      return this.pruebasCache$;
    }

    const stale = !force ? this.readPruebasSession() : null;

    const network$ = this.http.get<unknown>(apiUrl('/pruebas')).pipe(
      map((res) => this.asPruebaLista(res)),
      tap((items) => this.writePruebasSession(items)),
      catchError((err: HttpErrorResponse) => {
        if (stale?.length) {
          return of(stale);
        }
        this.pruebasCache$ = null;
        return throwError(() => new Error(mensajeApiError(err, 'No fue posible cargar el catálogo de pruebas.')));
      }),
    );

    this.pruebasCache$ = (stale?.length ? concat(of(stale), network$) : network$).pipe(shareReplay(1));
    return this.pruebasCache$;
  }

  listarPruebasDetalle(force = false): Observable<PruebaItem[]> {
    return this.listarPruebas(force).pipe(
      map((items) =>
        items.map((p) => ({
          id: p.id,
          descripcion: p.descripcion,
          resultadoEsperado: p.resultadoEsperado,
          activo: true,
        })),
      ),
    );
  }

  listarDepartamentos(force = false): Observable<CatalogoRef[]> {
    if (!force && this.departamentosCache$) {
      return this.departamentosCache$;
    }
    this.departamentosCache$ = this.http.get<unknown>(apiUrl('/departamentos')).pipe(
      map((res) => this.asRefLista(res)),
      catchError((err: HttpErrorResponse) => {
        this.departamentosCache$ = null;
        return throwError(() => new Error(mensajeApiError(err, 'No fue posible cargar los departamentos.')));
      }),
      shareReplay(1),
    );
    return this.departamentosCache$;
  }

  listarDepartamentosDetalle(force = false): Observable<DepartamentoItem[]> {
    if (!force && this.departamentosDetalleCache$) {
      return this.departamentosDetalleCache$;
    }

    const stale = !force ? this.readDepartamentosSession() : null;

    const network$ = this.listarDepartamentos(force).pipe(
      switchMap((deps) => {
        const initial: DepartamentoItem[] = deps.map((d) => {
          const prev = stale?.find((s) => s.id === d.id);
          return {
            id: d.id,
            nombre: d.nombre,
            activo: true,
            responsables: prev?.responsables ?? [],
            contactos: prev?.contactos ?? [],
          };
        });

        if (!deps.length) {
          return of(initial);
        }

        const enrich$ = from(deps).pipe(
          mergeMap(
            (d) =>
              this.detalleDeDepartamento(d).pipe(
                catchError(() =>
                  of({
                    id: d.id,
                    nombre: d.nombre,
                    activo: true,
                    responsables: [] as string[],
                    contactos: [] as DepartamentoContacto[],
                  }),
                ),
              ),
            4,
          ),
          scan((acc, upd) => acc.map((item) => (item.id === upd.id ? upd : item)), initial),
        );

        return concat(of(initial), enrich$);
      }),
      catchError((err: HttpErrorResponse | Error) => {
        if (stale?.length) {
          return of(stale);
        }
        this.departamentosDetalleCache$ = null;
        const message =
          err instanceof Error ? err.message : mensajeApiError(err, 'No fue posible cargar los departamentos.');
        return throwError(() => new Error(message));
      }),
    );

    this.departamentosDetalleCache$ = (stale?.length ? concat(of(stale), network$) : network$).pipe(
      tap((items) => this.writeDepartamentosSession(items)),
      shareReplay(1),
    );

    return this.departamentosDetalleCache$;
  }

  responsablesDeDepartamento(departamentoId: number, force = false): Observable<ResponsableRef[]> {
    if (!force && this.responsablesCache.has(departamentoId)) {
      return of(this.responsablesCache.get(departamentoId)!);
    }
    return this.http.get<unknown>(apiUrl(`/departamentos/${departamentoId}/responsables`)).pipe(
      map((res) => this.asResponsableLista(res)),
      tap((items) => this.responsablesCache.set(departamentoId, items)),
      catchError((err: HttpErrorResponse) =>
        throwError(() => new Error(mensajeApiError(err, 'No fue posible cargar los responsables.'))),
      ),
    );
  }

  contactosDeDepartamento(departamentoId: number): Observable<DepartamentoContacto[]> {
    return this.http.get<unknown>(apiUrl(`/departamentos/${departamentoId}/contactos`)).pipe(
      map((res) =>
        this.asArray(res)
          .map((item) => {
            const r = item as Record<string, unknown>;
            return {
              tipo: String(r['tipo'] ?? 'Contacto'),
              numero: String(r['valor'] ?? r['numero'] ?? ''),
              activo: r['activo'] == null ? true : Boolean(r['activo']),
            };
          })
          .filter((c) => c.numero),
      ),
      catchError((err: HttpErrorResponse) =>
        throwError(() => new Error(mensajeApiError(err, 'No fue posible cargar los contactos.'))),
      ),
    );
  }

  private detalleDeDepartamento(d: CatalogoRef): Observable<DepartamentoItem> {
    return forkJoin({
      responsables: this.responsablesDeDepartamento(d.id).pipe(catchError(() => of([] as ResponsableRef[]))),
      contactos: this.contactosDeDepartamento(d.id).pipe(catchError(() => of([] as DepartamentoContacto[]))),
    }).pipe(
      map(({ responsables, contactos }) => ({
        id: d.id,
        nombre: d.nombre,
        activo: true,
        responsables: responsables.map((r) => r.nombre).filter(Boolean),
        contactos,
      })),
    );
  }

  private asPruebaLista(res: unknown): PruebaCatalogo[] {
    return this.asArray(res)
      .map((item) => {
        const r = item as Record<string, unknown>;
        return {
          id: Number(r['id'] ?? 0),
          descripcion: String(r['descripcion'] ?? ''),
          resultadoEsperado: String(r['resultadoEsperado'] ?? ''),
        };
      })
      .filter((item) => item.id > 0);
  }

  private asRefLista(res: unknown): CatalogoRef[] {
    return this.asArray(res)
      .map((item) => {
        const r = item as Record<string, unknown>;
        return {
          id: Number(r['id'] ?? r['departamentoId'] ?? 0),
          nombre: String(r['nombre'] ?? r['descripcion'] ?? ''),
        };
      })
      .filter((item) => item.id > 0 && item.nombre);
  }

  private asResponsableLista(res: unknown): ResponsableRef[] {
    return this.asArray(res)
      .map((item) => {
        const r = item as Record<string, unknown>;
        return {
          id: Number(r['id'] ?? r['responsableId'] ?? 0),
          nombre: String(r['nombre'] ?? r['responsableNombre'] ?? ''),
        };
      })
      .filter((item) => item.id > 0);
  }

  private asArray(res: unknown): unknown[] {
    return Array.isArray(res) ? res : (res as { content?: unknown[] })?.content ?? [];
  }

  private readDepartamentosSession(): DepartamentoItem[] | null {
    try {
      const raw = sessionStorage.getItem(this.departamentosDetalleKey);
      if (!raw) {
        return null;
      }
      const parsed = JSON.parse(raw) as DepartamentoItem[];
      return Array.isArray(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }

  private writeDepartamentosSession(items: DepartamentoItem[]): void {
    try {
      sessionStorage.setItem(this.departamentosDetalleKey, JSON.stringify(items));
    } catch {
      // ignore
    }
  }

  private readPruebasSession(): PruebaCatalogo[] | null {
    try {
      const raw = sessionStorage.getItem(this.pruebasKey);
      if (!raw) {
        return null;
      }
      const parsed = JSON.parse(raw) as PruebaCatalogo[];
      return Array.isArray(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }

  private writePruebasSession(items: PruebaCatalogo[]): void {
    try {
      sessionStorage.setItem(this.pruebasKey, JSON.stringify(items));
    } catch {
      // ignore
    }
  }
}
