import { createClient } from "@/lib/supabase/server";

const BUCKET = "recordings";

export async function getSignedUrl(storagePath: string): Promise<string> {
  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, 3600);
  if (error) throw error;
  return data.signedUrl;
}
