import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ConocimientoService } from '../../core/services/conocimiento.service';
import { SolucionItem } from '../../core/models/catalogo.model';
import { Conocimiento, TipoSolucion } from '../../core/models/conocimiento.model';
import { CatalogoTabsComponent } from '../../shared/ui/catalogo-tabs.component';

@Component({
  selector: 'app-soluciones',
  standalone: true,
  imports: [FormsModule, ReactiveFormsModule, CatalogoTabsComponent, RouterLink],
  templateUrl: './soluciones.component.html',
  styleUrls: ['../../shared/ui/catalogo-page.css', './soluciones.component.css'],
})
export class SolucionesComponent implements OnInit {
  private readonly conocimientos = inject(ConocimientoService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(FormBuilder);

  q = this.route.snapshot.queryParamMap.get('q') || '';
  items: SolucionItem[] = [];
  guias: Conocimiento[] = [];
  loading = false;
  saving = false;
  error = '';
  formError = '';
  modalOpen = false;
  editItem: SolucionItem | null = null;

  form = this.fb.nonNullable.group({
    conocimientoId: [0, Validators.min(1)],
    descripcion: ['', Validators.required],
    tipo: ['PASOS' as TipoSolucion, Validators.required],
  });

  get filtrados(): SolucionItem[] {
    const term = this.q.trim().toLowerCase();
    if (!term) {
      return this.items;
    }
    return this.items.filter((item) =>
      [item.nombre, item.pasos, item.anexos, item.asignaciones.join(' '), item.conocimientoTitulo || '']
        .join(' ')
        .toLowerCase()
        .includes(term),
    );
  }

  ngOnInit(): void {
    this.cargar();
  }

  cargar(force = false): void {
    this.loading = !this.items.length;
    this.error = '';
    let first = true;
    this.conocimientos
      .listarSolucionesCatalogo(force)
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

  openCreate(): void {
    this.editItem = null;
    this.form.controls.conocimientoId.enable();
    this.formError = '';
    this.form.reset({ conocimientoId: 0, descripcion: '', tipo: 'PASOS' });
    this.modalOpen = true;
    this.cargarGuias();
  }

  openEdit(item: SolucionItem): void {
    if (!item.conocimientoId) {
      return;
    }
    this.editItem = item;
    this.formError = '';
    this.form.reset({
      conocimientoId: item.conocimientoId,
      descripcion: item.nombre,
      tipo: item.tipo === 'DERIVACION' ? 'DERIVACION' : 'PASOS',
    });
    this.form.controls.conocimientoId.disable();
    this.modalOpen = true;
    this.cargarGuias();
  }

  closeModal(): void {
    this.modalOpen = false;
    this.editItem = null;
    this.form.controls.conocimientoId.enable();
  }

  private cargarGuias(): void {
    this.conocimientos
      .listar()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (guias) => (this.guias = guias),
        error: () => (this.formError = 'No se pudieron cargar los conocimientos.'),
      });
  }

  save(): void {
    this.formError = '';
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.formError = 'Elige un conocimiento y escribe la solución.';
      return;
    }
    const raw = this.form.getRawValue();
    const conocimientoId = Number(raw.conocimientoId);
    const editando = this.editItem;
    const orden = editando?.orden || this.items.filter((item) => item.conocimientoId === conocimientoId).length + 1;
    const request = {
      descripcion: raw.descripcion.trim(),
      tipo: raw.tipo,
      orden,
    };
    this.saving = true;
    const req$ = editando?.conocimientoId
      ? this.conocimientos.modificarSolucion(editando.conocimientoId, editando.id, request)
      : this.conocimientos.crearSolucion(conocimientoId, request);
    req$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.saving = false;
          this.closeModal();
          this.cargar(true);
        },
        error: (err: Error) => {
          this.saving = false;
          this.formError = err.message || 'No se pudo guardar la solución.';
        },
      });
  }

  trackKey(item: SolucionItem): string {
    return `${item.conocimientoId ?? 0}-${item.id}`;
  }

  recortar(texto: string, max = 160): string {
    if (!texto) {
      return '—';
    }
    return texto.length > max ? `${texto.slice(0, max)}…` : texto;
  }

  anexosLista(texto: string): string[] {
    if (!texto?.trim()) {
      return [];
    }
    return [texto.trim()];
  }
}
