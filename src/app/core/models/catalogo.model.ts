export interface HardwareItem {
  id: number;
  nombre: string;
  so: string;
  sistemas: string[];
}

export interface DepartamentoContacto {
  tipo: string;
  numero: string;
  activo: boolean;
}

export interface DepartamentoItem {
  id: number;
  nombre: string;
  activo: boolean;
  contactos: DepartamentoContacto[];
  responsables: string[];
}

export interface PruebaItem {
  id: number;
  descripcion: string;
  resultadoEsperado: string;
  activo: boolean;
}

export interface SolucionItem {
  id: number;
  nombre: string;
  pasos: string;
  anexos: string;
  asignaciones: string[];
  /** Presente cuando viene agregada desde un conocimiento de la API. */
  conocimientoId?: number;
  conocimientoTitulo?: string;
  orden?: number;
  tipo?: 'PASOS' | 'DERIVACION';
}

export interface ErrorItem {
  id: number;
  descripcion: string;
  hardwareId: number | null;
  sistema: string;
  modulo: string;
  frecuencia: string;
  usuarioContexto: string;
  causa: string;
  comentarios: string;
  solucionIds: number[];
  pruebaIds: number[];
}

export const FRECUENCIAS = ['Diario', 'Frecuente', 'Semanal', 'Ocacional', 'Raro', 'Anual'] as const;

export interface MaterialApoyo {
  nombre: string;
  tamano: string;
}

export interface ConocimientoBusqueda {
  id: number;
  codigo: string;
  tipo: 'Conocimiento' | 'Procedimiento';
  titulo: string;
  descripcion: string;
  sistema: string;
  hardware: string;
  categoria: string;
  fecha: string;
  fechaCreacion: string;
  creador: string;
  visualizaciones: number;
  vecesUtil: number;
  icono: 'impresora' | 'monitor' | 'red' | 'servidor';
  sintomas: string[];
  pruebas: string[];
  causa: string;
  solucionPasos: string[];
  materiales: MaterialApoyo[];
  etiquetas: string[];
}
