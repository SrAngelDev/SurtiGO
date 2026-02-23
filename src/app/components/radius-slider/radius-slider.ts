import { Component, input, output, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-radius-slider',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="flex items-center gap-3">
      <svg class="h-4 w-4 shrink-0 text-text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/>
      </svg>
      <input
        type="range"
        [min]="min()"
        [max]="max()"
        [step]="step()"
        [ngModel]="value()"
        (ngModelChange)="onValueChange($event)"
        class="flex-1"
      />
      <span class="min-w-[3.5rem] text-right text-sm font-semibold tabular-nums text-text-primary">
        {{ value() }} km
      </span>
    </div>
  `,
  host: { class: 'block' },
})
export class RadiusSliderComponent {
  readonly value = input<number>(20);
  readonly min = input<number>(5);
  readonly max = input<number>(50);
  readonly step = input<number>(5);

  readonly valueChange = output<number>();

  onValueChange(val: number): void {
    this.valueChange.emit(val);
  }
}
