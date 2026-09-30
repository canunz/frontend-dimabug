import { DatePipe } from '@angular/common';
import { Component, HostListener, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { UsuarioService } from '../../core/services/usuario.service';
import { Rol, Usuario, esAdministrador, loginUsername } from '../../core/models/usuario.model';
import { CatalogoTabsComponent } from '../../shared/ui/catalogo-tabs.component';
import { LoadingModalComponent } from '../../shared/ui/loading-modal.component';

type TonoConfirmacion = 'peligro' | 'aviso' | 'ok';

interface Confirmacion {
  titulo: string;
  pregunta: string;
  nombre: string;
  nota?: string;
  accion: string;
  tono: TonoConfirmacion;
  ejecutar: () => void;
}

@Component({
  selector: 'app-usuarios',
  standalone: true,
  imports: [ReactiveFormsModule, DatePipe, CatalogoTabsComponent, LoadingModalComponent],
  templateUrl: './usuarios.component.html',
  styleUrl: './usuarios.component.css',
})
export class UsuariosComponent implements OnInit {
  private readonly usuariosApi = inject(UsuarioService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  usuarios: Usuario[] = [];
  roles: Rol[] = [];
  loading = false;
  saving = false;
  cambiandoEstado = false;
  mensajeCarga = 'Guardando cambios…';
  error = '';
  success = '';
  modalOpen = false;
  editId: number | null = null;
  private editOriginal: { nombre: string; email: string; rolId: number; activo: boolean } | null = null;
  confirmacion: Confirmacion | null = null;

  form = this.fb.nonNullable.group({
    nombre: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    rolId: [0, Validators.required],
    password1: [''],
    password2: [''],
    activo: [true],
  });

  ngOnInit(): void {
    this.cargar();
  }

  get currentUserId(): number | undefined {
    return this.auth.usuario()?.usuarioId;
  }

  get editandoCuentaActual(): boolean {
    if (this.editId == null) {
      return false;
    }
    return this.esCuentaActual({
      usuarioId: this.editId,
      usuarioEmail: this.form.controls.email.value || '',
    });
  }

  esCuentaActual(u: Pick<Usuario, 'usuarioId' | 'usuarioEmail'>): boolean {
    const yo = this.auth.usuario();
    if (!yo) {
      return false;
    }
    const mismoId = yo.usuarioId > 0 && u.usuarioId === yo.usuarioId;
    const mismoCorreo =
      !!yo.usuarioEmail &&
      yo.usuarioEmail.trim().toLowerCase() === (u.usuarioEmail || '').trim().toLowerCase();
    return mismoId || mismoCorreo;
  }

  cargar(force = false): void {
    this.loading = !this.usuarios.length;
    this.error = '';
    let first = true;
    this.usuariosApi.listar(force).subscribe({
      next: (list) => {
        this.usuarios = list;
        if (first) {
          first = false;
          this.loading = false;
        }
      },
      error: (err: Error) => {
        this.loading = false;
        this.error = err.message || 'No se pudieron cargar los usuarios. Intente nuevamente.';
      },
    });
    this.usuariosApi.listarRoles().subscribe({
      next: (roles) => (this.roles = roles),
      error: () => {
        /* roles opcionales si falla */
      },
    });
  }

  openCreate(): void {
    this.editId = null;
    this.editOriginal = null;
    this.error = '';
    this.form.controls.email.enable({ emitEvent: false });
    this.form.reset({
      nombre: '',
      email: '',
      rolId: this.roles[0]?.rolId || 0,
      password1: '',
      password2: '',
      activo: true,
    });
    this.form.controls.password1.setValidators([Validators.required, Validators.minLength(6)]);
    this.form.controls.password1.updateValueAndValidity();
    this.modalOpen = true;
  }

  openEdit(u: Usuario): void {
    this.editId = u.usuarioId;
    this.editOriginal = {
      nombre: u.usuarioNombre,
      email: u.usuarioEmail,
      rolId: u.rolId || u.rol?.rolId || 0,
      activo: u.usuarioEstado,
    };
    this.error = '';
    this.form.reset({
      nombre: u.usuarioNombre,
      email: u.usuarioEmail,
      rolId: u.rolId || u.rol?.rolId || 0,
      password1: '',
      password2: '',
      activo: u.usuarioEstado,
    });
    this.form.controls.password1.clearValidators();
    this.form.controls.password1.updateValueAndValidity();
    if (this.esCuentaActual(u)) {
      this.form.controls.email.disable({ emitEvent: false });
    } else {
      this.form.controls.email.enable({ emitEvent: false });
    }
    this.form.controls.nombre.enable({ emitEvent: false });
    this.form.controls.rolId.enable({ emitEvent: false });
    this.form.controls.activo.enable({ emitEvent: false });
    this.form.controls.password1.enable({ emitEvent: false });
    this.form.controls.password2.enable({ emitEvent: false });
    this.modalOpen = true;
  }

  closeModal(): void {
    this.modalOpen = false;
  }

  save(): void {
    this.error = '';
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error = 'Revisa los datos del formulario.';
      return;
    }
    const raw = this.form.getRawValue();
    if (raw.password1 || raw.password2) {
      if (raw.password1 !== raw.password2) {
        this.error = 'Las contraseñas no coinciden.';
        return;
      }
    }
    if (!this.editId && !raw.password1) {
      this.error = 'La contraseña es obligatoria al crear.';
      return;
    }

    const original = this.editOriginal;
    const correo = (original?.email || raw.email).trim();
    const emailCambio =
      !!original && raw.email.trim().toLowerCase() !== original.email.trim().toLowerCase();
    const editandoActual =
      this.editId != null &&
      this.esCuentaActual({
        usuarioId: this.editId,
        usuarioEmail: correo,
      });

    const payload = {
      usuarioNombre: raw.nombre.trim(),
      usuarioEmail: emailCambio && !editandoActual ? raw.email.trim() : correo,
      rolId: Number(raw.rolId),
      usuarioEstado: !!raw.activo,
      usuarioPassword: raw.password1 || undefined,
    };

    if (this.editId && original) {
      const sinCambios =
        payload.usuarioNombre === original.nombre.trim() &&
        payload.usuarioEmail.trim().toLowerCase() === original.email.trim().toLowerCase() &&
        payload.rolId === original.rolId &&
        payload.usuarioEstado === original.activo &&
        !payload.usuarioPassword;
      if (sinCambios) {
        this.modalOpen = false;
        return;
      }
    }

    this.mensajeCarga = 'Guardando cambios…';
    this.saving = true;
    const req$ = this.editId
      ? this.usuariosApi.actualizar(this.editId, payload)
      : this.usuariosApi.crear(payload);

    req$.subscribe({
      next: () => {
        this.saving = false;
        this.modalOpen = false;
        if (editandoActual) {
          const rol = this.roles.find((item) => item.rolId === payload.rolId);
          this.auth.actualizarSesion({
            usuarioNombre: payload.usuarioNombre,
            usuarioEmail: payload.usuarioEmail,
            rolId: payload.rolId,
            rolNombre: rol?.rolNombre,
            rol,
          });
          if (!esAdministrador(this.auth.usuario())) {
            void this.router.navigateByUrl('/inicio');
            return;
          }
        }
        this.success = this.editId ? 'Usuario actualizado.' : 'Usuario creado.';
        this.cargar(true);
      },
      error: (err) => {
        this.saving = false;
        this.error =
          err?.error?.message ||
          err?.message ||
          'No se pudo guardar el usuario.';
      },
    });
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.confirmacion) {
      this.cerrarConfirmacion();
    }
  }

  toggleEstado(u: Usuario): void {
    if (this.esCuentaActual(u)) {
      return;
    }
    const next = !u.usuarioEstado;
    this.confirmacion = {
      titulo: next ? 'Activar usuario' : 'Inactivar usuario',
      pregunta: next ? '¿Estás seguro de activar a' : '¿Estás seguro de inactivar a',
      nombre: u.usuarioNombre,
      nota: next ? undefined : 'No podrá iniciar sesión mientras esté inactivo.',
      accion: next ? 'Activar' : 'Inactivar',
      tono: next ? 'ok' : 'aviso',
      ejecutar: () => this.aplicarEstado(u, next),
    };
  }

  aceptarConfirmacion(): void {
    const accion = this.confirmacion?.ejecutar;
    this.confirmacion = null;
    accion?.();
  }

  cerrarConfirmacion(): void {
    this.confirmacion = null;
  }

  private aplicarEstado(u: Usuario, next: boolean): void {
    const fallbackPut = () =>
      this.usuariosApi.actualizar(u.usuarioId, {
        usuarioNombre: u.usuarioNombre,
        usuarioEmail: u.usuarioEmail,
        rolId: u.rolId || u.rol?.rolId || 0,
        usuarioEstado: next,
      });

    this.mensajeCarga = next ? 'Activando usuario…' : 'Desactivando usuario…';
    this.cambiandoEstado = true;
    this.usuariosApi.cambiarEstado(u.usuarioId, next).subscribe({
      next: () => {
        this.cambiandoEstado = false;
        this.success = next ? `${u.usuarioNombre} quedó activo.` : `${u.usuarioNombre} quedó inactivo.`;
        this.cargar(true);
      },
      error: () => {
        fallbackPut().subscribe({
          next: () => {
            this.cambiandoEstado = false;
            this.success = next
              ? `${u.usuarioNombre} quedó activo.`
              : `${u.usuarioNombre} quedó inactivo.`;
            this.cargar(true);
          },
          error: () => {
            this.cambiandoEstado = false;
            this.error = 'No se pudo cambiar el estado.';
          },
        });
      },
    });
  }

  rolNombre(u: Usuario): string {
    return u.rol?.rolNombre || u.rolNombre || '—';
  }

  usuarioLogin(u: Usuario): string {
    return loginUsername(u);
  }
}
