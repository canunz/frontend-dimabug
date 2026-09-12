import { Routes } from '@angular/router';
import { adminGuard, authGuard, guestGuard } from './core/guards/auth.guard';
import { ShellLayoutComponent } from './shared/layout/shell-layout.component';
import { LoginComponent } from './features/auth/login/login.component';
import { RecuperarComponent } from './features/auth/recuperar/recuperar.component';
import { InicioComponent } from './features/inicio/inicio.component';
import { UsuariosComponent } from './features/usuarios/usuarios.component';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'inicio' },
  { path: 'login', component: LoginComponent, canActivate: [guestGuard] },
  { path: 'recuperar', component: RecuperarComponent, canActivate: [guestGuard] },
  {
    path: '',
    component: ShellLayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: 'inicio', component: InicioComponent },
      { path: 'usuarios', component: UsuariosComponent, canActivate: [adminGuard] },
    ],
  },
  { path: '**', redirectTo: 'inicio' },
];
