import { createClient } from "@supabase/supabase-js";

type PerformanceInput = { itemKey: string; correct: boolean; responseMs: number };

function memoryClient(accessToken: string) {
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Supabase is not configured");
  return createClient(url, key, { global: { headers: { Authorization: `Bearer ${accessToken}` } }, auth: { persistSession: false, autoRefreshToken: false } });
}

async function getUser(accessToken: string) {
  const client = memoryClient(accessToken);
  const { data, error } = await client.auth.getUser(accessToken);
  if (error || !data.user) throw new Error("Phiên Supabase không hợp lệ");
  return { client, user: data.user };
}

export async function readMemorySnapshot(accessToken: string) {
  const { client, user } = await getUser(accessToken);
  const [{ data: progress, error: progressError }, { data: overrides, error: overridesError }] = await Promise.all([
    client.from("module_progress").select("total_xp, unlocked_group_orders, current_streak, last_practiced_date").eq("user_id", user.id).eq("module_key", "number-memory").maybeSingle(),
    client.from("user_item_overrides").select("custom_label, image_path, memory_items!inner(item_key)").eq("user_id", user.id),
  ]);
  if (progressError || overridesError) throw progressError || overridesError;

  const overrideViews = await Promise.all((overrides ?? []).map(async (override: any) => {
    const item = Array.isArray(override.memory_items) ? override.memory_items[0] : override.memory_items;
    const signed = override.image_path ? await client.storage.from("memory-images").createSignedUrl(override.image_path, 3600) : null;
    return { itemKey: item?.item_key as string, label: override.custom_label as string | null, signedUrl: signed?.data?.signedUrl as string | undefined };
  }));
  return {
    totalXp: progress?.total_xp ?? 0,
    completedGroups: Math.max(0, (progress?.unlocked_group_orders?.length ?? 1) - 1),
    currentStreak: progress?.current_streak ?? 0,
    overrides: overrideViews.filter((override) => override.itemKey),
  };
}

export async function saveMemorySession(input: {
  accessToken: string;
  scope: 10 | 50 | 100;
  direction: "number_to_image" | "image_to_number" | "mixed";
  correctCount: number;
  questionCount: number;
  meanResponseMs: number | null;
  totalXp: number;
  completedGroups: number;
  performances: PerformanceInput[];
}) {
  const { client, user } = await getUser(input.accessToken);
  const nextCompletedGroups = input.completedGroups;
  const unlocked = Array.from({ length: Math.min(10, nextCompletedGroups + 1) }, (_, index) => index);
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
  const { data: previous } = await client.from("module_progress").select("current_streak, last_practiced_date").eq("user_id", user.id).eq("module_key", "number-memory").maybeSingle();
  const streak = previous?.last_practiced_date === today ? previous.current_streak : previous?.last_practiced_date === yesterday ? (previous.current_streak ?? 0) + 1 : 1;
  const sessionId = crypto.randomUUID();
  const timestamp = new Date().toISOString();

  const { error: sessionError } = await client.from("practice_sessions").insert({ id: sessionId, user_id: user.id, module_key: "number-memory", scope_size: input.scope, direction: input.direction, level: 1, started_at: timestamp, ended_at: timestamp, correct_count: input.correctCount, question_count: input.questionCount, mean_response_ms: input.meanResponseMs, status: "completed", idempotency_key: sessionId, scoring_version: 1 });
  if (sessionError) throw sessionError;
  const { error: progressError } = await client.from("module_progress").upsert({ user_id: user.id, module_key: "number-memory", max_scope_size: nextCompletedGroups >= 10 ? 100 : nextCompletedGroups >= 5 ? 50 : 10, current_level: 1, total_xp: input.totalXp, unlocked_group_orders: unlocked, current_streak: streak, last_practiced_date: today, scoring_version: 1, updated_at: timestamp }, { onConflict: "user_id,module_key" });
  if (progressError) throw progressError;

  for (const performance of input.performances) {
    const { data: item } = await client.from("memory_items").select("id").eq("module_key", "number-memory").eq("item_key", performance.itemKey).single();
    if (!item) continue;
    const { data: current } = await client.from("item_performance").select("attempts, correct_count, best_ms, ema_response_ms").eq("user_id", user.id).eq("memory_item_id", item.id).maybeSingle();
    const previousAttempts = current?.attempts ?? 0;
    const previousCorrect = current?.correct_count ?? 0;
    const emaResponseMs = current?.ema_response_ms ? Math.round(current.ema_response_ms * 0.75 + performance.responseMs * 0.25) : performance.responseMs;
    await client.from("item_performance").upsert({ user_id: user.id, memory_item_id: item.id, attempts: previousAttempts + 1, correct_count: previousCorrect + (performance.correct ? 1 : 0), best_ms: performance.correct ? Math.min(current?.best_ms ?? performance.responseMs, performance.responseMs) : current?.best_ms ?? null, ema_response_ms: emaResponseMs, last_practiced_at: timestamp }, { onConflict: "user_id,memory_item_id" });
  }
  await client.from("user_achievements").upsert({ user_id: user.id, achievement_key: "number-memory-first-session", evidence_session_id: sessionId }, { onConflict: "user_id,achievement_key" });
  return { completedGroups: nextCompletedGroups, currentStreak: streak };
}

export async function saveMemoryOverride(input: { accessToken: string; itemKey: string; label: string; imagePath?: string }) {
  const { client, user } = await getUser(input.accessToken);
  const { data: item, error: itemError } = await client.from("memory_items").select("id").eq("module_key", "number-memory").eq("item_key", input.itemKey).single();
  if (itemError) throw itemError;
  const { error } = await client.from("user_item_overrides").upsert({ user_id: user.id, memory_item_id: item.id, custom_label: input.label || null, ...(input.imagePath ? { image_path: input.imagePath, image_version: 1 } : {}), updated_at: new Date().toISOString() }, { onConflict: "user_id,memory_item_id" });
  if (error) throw error;
}

export async function deleteMemoryOverride(input: { accessToken: string; itemKey: string }) {
  const { client, user } = await getUser(input.accessToken);
  const { data: item } = await client.from("memory_items").select("id").eq("module_key", "number-memory").eq("item_key", input.itemKey).single();
  if (!item) return;
  const { data: override } = await client.from("user_item_overrides").select("image_path").eq("user_id", user.id).eq("memory_item_id", item.id).maybeSingle();
  if (override?.image_path) await client.storage.from("memory-images").remove([override.image_path]);
  const { error } = await client.from("user_item_overrides").delete().eq("user_id", user.id).eq("memory_item_id", item.id);
  if (error) throw error;
}
