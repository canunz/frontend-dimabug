import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, concat, map, of, shareReplay, tap, throwError } from 'rxjs';
import { apiUrl } from '../config/api';
import { mensajeApiError } from '../http/api-error';
import { Rol, Usuario, UsuarioPayload } from '../models/usuario.model';

function fechaApi(value: unknown): string | undefined {
  if (value == null || value === '') {
    return undefined;
  }
  if (Array.isArray(value)) {
    const [year, month, day, hour = 0, minute = 0, second = 0] = value.map((part) => Number(part));
    const pad = (part: number) => String(part).padStart(2, '0');
    if (!year || !month || !day) {
      return undefined;
    }
    return `${year}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}:${pad(second)}`;
  }
  return String(value);
}

@Injectable({ providedIn: 'root' })
export class UsuarioService {
  private readonly http = inject(HttpClient);
  private readonly base = apiUrl('/usuarios');
  private readonly rolesUrl = apiUrl('/roles');
  private readonly listaKey = 'dimabug.usuarios.lista.v1';
  private readonly rolesKey = 'dimabug.roles.lista.v1';

  private listaCache$: Observable<Usuario[]> | null = null;
  private rolesCache$: Observable<Rol[]> | null = null;

  /** Caché de sesión al instante + refresco en red. */
  listar(force = false): Observable<Usuario[]> {
    if (!force && this.listaCache$) {
      return this.listaCache$;
    }

    const stale = !force ? this.readUsuariosSession() : null;

    const network$ = this.http.get<unknown>(this.base).pipe(
      map((res) => this.asUsuarioList(res)),
      tap((list) => this.writeUsuariosSession(list)),
      catchError((err: HttpErrorResponse) => {
        if (stale?.length) {
          return of(stale);
        }
        this.listaCache$ = null;
        return throwError(() => new Error(mensajeApiError(err, 'No se pudieron cargar los usuarios.')));
      }),
    );

    this.listaCache$ = (stale?.length ? concat(of(stale), network$) : network$).pipe(shareReplay(1));
    return this.listaCache$;
  }

  obtener(id: number): Observable<Usuario> {
    return this.http.get<unknown>(`${this.base}/${id}`).pipe(map((res) => this.normalizeUsuario(res)));
  }

  crear(payload: UsuarioPayload): Observable<Usuario> {
    return this.http.post<unknown>(this.base, this.toApiBody(payload)).pipe(
      map((res) => this.normalizeUsuario(res)),
      tap((item) => this.upsertLocal(item)),
    );
  }

  actualizar(id: number, payload: UsuarioPayload): Observable<Usuario> {
    return this.http.put<unknown>(`${this.base}/${id}`, this.toApiBody(payload)).pipe(
      map((res) => this.normalizeUsuario(res)),
      tap((item) => this.upsertLocal(item)),
    );
  }

  cambiarEstado(id: number, activo: boolean): Observable<Usuario> {
    return this.http.patch<unknown>(`${this.base}/${id}/estado`, { activo }).pipe(
      map((res) => this.normalizeUsuario(res)),
      tap((item) => this.upsertLocal(item)),
    );
  }

  listarRoles(force = false): Observable<Rol[]> {
    if (!force && this.rolesCache$) {
      return this.rolesCache$;
    }

    const stale = !force ? this.readRolesSession() : null;

    const network$ = this.http.get<unknown>(this.rolesUrl).pipe(
      map((res) => this.asRolList(res)),
      tap((list) => this.writeRolesSession(list)),
      catchError((err: HttpErrorResponse) => {
        if (stale?.length) {
          return of(stale);
        }
        this.rolesCache$ = null;
        return throwError(() => new Error(mensajeApiError(err, 'No se pudieron cargar los roles.')));
      }),
    );

    this.rolesCache$ = (stale?.length ? concat(of(stale), network$) : network$).pipe(shareReplay(1));
    return this.rolesCache$;
  }

  private invalidateLista(): void {
    this.listaCache$ = null;
  }

  private upsertLocal(item: Usuario): void {
    this.invalidateLista();
    const list = this.readUsuariosSession() ?? [];
    const idx = list.findIndex((u) => u.usuarioId === item.usuarioId);
    if (idx >= 0) {
      list[idx] = item;
    } else {
      list.unshift(item);
    }
    this.writeUsuariosSession(list);
  }

  private toApiBody(payload: UsuarioPayload): Record<string, unknown> {
    const body: Record<string, unknown> = {
      nombre: payload.usuarioNombre,
      email: payload.usuarioEmail,
      rolId: payload.rolId,
    };
    if (payload.usuarioPassword) {
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
    const rolRaw = u['rol'];
    const rol =
      typeof rolRaw === 'string'
        ? { rolId: Number(u['rolId'] ?? 0), rolNombre: rolRaw }
        : rolRaw && typeof rolRaw === 'object'
          ? this.normalizeRol(rolRaw)
          : u['rolId']
            ? { rolId: Number(u['rolId']), rolNombre: String(u['rolNombre'] ?? '') }
            : undefined;

    return {
      usuarioId: Number(u['usuarioId'] ?? u['id'] ?? 0),
      usuarioNombre: String(u['usuarioNombre'] ?? u['nombre'] ?? ''),
      usuarioEmail: String(u['usuarioEmail'] ?? u['email'] ?? ''),
      usuarioEstado: Boolean(u['usuarioEstado'] ?? u['activo'] ?? true),
      usuarioFechaCreacion: fechaApi(u['usuarioFechaCreacion'] ?? u['fechaCreacion']),
      rolId: rol?.rolId ?? (u['rolId'] != null ? Number(u['rolId']) : undefined),
      rol,
      rolNombre: rol?.rolNombre ?? (u['rolNombre'] ? String(u['rolNombre']) : undefined),
    };
  }

  private readUsuariosSession(): Usuario[] | null {
    try {
      const raw = sessionStorage.getItem(this.listaKey);
      if (!raw) {
        return null;
      }
      const parsed = JSON.parse(raw) as unknown[];
      return Array.isArray(parsed) ? parsed.map((item) => this.normalizeUsuario(item)) : null;
    } catch {
      return null;
    }
  }

  private writeUsuariosSession(items: Usuario[]): void {
    try {
      sessionStorage.setItem(this.listaKey, JSON.stringify(items));
    } catch {
      // ignore
    }
  }

  private readRolesSession(): Rol[] | null {
    try {
      const raw = sessionStorage.getItem(this.rolesKey);
      if (!raw) {
        return null;
      }
      const parsed = JSON.parse(raw) as unknown[];
      return Array.isArray(parsed) ? parsed.map((item) => this.normalizeRol(item)) : null;
    } catch {
      return null;
    }
  }

  private writeRolesSession(items: Rol[]): void {
    try {
      sessionStorage.setItem(this.rolesKey, JSON.stringify(items));
    } catch {
      // ignore
    }
  }
}
