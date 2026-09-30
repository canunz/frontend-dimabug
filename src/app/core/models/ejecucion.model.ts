export type EstadoEjecucion = 'EN_CURSO' | 'COMPLETADA' | 'CANCELADA';

export interface EjecucionUsuario {
  id: number;
  nombre: string;
  email: string;
}

export interface Ejecucion {
  id: number;
  procedimientoId: number;
  estado: EstadoEjecucion;
  fechaInicio: string | null;
  fechaFin: string | null;
  observaciones: string | null;
  usuario: EjecucionUsuario;
}

export interface EjecucionPaso {
  ejecucionPasoId: number;
  pasoId: number;
  orden: number;
  instruccion: string;
  esCritico: boolean;
  cumplido: boolean;
  observacion: string | null;
  fecha: string | null;
}

export interface ActualizarEjecucionPasoRequest {
  cumplido: boolean;
  observacion?: string | null;
}

export interface CancelarEjecucionRequest {
  observaciones?: string | null;
}

export type EstadoProcedimiento = 'BORRADOR' | 'PUBLICADO';

export interface ProcedimientoResumen {
  id: number;
  nombre: string;
  descripcion: string | null;
  estado: EstadoProcedimiento;
}
