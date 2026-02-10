import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { catchError, map, of, tap } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  GasStation,
  StationRadioResponse,
  Provincia,
  Municipio,
  PrecioMedioProvincia,
  FuelType,
} from '../models/gas-station.interface';
import { GeolocationService } from './geolocation.service';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class FuelService {
  private readonly http = inject(HttpClient);
  private readonly geoService = inject(GeolocationService);
  private readonly apiUrl = environment.apiBaseUrl;

  /** Estado reactivo */
  readonly stations = signal<GasStation[]>([]);
  readonly isLoading = signal(false);
  readonly error = signal<string | null>(null);
  readonly selectedFuelType = signal<FuelType>('gasolina95');
  readonly searchQuery = signal('');
  readonly provincias = signal<Provincia[]>([]);
  readonly selectedProvincia = signal<number | null>(null);

  /** Estaciones filtradas por búsqueda */
  readonly filteredStations = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const stationList = this.stations();

    if (!query) return stationList;

    return stationList.filter(
      (s) =>
        s.nombre.toLowerCase().includes(query) ||
        s.direccion.toLowerCase().includes(query) ||
        s.localidad?.toLowerCase().includes(query) ||
        s.provincia?.toLowerCase().includes(query),
    );
  });

  /** Estaciones ordenadas por precio del combustible seleccionado */
  readonly sortedStations = computed(() => {
    const filtered = this.filteredStations();
    const fuelType = this.selectedFuelType();

    return [...filtered].sort((a, b) => {
      const priceA = fuelType === 'diesel' ? (a.precioDiesel ?? Infinity) : (a.precioGasolina95 ?? Infinity);
      const priceB = fuelType === 'diesel' ? (b.precioDiesel ?? Infinity) : (b.precioGasolina95 ?? Infinity);
      return priceA - priceB;
    });
  });

  /** Precio medio para referencia visual */
  readonly averagePrice = computed(() => {
    const stationList = this.sortedStations();
    const fuelType = this.selectedFuelType();

    const prices = stationList
      .map((s) => (fuelType === 'diesel' ? s.precioDiesel : s.precioGasolina95))
      .filter((p): p is number => p != null && p > 0);

    if (prices.length === 0) return 0;
    return Math.round((prices.reduce((sum, p) => sum + p, 0) / prices.length) * 1000) / 1000;
  });

  /**
   * Carga estaciones cercanas a una ubicación dada (usa endpoint /estaciones/radio).
   */
  loadStationsByRadius(lat: number, lon: number, radio = environment.defaultRadius): void {
    this.isLoading.set(true);
    this.error.set(null);

    const params = new HttpParams()
      .set('latitud', lat.toString())
      .set('longitud', lon.toString())
      .set('radio', radio.toString())
      .set('limite', environment.defaultPageLimit.toString());

    this.http
      .get<StationRadioResponse[]>(`${this.apiUrl}/estaciones/radio`, { params })
      .pipe(
        map((response) => this.mapRadioResponse(response)),
        catchError((err) => {
          console.error('Error al cargar estaciones:', err);
          this.error.set('No se pudieron cargar las estaciones. Inténtalo de nuevo.');
          return of([]);
        }),
      )
      .subscribe((stations) => {
        this.stations.set(stations);
        this.isLoading.set(false);
      });
  }

  /**
   * Carga todas las provincias disponibles.
   */
  loadProvincias(): void {
    this.http
      .get<Provincia[]>(`${this.apiUrl}/provincias`)
      .pipe(
        catchError((err) => {
          console.error('Error al cargar provincias:', err);
          return of([]);
        }),
      )
      .subscribe((data) => this.provincias.set(data));
  }

  /**
   * Carga estaciones de un municipio específico.
   */
  loadStationsByMunicipio(idMunicipio: number): void {
    this.isLoading.set(true);
    this.error.set(null);

    this.http
      .get<GasStation[]>(`${this.apiUrl}/estaciones/municipio/${idMunicipio}`)
      .pipe(
        map((stations) =>
          stations.map((s) => ({
            ...s,
            distancia: this.geoService.distanceFromUser(s.latitud, s.longitud) ?? undefined,
          })),
        ),
        catchError((err) => {
          console.error('Error al cargar estaciones del municipio:', err);
          this.error.set('Error al cargar estaciones del municipio.');
          return of([]);
        }),
      )
      .subscribe((stations) => {
        this.stations.set(stations);
        this.isLoading.set(false);
      });
  }

  /**
   * Carga precios medios de una provincia.
   */
  loadPreciosMediosProvincia(idProvincia: number) {
    return this.http
      .get<PrecioMedioProvincia[]>(`${this.apiUrl}/precios/medios/provincia/${idProvincia}`)
      .pipe(
        catchError((err) => {
          console.error('Error al cargar precios medios:', err);
          return of([]);
        }),
      );
  }

  /**
   * Mapea la respuesta de /estaciones/radio al modelo GasStation.
   */
  private mapRadioResponse(response: StationRadioResponse[]): GasStation[] {
    return response.map((item) => {
      const [longitud, latitud] = item.coordenadas?.coordinates ?? [0, 0];
      return {
        idEstacion: parseInt(item._id, 10) || 0,
        nombre: item.nombre ?? 'Estación desconocida',
        direccion: '',
        latitud,
        longitud,
        provincia: item.provincia,
        localidad: item.localidad,
        distancia: item.distancia != null ? Math.round(item.distancia * 100) / 100 : undefined,
      };
    });
  }
}
