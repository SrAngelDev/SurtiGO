/**
 * Estación de servicio con datos consolidados para la UI.
 */
export interface GasStation {
  idEstacion: number;
  nombre: string;
  direccion: string;
  latitud: number;
  longitud: number;
  provincia?: string;
  localidad?: string;
  distancia?: number; // km desde la ubicación del usuario
  precioDiesel?: number;
  precioGasolina95?: number;
  precioGasolina98?: number;
}

/**
 * Respuesta cruda de la API /estaciones/radio
 */
export interface StationRadioResponse {
  _id: string;
  nombre: string;
  coordenadas: {
    type: string;
    coordinates: number[]; // [longitud, latitud]
  };
  distancia: number;
  provincia: string;
  localidad: string;
}

/**
 * Respuesta de /estaciones/detalles/{id}
 */
export interface StationDetailResponse {
  idEstacion: number;
  nombre: string;
  direccion: string;
  latitud: number;
  longitud: number;
}

/**
 * Respuesta de /estaciones/municipio/{id}
 */
export interface StationMunicipioResponse {
  idEstacion: number;
  nombre: string;
  direccion: string;
  idMunicipio: number;
  latitud: number;
  longitud: number;
}

/**
 * Provincia
 */
export interface Provincia {
  idProvincia: number;
  nombreProvincia: string;
}

/**
 * Municipio
 */
export interface Municipio {
  idMunicipio: number;
  nombreMunicipio: string;
  idProvincia: number;
}

/**
 * Precio medio por provincia
 */
export interface PrecioMedioProvincia {
  idProvincia: number;
  fuelTypeName: string;
  averagePrice: number;
  lastCalculated: string;
}

/**
 * Precio medio diario
 */
export interface PrecioMedioDiario {
  id: number;
  idFuelType: number;
  fecha: string;
  precioMedio: number;
}

/**
 * Histórico de precios
 */
export interface HistoricoPrecios {
  title: string;
  estacionId: number;
  periodo: {
    inicio: string;
    fin: string;
  };
  cantidadResultados: number;
  data: HistoricoPrecioItem[];
}

export interface HistoricoPrecioItem {
  id: number;
  idEstacion: number;
  timestamp: string;
  price: number;
}

/**
 * Tipo de combustible para filtros
 */
export type FuelType = 'gasolina95' | 'diesel';

/**
 * Coordenadas del usuario
 */
export interface UserLocation {
  latitude: number;
  longitude: number;
}
