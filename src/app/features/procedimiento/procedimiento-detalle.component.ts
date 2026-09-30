import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import {
  MaterialPaso,
  PasoProcedimiento,
  Procedimiento,
  TipoMaterialProcedimiento,
} from '../../core/models/procedimiento.model';
import { AuthService } from '../../core/services/auth.service';
import { EjecucionService } from '../../core/services/ejecucion.service';
import { ProcedimientoService } from '../../core/services/procedimiento.service';

@Component({
  selector: 'app-procedimiento-detalle',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './procedimiento-detalle.component.html',
  styleUrl: './procedimiento-detalle.component.css',
})
export class ProcedimientoDetalleComponent implements OnInit {
  private readonly procedimientos = inject(ProcedimientoService);
  private readonly ejecuciones = inject(EjecucionService);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly esAdministrador = this.auth.isAdmin;
  readonly tipos: TipoMaterialProcedimiento[] = ['IMAGEN', 'PDF', 'VIDEO', 'ENLACE'];

  item: Procedimiento | null = null;
  pasos: PasoProcedimiento[] = [];
  materiales: Record<number, MaterialPaso[]> = {};
  loading = true;
  error = '';
  iniciando = false;
  publicando = false;
  guardandoPaso = false;
  guardandoMaterial = false;
  pasoAbierto = false;
  editPasoId: number | null = null;
  orden = 1;
  instruccion = '';
  esCritico = false;
  materialPasoId: number | null = null;
  editMaterialId: number | null = null;
  materialNombre = '';
  materialTipo: TipoMaterialProcedimiento = 'PDF';
  materialUrl = '';

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id) {
      this.error = 'El procedimiento o recurso solicitado no está disponible.';
      this.loading = false;
      return;
    }
    this.cargar(id);
  }

  materialesDe(pasoId: number): MaterialPaso[] {
    return this.materiales[pasoId] ?? [];
  }

  etiquetaTipo(tipo: TipoMaterialProcedimiento): string {
    if (tipo === 'IMAGEN') return 'Imagen';
    if (tipo === 'PDF') return 'PDF';
    if (tipo === 'VIDEO') return 'Video';
    return 'Enlace';
  }

  iconoTipo(tipo: TipoMaterialProcedimiento): string {
    if (tipo === 'IMAGEN') return '🖼';
    if (tipo === 'PDF') return '📄';
    if (tipo === 'VIDEO') return '🎥';
    return '🔗';
  }

  abrirPaso(paso?: PasoProcedimiento): void {
    this.pasoAbierto = true;
    this.editPasoId = paso?.id ?? null;
    this.orden = paso?.orden ?? this.siguienteOrden();
    this.instruccion = paso?.instruccion ?? '';
    this.esCritico = paso?.esCritico ?? false;
    this.error = '';
  }

  cerrarPaso(): void {
    if (this.guardandoPaso) return;
    this.pasoAbierto = false;
    this.editPasoId = null;
  }

  guardarPaso(): void {
    if (!this.item || this.guardandoPaso || !this.instruccion.trim() || this.orden < 1) {
      this.error = 'El orden debe ser mayor que cero y la instrucción no puede quedar vacía.';
      return;
    }
    const request = {
      orden: Number(this.orden),
      instruccion: this.instruccion.trim(),
      esCritico: this.esCritico,
    };
    this.guardandoPaso = true;
    this.error = '';
    const llamada = this.editPasoId
      ? this.procedimientos.actualizarPaso(this.item.id, this.editPasoId, request)
      : this.procedimientos.crearPaso(this.item.id, request);
    llamada.subscribe({
      next: () => {
        this.guardandoPaso = false;
        this.cerrarPaso();
        this.recargarPasos();
      },
      error: (err: Error) => {
        this.guardandoPaso = false;
        this.error = err.message;
      },
    });
  }

  abrirMaterial(pasoId: number, material?: MaterialPaso): void {
    this.materialPasoId = pasoId;
    this.editMaterialId = material?.id ?? null;
    this.materialNombre = material?.nombre ?? '';
    this.materialTipo = material?.tipo ?? 'PDF';
    this.materialUrl = material?.url ?? '';
    this.error = '';
  }

  cerrarMaterial(): void {
    if (this.guardandoMaterial) return;
    this.materialPasoId = null;
    this.editMaterialId = null;
  }

  guardarMaterial(): void {
    if (!this.item || this.materialPasoId == null || this.guardandoMaterial) return;
    if (!this.materialNombre.trim() || !this.materialUrl.trim()) {
      this.error = 'El nombre y la URL del material son obligatorios.';
      return;
    }
    const request = {
      nombre: this.materialNombre.trim(),
      tipo: this.materialTipo,
      url: this.materialUrl.trim(),
    };
    const pasoId = this.materialPasoId;
    this.guardandoMaterial = true;
    this.error = '';
    const llamada = this.editMaterialId
      ? this.procedimientos.actualizarMaterial(this.item.id, pasoId, this.editMaterialId, request)
      : this.procedimientos.crearMaterial(this.item.id, pasoId, request);
    llamada.subscribe({
      next: () => {
        this.guardandoMaterial = false;
        this.cerrarMaterial();
        this.cargarMateriales(pasoId);
      },
      error: (err: Error) => {
        this.guardandoMaterial = false;
        this.error = err.message;
      },
    });
  }

  publicar(): void {
    if (!this.item || !this.esAdministrador() || this.item.estado !== 'BORRADOR' || this.publicando) return;
    this.publicando = true;
    this.error = '';
    this.procedimientos.cambiarEstado(this.item.id, 'PUBLICADO').subscribe({
      next: (item) => {
        this.item = item;
        this.publicando = false;
      },
      error: (err: Error) => {
        this.publicando = false;
        this.error = err.message;
      },
    });
  }

  iniciar(): void {
    if (!this.item || this.item.estado !== 'PUBLICADO' || this.iniciando) return;
    this.iniciando = true;
    this.error = '';
    this.ejecuciones.iniciar(this.item.id).subscribe({
      next: (ejecucion) => void this.router.navigate(['/ejecuciones', ejecucion.id]),
      error: (err: Error) => {
        this.iniciando = false;
        this.error = err.message;
      },
    });
  }

  private cargar(id: number): void {
    this.loading = true;
    this.procedimientos.obtenerPorId(id).subscribe({
      next: (item) => {
        this.item = item;
        this.procedimientos.listarPasos(id).subscribe({
          next: (pasos) => {
            this.pasos = pasos;
            this.cargarTodosLosMateriales();
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
    if (!this.item) return;
    this.procedimientos.listarPasos(this.item.id).subscribe({
      next: (pasos) => {
        this.pasos = pasos;
        this.cargarTodosLosMateriales();
      },
      error: (err: Error) => (this.error = err.message),
    });
  }

  private cargarTodosLosMateriales(): void {
    if (!this.item || !this.pasos.length) {
      this.materiales = {};
      this.loading = false;
      return;
    }
    const id = this.item.id;
    forkJoin(
      Object.fromEntries(this.pasos.map((paso) => [paso.id, this.procedimientos.listarMateriales(id, paso.id)])),
    ).subscribe({
      next: (mapa) => {
        this.materiales = mapa;
        this.loading = false;
      },
      error: (err: Error) => {
        this.error = err.message;
        this.loading = false;
      },
    });
  }

  private cargarMateriales(pasoId: number): void {
    if (!this.item) return;
    this.procedimientos.listarMateriales(this.item.id, pasoId).subscribe({
      next: (items) => (this.materiales = { ...this.materiales, [pasoId]: items }),
      error: (err: Error) => (this.error = err.message),
    });
  }

  private siguienteOrden(): number {
    return this.pasos.reduce((max, paso) => Math.max(max, paso.orden), 0) + 1;
  }
}
