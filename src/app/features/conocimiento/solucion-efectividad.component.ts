import { DatePipe } from '@angular/common';
import { Component, Input, OnChanges, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { EfectividadSolucion, ResultadoSolucion } from '../../core/models/conocimiento.model';
import { ConocimientoService } from '../../core/services/conocimiento.service';

@Component({
  selector: 'app-solucion-efectividad',
  standalone: true,
  imports: [DatePipe, FormsModule],
  templateUrl: './solucion-efectividad.component.html',
  styleUrl: './solucion-efectividad.component.css',
})
export class SolucionEfectividadComponent implements OnChanges, OnDestroy {
  @Input({ required: true }) conocimientoId!: number;
  @Input({ required: true }) solucionId!: number;

  efectividad: EfectividadSolucion | null = null;
  cargando = false;
  errorCarga = '';
  historial: ResultadoSolucion[] = [];
  historialVisible = false;
  cargandoHistorial = false;
  errorHistorial = '';
  panelAbierto = false;
  eleccion: boolean | null = null;
  comentario = '';
  registrando = false;
  errorRegistro = '';
  aviso = '';

  private cargaSub?: Subscription;
  private historialSub?: Subscription;
  private registroSub?: Subscription;
  private avisoTimer?: ReturnType<typeof setTimeout>;

  constructor(private readonly conocimientos: ConocimientoService) {}

  ngOnChanges(): void {
    this.cerrarPanel();
    this.historialVisible = false;
    this.historial = [];
    this.aviso = '';
    this.cargarEfectividad();
  }

  ngOnDestroy(): void {
    this.cargaSub?.unsubscribe();
    this.historialSub?.unsubscribe();
    this.registroSub?.unsubscribe();
    clearTimeout(this.avisoTimer);
  }

  get sinEvaluaciones(): boolean {
    return !!this.efectividad && this.efectividad.totalAplicaciones === 0;
  }

  get porcentajeTexto(): string {
    const efectividad = this.efectividad;
    if (!efectividad || efectividad.totalAplicaciones === 0 || efectividad.porcentajeEfectividad == null) {
      return '';
    }
    const valor = efectividad.porcentajeEfectividad;
    if (!Number.isFinite(valor)) {
      return '';
    }
    const redondeado = Math.round(valor * 10) / 10;
    const texto = Number.isInteger(redondeado)
      ? String(redondeado)
      : redondeado.toLocaleString('es-CL', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    return `${texto} %`;
  }

  abrir(funciono: boolean): void {
    if (this.registrando) {
      return;
    }
    this.panelAbierto = true;
    this.eleccion = funciono;
    this.errorRegistro = '';
  }

  cerrarPanel(): void {
    if (this.registrando) {
      return;
    }
    this.panelAbierto = false;
    this.eleccion = null;
    this.comentario = '';
    this.errorRegistro = '';
  }

  registrar(): void {
    if (this.eleccion == null || this.registrando || this.comentario.length > 300) {
      return;
    }
    this.registrando = true;
    this.errorRegistro = '';
    this.aviso = '';
    this.registroSub?.unsubscribe();
    this.registroSub = this.conocimientos
      .registrarResultado(this.conocimientoId, this.solucionId, {
        funciono: this.eleccion,
        comentario: this.comentario,
      })
      .subscribe({
        next: () => {
          this.registrando = false;
          this.panelAbierto = false;
          this.eleccion = null;
          this.comentario = '';
          this.mostrarAviso('Resultado registrado.');
          this.cargarEfectividad();
          if (this.historialVisible) {
            this.cargarHistorial();
          }
        },
        error: (err: Error) => {
          this.registrando = false;
          this.aviso = '';
          this.errorRegistro = err.message;
        },
      });
  }

  alternarHistorial(): void {
    this.historialVisible = !this.historialVisible;
    this.errorHistorial = '';
    if (this.historialVisible) {
      this.cargarHistorial();
    }
  }

  private cargarEfectividad(): void {
    this.cargando = true;
    this.errorCarga = '';
    this.cargaSub?.unsubscribe();
    this.cargaSub = this.conocimientos.obtenerEfectividad(this.conocimientoId, this.solucionId).subscribe({
      next: (efectividad) => {
        this.efectividad = efectividad;
        this.cargando = false;
      },
      error: (err: Error) => {
        this.efectividad = null;
        this.cargando = false;
        this.errorCarga = err.message;
      },
    });
  }

  private cargarHistorial(): void {
    this.cargandoHistorial = true;
    this.errorHistorial = '';
    this.historialSub?.unsubscribe();
    this.historialSub = this.conocimientos.obtenerResultados(this.conocimientoId, this.solucionId).subscribe({
      next: (items) => {
        this.historial = items;
        this.cargandoHistorial = false;
      },
      error: (err: Error) => {
        this.historial = [];
        this.cargandoHistorial = false;
        this.errorHistorial = err.message;
      },
    });
  }

  private mostrarAviso(texto: string): void {
    this.aviso = texto;
    clearTimeout(this.avisoTimer);
    this.avisoTimer = setTimeout(() => {
      this.aviso = '';
    }, 4000);
  }
}
