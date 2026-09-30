import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { OrganizacionService } from '../../core/services/organizacion.service';
import { DepartamentoItem } from '../../core/models/catalogo.model';
import { CatalogoTabsComponent } from '../../shared/ui/catalogo-tabs.component';

@Component({
  selector: 'app-departamentos',
  standalone: true,
  imports: [CatalogoTabsComponent],
  templateUrl: './departamentos.component.html',
  styleUrls: ['../../shared/ui/catalogo-page.css', './departamentos.component.css'],
})
export class DepartamentosComponent implements OnInit {
  private readonly organizacion = inject(OrganizacionService);
  private readonly destroyRef = inject(DestroyRef);

  items: DepartamentoItem[] = [];
  loading = false;
  error = '';

  ngOnInit(): void {
    this.cargar();
  }

  cargar(force = false): void {
    this.loading = !this.items.length;
    this.error = '';
    let first = true;
    this.organizacion
      .listarDepartamentosDetalle(force)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (items) => {
          this.items = items;
          if (first) {
            first = false;
            this.loading = false;
          }
        },
        error: (err: Error) => {
          this.error = err.message;
          this.loading = false;
        },
      });
  }
}
