import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ProcedimientoService } from '../../core/services/procedimiento.service';

@Component({
  selector: 'app-procedimiento-form',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './procedimiento-form.component.html',
  styleUrl: './procedimiento-form.component.css',
})
export class ProcedimientoFormComponent implements OnInit {
  private readonly procedimientos = inject(ProcedimientoService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  editId: number | null = null;
  loading = false;
  guardando = false;
  error = '';

  form = this.fb.nonNullable.group({
    nombre: ['', Validators.required],
    descripcion: [''],
  });

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id) {
      return;
    }
    this.editId = id;
    this.loading = true;
    this.procedimientos.obtenerPorId(id).subscribe({
      next: (item) => {
        this.form.setValue({
          nombre: item.nombre,
          descripcion: item.descripcion ?? '',
        });
        this.loading = false;
      },
      error: (err: Error) => {
        this.error = err.message;
        this.loading = false;
      },
    });
  }

  guardar(): void {
    if (this.form.invalid || this.guardando) {
      this.form.markAllAsTouched();
      return;
    }
    const raw = this.form.getRawValue();
    const request = { nombre: raw.nombre, descripcion: raw.descripcion };
    this.guardando = true;
    this.error = '';
    const llamada = this.editId
      ? this.procedimientos.actualizar(this.editId, request)
      : this.procedimientos.crear(request);
    llamada.subscribe({
      next: (item) => {
        void this.router.navigate(['/procedimientos', item.id]);
      },
      error: (err: Error) => {
        this.guardando = false;
        this.error = err.message;
      },
    });
  }
}
