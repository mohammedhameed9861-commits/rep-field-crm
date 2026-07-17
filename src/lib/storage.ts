import { supabase } from "@/lib/supabase";

export async function getSignedPhotoUrl(path: string, expiresInSeconds = 3600): Promise<string | null> {
  const { data, error } = await supabase.storage.from("visit-photos").createSignedUrl(path, expiresInSeconds);
  if (error) return null;
  return data.signedUrl;
}
