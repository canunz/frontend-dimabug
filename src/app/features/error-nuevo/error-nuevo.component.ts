import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { CatalogoService } from '../../core/services/catalogo.service';
import { ErrorItem, FRECUENCIAS } from '../../core/models/catalogo.model';
import { CatalogoTabsComponent } from '../../shared/ui/catalogo-tabs.component';

@Component({
  selector: 'app-error-nuevo',
  standalone: true,
  imports: [ReactiveFormsModule, CatalogoTabsComponent],
  templateUrl: './error-nuevo.component.html',
  styleUrls: ['../../shared/ui/catalogo-page.css', './error-nuevo.component.css'],
})
export class ErrorNuevoComponent implements OnInit {
  private readonly catalogo = inject(CatalogoService);
  private readonly auth = inject(AuthService);
  private readonly fb = inject(FormBuilder);

  readonly puedeGestionar = this.auth.isStaff;

  readonly frecuencias = FRECUENCIAS;
  modalOpen = false;
  editId: number | null = null;
  success = '';
  lista: ErrorItem[] = [];

  form = this.fb.nonNullable.group({
    descripcion: ['', Validators.required],
    hardwareId: [0],
    sistema: [''],
    modulo: [''],
    frecuencia: [''],
    usuarioContexto: [''],
    causa: [''],
    comentarios: [''],
    solucionIds: this.fb.nonNullable.control<number[]>([]),
    pruebaIds: this.fb.nonNullable.control<number[]>([]),
  });

  ngOnInit(): void {
    this.refrescarLista();
  }

  get hardware() {
    return this.catalogo.hardware();
  }

  get sistemas(): string[] {
    const id = Number(this.form.controls.hardwareId.value) || null;
    return this.catalogo.sistemasDeHardware(id);
  }

  nombreHardware(id: number | null): string {
    return this.hardware.find((item) => item.id === id)?.nombre || 'Sin hardware';
  }

  nombresSoluciones(ids: number[]): string[] {
    return this.catalogo
      .soluciones()
      .filter((item) => ids.includes(item.id))
      .map((item) => item.nombre);
  }

  abrirNuevo(): void {
    this.editId = null;
    this.success = '';
    this.form.reset({
      descripcion: '',
      hardwareId: 0,
      sistema: '',
      modulo: '',
      frecuencia: '',
      usuarioContexto: '',
      causa: '',
      comentarios: '',
      solucionIds: [],
      pruebaIds: [],
    });
    this.modalOpen = true;
  }

  abrirEditar(item: ErrorItem): void {
    this.editId = item.id;
    this.success = '';
    this.form.reset({
      descripcion: item.descripcion,
      hardwareId: item.hardwareId || 0,
      sistema: item.sistema,
      modulo: item.modulo,
      frecuencia: item.frecuencia,
      usuarioContexto: item.usuarioContexto,
      causa: item.causa,
      comentarios: item.comentarios,
      solucionIds: [...item.solucionIds],
      pruebaIds: [...item.pruebaIds],
    });
    this.modalOpen = true;
  }

  cerrarModal(): void {
    this.modalOpen = false;
    this.editId = null;
  }

  eliminar(item: ErrorItem): void {
    if (confirm(`¿Eliminar el error "${item.descripcion}"?`)) {
      this.catalogo.eliminarError(item.id);
      this.refrescarLista();
    }
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const raw = this.form.getRawValue();
    const esEdicion = this.editId != null;
    this.catalogo.guardarError({
      id: this.editId ?? undefined,
      descripcion: raw.descripcion.trim(),
      hardwareId: Number(raw.hardwareId) || null,
      sistema: String(raw.sistema || ''),
      modulo: raw.modulo.trim(),
      frecuencia: String(raw.frecuencia || ''),
      usuarioContexto: raw.usuarioContexto.trim(),
      causa: raw.causa.trim(),
      comentarios: raw.comentarios.trim(),
      solucionIds: [...raw.solucionIds],
      pruebaIds: [...raw.pruebaIds],
    });
    this.refrescarLista();
    this.modalOpen = false;
    this.editId = null;
    this.success = esEdicion ? 'Incidencia actualizada.' : 'Incidencia registrada correctamente.';
    if (!this.puedeGestionar()) {
      this.form.reset({
        descripcion: '',
        hardwareId: 0,
        sistema: '',
        modulo: '',
        frecuencia: '',
        usuarioContexto: '',
        causa: '',
        comentarios: '',
        solucionIds: [],
        pruebaIds: [],
      });
    }
  }

  private refrescarLista(): void {
    this.lista = [...this.catalogo.errores()].sort((a, b) => b.id - a.id);
  }
}
