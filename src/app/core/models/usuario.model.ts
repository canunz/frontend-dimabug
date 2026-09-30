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
  token: string;
  usuario: Usuario;
}

export interface UsuarioPayload {
  usuarioNombre: string;
  usuarioEmail: string;
  rolId: number;
  usuarioEstado: boolean;
  usuarioPassword?: string;
}

function nombreRol(usuario: Usuario | null | undefined): string {
  return (usuario?.rol?.rolNombre || usuario?.rolNombre || '').trim().toLowerCase();
}

export function esAdministrador(usuario: Usuario | null | undefined): boolean {
  const nombre = nombreRol(usuario);
  return nombre === 'administrador' || nombre === 'admin';
}

export function esSoporte(usuario: Usuario | null | undefined): boolean {
  const nombre = nombreRol(usuario);
  return nombre === 'tecnico' || nombre === 'técnico' || nombre === 'soporte' || nombre === 'soporte ti' || nombre === 'ti';
}

/** Administrador o soporte: gestionan catálogos, conocimiento y procedimientos. */
export function esStaff(usuario: Usuario | null | undefined): boolean {
  return esAdministrador(usuario) || esSoporte(usuario);
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

/** Usuario de ingreso (como Django): inicial + apellido, o parte local del correo. */
export function loginUsername(usuario: Pick<Usuario, 'usuarioNombre' | 'usuarioEmail'> | null | undefined): string {
  if (!usuario) {
    return '';
  }
  const local = (usuario.usuarioEmail || '').split('@')[0].trim();
  const parts = (usuario.usuarioNombre || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1]}`.toLowerCase();
  }
  return local.toLowerCase();
}
