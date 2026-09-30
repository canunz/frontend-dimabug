import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { CatalogoRef, ResultadoBusquedaConocimiento } from '../../core/models/conocimiento.model';
import { AuthService } from '../../core/services/auth.service';
import { ClasificacionService } from '../../core/services/clasificacion.service';
import { ConocimientoService } from '../../core/services/conocimiento.service';
import { FavoritosService } from '../../core/services/favoritos.service';
import { LoadingModalComponent } from '../../shared/ui/loading-modal.component';

@Component({
  selector: 'app-conocimiento',
  standalone: true,
  imports: [FormsModule, RouterLink, LoadingModalComponent],
  templateUrl: './conocimiento.component.html',
  styleUrl: './conocimiento.component.css',
})
export class ConocimientoComponent implements OnInit, OnDestroy {
  private readonly conocimientosApi = inject(ConocimientoService);
  private readonly clasificacion = inject(ClasificacionService);
  private readonly favoritosService = inject(FavoritosService);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private querySub?: Subscription;
  private busquedaSub?: Subscription;

  readonly esAdministrador = this.auth.isAdmin;
  readonly puedeGestionar = this.auth.isStaff;

  resultados: ResultadoBusquedaConocimiento[] = [];
  hardwares: CatalogoRef[] = [];
  sistemas: CatalogoRef[] = [];
  modulos: CatalogoRef[] = [];
  frecuencias: CatalogoRef[] = [];
  texto = '';
  hardwareId: number | null = null;
  sistemaId: number | null = null;
  moduloId: number | null = null;
  frecuenciaId: number | null = null;
  loading = false;
  buscado = false;
  error = '';
  aviso = '';
  pendienteEliminar: ResultadoBusquedaConocimiento | null = null;
  eliminando = false;

  ngOnInit(): void {
    const state = history.state as { conocimientoEliminado?: boolean } | null;
    if (state?.conocimientoEliminado) {
      this.aviso = 'El conocimiento dejó de estar disponible para consulta y búsqueda.';
      history.replaceState({ ...state, conocimientoEliminado: false }, '');
    }
    this.clasificacion.listarHardware().subscribe({
      next: (items) => (this.hardwares = items),
    });
    this.clasificacion.listarFrecuencias().subscribe({
      next: (data) => (this.frecuencias = data.items),
    });
    this.cargarSistemas();
    this.texto = this.route.snapshot.queryParamMap.get('q') || '';
    this.buscar();
    this.querySub = this.route.queryParamMap.subscribe((params) => {
      const q = params.get('q') || '';
      if (q !== this.texto) {
        this.texto = q;
        this.buscar();
      }
    });
  }

  ngOnDestroy(): void {
    this.querySub?.unsubscribe();
    this.busquedaSub?.unsubscribe();
  }

  onHardwareChange(): void {
    this.sistemaId = null;
    this.moduloId = null;
    this.modulos = [];
    this.cargarSistemas();
  }

  onSistemaChange(): void {
    this.moduloId = null;
    this.cargarModulos();
  }

  buscar(): void {
    this.busquedaSub?.unsubscribe();
    this.loading = true;
    this.error = '';
    this.busquedaSub = this.conocimientosApi
      .buscar({
        texto: this.texto,
        hardwareId: this.hardwareId,
        sistemaId: this.sistemaId,
        moduloId: this.moduloId,
        frecuenciaId: this.frecuenciaId,
      })
      .subscribe({
        next: (items) => {
          this.resultados = items;
          this.buscado = true;
          this.loading = false;
        },
        error: (err: Error) => {
          this.resultados = [];
          this.buscado = true;
          this.loading = false;
          this.error = err.message;
        },
      });
  }

  limpiar(): void {
    this.texto = '';
    this.hardwareId = null;
    this.sistemaId = null;
    this.moduloId = null;
    this.frecuenciaId = null;
    this.modulos = [];
    this.error = '';
    this.cargarSistemas();
    this.buscar();
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { q: null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  abrir(item: ResultadoBusquedaConocimiento): void {
    void this.router.navigate(['/conocimiento', item.id]);
  }

  editar(item: ResultadoBusquedaConocimiento, event: Event): void {
    event.stopPropagation();
    void this.router.navigate(['/conocimiento', item.id, 'editar']);
  }

  pedirEliminar(item: ResultadoBusquedaConocimiento, event: Event): void {
    event.stopPropagation();
    if (this.eliminando) {
      return;
    }
    this.pendienteEliminar = item;
  }

  cancelarEliminar(): void {
    if (this.eliminando) {
      return;
    }
    this.pendienteEliminar = null;
  }

  confirmarEliminar(): void {
    const item = this.pendienteEliminar;
    if (!item || this.eliminando) {
      return;
    }
    this.eliminando = true;
    this.error = '';
    this.conocimientosApi.eliminar(item.id).subscribe({
      next: () => {
        this.resultados = this.resultados.filter((actual) => actual.id !== item.id);
        this.pendienteEliminar = null;
        this.eliminando = false;
        this.aviso = 'El conocimiento dejó de estar disponible para consulta y búsqueda.';
      },
      error: (err: Error) => {
        this.eliminando = false;
        this.pendienteEliminar = null;
        this.aviso = '';
        this.error = err.message;
      },
    });
  }

  esFavorito(id: number): boolean {
    return this.favoritosService.tiene(id);
  }

  toggleFavorito(id: number, titulo: string, event: Event): void {
    event.stopPropagation();
    this.favoritosService.toggle(id, titulo);
  }

  private cargarSistemas(): void {
    const consulta = this.hardwareId
      ? this.clasificacion.sistemasDeHardware(this.hardwareId)
      : this.clasificacion.listarSistemas();
    consulta.subscribe({
      next: (items) => {
        this.sistemas = items;
        if (this.sistemaId && !items.some((item) => item.id === this.sistemaId)) {
          this.sistemaId = null;
          this.moduloId = null;
          this.modulos = [];
        }
      },
    });
  }

  private cargarModulos(): void {
    if (!this.sistemaId) {
      this.modulos = [];
      this.moduloId = null;
      return;
    }
    this.clasificacion.modulosDeSistema(this.sistemaId).subscribe({
      next: (items) => {
        this.modulos = items;
        if (this.moduloId && !items.some((item) => item.id === this.moduloId)) {
          this.moduloId = null;
        }
      },
    });
  }
}
