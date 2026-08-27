import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  snapshotQuery: vi.fn(),
  raceRecordsQuery: vi.fn(),
  saveSessionMutation: vi.fn(),
  saveRaceMutation: vi.fn(),
  saveOverrideMutation: vi.fn(),
}));

vi.mock("@/lib/memoryApi", () => ({
  memoryApi: {
    memory: {
      snapshot: { query: mocks.snapshotQuery },
      raceRecords: { query: mocks.raceRecordsQuery },
      saveSession: { mutate: mocks.saveSessionMutation },
      saveRaceRecord: { mutate: mocks.saveRaceMutation },
      saveOverride: { mutate: mocks.saveOverrideMutation },
      deleteOverride: { mutate: vi.fn() },
    },
  },
}));

import { loadLearnerSnapshot, loadRaceRecords, savePersonalOverride, savePracticeSummary, saveRaceRecord } from "./memorySync";

describe("memorySync một người dùng", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.snapshotQuery.mockResolvedValue({ totalXp: 12, completedGroups: 0, currentStreak: 1, overrides: [] });
    mocks.raceRecordsQuery.mockResolvedValue({ 20: 2200 });
  });

  it("tải snapshot và kỷ lục trực tiếp, không kèm token", async () => {
    await expect(loadLearnerSnapshot()).resolves.toMatchObject({ totalXp: 12, overrides: {} });
    await expect(loadRaceRecords()).resolves.toEqual({ 20: 2200 });
    expect(mocks.snapshotQuery).toHaveBeenCalledWith();
    expect(mocks.raceRecordsQuery).toHaveBeenCalledWith();
  });

  it("ghi phiên, liên tưởng và thành tích bằng payload chung", async () => {
    await savePracticeSummary({ scope: 10, direction: "mixed", correctCount: 8, questionCount: 10, meanResponseMs: 1200, totalXp: 80, completedGroups: 0, performances: [] });
    await savePersonalOverride({ itemKey: "00", label: "Quả trứng của tôi" });
    await saveRaceRecord({ sequenceLength: 20, correctPositions: 20, totalPositions: 20, durationMs: 2200, exact: true });
    expect(mocks.saveSessionMutation).toHaveBeenCalledWith(expect.objectContaining({ scope: 10, totalXp: 80 }));
    expect(mocks.saveOverrideMutation).toHaveBeenCalledWith({ itemKey: "00", label: "Quả trứng của tôi" });
    expect(mocks.saveRaceMutation).toHaveBeenCalledWith(expect.objectContaining({ sequenceLength: 20, exact: true }));
  });
});
