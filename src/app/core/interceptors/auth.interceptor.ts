import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { isPublicApiUrl } from '../config/api';
import { AuthService } from '../services/auth.service';

/** Evita lanzar varias comprobaciones si varias peticiones fallan juntas. */
let verificandoSesion = false;

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const token = auth.token();
  const publicRequest = isPublicApiUrl(req.url);

  const outgoing =
    !publicRequest && token
      ? req.clone({
          setHeaders: {
            Authorization: `Bearer ${token}`,
          },
        })
      : req;

  return next(outgoing).pipe(
    catchError((err: HttpErrorResponse) => {
      const sesionRechazada = !publicRequest && err.status === 401 && !!auth.token();
      if (sesionRechazada && req.url.includes('/api/auth/me')) {
        verificandoSesion = false;
        auth.logout();
      } else if (sesionRechazada && !verificandoSesion) {
        // Un 401 al editar o eliminar no cierra la sesión si el token sigue válido.
        verificandoSesion = true;
        auth.me().subscribe({
          next: () => {
            verificandoSesion = false;
          },
          error: () => {
            verificandoSesion = false;
          },
        });
      }
      return throwError(() => err);
    }),
  );
};
