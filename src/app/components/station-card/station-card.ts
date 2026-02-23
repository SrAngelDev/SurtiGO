import { Component, computed, inject, input, output, signal } from '@angular/core';
import { GasStation, FuelType } from '../../models/gas-station.interface';
import { FuelService } from '../../services/fuel.service';

@Component({
  selector: 'app-station-card',
  standalone: true,
  templateUrl: './station-card.html',
  host: { class: 'block' },
})
export class StationCardComponent {
  private readonly fuelService = inject(FuelService);

  readonly station = input.required<GasStation>();
  readonly averagePrice = input<number>(0);
  readonly rank = input<number>(0);
  readonly isActive = input<boolean>(false);

  readonly stationHover = output<GasStation | null>();
  readonly stationSelect = output<GasStation>();

  protected readonly expanded = signal(false);

  protected readonly currentPrice = computed(() => {
    const s = this.station();
    return this.fuelService.getPrice(s, this.fuelService.selectedFuelType());
  });

  protected readonly fuelLabel = computed(() => {
    const labels: Record<FuelType, string> = {
      gasolina95: 'Gasolina 95',
      gasolina98: 'Gasolina 98',
      diesel: 'Diésel',
      dieselPremium: 'Diésel Premium',
      glp: 'GLP',
    };
    return labels[this.fuelService.selectedFuelType()];
  });

  protected readonly isCheap = computed(() => {
    const price = this.currentPrice();
    const avg = this.averagePrice();
    return price != null && avg > 0 && price < avg;
  });

  protected readonly isTop3 = computed(() => this.rank() <= 3 && this.rank() > 0);

  protected readonly formattedDistance = computed(() => {
    const d = this.station().distancia;
    if (d == null) return null;
    if (d < 1) return `${Math.round(d * 1000)} m`;
    return `${d.toFixed(1)} km`;
  });

  protected readonly savingsVsAvg = computed(() => {
    const price = this.currentPrice();
    const avg = this.averagePrice();
    if (!price || !avg || avg === 0) return null;
    const diff = avg - price;
    if (diff <= 0) return null;
    return Math.round(diff * 50 * 100) / 100;
  });

  /** All available prices for the detail view */
  protected readonly allPrices = computed(() => {
    const s = this.station();
    const prices: { label: string; value: number }[] = [];
    if (s.precioGasolina95) prices.push({ label: 'Gasolina 95', value: s.precioGasolina95 });
    if (s.precioGasolina98) prices.push({ label: 'Gasolina 98', value: s.precioGasolina98 });
    if (s.precioDiesel) prices.push({ label: 'Diésel', value: s.precioDiesel });
    if (s.precioDieselPremium) prices.push({ label: 'Diésel Premium', value: s.precioDieselPremium });
    if (s.precioGLP) prices.push({ label: 'GLP', value: s.precioGLP });
    return prices;
  });

  onMouseEnter(): void {
    this.stationHover.emit(this.station());
  }

  onMouseLeave(): void {
    this.stationHover.emit(null);
  }

  toggleExpand(): void {
    this.expanded.update(v => !v);
    this.stationSelect.emit(this.station());
  }

  openNavigation(app: 'google' | 'waze' | 'apple'): void {
    const s = this.station();
    let url = '';
    switch (app) {
      case 'google':
        url = `https://www.google.com/maps/dir/?api=1&destination=${s.latitud},${s.longitud}`;
        break;
      case 'waze':
        url = `https://waze.com/ul?ll=${s.latitud},${s.longitud}&navigate=yes`;
        break;
      case 'apple':
        url = `https://maps.apple.com/?daddr=${s.latitud},${s.longitud}`;
        break;
    }
    window.open(url, '_blank');
  }
}
