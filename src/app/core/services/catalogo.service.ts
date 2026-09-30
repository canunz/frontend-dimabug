import { Injectable, signal } from '@angular/core';
import {
  ConocimientoBusqueda,
  DepartamentoItem,
  ErrorItem,
  HardwareItem,
  PruebaItem,
  SolucionItem,
} from '../models/catalogo.model';

const KEY = 'dimabug.catalogos.v2';

interface CatalogoState {
  hardware: HardwareItem[];
  departamentos: DepartamentoItem[];
  pruebas: PruebaItem[];
  soluciones: SolucionItem[];
  errores: ErrorItem[];
  nextId: number;
}

const CONOCIMIENTOS: ConocimientoBusqueda[] = [
  {
    id: 1,
    codigo: 'CON-IMP-001233',
    tipo: 'Conocimiento',
    titulo: 'Impresora fuera de línea (TSP800II / Star)',
    descripcion: 'La impresora aparece “Fuera de línea” en Windows o Debian y no responde a trabajos de impresión.',
    sistema: 'Impresora',
    hardware: 'TSP800II',
    categoria: 'Conectividad',
    fecha: '2026-02-12',
    fechaCreacion: '2026-01-05',
    creador: 'Cristófer A.',
    visualizaciones: 156,
    vecesUtil: 87,
    icono: 'impresora',
    sintomas: [
      'La impresora aparece “Fuera de línea”.',
      'No imprime tickets ni comprobantes.',
      'Los trabajos quedan en cola o no llegan a la impresora.',
    ],
    pruebas: [
      'Verificar conexión de red y cable.',
      'Hacer ping a la IP de la impresora.',
      'Revisar el servicio de impresión (spooler/CUPS).',
      'Imprimir página de prueba.',
    ],
    causa: 'La impresora pierde comunicación por problemas de red, servicio de impresión detenido o configuración incorrecta de puerto.',
    solucionPasos: [
      'Verificar conexión de red y encender la impresora.',
      'Reiniciar el servicio de impresión de Windows o CUPS (Debian).',
      'Eliminar trabajos en cola y reenviar una prueba.',
      'Verificar IP y configuración de puerto.',
      'Imprimir página de prueba y confirmar.',
    ],
    materiales: [
      { nombre: 'Manual Star TSP800II.pdf', tamano: '1.2 MB' },
      { nombre: 'Comandos CUPS — Debian.txt', tamano: '8 KB' },
      { nombre: 'Guía conexión de impresora.pdf', tamano: '890 KB' },
    ],
    etiquetas: ['impresora', 'red', 'fuera de línea', 'tsp800ii', 'star', 'conectividad'],
  },
  {
    id: 2,
    codigo: 'CON-JAD-000441',
    tipo: 'Conocimiento',
    titulo: 'Jadima error SimpleReport timeout',
    descripcion: 'Error intermitente al mover o consultar reportes en Jadima desde un POS.',
    sistema: 'Jadima',
    hardware: 'POS',
    categoria: 'Aplicación',
    fecha: '2026-02-10',
    fechaCreacion: '2026-01-18',
    creador: 'Ana Soto',
    visualizaciones: 98,
    vecesUtil: 41,
    icono: 'monitor',
    sintomas: [
      'El reporte SimpleReport queda en espera y termina en timeout.',
      'El POS no responde mientras se genera el informe.',
    ],
    pruebas: [
      'Reintentar el mismo reporte en otro POS.',
      'Revisar latencia hacia el servidor Jadima.',
      'Validar que no haya otro proceso bloqueando la caja.',
    ],
    causa: 'El servidor de reportes no responde a tiempo o la sesión del POS queda sin recursos.',
    solucionPasos: [
      'Cerrar Jadima y volver a ingresar.',
      'Reintentar el reporte fuera de horario punta.',
      'Si persiste, derivar a Soporte TI con hora y sucursal.',
    ],
    materiales: [{ nombre: 'Checklist timeout Jadima.pdf', tamano: '240 KB' }],
    etiquetas: ['jadima', 'pos', 'timeout', 'reportes'],
  },
  {
    id: 3,
    codigo: 'CON-RED-000218',
    tipo: 'Conocimiento',
    titulo: 'Pérdida de enlace con caja matriz',
    descripcion: 'La sucursal pierde conexión con caja matriz o con la impresora de red.',
    sistema: 'Red',
    hardware: 'Switch / Firewall',
    categoria: 'Impresora',
    fecha: '2026-02-08',
    fechaCreacion: '2025-12-02',
    creador: 'Luis Pérez',
    visualizaciones: 203,
    vecesUtil: 112,
    icono: 'red',
    sintomas: [
      'No hay ping a caja matriz.',
      'Las cajas locales quedan aisladas.',
    ],
    pruebas: [
      'Probar enlace WAN y switch de sucursal.',
      'Revisar firewall y VPN.',
    ],
    causa: 'Caída del enlace o filtrado de tráfico hacia caja matriz.',
    solucionPasos: [
      'Reiniciar switch y modem de sucursal.',
      'Validar VPN con el proveedor.',
      'Si no vuelve, activar plan B.',
    ],
    materiales: [{ nombre: 'Diagrama enlace sucursal.pdf', tamano: '640 KB' }],
    etiquetas: ['red', 'caja matriz', 'enlace'],
  },
  {
    id: 4,
    codigo: 'PRC-PBN-000077',
    tipo: 'Procedimiento',
    titulo: 'Activar plan B en sucursal',
    descripcion: 'Pasos para activar el plan B (VM local) cuando falla la conexión con caja matriz.',
    sistema: 'Plan B',
    hardware: 'Servidor local',
    categoria: 'Contingencia',
    fecha: '2026-02-05',
    fechaCreacion: '2025-11-20',
    creador: 'Soporte TI',
    visualizaciones: 74,
    vecesUtil: 33,
    icono: 'servidor',
    sintomas: ['Caja matriz no responde por más de 15 minutos.'],
    pruebas: ['Confirmar que el servidor local está encendido y con red interna.'],
    causa: 'Contingencia por caída prolongada del enlace central.',
    solucionPasos: [
      'Avisar a supervisor de sucursal.',
      'Encender VM de plan B.',
      'Cambiar apuntador de cajas al servidor local.',
      'Registrar la activación en el bitácora.',
    ],
    materiales: [{ nombre: 'Manual plan B sucursal.pdf', tamano: '1.1 MB' }],
    etiquetas: ['plan b', 'contingencia', 'sucursal'],
  },
];

const SEED: CatalogoState = {
  nextId: 20,
  hardware: [
    { id: 1, nombre: 'PC', so: 'Windows', sistemas: ['Jadima', 'Google Apps'] },
    { id: 2, nombre: 'POS', so: 'Windows', sistemas: ['Jadima', 'Comercial'] },
    { id: 3, nombre: 'Impresora', so: '', sistemas: ['Impresión fiscal'] },
    { id: 4, nombre: 'PDA', so: '', sistemas: ['Data'] },
  ],
  departamentos: [
    {
      id: 3,
      nombre: 'Soporte TI',
      activo: true,
      contactos: [{ tipo: 'Anexo', numero: '2100', activo: true }],
      responsables: ['Ana Soto'],
    },
    {
      id: 4,
      nombre: 'Operaciones',
      activo: true,
      contactos: [{ tipo: 'Celular', numero: '+56 9 1111 2222', activo: true }],
      responsables: ['Luis Pérez'],
    },
  ],
  pruebas: [
    { id: 5, descripcion: 'Reinstalar impresora', resultadoEsperado: 'Impresora · 8 pasos', activo: true },
    { id: 6, descripcion: 'Caída Jadima en POS', resultadoEsperado: 'Sistemas · 10 pasos', activo: true },
    { id: 9, descripcion: 'Pérdida de enlace', resultadoEsperado: 'Conectividad · 7 pasos', activo: true },
    { id: 10, descripcion: 'Activar plan B', resultadoEsperado: 'Sistemas · 5 pasos', activo: true },
  ],
  soluciones: [
    {
      id: 7,
      nombre: 'Reinstalar driver de impresora',
      pasos: '1. Quitar dispositivo\n2. Instalar driver oficial\n3. Imprimir prueba',
      anexos: 'Manual HP LaserJet',
      asignaciones: ['Ana Soto', 'Soporte TI'],
    },
    {
      id: 8,
      nombre: 'Reinicio controlado del POS',
      pasos: 'Cerrar turno, reiniciar y volver a abrir caja.',
      anexos: '',
      asignaciones: ['Operaciones'],
    },
  ],
  errores: [],
};

@Injectable({ providedIn: 'root' })
export class CatalogoService {
  private readonly state = signal<CatalogoState>(this.read());

  conocimientos(): ConocimientoBusqueda[] {
    return CONOCIMIENTOS;
  }

  conocimientoPorId(id: number): ConocimientoBusqueda | undefined {
    return CONOCIMIENTOS.find((item) => item.id === id);
  }

  conocimientoVecinos(id: number): { anterior?: ConocimientoBusqueda; siguiente?: ConocimientoBusqueda } {
    const index = CONOCIMIENTOS.findIndex((item) => item.id === id);
    return {
      anterior: index > 0 ? CONOCIMIENTOS[index - 1] : undefined,
      siguiente: index >= 0 && index < CONOCIMIENTOS.length - 1 ? CONOCIMIENTOS[index + 1] : undefined,
    };
  }

  hardware = () => this.state().hardware;
  departamentos = () => this.state().departamentos;
  pruebas = () => this.state().pruebas;
  soluciones = () => this.state().soluciones;
  errores = () => this.state().errores;

  guardarHardware(item: Omit<HardwareItem, 'id'> & { id?: number }): void {
    this.mutate('hardware', item);
  }

  eliminarHardware(id: number): void {
    this.remove('hardware', id);
  }

  guardarDepartamento(item: Omit<DepartamentoItem, 'id'> & { id?: number }): void {
    this.mutate('departamentos', item);
  }

  eliminarDepartamento(id: number): void {
    this.remove('departamentos', id);
  }

  guardarPrueba(item: Omit<PruebaItem, 'id'> & { id?: number }): void {
    this.mutate('pruebas', item);
  }

  eliminarPrueba(id: number): void {
    this.remove('pruebas', id);
  }

  guardarSolucion(item: Omit<SolucionItem, 'id'> & { id?: number }): void {
    this.mutate('soluciones', item);
  }

  eliminarSolucion(id: number): void {
    this.remove('soluciones', id);
  }

  eliminarError(id: number): void {
    const current = this.state();
    this.write({
      ...current,
      errores: current.errores.filter((row) => row.id !== id),
    });
  }

  guardarError(item: Omit<ErrorItem, 'id'> & { id?: number }): ErrorItem {
    const current = this.state();
    const saved: ErrorItem = { ...item, id: item.id ?? current.nextId };
    const list = item.id
      ? current.errores.map((row) => (row.id === item.id ? saved : row))
      : [...current.errores, saved];
    this.write({
      ...current,
      errores: list,
      nextId: Math.max(current.nextId, saved.id + 1),
    });
    return saved;
  }

  sistemasDeHardware(hardwareId: number | null): string[] {
    if (!hardwareId) {
      return this.state().hardware.flatMap((h) => h.sistemas);
    }
    return this.state().hardware.find((h) => h.id === hardwareId)?.sistemas ?? [];
  }

  private mutate<K extends keyof Pick<CatalogoState, 'hardware' | 'departamentos' | 'pruebas' | 'soluciones'>>(
    key: K,
    item: { id?: number } & Record<string, unknown>,
  ): void {
    const current = this.state();
    const id = item.id ?? current.nextId;
    const saved = { ...item, id } as CatalogoState[K][number];
    const list = (current[key] as Array<{ id: number }>).some((row) => row.id === item.id)
      ? (current[key] as Array<{ id: number }>).map((row) => (row.id === item.id ? saved : row))
      : [...(current[key] as unknown[]), saved];
    this.write({
      ...current,
      [key]: list,
      nextId: Math.max(current.nextId, id + 1),
    } as CatalogoState);
  }

  private remove(key: 'hardware' | 'departamentos' | 'pruebas' | 'soluciones', id: number): void {
    const current = this.state();
    this.write({
      ...current,
      [key]: (current[key] as Array<{ id: number }>).filter((row) => row.id !== id),
    });
  }

  private read(): CatalogoState {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) {
        return structuredClone(SEED);
      }
      return { ...structuredClone(SEED), ...JSON.parse(raw) } as CatalogoState;
    } catch {
      return structuredClone(SEED);
    }
  }

  private write(next: CatalogoState): void {
    this.state.set(next);
    localStorage.setItem(KEY, JSON.stringify(next));
  }
}
