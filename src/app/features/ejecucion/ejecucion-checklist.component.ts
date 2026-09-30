import { DatePipe } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Ejecucion, EjecucionPaso, ProcedimientoResumen } from '../../core/models/ejecucion.model';
import { EjecucionService } from '../../core/services/ejecucion.service';

@Component({
  selector: 'app-ejecucion-checklist',
  standalone: true,
  imports: [DatePipe, FormsModule, RouterLink],
  templateUrl: './ejecucion-checklist.component.html',
  styleUrl: './ejecucion-checklist.component.css',
})
export class EjecucionChecklistComponent implements OnInit {
  private readonly ejecuciones = inject(EjecucionService);
  private readonly route = inject(ActivatedRoute);

  ejecucion: Ejecucion | null = null;
  procedimiento: ProcedimientoResumen | null = null;
  pasos: EjecucionPaso[] = [];
  borradores: Record<number, string> = {};
  loading = true;
  error = '';
  guardando: number | null = null;
  completando = false;
  cancelando = false;
  confirmarCancelacion = false;
  motivoCancelacion = '';

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id) {
      this.error = 'La ejecución solicitada no está disponible.';
      this.loading = false;
      return;
    }
    this.cargar(id);
  }

  get enCurso(): boolean {
    return this.ejecucion?.estado === 'EN_CURSO';
  }

  get cumplidos(): number {
    return this.pasos.filter((paso) => paso.cumplido).length;
  }

  get porcentaje(): number {
    if (!this.pasos.length) {
      return 0;
    }
    return Math.round((this.cumplidos * 100) / this.pasos.length);
  }

  get puedeCompletar(): boolean {
    return this.enCurso && this.pasos.length > 0 && this.cumplidos === this.pasos.length && !this.completando;
  }

  etiquetaEstado(estado: string): string {
    if (estado === 'COMPLETADA') {
      return 'Completada';
    }
    if (estado === 'CANCELADA') {
      return 'Cancelada';
    }
    return 'En curso';
  }

  marcar(paso: EjecucionPaso, cumplido: boolean): void {
    if (!this.enCurso || this.guardando != null || this.completando || this.cancelando) {
      return;
    }
    this.guardando = paso.ejecucionPasoId;
    this.error = '';
    this.ejecuciones
      .actualizarPaso(this.ejecucion!.id, paso.ejecucionPasoId, {
        cumplido,
        observacion: this.borradores[paso.ejecucionPasoId] ?? paso.observacion,
      })
      .subscribe({
        next: (actualizado) => {
          this.reemplazar(actualizado);
          this.guardando = null;
        },
        error: (err: Error) => {
          this.guardando = null;
          this.error = err.message;
          this.recargarPasos();
        },
      });
  }

  guardarObservacion(paso: EjecucionPaso): void {
    const texto = this.borradores[paso.ejecucionPasoId] ?? '';
    if (!this.enCurso || this.guardando != null || texto.length > 300) {
      return;
    }
    this.guardando = paso.ejecucionPasoId;
    this.error = '';
    this.ejecuciones
      .actualizarPaso(this.ejecucion!.id, paso.ejecucionPasoId, {
        cumplido: paso.cumplido,
        observacion: texto,
      })
      .subscribe({
        next: (actualizado) => {
          this.reemplazar(actualizado);
          this.guardando = null;
        },
        error: (err: Error) => {
          this.guardando = null;
          this.error = err.message;
          this.recargarPasos();
        },
      });
  }

  completar(): void {
    if (!this.puedeCompletar || !this.ejecucion) {
      return;
    }
    this.completando = true;
    this.error = '';
    this.ejecuciones.completar(this.ejecucion.id).subscribe({
      next: (ejecucion) => {
        this.ejecucion = ejecucion;
        this.completando = false;
      },
      error: (err: Error) => {
        this.completando = false;
        this.error = err.message;
        this.recargarPasos();
      },
    });
  }

  pedirCancelar(): void {
    if (!this.enCurso || this.cancelando) {
      return;
    }
    this.confirmarCancelacion = true;
  }

  cerrarCancelar(): void {
    if (this.cancelando) {
      return;
    }
    this.confirmarCancelacion = false;
    this.motivoCancelacion = '';
  }

  confirmarCancelar(): void {
    if (!this.ejecucion || !this.enCurso || this.cancelando) {
      return;
    }
    this.cancelando = true;
    this.error = '';
    this.ejecuciones.cancelar(this.ejecucion.id, { observaciones: this.motivoCancelacion }).subscribe({
      next: (ejecucion) => {
        this.ejecucion = ejecucion;
        this.cancelando = false;
        this.confirmarCancelacion = false;
        this.motivoCancelacion = '';
      },
      error: (err: Error) => {
        this.cancelando = false;
        this.error = err.message;
      },
    });
  }

  private cargar(id: number): void {
    this.loading = true;
    this.error = '';
    this.ejecuciones.obtener(id).subscribe({
      next: (ejecucion) => {
        this.ejecucion = ejecucion;
        this.ejecuciones.obtenerProcedimiento(ejecucion.procedimientoId).subscribe({
          next: (procedimiento) => (this.procedimiento = procedimiento),
          error: () => (this.procedimiento = null),
        });
        this.ejecuciones.obtenerPasos(id).subscribe({
          next: (pasos) => {
            this.aplicarPasos(pasos);
            this.loading = false;
          },
          error: (err: Error) => {
            this.error = err.message;
            this.loading = false;
          },
        });
      },
      error: (err: Error) => {
        this.error = err.message;
        this.loading = false;
      },
    });
  }

  private recargarPasos(): void {
    if (!this.ejecucion) {
      return;
    }
    this.ejecuciones.obtenerPasos(this.ejecucion.id).subscribe({
      next: (pasos) => this.aplicarPasos(pasos),
      error: (err: Error) => (this.error = err.message),
    });
  }

  private aplicarPasos(pasos: EjecucionPaso[]): void {
    this.pasos = pasos;
    for (const paso of pasos) {
      this.borradores[paso.ejecucionPasoId] = paso.observacion ?? '';
    }
  }

  private reemplazar(actualizado: EjecucionPaso): void {
    this.pasos = this.pasos.map((paso) =>
      paso.ejecucionPasoId === actualizado.ejecucionPasoId ? actualizado : paso,
    );
    this.borradores[actualizado.ejecucionPasoId] = actualizado.observacion ?? '';
  }
}
