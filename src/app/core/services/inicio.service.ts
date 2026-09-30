import { Injectable, inject } from '@angular/core';
import { Observable, catchError, concat, map, of, shareReplay, switchMap, take, tap } from 'rxjs';
import { ClasificacionService } from './clasificacion.service';
import { ConocimientoService } from './conocimiento.service';
import { OrganizacionService } from './organizacion.service';
import { CatalogoRef, Conocimiento, PruebaCatalogo } from '../models/conocimiento.model';

export interface FrecuenteItem {
  id: number;
  tipo: 'PROCEDIMIENTO' | 'HARDWARE' | 'CATEGORIA' | string;
  titulo: string;
  subtitulo: string;
  pasos: number | null;
  ruta: string;
}

export interface InicioDashboard {
  conocimientos: number;
  procedimientos: number;
  ultimaActualizacion: string | null;
  frecuentes: FrecuenteItem[];
}

@Injectable({ providedIn: 'root' })
export class InicioService {
  private readonly conocimientos = inject(ConocimientoService);
  private readonly organizacion = inject(OrganizacionService);
  private readonly clasificacion = inject(ClasificacionService);
  private readonly storageKey = 'dimabug.inicio.dashboard.v1';
  private dashboardCache$: Observable<InicioDashboard> | null = null;

  /**
   * Procedimientos frecuentes primero (GET /pruebas, con caché).
   * Conocimientos solo enriquecen contadores/fecha en segundo plano.
   */
  dashboard(force = false): Observable<InicioDashboard> {
    if (!force && this.dashboardCache$) {
      return this.dashboardCache$;
    }

    const stale = !force ? this.readSession() : null;

    const network$ = this.organizacion.listarPruebas().pipe(
      catchError(() => of([] as PruebaCatalogo[])),
      switchMap((pruebas) => {
        if (pruebas.length) {
          const quick = this.build(pruebas, null, null, stale);
          return concat(
            of(quick),
            this.conocimientos.listar().pipe(
              take(1),
              map((conocimientos) => this.build(pruebas, conocimientos, null, stale)),
              catchError(() => of(quick)),
            ),
          );
        }

        return this.clasificacion.listarHardware().pipe(
          catchError(() => of([] as CatalogoRef[])),
          switchMap((hardware) => {
            const quick = this.build([], null, hardware, stale);
            return concat(
              of(quick),
              this.conocimientos.listar().pipe(
                take(1),
                map((conocimientos) => this.build([], conocimientos, hardware, stale)),
                catchError(() => of(quick)),
              ),
            );
          }),
        );
      }),
    );

    this.dashboardCache$ = (stale ? concat(of(stale), network$) : network$).pipe(
      tap((data) => this.writeSession(data)),
      shareReplay(1),
    );

    return this.dashboardCache$;
  }

  private build(
    pruebas: PruebaCatalogo[],
    conocimientos: Conocimiento[] | null,
    hardware: CatalogoRef[] | null,
    stale: InicioDashboard | null,
  ): InicioDashboard {
    const frecuentes: FrecuenteItem[] = pruebas.length
      ? pruebas.slice(0, 4).map((p) => ({
          id: p.id,
          tipo: 'PROCEDIMIENTO',
          titulo: p.descripcion,
          subtitulo: p.resultadoEsperado || 'Procedimiento',
          pasos: null,
          ruta: '/procedimientos',
        }))
      : (hardware ?? []).slice(0, 4).map((h) => ({
          id: h.id,
          tipo: 'HARDWARE',
          titulo: h.nombre,
          subtitulo: 'Hardware',
          pasos: null,
          ruta: '/plataforma/hardware',
        }));

    const fechas = (conocimientos ?? [])
      .map((c) => c.fechaModificacion || c.fechaCreacion)
      .filter(Boolean)
      .sort()
      .reverse();

    return {
      conocimientos: conocimientos?.length ?? stale?.conocimientos ?? 0,
      procedimientos: pruebas.length || stale?.procedimientos || 0,
      ultimaActualizacion: fechas[0] || stale?.ultimaActualizacion || null,
      frecuentes,
    };
  }

  private readSession(): InicioDashboard | null {
    try {
      const raw = sessionStorage.getItem(this.storageKey);
      if (!raw) {
        return null;
      }
      const parsed = JSON.parse(raw) as InicioDashboard;
      return parsed && Array.isArray(parsed.frecuentes) ? parsed : null;
    } catch {
      return null;
    }
  }

  private writeSession(data: InicioDashboard): void {
    try {
      sessionStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch {
      // ignore
    }
  }
}
