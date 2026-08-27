import { getScopeCatalog, numberCatalog, type MemoryItem } from "./catalog";

export type PracticeDirection = "number_to_image" | "image_to_number" | "mixed";
export type ScopeSize = 10 | 50 | 100;

export type PracticeQuestion = {
  id: string;
  direction: Exclude<PracticeDirection, "mixed">;
  item: MemoryItem;
  options: MemoryItem[];
  issuedAt: number;
};

export type PracticeOutcome = {
  correct: boolean;
  responseMs: number;
  xpEarned: number;
};

const shuffle = <T,>(items: T[]): T[] => {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex]!, copy[index]!];
  }
  return copy;
};

export function createPracticeQuestion(scope: ScopeSize, direction: PracticeDirection, groupOrder = 0): PracticeQuestion {
  const pool = scope === 10
    ? numberCatalog.slice(groupOrder * 10, groupOrder * 10 + 10)
    : scope === 50
      ? numberCatalog.slice(groupOrder * 50, groupOrder * 50 + 50)
      : getScopeCatalog(100);
  const item = pool[Math.floor(Math.random() * pool.length)]!;
  const resolvedDirection = direction === "mixed"
    ? (Math.random() > 0.5 ? "number_to_image" : "image_to_number")
    : direction;
  const distractors = shuffle(pool.filter((candidate) => candidate.key !== item.key)).slice(0, 3);

  return {
    id: `${item.key}-${performance.now().toFixed(2)}`,
    direction: resolvedDirection,
    item,
    options: shuffle([item, ...distractors]),
    issuedAt: performance.now(),
  };
}

export function evaluateAnswer(question: PracticeQuestion, answerKey: string, answeredAt = performance.now()): PracticeOutcome {
  const responseMs = Math.max(0, Math.round(answeredAt - question.issuedAt));
  const correct = answerKey === question.item.key;
  const speedBonus = correct && responseMs <= 2500 ? 3 : correct && responseMs <= 5000 ? 1 : 0;
  return { correct, responseMs, xpEarned: correct ? 10 + speedBonus : 0 };
}

export function calculateAccuracy(correctCount: number, questionCount: number): number {
  if (questionCount <= 0) return 0;
  return Math.round((correctCount / questionCount) * 100);
}

export function unlockedScope(completedGroups: number): ScopeSize {
  if (completedGroups >= 10) return 100;
  if (completedGroups >= 5) return 50;
  return 10;
}

export function isGroupMastered(stats: { sessions: number; questions: number; correct: number; correctResponseMs: number[] }): boolean {
  if (stats.sessions < 2 || stats.questions < 40 || stats.correct / stats.questions < 0.8 || stats.correctResponseMs.length === 0) return false;
  const sorted = [...stats.correctResponseMs].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 ? sorted[middle]! : Math.round((sorted[middle - 1]! + sorted[middle]!) / 2);
  return median <= 2500;
}
