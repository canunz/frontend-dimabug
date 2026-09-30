import { DecimalPipe } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CatalogoService } from '../../core/services/catalogo.service';

@Component({
  selector: 'app-reportes',
  standalone: true,
  imports: [DecimalPipe, RouterLink],
  templateUrl: './reportes.component.html',
  styleUrl: './reportes.component.css',
})
export class ReportesComponent {
  private readonly catalogo = inject(CatalogoService);

  readonly conocimientos = this.catalogo.conocimientos();
  readonly procedimientos = this.catalogo.pruebas();
  readonly soluciones = this.catalogo.soluciones();

  readonly totalVistas = computed(() => this.conocimientos.reduce((sum, item) => sum + item.visualizaciones, 0));
  readonly totalUtil = computed(() => this.conocimientos.reduce((sum, item) => sum + item.vecesUtil, 0));
  readonly utilidad = computed(() => {
    const vistas = this.totalVistas();
    return vistas ? Math.round((this.totalUtil() / vistas) * 100) : 0;
  });

  readonly meses = [
    { label: 'Sep', vistas: 48, utiles: 22 },
    { label: 'Oct', vistas: 67, utiles: 31 },
    { label: 'Nov', vistas: 81, utiles: 39 },
    { label: 'Dic', vistas: 94, utiles: 44 },
    { label: 'Ene', vistas: 110, utiles: 58 },
    { label: 'Feb', vistas: 131, utiles: 79 },
  ];

  readonly maxMes = Math.max(...this.meses.map((mes) => mes.vistas));

  readonly ranking = computed(() => {
    const max = Math.max(...this.conocimientos.map((item) => item.visualizaciones), 1);
    return [...this.conocimientos]
      .sort((a, b) => b.visualizaciones - a.visualizaciones)
      .map((item) => ({
        ...item,
        ancho: Math.round((item.visualizaciones / max) * 100),
      }));
  });

  readonly categorias = computed(() => {
    const map = new Map<string, number>();
    for (const item of this.conocimientos) {
      map.set(item.categoria, (map.get(item.categoria) || 0) + item.visualizaciones);
    }
    const max = Math.max(...map.values(), 1);
    return [...map.entries()]
      .map(([nombre, valor]) => ({ nombre, valor, ancho: Math.round((valor / max) * 100) }))
      .sort((a, b) => b.valor - a.valor);
  });

  readonly donut = computed(() => {
    const radio = 54;
    const perimetro = 2 * Math.PI * radio;
    const utiles = this.utilidad();
    return {
      radio,
      perimetro,
      utiles: (utiles / 100) * perimetro,
      resto: perimetro,
    };
  });

  readonly linea = computed(() => {
    const w = 520;
    const h = 168;
    const pad = 24;
    const innerW = w - pad * 2;
    const innerH = h - pad * 2;
    const max = this.maxMes;
    const puntos = this.meses.map((mes, i) => {
      const x = pad + (i * innerW) / (this.meses.length - 1);
      const y = pad + innerH - (mes.vistas / max) * innerH;
      return { x, y, ...mes };
    });
    const line = puntos.map((p) => `${p.x},${p.y}`).join(' ');
    const area = `${pad},${h - pad} ${line} ${w - pad},${h - pad}`;
    return { w, h, pad, puntos, line, area };
  });
}
