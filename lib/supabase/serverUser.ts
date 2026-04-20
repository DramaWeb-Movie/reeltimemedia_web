import type { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';

export async function getAuthenticatedServerUser(): Promise<{
  supabase: Awaited<ReturnType<typeof createClient>>;
  user: User | null;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { supabase, user };
}
