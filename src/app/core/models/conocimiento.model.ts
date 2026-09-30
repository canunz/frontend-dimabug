export type ConocimientoEstado = 'BORRADOR' | 'PUBLICADO' | 'ELIMINADO';

export function etiquetaEstadoConocimiento(estado: ConocimientoEstado): string {
  if (estado === 'PUBLICADO') {
    return 'Publicado';
  }
  if (estado === 'ELIMINADO') {
    return 'Eliminado';
  }
  return 'Borrador';
}

export interface CatalogoRef {
  id: number;
  nombre: string;
}

export interface Conocimiento {
  id: number;
  titulo: string;
  descripcion: string;
  comentario: string | null;
  estado: ConocimientoEstado;
  hardwareId: number | null;
  sistemaId: number | null;
  moduloId: number | null;
  frecuenciaId: number | null;
  hardwareNombre: string;
  sistemaNombre: string;
  moduloNombre: string;
  frecuenciaNombre: string;
  creadoPor: string;
  fechaCreacion: string | null;
  fechaModificacion: string | null;
}

/** Respuesta de GET /api/conocimientos/buscar. No incluye estado ni descripción. */
export interface ResultadoBusquedaConocimiento {
  id: number;
  titulo: string;
  hardwareId: number | null;
  hardwareNombre: string | null;
  sistemaId: number | null;
  sistemaNombre: string | null;
  moduloId: number | null;
  moduloNombre: string | null;
  frecuenciaId: number | null;
  frecuenciaNombre: string | null;
  relevancia: number | null;
}

export interface BusquedaConocimientoFiltro {
  texto?: string | null;
  hardwareId?: number | null;
  sistemaId?: number | null;
  moduloId?: number | null;
  frecuenciaId?: number | null;
}

export interface ConocimientoRequest {
  titulo: string;
  descripcion: string;
  hardwareId: number | null;
  sistemaId: number | null;
  moduloId: number | null;
  frecuenciaId: number | null;
  comentario: string | null;
}

export interface FrecuenciaCatalogo {
  items: CatalogoRef[];
  disponible: boolean;
}

export interface ItemOrdenado {
  id: number;
  descripcion: string;
  orden: number;
}

export interface OrdenRequest {
  descripcion: string;
  orden: number;
}

export interface PruebaCatalogo {
  id: number;
  descripcion: string;
  resultadoEsperado: string;
}

export interface PruebaAsociada {
  id: number;
  descripcion: string;
  resultadoEsperado: string;
  orden: number;
}

export interface AsociarPruebaRequest {
  pruebaId: number;
  orden: number;
}

export interface OrdenPruebaRequest {
  orden: number;
}

export type TipoSolucion = 'PASOS' | 'DERIVACION';

export interface Solucion {
  id: number;
  descripcion: string;
  tipo: TipoSolucion;
  orden: number;
}

export interface SolucionRequest {
  descripcion: string;
  tipo: TipoSolucion;
  orden: number;
}

export interface UsuarioResultado {
  id: number;
  nombre: string;
  email: string;
}

export interface ResultadoSolucion {
  id: number;
  funciono: boolean;
  comentario: string | null;
  fecha: string;
  usuario: UsuarioResultado;
}

export interface EfectividadSolucion {
  solucionId: number;
  totalAplicaciones: number;
  totalFunciono: number;
  totalNoFunciono: number;
  porcentajeEfectividad: number | null;
}

export interface RegistrarResultadoRequest {
  funciono: boolean;
  comentario?: string | null;
}

export interface AsignacionSolucion {
  id: number;
  responsableId: number | null;
  responsableNombre: string | null;
  departamentoId: number | null;
  departamentoNombre: string | null;
  principal: boolean;
}

export interface AsignacionRequest {
  departamentoId: number | null;
  responsableId: number | null;
  principal: boolean;
}

export type TipoMaterial = 'IMAGEN' | 'PDF' | 'VIDEO' | 'ENLACE';

export interface MaterialApoyo {
  id: number;
  nombre: string;
  tipo: TipoMaterial;
  url: string;
}

export interface MaterialRequest {
  nombre: string;
  tipo: TipoMaterial;
  url: string;
}

export interface ResponsableRef {
  id: number;
  nombre: string;
}
