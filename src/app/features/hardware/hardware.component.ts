import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ClasificacionService } from '../../core/services/clasificacion.service';
import { HardwareItem } from '../../core/models/catalogo.model';
import { CatalogoTabsComponent } from '../../shared/ui/catalogo-tabs.component';

@Component({
  selector: 'app-hardware',
  standalone: true,
  imports: [CatalogoTabsComponent],
  templateUrl: './hardware.component.html',
  styleUrls: ['../../shared/ui/catalogo-page.css', './hardware.component.css'],
})
export class HardwareComponent implements OnInit {
  private readonly clasificacion = inject(ClasificacionService);
  private readonly destroyRef = inject(DestroyRef);

  items: HardwareItem[] = [];
  loading = false;
  error = '';

  ngOnInit(): void {
    this.cargar();
  }

  cargar(force = false): void {
    this.loading = !this.items.length;
    this.error = '';
    let first = true;
    this.clasificacion
      .listarHardwareDetalle(force)
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
          if (!this.items.length) {
            this.items = [];
          }
          this.loading = false;
        },
      });
  }
}
