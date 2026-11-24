export function round2(value: number) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}
