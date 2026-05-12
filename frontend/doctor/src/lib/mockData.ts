import type { GlucoseMultidayData, AverageDayPoint } from "@/src/types";

// Pure computation — stays frontend side (AGP aggregation)
export function getAverageDayProfile(multidayData: GlucoseMultidayData[]): AverageDayPoint[] {
  if (multidayData.length === 0) return [];
  const slotMap = new Map<string, number[]>();
  for (const day of multidayData) {
    for (const r of day.readings) {
      const arr = slotMap.get(r.time) ?? [];
      arr.push(r.value);
      slotMap.set(r.time, arr);
    }
  }
  return Array.from(slotMap.keys())
    .sort()
    .map((time) => {
      const vals = slotMap.get(time)!;
      return {
        time,
        avg: Math.round(vals.reduce((s, v) => s + v, 0) / vals.length),
        min: Math.min(...vals),
        max: Math.max(...vals),
      };
    });
}
