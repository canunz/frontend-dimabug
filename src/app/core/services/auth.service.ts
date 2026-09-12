import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, catchError, map, of, switchMap, tap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthSession, Usuario, esAdministrador } from '../models/usuario.model';
import { UsuarioService } from './usuario.service';

const STORAGE_KEY = 'dimabug.auth';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly usuarios = inject(UsuarioService);
  private readonly router = inject(Router);

  private readonly sessionSignal = signal<AuthSession | null>(this.readSession());

  readonly session = this.sessionSignal.asReadonly();
  readonly usuario = computed(() => this.sessionSignal()?.usuario ?? null);
  readonly isAuthenticated = computed(() => !!this.sessionSignal()?.usuario);
  readonly isAdmin = computed(() => esAdministrador(this.sessionSignal()?.usuario));

  login(identifier: string, password: string): Observable<AuthSession> {
    const body = {
      username: identifier.trim(),
      email: identifier.trim(),
      password,
    };

    return this.http.post<unknown>(`${environment.apiUrl}/auth/login`, body).pipe(
      map((res) => this.normalizeSession(res)),
      catchError((err: HttpErrorResponse) => {
        if (environment.authFallback && (err.status === 404 || err.status === 0)) {
          return this.fallbackLogin(identifier.trim());
        }
        const apiMsg =
          typeof err.error === 'object'
            ? (err.error?.message || err.error?.error)
            : undefined;
        const message =
          err.status === 401 || err.status === 403
            ? 'Usuario o contraseña incorrectos.'
            : this.safeApiMessage(apiMsg, 'No fue posible iniciar sesión. Intente nuevamente.');
        return throwError(() => new Error(message));
      }),
      tap((session) => this.persist(session)),
    );
  }

  logout(): void {
    localStorage.removeItem(STORAGE_KEY);
    this.sessionSignal.set(null);
    this.router.navigateByUrl('/login');
  }

  token(): string | undefined {
    return this.sessionSignal()?.token;
  }

  solicitarCodigo(email: string): Observable<{ message: string; debugCode?: string }> {
    return this.http
      .post<{ message?: string; debugCode?: string; codigo?: string }>(
        `${environment.apiUrl}/auth/recuperar/email`,
        { email },
      )
      .pipe(
        map((res) => ({
          message: res.message || 'Te enviamos un código de 5 dígitos a tu correo.',
          debugCode: res.debugCode || res.codigo,
        })),
        catchError((err: HttpErrorResponse) => {
          if (environment.authFallback && (err.status === 404 || err.status === 0)) {
            return this.usuarios.listar().pipe(
              switchMap((list) => {
                const found = list.find(
                  (u) => u.usuarioEmail.toLowerCase() === email.trim().toLowerCase(),
                );
                if (!found) {
                  return throwError(() => new Error('No encontramos una cuenta con ese correo.'));
                }
                const code = String(Math.floor(10000 + Math.random() * 90000));
                sessionStorage.setItem('dimabug.reset.email', email.trim());
                sessionStorage.setItem('dimabug.reset.code', code);
                sessionStorage.setItem('dimabug.reset.verified', '0');
                return of({
                  message: 'Si el correo está registrado, recibirá un código de verificación.',
                  debugCode: environment.production ? undefined : code,
                });
              }),
            );
          }
          return throwError(
            () =>
              new Error(
                this.safeApiMessage(err.error?.message, 'No fue posible enviar el código. Intente más tarde.'),
              ),
          );
        }),
      );
  }

  validarCodigo(email: string, code: string): Observable<void> {
    return this.http
      .post<unknown>(`${environment.apiUrl}/auth/recuperar/codigo`, { email, code })
      .pipe(
        map(() => void 0),
        catchError((err: HttpErrorResponse) => {
          if (environment.authFallback && (err.status === 404 || err.status === 0)) {
            const storedEmail = sessionStorage.getItem('dimabug.reset.email');
            const storedCode = sessionStorage.getItem('dimabug.reset.code');
            if (
              storedEmail?.toLowerCase() === email.trim().toLowerCase() &&
              storedCode === code.trim()
            ) {
              sessionStorage.setItem('dimabug.reset.verified', '1');
              return of(void 0);
            }
            return throwError(() => new Error('Código incorrecto.'));
          }
          return throwError(
            () =>
              new Error(this.safeApiMessage(err.error?.message, 'El código ingresado no es válido.')),
          );
        }),
      );
  }

  cambiarPassword(email: string, newPassword: string): Observable<void> {
    return this.http
      .post<unknown>(`${environment.apiUrl}/auth/recuperar/password`, {
        email,
        password: newPassword,
        newPassword,
      })
      .pipe(
        map(() => void 0),
        catchError((err: HttpErrorResponse) => {
          if (environment.authFallback && (err.status === 404 || err.status === 0)) {
            const verified = sessionStorage.getItem('dimabug.reset.verified') === '1';
            const storedEmail = sessionStorage.getItem('dimabug.reset.email');
            if (!verified || storedEmail?.toLowerCase() !== email.trim().toLowerCase()) {
              return throwError(() => new Error('Debes validar el código primero.'));
            }
            return this.usuarios.listar().pipe(
              switchMap((list) => {
                const user = list.find(
                  (u) => u.usuarioEmail.toLowerCase() === email.trim().toLowerCase(),
                );
                if (!user) {
                  return throwError(() => new Error('Usuario no encontrado.'));
                }
                return this.usuarios
                  .actualizar(user.usuarioId, {
                    usuarioNombre: user.usuarioNombre,
                    usuarioEmail: user.usuarioEmail,
                    rolId: user.rolId || user.rol?.rolId || 0,
                    usuarioEstado: user.usuarioEstado,
                    usuarioPassword: newPassword,
                  })
                  .pipe(
                    tap(() => {
                      sessionStorage.removeItem('dimabug.reset.email');
                      sessionStorage.removeItem('dimabug.reset.code');
                      sessionStorage.removeItem('dimabug.reset.verified');
                    }),
                    map(() => void 0),
                  );
              }),
            );
          }
          return throwError(
            () =>
              new Error(
                this.safeApiMessage(
                  err.error?.message,
                  'No fue posible actualizar la contraseña. Intente más tarde.',
                ),
              ),
          );
        }),
      );
  }

  private fallbackLogin(identifier: string): Observable<AuthSession> {
    return this.usuarios.listar().pipe(
      switchMap((list) => {
        const needle = identifier.toLowerCase();
        const found = list.find((u) => {
          const email = u.usuarioEmail.toLowerCase();
          const local = email.split('@')[0];
          const nombre = u.usuarioNombre.toLowerCase();
          return email === needle || local === needle || nombre.includes(needle);
        });
        if (!found || !found.usuarioEstado) {
          return throwError(() => new Error('Usuario o contraseña incorrectos.'));
        }
        return of({ usuario: found });
      }),
      catchError((err: HttpErrorResponse | Error) => {
        if (err instanceof Error && !(err instanceof HttpErrorResponse)) {
          return throwError(() => err);
        }
        return throwError(
          () => new Error('El servicio no está disponible en este momento. Intente más tarde.'),
        );
      }),
    );
  }

  /** Evita filtrar mensajes técnicos (puertos, stack, endpoints) al usuario. */
  private safeApiMessage(raw: unknown, fallback: string): string {
    if (typeof raw !== 'string') {
      return fallback;
    }
    const msg = raw.trim();
    if (!msg) {
      return fallback;
    }
    const technical =
      /spring|boot|:8080|:8081|localhost|\/api\/|httpd|apache|proxy|endpoint|stack|exception|nullpointer/i;
    if (technical.test(msg) || msg.length > 160) {
      return fallback;
    }
    return msg;
  }

  private normalizeSession(raw: unknown): AuthSession {
    const data = raw as Record<string, unknown>;
    const token = (data['token'] || data['accessToken'] || data['jwt']) as string | undefined;
    const userRaw = data['usuario'] || data['user'] || data;
    return {
      token,
      usuario: this.usuarios.normalizeUsuario(userRaw),
    };
  }

  private persist(session: AuthSession): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    this.sessionSignal.set(session);
  }

  private readSession(): AuthSession | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return null;
      }
      return JSON.parse(raw) as AuthSession;
    } catch {
      return null;
    }
  }
}
