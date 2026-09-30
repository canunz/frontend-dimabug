import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { OrganizacionService } from '../../core/services/organizacion.service';
import { PruebaItem } from '../../core/models/catalogo.model';
import { CatalogoTabsComponent } from '../../shared/ui/catalogo-tabs.component';

@Component({
  selector: 'app-pruebas',
  standalone: true,
  imports: [CatalogoTabsComponent],
  templateUrl: './pruebas.component.html',
  styleUrls: ['../../shared/ui/catalogo-page.css', './pruebas.component.css'],
})
export class PruebasComponent implements OnInit {
  private readonly organizacion = inject(OrganizacionService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  items: PruebaItem[] = [];
  loading = false;
  error = '';

  get titulo(): string {
    return this.router.url.includes('procedimientos') ? 'Procedimientos' : 'Pruebas';
  }

  ngOnInit(): void {
    // Pintar de inmediato lo que ya esté en sesión.
    const cached = this.organizacion.snapshotPruebas();
    if (cached.length) {
      this.items = cached.map((p) => ({
        id: p.id,
        descripcion: p.descripcion,
        resultadoEsperado: p.resultadoEsperado,
        activo: true,
      }));
    }
    this.cargar();
  }

  cargar(): void {
    this.loading = !this.items.length;
    this.error = '';
    this.organizacion
      .listarPruebasDetalle(false)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (items) => {
          this.items = items;
          this.loading = false;
        },
        error: (err: Error) => {
          this.error = err.message;
          this.loading = false;
        },
      });
  }
}
