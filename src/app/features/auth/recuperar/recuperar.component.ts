import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

type Step = 'email' | 'code' | 'password';

@Component({
  selector: 'app-recuperar',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './recuperar.component.html',
  styleUrl: './recuperar.component.css',
})
export class RecuperarComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);

  step: Step = 'email';
  email = '';
  loading = false;
  error = '';
  success = '';
  debugCode = '';

  emailForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });

  codeForm = this.fb.nonNullable.group({
    code: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(5)]],
  });

  passwordForm = this.fb.nonNullable.group({
    password1: ['', [Validators.required, Validators.minLength(6)]],
    password2: ['', [Validators.required]],
  });

  sendCode(): void {
    this.error = '';
    this.success = '';
    if (this.emailForm.invalid) {
      this.emailForm.markAllAsTouched();
      return;
    }
    this.loading = true;
    const email = this.emailForm.controls.email.value.trim();
    this.auth.solicitarCodigo(email).subscribe({
      next: (res) => {
        this.loading = false;
        this.email = email;
        this.step = 'code';
        this.success = res.message;
        this.debugCode = res.debugCode || '';
      },
      error: (err: Error) => {
        this.loading = false;
        this.error = err.message;
      },
    });
  }

  validateCode(): void {
    this.error = '';
    this.success = '';
    if (this.codeForm.invalid) {
      this.codeForm.markAllAsTouched();
      this.error = 'Ingresa un código de 5 dígitos.';
      return;
    }
    this.loading = true;
    this.auth.validarCodigo(this.email, this.codeForm.controls.code.value).subscribe({
      next: () => {
        this.loading = false;
        this.step = 'password';
        this.success = 'Código validado. Ya puedes cambiar tu contraseña.';
        this.debugCode = '';
      },
      error: (err: Error) => {
        this.loading = false;
        this.error = err.message;
      },
    });
  }

  savePassword(): void {
    this.error = '';
    this.success = '';
    const { password1, password2 } = this.passwordForm.getRawValue();
    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      return;
    }
    if (password1 !== password2) {
      this.error = 'Las contraseñas no coinciden.';
      return;
    }
    this.loading = true;
    this.auth.cambiarPassword(this.email, password1).subscribe({
      next: () => {
        this.loading = false;
        this.success = 'Contraseña actualizada. Ya puedes iniciar sesión.';
        this.step = 'email';
        this.emailForm.reset();
        this.codeForm.reset();
        this.passwordForm.reset();
      },
      error: (err: Error) => {
        this.loading = false;
        this.error = err.message;
      },
    });
  }

  resetEmail(): void {
    this.step = 'email';
    this.error = '';
    this.success = '';
    this.debugCode = '';
    this.codeForm.reset();
  }

  resend(): void {
    if (!this.email) {
      return;
    }
    this.loading = true;
    this.error = '';
    this.auth.solicitarCodigo(this.email).subscribe({
      next: (res) => {
        this.loading = false;
        this.success = res.message;
        this.debugCode = res.debugCode || '';
      },
      error: (err: Error) => {
        this.loading = false;
        this.error = err.message;
      },
    });
  }
}
