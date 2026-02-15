export class VehicleProfileService {
  getAverageSpeed(vehicleType: string): number {
    const speeds: Record<string, number> = {
      BIKE: 25,
      SCOOTER: 30,
      CAR: 35,
      VAN: 28
    };

    return speeds[vehicleType] || speeds.BIKE;
  }
}
