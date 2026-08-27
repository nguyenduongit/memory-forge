import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

const SUPPORTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 5 * 1024 * 1024;
const MAX_PIXELS = 16_000_000;
const MAX_EDGE = 1920;

export async function validateAndNormalizeImage(file: File): Promise<File> {
  if (!SUPPORTED_TYPES.includes(file.type)) throw new Error("Chỉ chấp nhận ảnh JPG, PNG hoặc WEBP.");
  if (file.size > MAX_BYTES) throw new Error("Ảnh cần nhỏ hơn 5 MB.");
  const bitmap = await createImageBitmap(file);
  if (bitmap.width * bitmap.height > MAX_PIXELS) { bitmap.close(); throw new Error("Ảnh có độ phân giải quá lớn."); }
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((output) => output ? resolve(output) : reject(new Error("Không thể xử lý ảnh.")), "image/webp", 0.9));
  return new File([blob], `${file.name.replace(/\.[^.]+$/, "")}.webp`, { type: "image/webp" });
}

export async function uploadPrivateImage(user: User, itemKey: string, file: File): Promise<string> {
  const path = `${user.id}/number-memory/${itemKey}/${crypto.randomUUID()}.webp`;
  if (!supabase) throw new Error("Đồng bộ Supabase chưa được cấu hình cho môi trường này.");
  const { error } = await supabase.storage.from("memory-images").upload(path, file, { contentType: "image/webp", upsert: false });
  if (error) throw error;
  return path;
}
