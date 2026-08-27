import { memoryApi } from "@/lib/memoryApi";
import type { ScopeSize } from "../domain/gameplay";

export type OverrideMap = Record<string, { label?: string }>;
export type LearnerSnapshot = { totalXp: number; completedGroups: number; currentStreak: number; overrides: OverrideMap };

export async function loadLearnerSnapshot(): Promise<LearnerSnapshot> {
  const snapshot = await memoryApi.memory.snapshot.query();
  return {
    totalXp: snapshot.totalXp,
    completedGroups: snapshot.completedGroups,
    currentStreak: snapshot.currentStreak,
    overrides: Object.fromEntries(snapshot.overrides.map((item) => [item.itemKey, { label: item.label || undefined }])),
  };
}

export async function savePracticeSummary(input: { scope: ScopeSize; direction: "number_to_image" | "image_to_number" | "mixed"; correctCount: number; questionCount: number; meanResponseMs: number | null; totalXp: number; completedGroups: number; performances: { itemKey: string; correct: boolean; responseMs: number }[] }) {
  return memoryApi.memory.saveSession.mutate(input);
}

export async function loadRaceRecords() {
  return memoryApi.memory.raceRecords.query();
}

export async function saveRaceRecord(input: { sequenceLength: number; correctPositions: number; totalPositions: number; durationMs: number; exact: boolean }) {
  return memoryApi.memory.saveRaceRecord.mutate(input);
}

export async function savePersonalOverride(input: { itemKey: string; label: string }) {
  return memoryApi.memory.saveOverride.mutate(input);
}

export async function deletePersonalOverride(itemKey: string) {
  return memoryApi.memory.deleteOverride.mutate({ itemKey });
}
