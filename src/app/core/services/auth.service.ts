import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, catchError, map, tap, throwError } from 'rxjs';
import { apiUrl } from '../config/api';
import { AuthSession, Usuario, esAdministrador, esSoporte, esStaff } from '../models/usuario.model';

const STORAGE_KEY = 'dimabug.auth';

interface LoginResponse {
  token: string;
  usuarioId: number;
  nombre: string;
  email: string;
  rol: string;
}

interface AuthMeResponse {
  email: string;
  estado: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  private readonly sessionSignal = signal<AuthSession | null>(this.readSession());

  readonly session = this.sessionSignal.asReadonly();
  readonly usuario = computed(() => this.sessionSignal()?.usuario ?? null);
  readonly isAuthenticated = computed(() => {
    const session = this.sessionSignal();
    return !!session?.token && !!session.usuario;
  });
  readonly isAdmin = computed(() => esAdministrador(this.sessionSignal()?.usuario));
  readonly isSoporte = computed(() => esSoporte(this.sessionSignal()?.usuario));
  readonly isStaff = computed(() => esStaff(this.sessionSignal()?.usuario));

  login(email: string, password: string): Observable<AuthSession> {
    return this.http
      .post<LoginResponse>(apiUrl('/auth/login'), {
        email: email.trim(),
        password,
      })
      .pipe(
        map((res) => this.sessionFromLogin(res)),
        tap((session) => this.persist(session)),
        catchError((err: HttpErrorResponse) => throwError(() => new Error(this.loginError(err)))),
      );
  }

  me(): Observable<AuthMeResponse> {
    return this.http.get<AuthMeResponse>(apiUrl('/auth/me')).pipe(
      catchError((err: HttpErrorResponse) =>
        throwError(() => new Error(this.httpError(err, 'No fue posible comprobar la autenticación.'))),
      ),
    );
  }

  logout(): void {
    localStorage.removeItem(STORAGE_KEY);
    this.sessionSignal.set(null);
    this.router.navigateByUrl('/login');
  }

  /** Actualiza los datos visibles de la sesión sin tocar el token. */
  actualizarSesion(parcial: Partial<Usuario>): void {
    const session = this.sessionSignal();
    if (!session) {
      return;
    }
    this.persist({
      ...session,
      usuario: { ...session.usuario, ...parcial },
    });
  }

  token(): string | undefined {
    return this.sessionSignal()?.token;
  }

  solicitarCodigo(email: string): Observable<{ message: string; debugCode?: string }> {
    return this.http
      .post<{ message?: string; debugCode?: string; codigo?: string }>(apiUrl('/auth/recuperar/email'), {
        email,
      })
      .pipe(
        map((res) => ({
          message: res.message || 'Te enviamos un código de 5 dígitos a tu correo.',
          debugCode: res.debugCode || res.codigo,
        })),
        catchError((err: HttpErrorResponse) =>
          throwError(() => new Error(this.recoverError(err, 'No fue posible enviar el código. Intente más tarde.'))),
        ),
      );
  }

  validarCodigo(email: string, code: string): Observable<void> {
    return this.http.post<unknown>(apiUrl('/auth/recuperar/codigo'), { email, code }).pipe(
      map(() => void 0),
      catchError((err: HttpErrorResponse) =>
        throwError(() => new Error(this.recoverError(err, 'El código ingresado no es válido.'))),
      ),
    );
  }

  cambiarPassword(email: string, newPassword: string): Observable<void> {
    return this.http
      .post<unknown>(apiUrl('/auth/recuperar/password'), {
        email,
        password: newPassword,
        newPassword,
      })
      .pipe(
        map(() => void 0),
        catchError((err: HttpErrorResponse) =>
          throwError(
            () =>
              new Error(this.recoverError(err, 'No fue posible actualizar la contraseña. Intente más tarde.')),
          ),
        ),
      );
  }

  private sessionFromLogin(res: LoginResponse): AuthSession {
    if (!res?.token) {
      throw new Error('La API no devolvió un token de autenticación.');
    }

    const usuario: Usuario = {
      usuarioId: Number(res.usuarioId),
      usuarioNombre: res.nombre,
      usuarioEmail: res.email,
      usuarioEstado: true,
      rolNombre: res.rol,
      rol: res.rol ? { rolId: 0, rolNombre: res.rol } : undefined,
    };

    return { token: res.token, usuario };
  }

  private loginError(err: HttpErrorResponse): string {
    if (err.status === 400) {
      return this.safeApiMessage(this.extractApiMessage(err), 'Los datos enviados no son válidos.');
    }
    if (err.status === 401) {
      return 'Usuario o contraseña incorrectos.';
    }
    if (err.status === 403) {
      return 'Su cuenta no tiene autorización o está inactiva.';
    }
    if (err.status === 0) {
      return 'No se pudo conectar con el servidor. Intente más tarde.';
    }
    if (err.status === 404) {
      return 'El servidor no tiene el login activo. Reinicia el backend de este proyecto (puerto 8080) e intenta de nuevo.';
    }
    return this.httpError(err, 'No fue posible iniciar sesión. Intente nuevamente.');
  }

  private recoverError(err: HttpErrorResponse, fallback: string): string {
    if (err.status === 404 || err.status === 401 || err.status === 403) {
      return 'La recuperación de contraseña aún no está disponible. Use su correo y clave para entrar, o contacte al administrador.';
    }
    return this.httpError(err, fallback);
  }

  private httpError(err: HttpErrorResponse, fallback: string): string {
    if (err.status === 400) {
      return this.safeApiMessage(this.extractApiMessage(err), 'Los datos enviados no son válidos.');
    }
    if (err.status === 401) {
      return 'No autenticado o token inválido.';
    }
    if (err.status === 403) {
      return 'No tiene autorización para esta operación.';
    }
    if (err.status === 404) {
      return fallback;
    }
    if (err.status === 0) {
      return 'No se pudo conectar con el servidor. Intente más tarde.';
    }
    return this.safeApiMessage(this.extractApiMessage(err), fallback);
  }

  private extractApiMessage(err: HttpErrorResponse): unknown {
    if (typeof err.error === 'string') {
      return err.error;
    }
    if (err.error && typeof err.error === 'object') {
      return err.error.message || err.error.error;
    }
    return undefined;
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
      /spring|boot|:8080|:8081|localhost|\/api\/|httpd|apache|proxy|endpoint|stack|exception|nullpointer|^not found$|^unauthorized$|^forbidden$/i;
    if (technical.test(msg) || msg.length > 160) {
      return fallback;
    }
    return msg;
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
      const session = JSON.parse(raw) as AuthSession;
      if (!session?.token || !session.usuario) {
        localStorage.removeItem(STORAGE_KEY);
        return null;
      }
      return session;
    } catch {
      return null;
    }
  }
}
