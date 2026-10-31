import { supabase } from '@/lib/supabase';

let cached = null;

export async function getOperatorId() {
  if (!supabase) {
    cached = null;
    return null;
  }

  const { data, error } = await supabase.auth.getUser();

  if (error || !data?.user?.id) {
    cached = null;
    return null;
  }

  cached = data.user.id;
  return cached;
}

export function getCachedOperatorId() {
  return cached;
}
