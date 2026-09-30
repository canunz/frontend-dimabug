import { DatePipe } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { Ejecucion } from '../../core/models/ejecucion.model';
import { EjecucionService } from '../../core/services/ejecucion.service';

@Component({
  selector: 'app-ejecuciones',
  standalone: true,
  imports: [DatePipe, RouterLink],
  templateUrl: './ejecuciones.component.html',
  styleUrl: '../../shared/ui/catalogo-page.css',
})
export class EjecucionesComponent implements OnInit {
  private readonly ejecuciones = inject(EjecucionService);

  items: Ejecucion[] = [];
  nombres: Record<number, string> = {};
  loading = true;
  error = '';

  ngOnInit(): void {
    forkJoin({
      ejecuciones: this.ejecuciones.listar(),
      procedimientos: this.ejecuciones.listarProcedimientos(),
    }).subscribe({
      next: ({ ejecuciones, procedimientos }) => {
        this.items = ejecuciones;
        this.nombres = Object.fromEntries(procedimientos.map((item) => [item.id, item.nombre]));
        this.loading = false;
      },
      error: (err: Error) => {
        this.error = err.message;
        this.loading = false;
      },
    });
  }

  nombre(procedimientoId: number): string {
    return this.nombres[procedimientoId] || `Procedimiento ${procedimientoId}`;
  }

  etiqueta(estado: string): string {
    if (estado === 'COMPLETADA') {
      return 'Completada';
    }
    if (estado === 'CANCELADA') {
      return 'Cancelada';
    }
    return 'En curso';
  }
}
