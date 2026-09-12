import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Rol, Usuario, UsuarioPayload } from '../models/usuario.model';

@Injectable({ providedIn: 'root' })
export class UsuarioService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/usuarios`;
  private readonly rolesUrl = `${environment.apiUrl}/roles`;

  listar(): Observable<Usuario[]> {
    return this.http.get<unknown>(this.base).pipe(map((res) => this.asUsuarioList(res)));
  }

  obtener(id: number): Observable<Usuario> {
    return this.http.get<unknown>(`${this.base}/${id}`).pipe(map((res) => this.normalizeUsuario(res)));
  }

  crear(payload: UsuarioPayload): Observable<Usuario> {
    return this.http.post<unknown>(this.base, this.toApiBody(payload)).pipe(
      map((res) => this.normalizeUsuario(res)),
    );
  }

  actualizar(id: number, payload: UsuarioPayload): Observable<Usuario> {
    return this.http.put<unknown>(`${this.base}/${id}`, this.toApiBody(payload)).pipe(
      map((res) => this.normalizeUsuario(res)),
    );
  }

  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  cambiarEstado(id: number, activo: boolean): Observable<Usuario> {
    return this.http.patch<unknown>(`${this.base}/${id}/estado`, { usuarioEstado: activo }).pipe(
      map((res) => this.normalizeUsuario(res)),
    );
  }

  listarRoles(): Observable<Rol[]> {
    return this.http.get<unknown>(this.rolesUrl).pipe(map((res) => this.asRolList(res)));
  }

  private toApiBody(payload: UsuarioPayload): Record<string, unknown> {
    const body: Record<string, unknown> = {
      usuarioNombre: payload.usuarioNombre,
      usuarioEmail: payload.usuarioEmail,
      rolId: payload.rolId,
      usuarioEstado: payload.usuarioEstado,
    };
    if (payload.usuarioPassword) {
      body['usuarioPassword'] = payload.usuarioPassword;
      body['password'] = payload.usuarioPassword;
    }
    return body;
  }

  private asUsuarioList(res: unknown): Usuario[] {
    const list = Array.isArray(res) ? res : (res as { content?: unknown[] })?.content ?? [];
    return list.map((item) => this.normalizeUsuario(item));
  }

  private asRolList(res: unknown): Rol[] {
    const list = Array.isArray(res) ? res : (res as { content?: unknown[] })?.content ?? [];
    return list.map((item) => this.normalizeRol(item));
  }

  private normalizeRol(raw: unknown): Rol {
    const r = raw as Record<string, unknown>;
    return {
      rolId: Number(r['rolId'] ?? r['id'] ?? 0),
      rolNombre: String(r['rolNombre'] ?? r['nombre'] ?? ''),
    };
  }

  normalizeUsuario(raw: unknown): Usuario {
    const u = raw as Record<string, unknown>;
    const rolRaw = u['rol'] as Record<string, unknown> | undefined;
    const rol = rolRaw
      ? this.normalizeRol(rolRaw)
      : u['rolId']
        ? { rolId: Number(u['rolId']), rolNombre: String(u['rolNombre'] ?? '') }
        : undefined;

    return {
      usuarioId: Number(u['usuarioId'] ?? u['id'] ?? 0),
      usuarioNombre: String(u['usuarioNombre'] ?? u['nombre'] ?? ''),
      usuarioEmail: String(u['usuarioEmail'] ?? u['email'] ?? ''),
      usuarioEstado: Boolean(u['usuarioEstado'] ?? u['activo'] ?? true),
      usuarioFechaCreacion: u['usuarioFechaCreacion']
        ? String(u['usuarioFechaCreacion'])
        : undefined,
      rolId: rol?.rolId ?? (u['rolId'] != null ? Number(u['rolId']) : undefined),
      rol,
      rolNombre: rol?.rolNombre ?? (u['rolNombre'] ? String(u['rolNombre']) : undefined),
    };
  }
}
