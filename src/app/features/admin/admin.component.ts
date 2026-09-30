import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AdminMaestrosService, MaestroTipo } from '../../core/services/admin-maestros.service';
import { CatalogoService } from '../../core/services/catalogo.service';
import { UsuarioService } from '../../core/services/usuario.service';
import { CatalogoTabsComponent } from '../../shared/ui/catalogo-tabs.component';

type AdminTab = 'todos' | 'auth' | 'buscador' | 'recientes';

interface AdminModelo {
  nombre: string;
  singular: string;
  descripcion: string;
  count: number;
  grupo: 'auth' | 'buscador';
  listar: string;
  anadir: string;
}

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [RouterLink, DatePipe, CatalogoTabsComponent],
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.css',
})
export class AdminComponent {
  private readonly catalogo = inject(CatalogoService);
  private readonly maestros = inject(AdminMaestrosService);
  private readonly usuariosApi = inject(UsuarioService);

  readonly tab = signal<AdminTab>('todos');
  readonly usuarios = signal(0);

  constructor() {
    this.usuariosApi.listar().subscribe({
      next: (list) => this.usuarios.set(list.length),
      error: () => this.usuarios.set(0),
    });
  }

  readonly tabs: { id: AdminTab; label: string }[] = [
    { id: 'auth', label: 'Autenticación' },
    { id: 'buscador', label: 'Buscador de errores' },
    { id: 'recientes', label: 'Recientes' },
  ];

  readonly modelos = computed<AdminModelo[]>(() => [
    this.simple('Grupos', 'grupo', 'Roles de acceso al sistema', 'grupos', 'auth'),
    {
      nombre: 'Usuarios',
      singular: 'usuario',
      descripcion: 'Cuentas, correos y permisos',
      count: this.usuarios(),
      grupo: 'auth',
      listar: '/usuarios',
      anadir: '/usuarios',
    },
    {
      nombre: 'Departamentos',
      singular: 'departamento',
      descripcion: 'Áreas y contactos internos',
      count: this.catalogo.departamentos().length,
      grupo: 'buscador',
      listar: '/departamentos',
      anadir: '/departamentos',
    },
    {
      nombre: 'Errores',
      singular: 'error',
      descripcion: 'Incidencias registradas',
      count: this.catalogo.errores().length,
      grupo: 'buscador',
      listar: '/error/nuevo',
      anadir: '/error/nuevo',
    },
    this.simple('Frecuencias', 'frecuencia', 'Periodicidad de los incidentes', 'frecuencias', 'buscador'),
    {
      nombre: 'Hardware',
      singular: 'hardware',
      descripcion: 'Equipos y sistemas asociados',
      count: this.catalogo.hardware().length,
      grupo: 'buscador',
      listar: '/plataforma/hardware',
      anadir: '/plataforma/hardware',
    },
    this.simple('Módulos', 'módulo', 'Módulos por sistema', 'modulos', 'buscador'),
    {
      nombre: 'Pruebas típicas',
      singular: 'prueba',
      descripcion: 'Pasos de diagnóstico',
      count: this.catalogo.pruebas().length,
      grupo: 'buscador',
      listar: '/pruebas',
      anadir: '/pruebas',
    },
    this.simple('Responsables', 'responsable', 'Personas a cargo de soluciones', 'responsables', 'buscador'),
    this.simple('Sistemas', 'sistema', 'Aplicaciones de la plataforma', 'sistemas', 'buscador'),
    {
      nombre: 'Soluciones',
      singular: 'solución',
      descripcion: 'Pasos y anexos de resolución',
      count: this.catalogo.soluciones().length,
      grupo: 'buscador',
      listar: '/soluciones',
      anadir: '/soluciones',
    },
  ]);

  readonly visibles = computed(() => {
    const tab = this.tab();
    if (tab === 'todos' || tab === 'recientes') return this.modelos();
    return this.modelos().filter((item) => item.grupo === tab);
  });

  get acciones() {
    return this.maestros.acciones();
  }

  setTab(tab: AdminTab): void {
    this.tab.set(tab);
  }

  marcar(texto: string, ruta: string): void {
    this.maestros.registrar(texto, ruta);
  }

  private simple(
    nombre: string,
    singular: string,
    descripcion: string,
    tipo: MaestroTipo,
    grupo: 'auth' | 'buscador',
  ): AdminModelo {
    return {
      nombre,
      singular,
      descripcion,
      count: this.maestros.contar(tipo),
      grupo,
      listar: `/admin/catalogo/${tipo}`,
      anadir: `/admin/catalogo/${tipo}`,
    };
  }
}
