export interface Rol {
  rolId: number;
  rolNombre: string;
}

export interface Usuario {
  usuarioId: number;
  usuarioNombre: string;
  usuarioEmail: string;
  usuarioEstado: boolean;
  usuarioFechaCreacion?: string;
  rolId?: number;
  rol?: Rol;
  rolNombre?: string;
}

export interface AuthSession {
  token?: string;
  usuario: Usuario;
}

export interface UsuarioPayload {
  usuarioNombre: string;
  usuarioEmail: string;
  rolId: number;
  usuarioEstado: boolean;
  usuarioPassword?: string;
}

export function esAdministrador(usuario: Usuario | null | undefined): boolean {
  if (!usuario) {
    return false;
  }
  const nombre = (
    usuario.rol?.rolNombre ||
    usuario.rolNombre ||
    ''
  ).toLowerCase();
  return ['administrador', 'admin', 'ti', 'soporte ti'].includes(nombre);
}

export function iniciales(nombre: string | undefined): string {
  const parts = (nombre || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return '?';
}

export function primerNombre(nombre: string | undefined): string {
  return (nombre || '').trim().split(/\s+/)[0] || 'usuario';
}
