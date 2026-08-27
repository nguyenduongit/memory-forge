export const RACE_LENGTHS = [20, 30, 40, 50, 60, 70, 80, 90, 100, 120, 150, 200] as const;
export type RaceLength = (typeof RACE_LENGTHS)[number];

export function createDigitSequence(length: RaceLength, random: () => number = Math.random): string {
  return Array.from({ length }, () => Math.floor(random() * 10)).join("");
}

export function scoreDigitSequence(expected: string, submitted: string) {
  const normalized = submitted.replace(/\D/g, "").slice(0, expected.length);
  const correctPositions = Array.from(expected).reduce((count, digit, index) => count + (digit === normalized[index] ? 1 : 0), 0);
  return { submitted: normalized, correctPositions, total: expected.length, exact: normalized === expected };
}

export function formatRaceTime(milliseconds: number): string {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  return `${String(minutes).padStart(2, "0")}:${String(totalSeconds % 60).padStart(2, "0")}`;
}
