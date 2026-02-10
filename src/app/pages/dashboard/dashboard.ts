import { Component, inject, OnInit } from '@angular/core';
import { StationCardComponent } from '../../components/station-card/station-card';
import { FuelService } from '../../services/fuel.service';
import { GeolocationService } from '../../services/geolocation.service';
import { FuelType } from '../../models/gas-station.interface';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [StationCardComponent],
  templateUrl: './dashboard.html',
})
export class DashboardComponent implements OnInit {
  protected readonly fuelService = inject(FuelService);
  protected readonly geoService = inject(GeolocationService);

  /** Opciones de combustible */
  protected readonly fuelOptions: { value: FuelType; label: string; icon: string }[] = [
    { value: 'gasolina95', label: 'Gasolina 95', icon: '⛽' },
    { value: 'diesel', label: 'Diésel', icon: '🛢️' },
  ];

  async ngOnInit() {
    const location = await this.geoService.requestLocation();
    if (location) {
      this.fuelService.loadStationsByRadius(location.latitude, location.longitude);
    }
  }

  selectFuelType(type: FuelType): void {
    this.fuelService.selectedFuelType.set(type);
  }

  retryLocation(): void {
    this.geoService.requestLocation().then((loc) => {
      if (loc) {
        this.fuelService.loadStationsByRadius(loc.latitude, loc.longitude);
      }
    });
  }
}
