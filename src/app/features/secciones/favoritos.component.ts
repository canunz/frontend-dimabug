import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ConocimientoEstado, etiquetaEstadoConocimiento } from '../../core/models/conocimiento.model';
import { ConocimientoService } from '../../core/services/conocimiento.service';
import { FavoritoItem, FavoritosService } from '../../core/services/favoritos.service';

interface FavoritoVista extends FavoritoItem {
  estado?: ConocimientoEstado;
}

@Component({
  selector: 'app-favoritos',
  standalone: true,
  imports: [RouterLink],
  template: `
    <section class="cat-page">
      <div class="franja">
        <div>
          <p>Biblioteca</p>
          <h1>Favoritos</h1>
          <span>Los conocimientos que marcas con estrella quedan guardados aquí.</span>
        </div>
        <a routerLink="/conocimiento" class="btn-crear">Buscar conocimiento</a>
      </div>

      <div class="tabla-wrap">
        <table>
          <thead>
            <tr>
              <th class="col-acciones">Acciones</th>
              <th>Conocimiento</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            @for (item of items; track item.id) {
              <tr>
                <td>
                  <div class="acciones">
                    <a class="act ver" [routerLink]="['/conocimiento', item.id]">Ver</a>
                  </div>
                </td>
                <td><strong>{{ item.titulo }}</strong></td>
                <td>{{ etiqueta(item.estado) }}</td>
              </tr>
            } @empty {
              <tr>
                <td colspan="3" class="vacio">Aún no tienes favoritos. Márcalos con la estrella al buscar un conocimiento.</td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </section>
  `,
  styleUrl: '../../shared/ui/catalogo-page.css',
})
export class FavoritosComponent implements OnInit {
  private readonly conocimientosApi = inject(ConocimientoService);
  private readonly favoritos = inject(FavoritosService);
  readonly etiquetaEstado = etiquetaEstadoConocimiento;

  etiqueta(estado?: ConocimientoEstado): string {
    return estado ? this.etiquetaEstado(estado) : 'Guardado';
  }
  items: FavoritoVista[] = [];

  ngOnInit(): void {
    this.items = this.favoritos.items();
    this.conocimientosApi.listar().subscribe({
      next: (list) => {
        const ids = new Set(this.favoritos.ids());
        const encontrados = list.filter((item) => ids.has(item.id));
        if (!encontrados.length) {
          return;
        }
        this.items = encontrados.map((item) => ({
          id: item.id,
          titulo: item.titulo,
          estado: item.estado,
        }));
      },
    });
  }
}
