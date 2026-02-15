export class BufferPolicyService {
  calculate(distanceKm: number, timeOfDay: string): number {
    let buffer = Math.min(distanceKm * 2, 10);

    if (timeOfDay === 'morning' || timeOfDay === 'evening') {
      buffer += 5;
    }

    return buffer;
  }
}
