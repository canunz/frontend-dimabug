import { DatePipe, NgClass } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  AsignacionSolucion,
  CatalogoRef,
  Conocimiento,
  ItemOrdenado,
  MaterialApoyo,
  PruebaAsociada,
  PruebaCatalogo,
  ResponsableRef,
  Solucion,
  TipoMaterial,
  TipoSolucion,
  etiquetaEstadoConocimiento,
} from '../../core/models/conocimiento.model';
import { AuthService } from '../../core/services/auth.service';
import { ConocimientoService } from '../../core/services/conocimiento.service';
import { FavoritosService } from '../../core/services/favoritos.service';
import { OrganizacionService } from '../../core/services/organizacion.service';
import { LoadingModalComponent } from '../../shared/ui/loading-modal.component';
import { SolucionEfectividadComponent } from './solucion-efectividad.component';

type Seccion = 'sintomas' | 'causas' | 'pruebas' | 'soluciones' | 'materiales' | 'asignaciones';

@Component({
  selector: 'app-conocimiento-detalle',
  standalone: true,
  imports: [DatePipe, NgClass, RouterLink, ReactiveFormsModule, LoadingModalComponent, SolucionEfectividadComponent],
  templateUrl: './conocimiento-detalle.component.html',
  styleUrl: './conocimiento-detalle.component.css',
})
export class ConocimientoDetalleComponent implements OnInit {
  private readonly conocimientosApi = inject(ConocimientoService);
  private readonly auth = inject(AuthService);
  private readonly organizacion = inject(OrganizacionService);
  private readonly favoritosService = inject(FavoritosService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  readonly esAdministrador = this.auth.isAdmin;
  readonly puedeGestionar = this.auth.isStaff;
  readonly etiquetaEstado = etiquetaEstadoConocimiento;

  item: Conocimiento | null = null;
  sintomas: ItemOrdenado[] = [];
  causas: ItemOrdenado[] = [];
  pruebas: PruebaAsociada[] = [];
  soluciones: Solucion[] = [];
  materiales: MaterialApoyo[] = [];
  asignacionesPorSolucion: Record<number, AsignacionSolucion[]> = {};

  pruebasCatalogo: PruebaCatalogo[] = [];
  departamentos: CatalogoRef[] = [];
  responsables: ResponsableRef[] = [];

  loading = false;
  loadingSintomas = false;
  loadingCausas = false;
  loadingPruebas = false;
  loadingSoluciones = false;
  loadingMateriales = false;
  error = '';
  sectionError = '';
  sectionSuccess = '';
  publishing = false;
  eliminando = false;
  confirmarEliminacion = false;
  saving: Seccion | null = null;
  copiado = false;
  private currentId: number | null = null;

  editSintomaId: number | null = null;
  editCausaId: number | null = null;
  editPruebaId: number | null = null;
  editSolucionId: number | null = null;
  editMaterialId: number | null = null;
  editAsignacionId: number | null = null;
  solucionAsignacionId: number | null = null;

  formAbierto: Record<'sintomas' | 'causas' | 'pruebas' | 'soluciones' | 'materiales', boolean> = {
    sintomas: false,
    causas: false,
    pruebas: false,
    soluciones: false,
    materiales: false,
  };

  readonly tiposSolucion: TipoSolucion[] = ['PASOS', 'DERIVACION'];
  readonly tiposMaterial: TipoMaterial[] = ['IMAGEN', 'PDF', 'VIDEO', 'ENLACE'];

  sintomaForm = this.fb.nonNullable.group({
    descripcion: ['', Validators.required],
    orden: [1, [Validators.required, Validators.min(1)]],
  });

  causaForm = this.fb.nonNullable.group({
    descripcion: ['', Validators.required],
    orden: [1, [Validators.required, Validators.min(1)]],
  });

  pruebaForm = this.fb.nonNullable.group({
    pruebaId: this.fb.control<number | null>(null, Validators.required),
    orden: [1, [Validators.required, Validators.min(1)]],
  });

  solucionForm = this.fb.nonNullable.group({
    descripcion: ['', Validators.required],
    tipo: this.fb.nonNullable.control<TipoSolucion>('PASOS'),
    orden: [1, [Validators.required, Validators.min(1)]],
  });

  asignacionForm = this.fb.nonNullable.group({
    departamentoId: this.fb.control<number | null>(null),
    responsableId: this.fb.control<number | null>(null),
    principal: [true],
  });

  materialForm = this.fb.nonNullable.group({
    nombre: ['', Validators.required],
    tipo: this.fb.nonNullable.control<TipoMaterial>('PDF'),
    url: ['', Validators.required],
  });

  get favorito(): boolean {
    return !!this.item && this.favoritosService.tiene(this.item.id);
  }

  get conocimientoId(): number | null {
    return this.item?.id ?? null;
  }

  get mostrandoCarga(): boolean {
    return this.saving != null || this.publishing || this.eliminando;
  }

  get mensajeCarga(): string {
    return this.eliminando ? 'Eliminando, por favor…' : 'Cargando, por favor…';
  }

  ngOnInit(): void {
    this.asignacionForm.controls.departamentoId.valueChanges.subscribe((departamentoId) => {
      this.asignacionForm.controls.responsableId.setValue(null, { emitEvent: false });
      this.responsables = [];
      if (departamentoId) {
        this.organizacion.responsablesDeDepartamento(departamentoId).subscribe({
          next: (items) => (this.responsables = items),
          error: (err: Error) => (this.sectionError = err.message),
        });
      }
    });

    this.route.paramMap.subscribe((params) => {
      const id = Number(params.get('id'));
      if (id) {
        this.cargar(id);
      }
    });
  }

  cargar(id: number): void {
    this.currentId = id;
    this.error = '';
    this.sectionError = '';
    this.sectionSuccess = '';
    this.formAbierto = {
      sintomas: false,
      causas: false,
      pruebas: false,
      soluciones: false,
      materiales: false,
    };

    const cached = this.conocimientosApi.peekDetalle(id);
    if (cached) {
      this.item = cached;
      this.loading = false;
    } else {
      this.loading = true;
      this.item = null;
    }

    this.conocimientosApi.obtenerPorId(id, true).subscribe({
      next: (item) => {
        if (this.currentId !== id) return;
        this.item = item;
        this.loading = false;
      },
      error: (err: Error) => {
        if (this.currentId !== id) return;
        this.error = err.message;
        this.loading = false;
        if (err.message === 'El conocimiento no está disponible.') {
          this.item = null;
        }
      },
    });

    this.cargarSeccionProgresiva(id);
  }

  private cargarSeccionProgresiva(id: number): void {
    this.loadingSintomas = true;
    this.conocimientosApi.listarSintomas(id).subscribe({
      next: (items) => {
        if (this.currentId !== id) return;
        this.sintomas = items;
        this.sintomaForm.controls.orden.setValue(this.nextOrden(items));
        this.loadingSintomas = false;
      },
      error: (err: Error) => {
        if (this.currentId !== id) return;
        this.sectionError = err.message;
        this.loadingSintomas = false;
      },
    });

    this.loadingCausas = true;
    this.conocimientosApi.listarCausas(id).subscribe({
      next: (items) => {
        if (this.currentId !== id) return;
        this.causas = items;
        this.causaForm.controls.orden.setValue(this.nextOrden(items));
        this.loadingCausas = false;
      },
      error: (err: Error) => {
        if (this.currentId !== id) return;
        this.sectionError = err.message;
        this.loadingCausas = false;
      },
    });

    this.loadingPruebas = true;
    this.conocimientosApi.listarPruebas(id).subscribe({
      next: (items) => {
        if (this.currentId !== id) return;
        this.pruebas = items;
        this.pruebaForm.controls.orden.setValue(this.nextOrden(items));
        this.loadingPruebas = false;
      },
      error: (err: Error) => {
        if (this.currentId !== id) return;
        this.sectionError = err.message;
        this.loadingPruebas = false;
      },
    });

    this.loadingSoluciones = true;
    this.conocimientosApi.listarSoluciones(id).subscribe({
      next: (items) => {
        if (this.currentId !== id) return;
        this.soluciones = items;
        this.solucionForm.controls.orden.setValue(this.nextOrden(items));
        this.loadingSoluciones = false;
        // Diferir asignaciones para no competir con la primera pintura.
        window.setTimeout(() => {
          if (this.currentId === id) {
            this.cargarAsignaciones(id, items);
          }
        }, 0);
      },
      error: (err: Error) => {
        if (this.currentId !== id) return;
        this.sectionError = err.message;
        this.loadingSoluciones = false;
      },
    });

    this.loadingMateriales = true;
    this.conocimientosApi.listarMateriales(id).subscribe({
      next: (items) => {
        if (this.currentId !== id) return;
        this.materiales = items;
        this.loadingMateriales = false;
      },
      error: (err: Error) => {
        if (this.currentId !== id) return;
        this.sectionError = err.message;
        this.loadingMateriales = false;
      },
    });
  }

  abrirFormulario(seccion: keyof typeof this.formAbierto): void {
    this.formAbierto[seccion] = true;
    if (seccion === 'pruebas' && !this.pruebasCatalogo.length) {
      this.organizacion.listarPruebas().subscribe({
        next: (items) => (this.pruebasCatalogo = items),
        error: (err: Error) => (this.sectionError = err.message),
      });
    }
  }

  private ensureDepartamentos(): void {
    if (this.departamentos.length) return;
    this.organizacion.listarDepartamentos().subscribe({
      next: (items) => (this.departamentos = items),
      error: (err: Error) => (this.sectionError = err.message),
    });
  }

  toggleFavorito(): void {
    if (this.item) {
      this.favoritosService.toggle(this.item.id, this.item.titulo);
    }
  }

  cambiarEstado(estado: 'PUBLICADO' | 'BORRADOR'): void {
    if (!this.item || this.item.estado === estado) {
      return;
    }
    this.publishing = true;
    this.error = '';
    this.conocimientosApi.cambiarEstado(this.item.id, estado).subscribe({
      next: (item) => {
        this.item = item;
        this.publishing = false;
      },
      error: (err: Error) => {
        this.error = err.message;
        this.publishing = false;
      },
    });
  }

  editar(): void {
    if (this.item) {
      void this.router.navigate(['/conocimiento', this.item.id, 'editar']);
    }
  }

  pedirEliminar(): void {
    if (!this.item || this.eliminando) {
      return;
    }
    this.confirmarEliminacion = true;
  }

  cancelarEliminar(): void {
    if (this.eliminando) {
      return;
    }
    this.confirmarEliminacion = false;
  }

  confirmarEliminar(): void {
    if (!this.item || this.eliminando) {
      return;
    }
    const id = this.item.id;
    this.eliminando = true;
    this.error = '';
    this.conocimientosApi.eliminar(id).subscribe({
      next: () => {
        this.eliminando = false;
        this.confirmarEliminacion = false;
        void this.router.navigate(['/conocimiento'], { state: { conocimientoEliminado: true } });
      },
      error: (err: Error) => {
        this.eliminando = false;
        this.confirmarEliminacion = false;
        this.error = err.message;
        if (err.message === 'El conocimiento no está disponible.') {
          this.item = null;
        }
      },
    });
  }

  compartir(): void {
    const url = window.location.href;
    if (navigator.clipboard?.writeText) {
      void navigator.clipboard.writeText(url);
    }
    this.copiado = true;
    window.setTimeout(() => (this.copiado = false), 1800);
  }

  cerrarFormulario(seccion: keyof typeof this.formAbierto): void {
    this.formAbierto[seccion] = false;
    if (seccion === 'sintomas') this.cancelarSintoma();
    if (seccion === 'causas') this.cancelarCausa();
    if (seccion === 'pruebas') this.cancelarPrueba();
    if (seccion === 'soluciones') this.cancelarSolucion();
    if (seccion === 'materiales') this.cancelarMaterial();
  }

  guardarSintoma(): void {
    const id = this.conocimientoId;
    if (!id || this.sintomaForm.invalid) {
      this.sintomaForm.markAllAsTouched();
      return;
    }
    const request = this.sintomaForm.getRawValue();
    this.saving = 'sintomas';
    const req$ =
      this.editSintomaId != null
        ? this.conocimientosApi.modificarSintoma(id, this.editSintomaId, request)
        : this.conocimientosApi.crearSintoma(id, request);
    req$.subscribe({
      next: () => {
        this.editSintomaId = null;
        this.formAbierto.sintomas = false;
        this.sintomaForm.reset({ descripcion: '', orden: this.nextOrden(this.sintomas) + 1 });
        this.reloadSintomas(id);
      },
      error: (err: Error) => this.fail(err),
    });
  }

  editarSintoma(item: ItemOrdenado): void {
    this.formAbierto.sintomas = true;
    this.editSintomaId = item.id;
    this.sintomaForm.setValue({ descripcion: item.descripcion, orden: item.orden });
  }

  cancelarSintoma(): void {
    this.editSintomaId = null;
    this.sintomaForm.reset({ descripcion: '', orden: this.nextOrden(this.sintomas) });
  }

  guardarCausa(): void {
    const id = this.conocimientoId;
    if (!id || this.causaForm.invalid) {
      this.causaForm.markAllAsTouched();
      return;
    }
    const request = this.causaForm.getRawValue();
    this.saving = 'causas';
    const req$ =
      this.editCausaId != null
        ? this.conocimientosApi.modificarCausa(id, this.editCausaId, request)
        : this.conocimientosApi.crearCausa(id, request);
    req$.subscribe({
      next: () => {
        this.editCausaId = null;
        this.formAbierto.causas = false;
        this.causaForm.reset({ descripcion: '', orden: this.nextOrden(this.causas) + 1 });
        this.reloadCausas(id);
      },
      error: (err: Error) => this.fail(err),
    });
  }

  editarCausa(item: ItemOrdenado): void {
    this.formAbierto.causas = true;
    this.editCausaId = item.id;
    this.causaForm.setValue({ descripcion: item.descripcion, orden: item.orden });
  }

  cancelarCausa(): void {
    this.editCausaId = null;
    this.causaForm.reset({ descripcion: '', orden: this.nextOrden(this.causas) });
  }

  guardarPrueba(): void {
    const id = this.conocimientoId;
    if (!id || this.pruebaForm.invalid) {
      this.pruebaForm.markAllAsTouched();
      return;
    }
    const value = this.pruebaForm.getRawValue();
    this.saving = 'pruebas';
    if (this.editPruebaId != null) {
      this.conocimientosApi.modificarPrueba(id, this.editPruebaId, { orden: value.orden }).subscribe({
        next: () => {
          this.editPruebaId = null;
          this.formAbierto.pruebas = false;
          this.pruebaForm.reset({ pruebaId: null, orden: this.nextOrden(this.pruebas) + 1 });
          this.reloadPruebas(id);
        },
        error: (err: Error) => this.fail(err),
      });
      return;
    }
    if (value.pruebaId == null) {
      this.sectionError = 'Seleccione una prueba del catálogo.';
      this.saving = null;
      return;
    }
    this.conocimientosApi.asociarPrueba(id, { pruebaId: value.pruebaId, orden: value.orden }).subscribe({
      next: () => {
        this.formAbierto.pruebas = false;
        this.pruebaForm.reset({ pruebaId: null, orden: this.nextOrden(this.pruebas) + 1 });
        this.reloadPruebas(id);
      },
      error: (err: Error) => this.fail(err),
    });
  }

  editarPrueba(item: PruebaAsociada): void {
    this.formAbierto.pruebas = true;
    this.editPruebaId = item.id;
    this.pruebaForm.setValue({ pruebaId: item.id, orden: item.orden });
  }

  cancelarPrueba(): void {
    this.editPruebaId = null;
    this.pruebaForm.reset({ pruebaId: null, orden: this.nextOrden(this.pruebas) });
  }

  guardarSolucion(): void {
    const id = this.conocimientoId;
    if (!id || this.solucionForm.invalid) {
      this.solucionForm.markAllAsTouched();
      return;
    }
    const request = this.solucionForm.getRawValue();
    this.saving = 'soluciones';
    const req$ =
      this.editSolucionId != null
        ? this.conocimientosApi.modificarSolucion(id, this.editSolucionId, request)
        : this.conocimientosApi.crearSolucion(id, request);
    req$.subscribe({
      next: () => {
        this.editSolucionId = null;
        this.formAbierto.soluciones = false;
        this.solucionForm.reset({ descripcion: '', tipo: 'PASOS', orden: this.nextOrden(this.soluciones) + 1 });
        this.reloadSoluciones(id);
      },
      error: (err: Error) => this.fail(err),
    });
  }

  editarSolucion(item: Solucion): void {
    this.formAbierto.soluciones = true;
    this.editSolucionId = item.id;
    this.solucionForm.setValue({
      descripcion: item.descripcion,
      tipo: item.tipo,
      orden: item.orden,
    });
  }

  cancelarSolucion(): void {
    this.editSolucionId = null;
    this.solucionForm.reset({ descripcion: '', tipo: 'PASOS', orden: this.nextOrden(this.soluciones) });
  }

  abrirAsignacion(solucionId: number, asignacion?: AsignacionSolucion): void {
    this.ensureDepartamentos();
    const conocimientoId = this.conocimientoId;
    if (conocimientoId && !this.asignacionesPorSolucion[solucionId]) {
      this.reloadAsignaciones(conocimientoId, solucionId);
    }
    this.solucionAsignacionId = solucionId;
    this.editAsignacionId = asignacion?.id ?? null;
    this.asignacionForm.reset({
      departamentoId: asignacion?.departamentoId ?? null,
      responsableId: asignacion?.responsableId ?? null,
      principal: asignacion?.principal ?? true,
    });
    if (asignacion?.departamentoId) {
      this.organizacion.responsablesDeDepartamento(asignacion.departamentoId).subscribe({
        next: (items) => (this.responsables = items),
      });
    }
  }

  cancelarAsignacion(): void {
    this.solucionAsignacionId = null;
    this.editAsignacionId = null;
    this.asignacionForm.reset({ departamentoId: null, responsableId: null, principal: true });
    this.responsables = [];
  }

  guardarAsignacion(): void {
    const conocimientoId = this.conocimientoId;
    const solucionId = this.solucionAsignacionId;
    if (!conocimientoId || !solucionId) {
      return;
    }
    const value = this.asignacionForm.getRawValue();
    if (value.departamentoId == null && value.responsableId == null) {
      this.sectionError = 'Indique al menos un departamento o un responsable.';
      return;
    }
    this.saving = 'asignaciones';
    const request = {
      departamentoId: value.departamentoId,
      responsableId: value.responsableId,
      principal: value.principal,
    };
    const req$ =
      this.editAsignacionId != null
        ? this.conocimientosApi.modificarAsignacion(
            conocimientoId,
            solucionId,
            this.editAsignacionId,
            request,
          )
        : this.conocimientosApi.crearAsignacion(conocimientoId, solucionId, request);
    req$.subscribe({
      next: () => {
        this.cancelarAsignacion();
        this.reloadAsignaciones(conocimientoId, solucionId);
        this.ok('Asignación guardada.');
      },
      error: (err: Error) => this.fail(err),
    });
  }

  guardarMaterial(): void {
    const id = this.conocimientoId;
    if (!id || this.materialForm.invalid) {
      this.materialForm.markAllAsTouched();
      this.sectionError = 'Complete nombre y URL del material.';
      return;
    }
    const request = this.materialForm.getRawValue();
    this.saving = 'materiales';
    const req$ =
      this.editMaterialId != null
        ? this.conocimientosApi.modificarMaterial(id, this.editMaterialId, request)
        : this.conocimientosApi.crearMaterial(id, request);
    req$.subscribe({
      next: () => {
        this.editMaterialId = null;
        this.formAbierto.materiales = false;
        this.materialForm.reset({ nombre: '', tipo: 'PDF', url: '' });
        this.reloadMateriales(id);
      },
      error: (err: Error) => this.fail(err),
    });
  }

  editarMaterial(item: MaterialApoyo): void {
    this.formAbierto.materiales = true;
    this.editMaterialId = item.id;
    this.materialForm.setValue({
      nombre: item.nombre,
      tipo: item.tipo,
      url: item.url,
    });
  }

  tipoMaterialLabel(tipo: TipoMaterial): string {
    switch (tipo) {
      case 'IMAGEN':
        return 'Imagen';
      case 'PDF':
        return 'PDF';
      case 'VIDEO':
        return 'Video';
      default:
        return 'Enlace';
    }
  }

  tipoMaterialShort(tipo: TipoMaterial): string {
    switch (tipo) {
      case 'IMAGEN':
        return 'IMG';
      case 'PDF':
        return 'PDF';
      case 'VIDEO':
        return 'VID';
      default:
        return 'URL';
    }
  }

  tipoMaterialClass(tipo: TipoMaterial): string {
    return `tipo-${tipo.toLowerCase()}`;
  }

  cancelarMaterial(): void {
    this.editMaterialId = null;
    this.materialForm.reset({ nombre: '', tipo: 'PDF', url: '' });
  }

  asignacionesDe(solucionId: number): AsignacionSolucion[] {
    return this.asignacionesPorSolucion[solucionId] ?? [];
  }

  private cargarAsignaciones(conocimientoId: number, soluciones: Solucion[]): void {
    this.asignacionesPorSolucion = {};
    for (const solucion of soluciones) {
      this.conocimientosApi.listarAsignaciones(conocimientoId, solucion.id).subscribe({
        next: (items) => {
          if (this.currentId !== conocimientoId) return;
          this.asignacionesPorSolucion = {
            ...this.asignacionesPorSolucion,
            [solucion.id]: items,
          };
        },
      });
    }
  }

  private reloadSintomas(id: number): void {
    this.conocimientosApi.listarSintomas(id, true).subscribe({
      next: (items) => {
        this.sintomas = items;
        this.ok('Síntoma guardado.');
      },
      error: (err: Error) => this.fail(err),
    });
  }

  private reloadCausas(id: number): void {
    this.conocimientosApi.listarCausas(id, true).subscribe({
      next: (items) => {
        this.causas = items;
        this.ok('Causa guardada.');
      },
      error: (err: Error) => this.fail(err),
    });
  }

  private reloadPruebas(id: number): void {
    this.conocimientosApi.listarPruebas(id, true).subscribe({
      next: (items) => {
        this.pruebas = items;
        this.ok('Prueba asociada guardada.');
      },
      error: (err: Error) => this.fail(err),
    });
  }

  private reloadSoluciones(id: number): void {
    this.conocimientosApi.listarSoluciones(id, true).subscribe({
      next: (items) => {
        this.soluciones = items;
        this.cargarAsignaciones(id, items);
        this.ok('Solución guardada.');
      },
      error: (err: Error) => this.fail(err),
    });
  }

  private reloadAsignaciones(conocimientoId: number, solucionId: number): void {
    this.conocimientosApi.listarAsignaciones(conocimientoId, solucionId, true).subscribe({
      next: (items) => {
        this.asignacionesPorSolucion = { ...this.asignacionesPorSolucion, [solucionId]: items };
      },
      error: (err: Error) => this.fail(err),
    });
  }

  private reloadMateriales(id: number): void {
    this.conocimientosApi.listarMateriales(id, true).subscribe({
      next: (items) => {
        this.materiales = items;
        this.ok('Material guardado.');
      },
      error: (err: Error) => this.fail(err),
    });
  }

  private nextOrden(items: { orden: number }[]): number {
    return items.reduce((max, item) => Math.max(max, item.orden || 0), 0) + 1;
  }

  private ok(message: string): void {
    this.saving = null;
    this.sectionError = '';
    this.sectionSuccess = message;
  }

  private fail(err: Error): void {
    this.saving = null;
    this.sectionSuccess = '';
    this.sectionError = err.message;
  }
}
