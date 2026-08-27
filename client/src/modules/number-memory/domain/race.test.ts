import { describe, expect, it } from "vitest";
import { createDigitSequence, formatRaceTime, scoreDigitSequence } from "./race";

describe("number race", () => {
  it("creates a digit-only sequence of the selected length", () => {
    const sequence = createDigitSequence(20, () => 0.42);
    expect(sequence).toHaveLength(20);
    expect(sequence).toMatch(/^4+$/);
  });

  it("scores exact and position-correct recalls without punctuation", () => {
    expect(scoreDigitSequence("012345", "012-345")).toMatchObject({ exact: true, correctPositions: 6, total: 6 });
    expect(scoreDigitSequence("012345", "012999")).toMatchObject({ exact: false, correctPositions: 3, total: 6 });
  });

  it("formats a duration for a personal record", () => {
    expect(formatRaceTime(65_900)).toBe("01:05");
  });
});
