import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, map, throwError } from 'rxjs';
import { apiUrl } from '../config/api';
import { mensajeApiError } from '../http/api-error';
import {
  ActualizarEjecucionPasoRequest,
  CancelarEjecucionRequest,
  Ejecucion,
  EjecucionPaso,
  EstadoEjecucion,
  ProcedimientoResumen,
  EstadoProcedimiento,
} from '../models/ejecucion.model';

@Injectable({ providedIn: 'root' })
export class EjecucionService {
  private readonly http = inject(HttpClient);

  iniciar(procedimientoId: number): Observable<Ejecucion> {
    return this.http.post<unknown>(apiUrl(`/procedimientos/${procedimientoId}/ejecuciones`), null).pipe(
      map((res) => this.normalizeEjecucion(res)),
      catchError((err: HttpErrorResponse) => throwError(() => new Error(this.mensaje(err)))),
    );
  }

  listar(): Observable<Ejecucion[]> {
    return this.http.get<unknown>(apiUrl('/ejecuciones')).pipe(
      map((res) => this.asArray(res).map((item) => this.normalizeEjecucion(item))),
      catchError((err: HttpErrorResponse) => throwError(() => new Error(this.mensaje(err)))),
    );
  }

  obtener(id: number): Observable<Ejecucion> {
    return this.http.get<unknown>(apiUrl(`/ejecuciones/${id}`)).pipe(
      map((res) => this.normalizeEjecucion(res)),
      catchError((err: HttpErrorResponse) => throwError(() => new Error(this.mensaje(err)))),
    );
  }

  obtenerPasos(id: number): Observable<EjecucionPaso[]> {
    return this.http.get<unknown>(apiUrl(`/ejecuciones/${id}/pasos`)).pipe(
      map((res) => this.asArray(res).map((item) => this.normalizePaso(item))),
      catchError((err: HttpErrorResponse) => throwError(() => new Error(this.mensaje(err)))),
    );
  }

  actualizarPaso(
    ejecucionId: number,
    ejecucionPasoId: number,
    request: ActualizarEjecucionPasoRequest,
  ): Observable<EjecucionPaso> {
    const observacion = request.observacion?.trim() ? request.observacion.trim() : null;
    return this.http
      .patch<unknown>(apiUrl(`/ejecuciones/${ejecucionId}/pasos/${ejecucionPasoId}`), {
        cumplido: request.cumplido,
        observacion,
      })
      .pipe(
        map((res) => this.normalizePaso(res)),
        catchError((err: HttpErrorResponse) => throwError(() => new Error(this.mensaje(err)))),
      );
  }

  completar(id: number): Observable<Ejecucion> {
    return this.http.patch<unknown>(apiUrl(`/ejecuciones/${id}/completar`), null).pipe(
      map((res) => this.normalizeEjecucion(res)),
      catchError((err: HttpErrorResponse) => throwError(() => new Error(this.mensaje(err)))),
    );
  }

  cancelar(id: number, request: CancelarEjecucionRequest): Observable<Ejecucion> {
    const observaciones = request.observaciones?.trim() ? request.observaciones.trim() : null;
    return this.http.patch<unknown>(apiUrl(`/ejecuciones/${id}/cancelar`), { observaciones }).pipe(
      map((res) => this.normalizeEjecucion(res)),
      catchError((err: HttpErrorResponse) => throwError(() => new Error(this.mensaje(err)))),
    );
  }

  listarProcedimientos(): Observable<ProcedimientoResumen[]> {
    return this.http.get<unknown>(apiUrl('/procedimientos')).pipe(
      map((res) => this.asArray(res).map((item) => this.normalizeProcedimiento(item))),
      catchError((err: HttpErrorResponse) => throwError(() => new Error(mensajeApiError(err, 'No fue posible cargar los procedimientos.')))),
    );
  }

  obtenerProcedimiento(id: number): Observable<ProcedimientoResumen> {
    return this.http.get<unknown>(apiUrl(`/procedimientos/${id}`)).pipe(
      map((res) => this.normalizeProcedimiento(res)),
      catchError((err: HttpErrorResponse) => throwError(() => new Error(mensajeApiError(err, 'El procedimiento no está disponible.')))),
    );
  }

  private mensaje(err: HttpErrorResponse): string {
    if (err.status === 403) {
      return 'No tienes permisos para acceder o modificar esta ejecución.';
    }
    if (err.status === 404) {
      return 'La ejecución solicitada no está disponible.';
    }
    if (err.status === 401) {
      return mensajeApiError(err, 'Su sesión no es válida. Inicie sesión nuevamente.');
    }
    if (err.status === 0 || err.status >= 500) {
      return 'Ocurrió un error inesperado. Intente más tarde.';
    }
    return mensajeApiError(err, 'No fue posible completar la operación.');
  }

  private asArray(res: unknown): unknown[] {
    return Array.isArray(res) ? res : (res as { content?: unknown[] })?.content ?? [];
  }

  private normalizeEjecucion(raw: unknown): Ejecucion {
    const r = (raw ?? {}) as Record<string, unknown>;
    const usuario = (r['usuario'] ?? {}) as Record<string, unknown>;
    return {
      id: Number(r['id'] ?? 0),
      procedimientoId: Number(r['procedimientoId'] ?? 0),
      estado: this.estado(r['estado']),
      fechaInicio: r['fechaInicio'] != null ? String(r['fechaInicio']) : null,
      fechaFin: r['fechaFin'] != null ? String(r['fechaFin']) : null,
      observaciones: r['observaciones'] != null ? String(r['observaciones']) : null,
      usuario: {
        id: Number(usuario['id'] ?? 0),
        nombre: String(usuario['nombre'] ?? ''),
        email: String(usuario['email'] ?? ''),
      },
    };
  }

  private normalizePaso(raw: unknown): EjecucionPaso {
    const r = (raw ?? {}) as Record<string, unknown>;
    return {
      ejecucionPasoId: Number(r['ejecucionPasoId'] ?? r['id'] ?? 0),
      pasoId: Number(r['pasoId'] ?? 0),
      orden: Number(r['orden'] ?? 0),
      instruccion: String(r['instruccion'] ?? ''),
      esCritico: r['esCritico'] === true,
      cumplido: r['cumplido'] === true,
      observacion: r['observacion'] != null && String(r['observacion']).trim() ? String(r['observacion']) : null,
      fecha: r['fecha'] != null ? String(r['fecha']) : null,
    };
  }

  private normalizeProcedimiento(raw: unknown): ProcedimientoResumen {
    const r = (raw ?? {}) as Record<string, unknown>;
    const estado = String(r['estado'] ?? 'BORRADOR').toUpperCase();
    return {
      id: Number(r['id'] ?? 0),
      nombre: String(r['nombre'] ?? ''),
      descripcion: r['descripcion'] != null ? String(r['descripcion']) : null,
      estado: (estado === 'PUBLICADO' ? 'PUBLICADO' : 'BORRADOR') as EstadoProcedimiento,
    };
  }

  private estado(raw: unknown): EstadoEjecucion {
    const valor = String(raw ?? 'EN_CURSO').toUpperCase();
    if (valor === 'COMPLETADA' || valor === 'CANCELADA') {
      return valor;
    }
    return 'EN_CURSO';
  }
}
