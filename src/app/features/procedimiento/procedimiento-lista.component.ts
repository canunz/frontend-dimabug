import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Procedimiento } from '../../core/models/procedimiento.model';
import { AuthService } from '../../core/services/auth.service';
import { ProcedimientoService } from '../../core/services/procedimiento.service';

@Component({
  selector: 'app-procedimiento-lista',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './procedimiento-lista.component.html',
  styleUrl: '../../shared/ui/catalogo-page.css',
})
export class ProcedimientoListaComponent implements OnInit {
  private readonly procedimientos = inject(ProcedimientoService);
  private readonly auth = inject(AuthService);

  readonly esAdministrador = this.auth.isAdmin;
  items: Procedimiento[] = [];
  loading = true;
  error = '';
  publicandoId: number | null = null;

  ngOnInit(): void {
    this.cargar();
  }

  publicar(item: Procedimiento): void {
    if (!this.esAdministrador() || item.estado !== 'BORRADOR' || this.publicandoId != null) {
      return;
    }
    this.publicandoId = item.id;
    this.error = '';
    this.procedimientos.cambiarEstado(item.id, 'PUBLICADO').subscribe({
      next: (actualizado) => {
        this.items = this.items.map((actual) => (actual.id === actualizado.id ? actualizado : actual));
        this.publicandoId = null;
      },
      error: (err: Error) => {
        this.publicandoId = null;
        this.error = err.message;
      },
    });
  }

  private cargar(): void {
    this.loading = this.items.length === 0;
    this.procedimientos.listar().subscribe({
      next: (items) => {
        this.items = items;
        this.loading = false;
      },
      error: (err: Error) => {
        this.error = err.message;
        this.loading = false;
      },
    });
  }
}
