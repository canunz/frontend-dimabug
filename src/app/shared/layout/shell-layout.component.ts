import { Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { esAdministrador, iniciales, primerNombre } from '../../core/models/usuario.model';

@Component({
  selector: 'app-shell-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './shell-layout.component.html',
  styleUrl: './shell-layout.component.css',
})
export class ShellLayoutComponent {
  private readonly auth = inject(AuthService);

  readonly usuario = this.auth.usuario;
  readonly isAdmin = computed(() => esAdministrador(this.usuario()));
  readonly iniciales = computed(() => iniciales(this.usuario()?.usuarioNombre));
  readonly primerNombre = computed(() => primerNombre(this.usuario()?.usuarioNombre));
  readonly rolNombre = computed(
    () => this.usuario()?.rol?.rolNombre || this.usuario()?.rolNombre || 'Usuario',
  );

  menuOpen = false;
  temaOscuro = localStorage.getItem('dimabug-tema') === 'oscuro';

  constructor() {
    this.applyTema();
  }

  toggleTema(): void {
    this.temaOscuro = !this.temaOscuro;
    localStorage.setItem('dimabug-tema', this.temaOscuro ? 'oscuro' : 'claro');
    this.applyTema();
  }

  toggleMenu(): void {
    this.menuOpen = !this.menuOpen;
  }

  closeMenu(): void {
    this.menuOpen = false;
  }

  logout(): void {
    this.auth.logout();
  }

  private applyTema(): void {
    document.body.classList.toggle('tema-oscuro', this.temaOscuro);
  }
}
