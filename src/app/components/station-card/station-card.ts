import { Component, computed, inject, input } from '@angular/core';
import { GasStation, FuelType } from '../../models/gas-station.interface';
import { FuelService } from '../../services/fuel.service';

@Component({
  selector: 'app-station-card',
  standalone: true,
  templateUrl: './station-card.html',
})
export class StationCardComponent {
  private readonly fuelService = inject(FuelService);

  /** Inputs */
  readonly station = input.required<GasStation>();
  readonly averagePrice = input<number>(0);

  /** Computed: precio actual según filtro */
  protected readonly currentPrice = computed(() => {
    const s = this.station();
    const type = this.fuelService.selectedFuelType();
    return type === 'diesel' ? s.precioDiesel : s.precioGasolina95;
  });

  /** Computed: label del tipo de combustible */
  protected readonly fuelLabel = computed(() =>
    this.fuelService.selectedFuelType() === 'diesel' ? 'Diésel' : 'Gasolina 95',
  );

  /** Indica si el precio está por debajo de la media */
  protected readonly isCheap = computed(() => {
    const price = this.currentPrice();
    const avg = this.averagePrice();
    return price != null && avg > 0 && price < avg;
  });

  /** Formatea la distancia */
  protected readonly formattedDistance = computed(() => {
    const d = this.station().distancia;
    if (d == null) return null;
    return d < 1 ? `${Math.round(d * 1000)} m` : `${d.toFixed(1)} km`;
  });
}
