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
  marca?: string;
  horario?: string;
  distancia?: number; // km desde la ubicación del usuario
  precioDiesel?: number;
  precioDieselPremium?: number;
  precioGasolina95?: number;
  precioGasolina98?: number;
  precioGLP?: number;
  precioDieselMedia?: number;
  precioGasolina95Media?: number;
}

/**
 * Respuesta cruda de la API /estaciones/radio
 * Campos reales devueltos por https://api.precioil.es/estaciones/radio
 */
export interface StationRadioResponse {
  idEstacion: number;
  nombreEstacion: string;
  direccion: string;
  latitud: number;
  longitud: number;
  provincia: string;
  localidad: string;
  marca: string;
  horario: string;
  margen: string;
  codPostal: number;
  tipoVenta: string;
  nombreMunicipio: string;
  lastUpdate: string;
  distancia: number;
  Diesel?: number;
  DieselPremium?: number;
  Gasolina95?: number;
  Gasolina98?: number;
  GLP?: number;
  Diesel_media?: number;
  DieselPremium_media?: number;
  Gasolina95_media?: number;
  Gasolina98_media?: number;
  Gasolina95_E5_Premium?: number;
  Gasolina95_E5_Premium_media?: number;
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
export type FuelType = 'gasolina95' | 'diesel' | 'dieselPremium' | 'gasolina98' | 'glp';

/**
 * Coordenadas del usuario
 */
export interface UserLocation {
  latitude: number;
  longitude: number;
}
