export interface ETARequest {
  pickupLat: number;
  pickupLng: number;
  dropLat: number;
  dropLng: number;
  prepTimeMinutes: number;
  vehicleType: string;
  timeOfDay: string;
  dayOfWeek: string;
}

export interface ETABreakdown {
  distanceKm: number;
  travelTimeMinutes: number;
  bufferTimeMinutes: number;
  prepTimeMinutes: number;
}

export interface ETAResponse {
  etaMinutes: number;
  breakdown: ETABreakdown;
}
