import { Component, computed, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { primerNombre } from '../../core/models/usuario.model';

@Component({
  selector: 'app-inicio',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './inicio.component.html',
  styleUrl: './inicio.component.css',
})
export class InicioComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  readonly usuario = this.auth.usuario;
  readonly primerNombre = computed(() => primerNombre(this.usuario()?.usuarioNombre));
  readonly isAdmin = this.auth.isAdmin;

  searchForm = this.fb.nonNullable.group({
    q: [''],
  });

  buscar(): void {
    const q = this.searchForm.controls.q.value.trim();
    // Catálogo completo queda para fases siguientes; por ahora admin puede ir a usuarios.
    if (this.isAdmin()) {
      this.router.navigate(['/usuarios'], { queryParams: q ? { q } : {} });
    }
  }

  irUsuarios(): void {
    this.router.navigateByUrl('/usuarios');
  }
}
