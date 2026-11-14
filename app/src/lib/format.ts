export function timeToMin(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

export function minToTime(min: number): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(Math.floor(min / 60))}:${pad(min % 60)}`;
}

export function missionDayLabel(day: number): string {
  return day < 0 ? `Pre-flight day ${day}` : `Mission day ${day}`;
}
