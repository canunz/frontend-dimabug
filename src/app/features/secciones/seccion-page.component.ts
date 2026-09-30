import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-seccion-page',
  standalone: true,
  template: `
    <section class="sec">
      <p class="kicker">{{ kicker }}</p>
      <h1>{{ titulo }}</h1>
      <p class="lead">{{ descripcion }}</p>
      <div class="panel">
        <ng-content />
      </div>
    </section>
  `,
  styles: `
    .sec { max-width: 1040px; }
    .kicker { margin: 0 0 8px; color: #94a3b8; font-size: 13px; }
    h1 { margin: 0 0 6px; font-size: 26px; font-weight: 700; color: #0f172a; }
    .lead { margin: 0 0 20px; color: #667085; font-size: 14px; }
    .panel { background: #fff; border: 1px solid #e7e9f0; border-radius: 18px; padding: 22px; box-shadow: 0 8px 24px rgba(15, 23, 42, 0.04); }
    :host-context(.tema-oscuro) h1 { color: #f8fafc; }
    :host-context(.tema-oscuro) .panel { background: #111827; border-color: #1f2937; }
  `,
})
export class SeccionPageComponent {
  @Input() kicker = 'DimaBug';
  @Input() titulo = '';
  @Input() descripcion = '';
}
