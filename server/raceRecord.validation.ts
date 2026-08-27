import { z } from "zod";

const raceLengths = [20, 30, 40, 50, 60, 70, 80, 90, 100, 120, 150, 200] as const;

export const raceRecordInput = z.object({
  sequenceLength: z.number().int().refine((value) => raceLengths.includes(value as (typeof raceLengths)[number]), "Độ dài dãy không được hỗ trợ."),
  correctPositions: z.number().int().min(0),
  totalPositions: z.number().int().min(1),
  durationMs: z.number().int().min(0),
  exact: z.boolean(),
}).superRefine((value, context) => {
  if (value.correctPositions > value.totalPositions) context.addIssue({ code: z.ZodIssueCode.custom, path: ["correctPositions"], message: "Số vị trí đúng không thể vượt tổng vị trí." });
  if (value.exact !== (value.correctPositions === value.totalPositions)) context.addIssue({ code: z.ZodIssueCode.custom, path: ["exact"], message: "Trạng thái chính xác phải khớp với điểm số." });
});
