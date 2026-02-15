export class TrafficService {
  async getMultiplier(
    timeOfDay: string,
    dayOfWeek: string
  ): Promise<number> {

    const timeMap: Record<string, number> = {
      morning: 1.3,
      afternoon: 1.1,
      evening: 1.4,
      night: 0.9
    };

    const dayMap: Record<string, number> = {
      monday: 1.1,
      friday: 1.2,
      saturday: 1.0,
      sunday: 0.8
    };

    return (timeMap[timeOfDay] || 1.0) *
           (dayMap[dayOfWeek] || 1.0);
  }
}
