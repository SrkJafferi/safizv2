import { supabase } from '../lib/supabase';

export async function getSetting(key: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('system_settings')
    .select('value')
    .eq('key', key)
    .maybeSingle();

  if (error) {
    console.error(`Error fetching setting "${key}":`, error);
    return null;
  }

  return data?.value || null;
}

export async function updateSetting(key: string, value: string): Promise<boolean> {
  const { error } = await supabase
    .from('system_settings')
    .update({ value })
    .eq('key', key);

  if (error) {
    console.error(`Error updating setting "${key}":`, error);
    return false;
  }

  return true;
}
