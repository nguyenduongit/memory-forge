import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ from: vi.fn(), upsert: vi.fn() }));

vi.mock("@/lib/supabase", () => ({ supabase: { from: mocks.from } }));

import { loadLearnerSnapshot, loadRaceRecords, savePersonalOverride, saveRaceRecord } from "./memorySync";

const selectChain = (result: unknown) => ({
  then: (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) => Promise.resolve(result).then(resolve, reject),
  eq: () => selectChain(result),
  order: () => selectChain(result),
  limit: () => Promise.resolve(result),
  maybeSingle: () => Promise.resolve(result),
  single: () => Promise.resolve(result),
});

describe("memorySync một người dùng", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.from.mockImplementation((table: string) => {
      if (table === "app_progress") return { select: () => selectChain({ data: { total_xp: 12, unlocked_group_orders: [0], current_streak: 1 }, error: null }) };
      if (table === "memory_item_overrides") return { select: () => selectChain({ data: [{ custom_label: "Trứng", memory_items: { item_key: "00" } }], error: null }), upsert: mocks.upsert };
      if (table === "memory_items") return { select: () => selectChain({ data: { id: "item-00" }, error: null }) };
      if (table === "race_records") return { select: () => selectChain({ data: [{ sequence_length: 20, duration_ms: 2200 }], error: null }), insert: () => Promise.resolve({ error: null }) };
      return { upsert: mocks.upsert };
    });
    mocks.upsert.mockResolvedValue({ error: null });
  });

  it("tải tiến độ và kỷ lục trực tiếp từ các bảng Supabase chung", async () => {
    await expect(loadLearnerSnapshot()).resolves.toMatchObject({ totalXp: 12, currentStreak: 1, overrides: { "00": { label: "Trứng" } } });
    await expect(loadRaceRecords()).resolves.toEqual({ 20: 2200 });
    expect(mocks.from).toHaveBeenCalledWith("app_progress");
    expect(mocks.from).toHaveBeenCalledWith("race_records");
  });

  it("ghi liên tưởng và thành tích không truyền token hoặc định danh người dùng", async () => {
    await savePersonalOverride({ itemKey: "00", label: "Quả trứng của tôi" });
    await saveRaceRecord({ sequenceLength: 20, correctPositions: 20, totalPositions: 20, durationMs: 2200, exact: true });
    expect(mocks.upsert).toHaveBeenCalledWith(expect.objectContaining({ memory_item_id: "item-00", custom_label: "Quả trứng của tôi" }), { onConflict: "memory_item_id" });
    expect(mocks.from).toHaveBeenCalledWith("race_records");
  });
});
