import { describe, expect, it } from "vitest";
import { raceRecordInput } from "./raceRecord.validation";

const validRecord = { accessToken: "token", sequenceLength: 20, correctPositions: 20, totalPositions: 20, durationMs: 1234, exact: true };

describe("raceRecordInput", () => {
  it("chấp nhận thành tích hợp lệ với độ dài được hỗ trợ", () => {
    expect(raceRecordInput.safeParse(validRecord).success).toBe(true);
  });

  it("từ chối độ dài, điểm số và cờ exact không nhất quán", () => {
    expect(raceRecordInput.safeParse({ ...validRecord, sequenceLength: 21 }).success).toBe(false);
    expect(raceRecordInput.safeParse({ ...validRecord, correctPositions: 21 }).success).toBe(false);
    expect(raceRecordInput.safeParse({ ...validRecord, correctPositions: 19 }).success).toBe(false);
  });
});
