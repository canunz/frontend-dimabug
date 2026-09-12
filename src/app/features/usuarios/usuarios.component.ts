import { DatePipe } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { UsuarioService } from '../../core/services/usuario.service';
import { Rol, Usuario } from '../../core/models/usuario.model';

@Component({
  selector: 'app-usuarios',
  standalone: true,
  imports: [ReactiveFormsModule, DatePipe],
  templateUrl: './usuarios.component.html',
  styleUrl: './usuarios.component.css',
})
export class UsuariosComponent implements OnInit {
  private readonly usuariosApi = inject(UsuarioService);
  private readonly auth = inject(AuthService);
  private readonly fb = inject(FormBuilder);

  usuarios: Usuario[] = [];
  roles: Rol[] = [];
  loading = false;
  saving = false;
  error = '';
  success = '';
  modalOpen = false;
  editId: number | null = null;

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

  cargar(): void {
    this.loading = true;
    this.error = '';
    this.usuariosApi.listar().subscribe({
      next: (list) => {
        this.usuarios = list;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.error = 'No se pudieron cargar los usuarios. Intente nuevamente.';
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
    this.error = '';
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

    const payload = {
      usuarioNombre: raw.nombre.trim(),
      usuarioEmail: raw.email.trim(),
      rolId: Number(raw.rolId),
      usuarioEstado: !!raw.activo,
      usuarioPassword: raw.password1 || undefined,
    };

    this.saving = true;
    const req$ = this.editId
      ? this.usuariosApi.actualizar(this.editId, payload)
      : this.usuariosApi.crear(payload);

    req$.subscribe({
      next: () => {
        this.saving = false;
        this.modalOpen = false;
        this.success = this.editId ? 'Usuario actualizado.' : 'Usuario creado.';
        this.cargar();
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

  toggleEstado(u: Usuario): void {
    if (u.usuarioId === this.currentUserId) {
      return;
    }
    const next = !u.usuarioEstado;
    const ok = confirm(
      next
        ? `¿Estás seguro de activar a ${u.usuarioNombre}?`
        : `¿Estás seguro de inactivar a ${u.usuarioNombre}? No podrá iniciar sesión mientras esté inactivo.`,
    );
    if (!ok) {
      return;
    }

    const fallbackPut = () =>
      this.usuariosApi.actualizar(u.usuarioId, {
        usuarioNombre: u.usuarioNombre,
        usuarioEmail: u.usuarioEmail,
        rolId: u.rolId || u.rol?.rolId || 0,
        usuarioEstado: next,
      });

    this.usuariosApi.cambiarEstado(u.usuarioId, next).subscribe({
      next: () => {
        this.success = next ? `${u.usuarioNombre} quedó activo.` : `${u.usuarioNombre} quedó inactivo.`;
        this.cargar();
      },
      error: () => {
        fallbackPut().subscribe({
          next: () => {
            this.success = next
              ? `${u.usuarioNombre} quedó activo.`
              : `${u.usuarioNombre} quedó inactivo.`;
            this.cargar();
          },
          error: () => (this.error = 'No se pudo cambiar el estado.'),
        });
      },
    });
  }

  eliminar(u: Usuario): void {
    if (u.usuarioId === this.currentUserId) {
      return;
    }
    if (!confirm(`¿Estás seguro de eliminar a ${u.usuarioNombre}? Esta acción no se puede deshacer.`)) {
      return;
    }
    this.usuariosApi.eliminar(u.usuarioId).subscribe({
      next: () => {
        this.success = `Usuario ${u.usuarioNombre} eliminado.`;
        this.cargar();
      },
      error: () => (this.error = 'No se pudo eliminar el usuario.'),
    });
  }

  rolNombre(u: Usuario): string {
    return u.rol?.rolNombre || u.rolNombre || '—';
  }
}
