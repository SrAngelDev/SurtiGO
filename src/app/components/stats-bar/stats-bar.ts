import { Component, computed, inject } from '@angular/core';
import { FuelService } from '../../services/fuel.service';

@Component({
  selector: 'app-stats-bar',
  standalone: true,
  template: `
    <div class="flex flex-wrap items-center gap-3">
      <!-- Summary cards -->
      @if (stationCount() > 0) {
        <div class="flex items-center gap-5 rounded-xl border border-glass-border bg-glass px-4 py-2.5">
          <!-- Count -->
          <div class="text-center">
            <div class="text-lg font-bold tabular-nums text-text-primary leading-none">{{ stationCount() }}</div>
            <div class="mt-0.5 text-[10px] font-medium uppercase tracking-wider text-text-muted">Estaciones</div>
          </div>

          <div class="h-8 w-px bg-dark-border"></div>

          <!-- Cheapest -->
          @if (cheapest() != null) {
            <div class="text-center">
              <div class="text-lg font-bold tabular-nums text-brand-orange leading-none">{{ cheapest()!.toFixed(3) }}</div>
              <div class="mt-0.5 text-[10px] font-medium uppercase tracking-wider text-text-muted">Mín EUR/L</div>
            </div>
          }

          <div class="h-8 w-px bg-dark-border"></div>

          <!-- Average -->
          @if (average() > 0) {
            <div class="text-center">
              <div class="text-lg font-bold tabular-nums text-text-secondary leading-none">{{ average().toFixed(3) }}</div>
              <div class="mt-0.5 text-[10px] font-medium uppercase tracking-wider text-text-muted">Media EUR/L</div>
            </div>
          }

          <div class="h-8 w-px bg-dark-border"></div>

          <!-- Savings on full tank -->
          @if (savingsOnTank() > 0) {
            <div class="text-center">
              <div class="text-lg font-bold tabular-nums text-brand-green leading-none">{{ savingsOnTank().toFixed(2) }} EUR</div>
              <div class="mt-0.5 text-[10px] font-medium uppercase tracking-wider text-text-muted">Ahorro / 50L</div>
            </div>
          }
        </div>
      }
    </div>
  `,
  host: { class: 'block' },
})
export class StatsBarComponent {
  private readonly fuelService = inject(FuelService);

  protected readonly stationCount = computed(() => this.fuelService.sortedStations().length);
  protected readonly average = computed(() => this.fuelService.averagePrice());

  protected readonly cheapest = computed(() => {
    const stations = this.fuelService.sortedStations();
    const type = this.fuelService.selectedFuelType();
    const prices = stations
      .map(s => this.fuelService.getPrice(s, type))
      .filter((p): p is number => p != null && p > 0);
    return prices.length > 0 ? Math.min(...prices) : null;
  });

  protected readonly savingsOnTank = computed(() => {
    const avg = this.average();
    const min = this.cheapest();
    if (!min || !avg || avg <= 0) return 0;
    return (avg - min) * 50;
  });
}
