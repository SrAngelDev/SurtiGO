import { Component, inject, OnInit, signal } from '@angular/core';
import { StationCardComponent } from '../../components/station-card/station-card';
import { MapViewComponent } from '../../components/map-view/map-view';
import { RadiusSliderComponent } from '../../components/radius-slider/radius-slider';
import { StatsBarComponent } from '../../components/stats-bar/stats-bar';
import { FuelService } from '../../services/fuel.service';
import { GeolocationService } from '../../services/geolocation.service';
import { FuelType, GasStation } from '../../models/gas-station.interface';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [StationCardComponent, MapViewComponent, RadiusSliderComponent, StatsBarComponent],
  templateUrl: './dashboard.html',
})
export class DashboardComponent implements OnInit {
  protected readonly fuelService = inject(FuelService);
  protected readonly geoService = inject(GeolocationService);

  protected readonly viewMode = signal<'split' | 'list' | 'map'>('split');
  protected readonly highlightedStation = signal<GasStation | null>(null);
  protected readonly selectedStation = signal<GasStation | null>(null);
  protected readonly searchRadius = signal(20);

  protected readonly fuelOptions: { value: FuelType; label: string; icon: string }[] = [
    { value: 'gasolina95', label: 'G95', icon: '⛽' },
    { value: 'gasolina98', label: 'G98', icon: '⛽' },
    { value: 'diesel', label: 'Diésel', icon: '🛢️' },
    { value: 'dieselPremium', label: 'D.Premium', icon: '🛢️' },
    { value: 'glp', label: 'GLP', icon: '🔋' },
  ];

  async ngOnInit() {
    if (this.fuelService.stations().length > 0) return;

    const location = await this.geoService.requestLocation();
    const coords = location ?? { latitude: 40.4167, longitude: -3.7033 };
    this.fuelService.loadStationsByRadius(coords.latitude, coords.longitude, this.searchRadius());
  }

  selectFuelType(type: FuelType): void {
    this.fuelService.selectedFuelType.set(type);
  }

  setViewMode(mode: 'split' | 'list' | 'map'): void {
    this.viewMode.set(mode);
  }

  onRadiusChange(radius: number): void {
    this.searchRadius.set(radius);
    const center = this.fuelService.searchCenter() ?? this.geoService.userLocation() ?? { latitude: 40.4167, longitude: -3.7033 };
    this.fuelService.loadStationsByRadius(center.latitude, center.longitude, radius);
  }

  onStationHover(station: GasStation | null): void {
    this.highlightedStation.set(station ?? this.selectedStation());
  }

  onStationSelect(station: GasStation): void {
    const current = this.selectedStation();
    if (current?.idEstacion === station.idEstacion) {
      this.selectedStation.set(null);
      this.highlightedStation.set(null);
    } else {
      this.selectedStation.set(station);
      this.highlightedStation.set(station);
    }
  }

  onMapLocationChange(location: { latitude: number; longitude: number }): void {
    this.fuelService.loadStationsByRadius(location.latitude, location.longitude, this.searchRadius());
  }

  retryLocation(): void {
    this.geoService.requestLocation().then((loc) => {
      if (loc) {
        this.fuelService.loadStationsByRadius(loc.latitude, loc.longitude, this.searchRadius());
      }
    });
  }
}
