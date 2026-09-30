import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

export interface CatalogoTab {
  label: string;
  ruta: string;
}

@Component({
  selector: 'app-catalogo-tabs',
  standalone: true,
  imports: [RouterLink],
  template: `
    <nav class="tabs" aria-label="Catálogos">
      @for (grupo of grupos; track grupo.titulo) {
        <div class="fila">
          <span class="etiqueta">{{ grupo.titulo }}</span>
          <div class="links">
            @for (item of grupo.items; track item.ruta) {
              <a
                [routerLink]="item.ruta"
                [queryParams]="{}"
                [class.on]="activo(item.ruta)"
              >{{ item.label }}</a>
            }
          </div>
        </div>
      }
    </nav>
  `,
  styles: `
    .tabs {
      display: grid;
      gap: 8px;
      margin: 0 0 16px;
      padding: 10px;
      background: #fff;
      border: 1px solid #e7e9f0;
      border-radius: 14px;
    }

    .fila {
      display: grid;
      grid-template-columns: 132px minmax(0, 1fr);
      gap: 8px;
      align-items: center;
    }

    .etiqueta {
      color: #64748b;
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }

    .links {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }

    a {
      border-radius: 10px;
      padding: 8px 12px;
      color: #475569;
      font-size: 13px;
      font-weight: 650;
      text-decoration: none;
    }

    a.on {
      background: #1e4fd6;
      color: #fff;
    }

    @media (max-width: 720px) {
      .fila {
        grid-template-columns: 1fr;
        gap: 4px;
      }
    }

    :host-context(.tema-oscuro) .tabs {
      background: #111827;
      border-color: #1f2937;
    }

    :host-context(.tema-oscuro) .etiqueta,
    :host-context(.tema-oscuro) a {
      color: #cbd5e1;
    }
  `,
})
export class CatalogoTabsComponent {
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);

  get grupos(): { titulo: string; items: CatalogoTab[] }[] {
    const operacion: CatalogoTab[] = [
      { label: 'Departamentos', ruta: '/departamentos' },
      { label: 'Errores', ruta: '/error/nuevo' },
      { label: 'Hardware', ruta: '/plataforma/hardware' },
      { label: 'Pruebas', ruta: '/pruebas' },
      { label: 'Soluciones', ruta: '/soluciones' },
    ];
    if (!this.auth.isAdmin()) {
      return [{ titulo: 'Catálogos', items: operacion }];
    }
    return [
      {
        titulo: 'Accesos',
        items: [
          { label: 'Todos', ruta: '/admin' },
          { label: 'Grupos', ruta: '/admin/catalogo/grupos' },
          { label: 'Usuarios', ruta: '/usuarios' },
        ],
      },
      {
        titulo: 'Catálogos',
        items: [
          { label: 'Departamentos', ruta: '/departamentos' },
          { label: 'Errores', ruta: '/error/nuevo' },
          { label: 'Frecuencias', ruta: '/admin/catalogo/frecuencias' },
          { label: 'Hardware', ruta: '/plataforma/hardware' },
          { label: 'Módulos', ruta: '/admin/catalogo/modulos' },
          { label: 'Pruebas', ruta: '/pruebas' },
          { label: 'Responsables', ruta: '/admin/catalogo/responsables' },
          { label: 'Sistemas', ruta: '/admin/catalogo/sistemas' },
          { label: 'Soluciones', ruta: '/soluciones' },
        ],
      },
    ];
  }

  activo(ruta: string): boolean {
    const url = this.router.url.split('?')[0];
    if (ruta === '/admin') {
      return url === '/admin';
    }
    if (ruta === '/pruebas') {
      return url === '/pruebas';
    }
    return url === ruta || url.startsWith(`${ruta}/`);
  }
}
