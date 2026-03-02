
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

let supabaseInstance: SupabaseClient | null = null;

export const getSupabase = (): SupabaseClient | null => {
  if (!supabaseUrl || !supabaseAnonKey) return null;
  
  if (!supabaseInstance) {
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
  }
  return supabaseInstance;
};

export const syncToSupabase = async (table: string, data: any) => {
  const client = getSupabase();
  if (!client) return;
  
  try {
    const { error } = await client
      .from(table)
      .upsert(data);
    
    if (error) console.error(`Error syncing to ${table}:`, error);
  } catch (err) {
    console.error(`Supabase sync error for ${table}:`, err);
  }
};

export const fetchFromSupabase = async (table: string) => {
  const client = getSupabase();
  if (!client) return [];
  
  try {
    const { data, error } = await client
      .from(table)
      .select('*');
    
    if (error) {
      console.error(`Error fetching from ${table}:`, error);
      return [];
    }
    return data || [];
  } catch (err) {
    console.error(`Supabase fetch error for ${table}:`, err);
    return [];
  }
};
