import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { deleteMemoryOverride, readMemorySnapshot, readRaceRecords, saveMemoryOverride, saveMemorySession, saveRaceRecord } from "./memoryForge";
import { raceRecordInput } from "./raceRecord.validation";

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),
  memory: router({
    snapshot: publicProcedure.query(() => readMemorySnapshot()),
    saveSession: publicProcedure.input(z.object({ scope: z.union([z.literal(10), z.literal(50), z.literal(100)]), direction: z.enum(["number_to_image", "image_to_number", "mixed"]), correctCount: z.number().int().min(0), questionCount: z.number().int().min(1), meanResponseMs: z.number().int().positive().nullable(), totalXp: z.number().int().min(0), completedGroups: z.number().int().min(0).max(10), performances: z.array(z.object({ itemKey: z.string().regex(/^\d{2}$/), correct: z.boolean(), responseMs: z.number().int().positive() })).max(10) })).mutation(({ input }) => saveMemorySession(input)),
    saveOverride: publicProcedure.input(z.object({ itemKey: z.string().regex(/^\d{2}$/), label: z.string().max(64) })).mutation(({ input }) => saveMemoryOverride(input)),
    deleteOverride: publicProcedure.input(z.object({ itemKey: z.string().regex(/^\d{2}$/) })).mutation(({ input }) => deleteMemoryOverride(input)),
    raceRecords: publicProcedure.query(() => readRaceRecords()),
    saveRaceRecord: publicProcedure.input(raceRecordInput).mutation(({ input }) => saveRaceRecord(input)),
  }),

  // TODO: add feature routers here, e.g.
  // todo: router({
  //   list: protectedProcedure.query(({ ctx }) =>
  //     db.getUserTodos(ctx.user.id)
  //   ),
  // }),
});

export type AppRouter = typeof appRouter;
