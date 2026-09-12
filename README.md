# Buscador de Errores (DimaBug) — Frontend Angular

SPA Angular 19 (**sin Django, sin Bootstrap**) que consume el API Spring Boot.

## Requisitos

- Node.js 18+ (recomendado 20/22)
- Spring Boot en `http://localhost:8080`
  - En este PC el puerto `8081` suele estar ocupado por Apache (`httpd`), no por Spring.

## Cómo levantar

```powershell
cd C:\Capstone\buscador-errores\frontend-dimabug
npm install
npm start
```

Abre: **http://localhost:4200**

El proxy (`proxy.conf.json`) reenvía `/api/*` → `http://localhost:8080/api/*`.

Si Spring usa otro puerto, edita `proxy.conf.json`.

## Rutas

| Ruta | Descripción |
|------|-------------|
| `/login` | Inicio de sesión |
| `/recuperar` | Recuperar contraseña |
| `/inicio` | Home autenticado |
| `/usuarios` | CRUD usuarios (admin) |

## Endpoints esperados (Spring)

Base: `http://localhost:8080`

- `POST /api/auth/login`
- `POST /api/auth/recuperar/email|codigo|password`
- `GET/POST/PUT/DELETE /api/usuarios`
- `PATCH /api/usuarios/{id}/estado`
- `GET /api/roles`

## Stack

- Angular 19 standalone
- CSS propio (diseño DimaBug)
- Proxy local hacia Spring Boot
