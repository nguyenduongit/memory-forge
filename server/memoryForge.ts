import { createClient } from "@supabase/supabase-js";

type PerformanceInput = { itemKey: string; correct: boolean; responseMs: number };

function memoryClient() {
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Supabase is not configured");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function readMemorySnapshot() {
  const client = memoryClient();
  const [{ data: progress, error: progressError }, { data: overrides, error: overridesError }] = await Promise.all([
    client.from("app_progress").select("total_xp, unlocked_group_orders, current_streak").eq("module_key", "number-memory").maybeSingle(),
    client.from("memory_item_overrides").select("custom_label, memory_items!inner(item_key)"),
  ]);
  if (progressError || overridesError) throw progressError || overridesError;
  return {
    totalXp: progress?.total_xp ?? 0,
    completedGroups: Math.max(0, (progress?.unlocked_group_orders?.length ?? 1) - 1),
    currentStreak: progress?.current_streak ?? 0,
    overrides: (overrides ?? []).map((override: any) => {
      const item = Array.isArray(override.memory_items) ? override.memory_items[0] : override.memory_items;
      return { itemKey: item?.item_key as string, label: override.custom_label as string | null, signedUrl: undefined };
    }).filter((override) => override.itemKey),
  };
}

export async function saveMemorySession(input: { scope: 10 | 50 | 100; direction: "number_to_image" | "image_to_number" | "mixed"; correctCount: number; questionCount: number; meanResponseMs: number | null; totalXp: number; completedGroups: number; performances: PerformanceInput[] }) {
  const client = memoryClient();
  const unlocked = Array.from({ length: Math.min(10, input.completedGroups + 1) }, (_, index) => index);
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
  const { data: previous, error: previousError } = await client.from("app_progress").select("current_streak, last_practiced_date").eq("module_key", "number-memory").maybeSingle();
  if (previousError) throw previousError;
  const streak = previous?.last_practiced_date === today ? previous.current_streak : previous?.last_practiced_date === yesterday ? (previous.current_streak ?? 0) + 1 : 1;
  const timestamp = new Date().toISOString();
  const { error: sessionError } = await client.from("practice_sessions").insert({ module_key: "number-memory", scope_size: input.scope, direction: input.direction, level: 1, started_at: timestamp, ended_at: timestamp, correct_count: input.correctCount, question_count: input.questionCount, mean_response_ms: input.meanResponseMs, status: "completed", scoring_version: 1 });
  if (sessionError) throw sessionError;
  const { error: progressError } = await client.from("app_progress").upsert({ module_key: "number-memory", max_scope_size: input.completedGroups >= 10 ? 100 : input.completedGroups >= 5 ? 50 : 10, current_level: 1, total_xp: input.totalXp, unlocked_group_orders: unlocked, current_streak: streak, last_practiced_date: today, scoring_version: 1, updated_at: timestamp }, { onConflict: "module_key" });
  if (progressError) throw progressError;
  for (const performance of input.performances) {
    const { data: item, error: itemError } = await client.from("memory_items").select("id").eq("module_key", "number-memory").eq("item_key", performance.itemKey).single();
    if (itemError || !item) continue;
    const { data: current, error: currentError } = await client.from("item_performance").select("attempts, correct_count, best_ms, ema_response_ms").eq("memory_item_id", item.id).maybeSingle();
    if (currentError) throw currentError;
    const emaResponseMs = current?.ema_response_ms ? Math.round(current.ema_response_ms * 0.75 + performance.responseMs * 0.25) : performance.responseMs;
    const { error: performanceError } = await client.from("item_performance").upsert({ memory_item_id: item.id, attempts: (current?.attempts ?? 0) + 1, correct_count: (current?.correct_count ?? 0) + (performance.correct ? 1 : 0), best_ms: performance.correct ? Math.min(current?.best_ms ?? performance.responseMs, performance.responseMs) : current?.best_ms ?? null, ema_response_ms: emaResponseMs, last_practiced_at: timestamp }, { onConflict: "memory_item_id" });
    if (performanceError) throw performanceError;
  }
  return { completedGroups: input.completedGroups, currentStreak: streak };
}

export async function readRaceRecords() {
  const { data, error } = await memoryClient().from("race_records").select("sequence_length, duration_ms").eq("exact", true).order("duration_ms", { ascending: true }).limit(200);
  if (error) throw error;
  return (data ?? []).reduce<Record<number, number>>((records, row) => {
    const length = Number(row.sequence_length);
    records[length] = Math.min(records[length] ?? Number.POSITIVE_INFINITY, Number(row.duration_ms));
    return records;
  }, {});
}

export async function saveRaceRecord(input: { sequenceLength: number; correctPositions: number; totalPositions: number; durationMs: number; exact: boolean }) {
  const { error } = await memoryClient().from("race_records").insert({ module_key: "number-memory", sequence_length: input.sequenceLength, correct_positions: input.correctPositions, total_positions: input.totalPositions, duration_ms: input.durationMs, exact: input.exact });
  if (error) throw error;
  return readRaceRecords();
}

export async function saveMemoryOverride(input: { itemKey: string; label: string }) {
  const client = memoryClient();
  const { data: item, error: itemError } = await client.from("memory_items").select("id").eq("module_key", "number-memory").eq("item_key", input.itemKey).single();
  if (itemError) throw itemError;
  const { error } = await client.from("memory_item_overrides").upsert({ memory_item_id: item.id, custom_label: input.label || null, updated_at: new Date().toISOString() }, { onConflict: "memory_item_id" });
  if (error) throw error;
}

export async function deleteMemoryOverride(input: { itemKey: string }) {
  const client = memoryClient();
  const { data: item, error: itemError } = await client.from("memory_items").select("id").eq("module_key", "number-memory").eq("item_key", input.itemKey).single();
  if (itemError || !item) return;
  const { error } = await client.from("memory_item_overrides").delete().eq("memory_item_id", item.id);
  if (error) throw error;
}
