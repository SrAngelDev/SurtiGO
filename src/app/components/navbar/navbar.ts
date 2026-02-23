import { Component, inject, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { FuelService } from '../../services/fuel.service';
import { GeolocationService } from '../../services/geolocation.service';
import { ThemeService } from '../../services/theme.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './navbar.html',
  host: { class: 'block' },
})
export class NavbarComponent {
  protected readonly fuelService = inject(FuelService);
  protected readonly geoService = inject(GeolocationService);
  protected readonly themeService = inject(ThemeService);

  readonly retryLocation = output<void>();

  onRetryLocation(): void {
    this.retryLocation.emit();
  }

  onSearchKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      const query = this.fuelService.searchQuery().trim();
      if (query && this.fuelService.filteredStations().length === 0) {
        this.fuelService.searchByLocation(query);
      }
    }
  }

  cycleTheme(): void {
    this.themeService.cycleTheme();
  }
}
