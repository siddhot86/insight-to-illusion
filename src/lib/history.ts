import { supabase } from "@/integrations/supabase/client";

export type HistoryRow = {
  id: string;
  title: string;
  image_path: string | null;
  result: Record<string, unknown>;
  created_at: string;
};

function dataUrlToBlob(dataUrl: string): { blob: Blob; ext: string } {
  const [meta, b64] = dataUrl.split(",");
  const mime = /data:(.*?);base64/.exec(meta)?.[1] ?? "image/jpeg";
  const ext = mime.split("/")[1]?.split("+")[0] ?? "jpg";
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return { blob: new Blob([bytes], { type: mime }), ext };
}

export async function saveAnalysis(opts: {
  userId: string;
  imageDataUrl: string;
  result: Record<string, unknown>;
}) {
  const { blob, ext } = dataUrlToBlob(opts.imageDataUrl);
  const path = `${opts.userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const up = await supabase.storage.from("scene-images").upload(path, blob, {
    contentType: blob.type,
    upsert: false,
  });
  if (up.error) throw up.error;

  const vp = (opts.result.video_prompt ?? {}) as Record<string, string>;
  const title =
    (vp.main_prompt ? vp.main_prompt.slice(0, 80) : "Untitled scene").trim() || "Untitled scene";

  const ins = await supabase
    .from("analyses")
    .insert({ user_id: opts.userId, image_path: path, result: opts.result, title })
    .select()
    .single();
  if (ins.error) throw ins.error;
  return ins.data as HistoryRow;
}

export async function listAnalyses(): Promise<HistoryRow[]> {
  const { data, error } = await supabase
    .from("analyses")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as HistoryRow[];
}

export async function deleteAnalysis(row: HistoryRow) {
  if (row.image_path) {
    await supabase.storage.from("scene-images").remove([row.image_path]);
  }
  const { error } = await supabase.from("analyses").delete().eq("id", row.id);
  if (error) throw error;
}

export async function getSignedImageUrl(path: string | null): Promise<string | null> {
  if (!path) return null;
  const { data, error } = await supabase.storage
    .from("scene-images")
    .createSignedUrl(path, 60 * 60);
  if (error) return null;
  return data.signedUrl;
}
