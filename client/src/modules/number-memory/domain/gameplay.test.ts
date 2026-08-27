import { describe, expect, it } from "vitest";
import { getCatalogItem, getScopeCatalog } from "./catalog";
import { calculateAccuracy, createPracticeQuestion, evaluateAnswer, isGroupMastered, unlockedScope, type PracticeQuestion } from "./gameplay";

describe("number catalog", () => {
  it("keeps the leading zero and supplies 100 standard associations", () => {
    expect(getScopeCatalog(100)).toHaveLength(100);
    expect(getCatalogItem("00")?.label).toBe("Quả trứng");
    expect(getCatalogItem("07")?.label).toBe("Cái rìu");
    expect(getCatalogItem("07")?.assetKey).toBe("number-07-axe");
  });
});

describe("practice scoring", () => {
  const item = getCatalogItem("07")!;
  const question: PracticeQuestion = {
    id: "test-question",
    direction: "number_to_image",
    item,
    options: [item],
    issuedAt: 100,
  };

  it("awards XP for a quick correct answer", () => {
    expect(evaluateAnswer(question, "07", 1200)).toEqual({ correct: true, responseMs: 1100, xpEarned: 13 });
  });

  it("does not award XP for a wrong answer and calculates progress safely", () => {
    expect(evaluateAnswer(question, "06", 1700)).toEqual({ correct: false, responseMs: 1600, xpEarned: 0 });
    expect(calculateAccuracy(0, 0)).toBe(0);
    expect(calculateAccuracy(7, 10)).toBe(70);
  });

  it("unlocks scopes only after their required group milestones", () => {
    expect(unlockedScope(0)).toBe(10);
    expect(unlockedScope(5)).toBe(50);
    expect(unlockedScope(10)).toBe(100);
  });

  it("draws scope-10 questions from the active group and applies the mastery contract", () => {
    const question = createPracticeQuestion(10, "mixed", 2);
    expect(question.item.groupOrder).toBe(2);
    expect(isGroupMastered({ sessions: 2, questions: 40, correct: 32, correctResponseMs: Array(32).fill(2100) })).toBe(true);
    expect(isGroupMastered({ sessions: 2, questions: 40, correct: 32, correctResponseMs: Array(32).fill(2900) })).toBe(false);
  });

  it("keeps the explicitly selected practice direction for either launchpad choice", () => {
    expect(createPracticeQuestion(10, "number_to_image", 0).direction).toBe("number_to_image");
    expect(createPracticeQuestion(10, "image_to_number", 0).direction).toBe("image_to_number");
  });

  it("keeps the second 50-number stage inside 50–99", () => {
    for (let index = 0; index < 20; index += 1) {
      const question = createPracticeQuestion(50, "mixed", 1);
      expect(Number(question.item.key)).toBeGreaterThanOrEqual(50);
      expect(Number(question.item.key)).toBeLessThanOrEqual(99);
      question.options.forEach((option) => expect(Number(option.key)).toBeGreaterThanOrEqual(50));
    }
  });
});
