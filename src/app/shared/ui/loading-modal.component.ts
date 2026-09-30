import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-loading-modal',
  standalone: true,
  template: `
    @if (visible) {
      <div class="loading-modal" role="alertdialog" aria-live="assertive" aria-busy="true" [attr.aria-label]="mensaje">
        <div class="loading-modal__backdrop" aria-hidden="true"></div>
        <div class="loading-modal__card">
          <span class="loading-modal__spinner" aria-hidden="true"></span>
          <p>{{ mensaje }}</p>
        </div>
      </div>
    }
  `,
  styles: [
    `
      .loading-modal {
        position: fixed;
        inset: 0;
        z-index: 9999;
        display: grid;
        place-items: center;
        padding: 1rem;
      }

      .loading-modal__backdrop {
        position: absolute;
        inset: 0;
        background: rgba(11, 27, 77, 0.45);
        backdrop-filter: blur(2px);
      }

      .loading-modal__card {
        position: relative;
        z-index: 1;
        display: flex;
        align-items: center;
        gap: 0.85rem;
        min-width: min(280px, 100%);
        padding: 1.15rem 1.4rem;
        border-radius: 14px;
        background: #fff;
        box-shadow: 0 18px 40px rgba(11, 27, 77, 0.22);
        color: #1d2433;
        font-size: 0.95rem;
        font-weight: 600;
      }

      .loading-modal__card p {
        margin: 0;
      }

      .loading-modal__spinner {
        width: 1.35rem;
        height: 1.35rem;
        border: 2.5px solid #eaf0fe;
        border-top-color: #1e4fd6;
        border-radius: 50%;
        animation: loading-spin 0.7s linear infinite;
        flex-shrink: 0;
      }

      @keyframes loading-spin {
        to {
          transform: rotate(360deg);
        }
      }

      :host-context(.tema-oscuro) .loading-modal__card {
        background: #152238;
        color: #f3f5fb;
        box-shadow: 0 18px 40px rgba(0, 0, 0, 0.45);
      }

      :host-context(.tema-oscuro) .loading-modal__spinner {
        border-color: rgba(234, 240, 254, 0.2);
        border-top-color: #6b93ff;
      }
    `,
  ],
})
export class LoadingModalComponent {
  @Input() visible = false;
  @Input() mensaje = 'Cargando, por favor…';
}
