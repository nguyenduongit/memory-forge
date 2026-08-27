import type { User } from "@supabase/supabase-js";
import { memoryApi } from "@/lib/memoryApi";
import { supabase } from "@/lib/supabase";
import { uploadPrivateImage } from "./memoryImages";
import type { ScopeSize } from "../domain/gameplay";

export type OverrideMap = Record<string, { label?: string; signedUrl?: string }>;
export type LearnerSnapshot = { totalXp: number; completedGroups: number; currentStreak: number; overrides: OverrideMap };

async function requireAccessToken() {
  const { data } = await supabase!.auth.getSession();
  if (!data.session?.access_token) throw new Error("Hãy đăng nhập để đồng bộ dữ liệu.");
  return data.session.access_token;
}

export async function sendMagicLink(email: string) {
  if (!supabase) throw new Error("Đồng bộ Supabase chưa được cấu hình cho môi trường này.");
  return supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.origin } });
}

export async function loadLearnerSnapshot(): Promise<LearnerSnapshot> {
  const accessToken = await requireAccessToken();
  const snapshot = await memoryApi.memory.snapshot.query({ accessToken });
  return {
    totalXp: snapshot.totalXp,
    completedGroups: snapshot.completedGroups,
    currentStreak: snapshot.currentStreak,
    overrides: Object.fromEntries(snapshot.overrides.map((item) => [item.itemKey, { label: item.label || undefined, signedUrl: item.signedUrl }])),
  };
}

export async function savePracticeSummary(input: {
  scope: ScopeSize;
  direction: "number_to_image" | "image_to_number" | "mixed";
  correctCount: number;
  questionCount: number;
  meanResponseMs: number | null;
  totalXp: number;
  completedGroups: number;
  performances: { itemKey: string; correct: boolean; responseMs: number }[];
}) {
  const accessToken = await requireAccessToken();
  return memoryApi.memory.saveSession.mutate({ accessToken, ...input });
}

export async function savePersonalOverride(input: { user: User; itemKey: string; label: string; imageFile?: File }) {
  const accessToken = await requireAccessToken();
  const imagePath = input.imageFile ? await uploadPrivateImage(input.user, input.itemKey, input.imageFile) : undefined;
  return memoryApi.memory.saveOverride.mutate({ accessToken, itemKey: input.itemKey, label: input.label, imagePath });
}

export async function deletePersonalOverride(itemKey: string) {
  const accessToken = await requireAccessToken();
  return memoryApi.memory.deleteOverride.mutate({ accessToken, itemKey });
}
