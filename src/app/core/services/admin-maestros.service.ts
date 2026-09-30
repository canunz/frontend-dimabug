import { Injectable, signal } from '@angular/core';

export interface MaestroItem {
  id: number;
  nombre: string;
  extra?: string;
  activo?: boolean;
}

export type MaestroTipo = 'grupos' | 'frecuencias' | 'sistemas' | 'modulos' | 'responsables';

interface MaestrosState {
  nextId: number;
  grupos: MaestroItem[];
  frecuencias: MaestroItem[];
  sistemas: MaestroItem[];
  modulos: MaestroItem[];
  responsables: MaestroItem[];
  acciones: { texto: string; ruta: string; fecha: string }[];
}

const KEY = 'dimabug.admin.maestros.v1';

const SEED: MaestrosState = {
  nextId: 30,
  grupos: [
    { id: 1, nombre: 'Administrador' },
    { id: 2, nombre: 'Soporte' },
    { id: 3, nombre: 'Usuario' },
  ],
  frecuencias: [
    { id: 4, nombre: 'Diario' },
    { id: 5, nombre: 'Frecuente' },
    { id: 6, nombre: 'Semanal' },
    { id: 7, nombre: 'Ocasional' },
    { id: 8, nombre: 'Raro' },
    { id: 9, nombre: 'Anual' },
  ],
  sistemas: [
    { id: 10, nombre: 'Jadima' },
    { id: 11, nombre: 'Google Apps' },
    { id: 12, nombre: 'Comercial' },
    { id: 13, nombre: 'Impresión fiscal' },
    { id: 14, nombre: 'Data' },
  ],
  modulos: [
    { id: 15, nombre: 'Caja', extra: 'Jadima' },
    { id: 16, nombre: 'Reportes', extra: 'Jadima' },
    { id: 17, nombre: 'Inventario', extra: 'Comercial' },
  ],
  responsables: [
    { id: 18, nombre: 'Ana Soto', extra: 'Soporte TI', activo: true },
    { id: 19, nombre: 'Luis Pérez', extra: 'Operaciones', activo: true },
  ],
  acciones: [
    { texto: 'Consultó Usuarios', ruta: '/usuarios', fecha: '2026-02-12T10:20:00' },
    { texto: 'Revisó Hardware', ruta: '/plataforma/hardware', fecha: '2026-02-11T16:05:00' },
  ],
};

@Injectable({ providedIn: 'root' })
export class AdminMaestrosService {
  private readonly state = signal<MaestrosState>(this.leer());

  listar(tipo: MaestroTipo): MaestroItem[] {
    return this.state()[tipo];
  }

  contar(tipo: MaestroTipo): number {
    return this.state()[tipo].length;
  }

  acciones() {
    return this.state().acciones.slice(0, 6);
  }

  registrar(texto: string, ruta: string): void {
    const current = this.state();
    this.escribir({
      ...current,
      acciones: [{ texto, ruta, fecha: new Date().toISOString() }, ...current.acciones].slice(0, 12),
    });
  }

  guardar(tipo: MaestroTipo, item: Omit<MaestroItem, 'id'> & { id?: number }): void {
    const current = this.state();
    const id = item.id ?? current.nextId;
    const saved = { ...item, id };
    const list = current[tipo].some((row) => row.id === item.id)
      ? current[tipo].map((row) => (row.id === item.id ? saved : row))
      : [...current[tipo], saved];
    this.escribir({
      ...current,
      [tipo]: list,
      nextId: Math.max(current.nextId, id + 1),
    });
    this.registrar(item.id ? `Modificó ${tipo}` : `Añadió ${saved.nombre}`, `/admin/catalogo/${tipo}`);
  }

  eliminar(tipo: MaestroTipo, id: number): void {
    const current = this.state();
    this.escribir({
      ...current,
      [tipo]: current[tipo].filter((row) => row.id !== id),
    });
  }

  private leer(): MaestrosState {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? { ...structuredClone(SEED), ...JSON.parse(raw) } : structuredClone(SEED);
    } catch {
      return structuredClone(SEED);
    }
  }

  private escribir(next: MaestrosState): void {
    this.state.set(next);
    localStorage.setItem(KEY, JSON.stringify(next));
  }
}
