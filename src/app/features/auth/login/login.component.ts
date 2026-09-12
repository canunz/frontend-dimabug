import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  loading = false;
  error = '';
  showPass = false;

  form = this.fb.nonNullable.group({
    username: ['', Validators.required],
    password: ['', Validators.required],
  });

  submit(): void {
    this.error = '';
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error = 'Ingrese usuario y contraseña.';
      return;
    }
    this.loading = true;
    const { username, password } = this.form.getRawValue();
    this.auth.login(username, password).subscribe({
      next: () => {
        this.loading = false;
        this.router.navigateByUrl('/inicio');
      },
      error: (err: Error) => {
        this.loading = false;
        const msg = err?.message || '';
        const technical =
          /spring|boot|:8080|:8081|localhost|\/api\/|httpd|apache|proxy|endpoint/i.test(msg);
        this.error = !msg || technical
          ? 'No fue posible iniciar sesión. Verifique sus datos e intente nuevamente.'
          : msg;
      },
    });
  }
}
