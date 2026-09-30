export type EstadoProcedimiento = 'BORRADOR' | 'PUBLICADO';

export interface UsuarioProcedimiento {
  id: number;
  nombre: string;
}

export interface Procedimiento {
  id: number;
  nombre: string;
  descripcion: string | null;
  estado: EstadoProcedimiento;
  creadoPor: UsuarioProcedimiento | null;
  fechaCreacion: string | null;
  modificadoPor: UsuarioProcedimiento | null;
  fechaModificacion: string | null;
}

export interface GuardarProcedimientoRequest {
  nombre: string;
  descripcion: string | null;
}

export interface PasoProcedimiento {
  id: number;
  procedimientoId: number;
  orden: number;
  instruccion: string;
  esCritico: boolean;
}

export interface GuardarPasoRequest {
  orden: number;
  instruccion: string;
  esCritico: boolean;
}

export type TipoMaterialProcedimiento = 'IMAGEN' | 'PDF' | 'VIDEO' | 'ENLACE';

export interface MaterialPaso {
  id: number;
  nombre: string;
  tipo: TipoMaterialProcedimiento;
  url: string;
}

export interface GuardarMaterialPasoRequest {
  nombre: string;
  tipo: TipoMaterialProcedimiento;
  url: string;
}
