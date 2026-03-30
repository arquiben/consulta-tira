
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

let supabaseInstance: SupabaseClient | null = null;

export const getSupabase = (): SupabaseClient | null => {
  if (!supabaseUrl || !supabaseAnonKey) return null;
  
  // Basic URL validation to avoid createClient throwing
  try {
    new URL(supabaseUrl);
  } catch (e) {
    return null;
  }
  
  if (!supabaseInstance) {
    try {
      supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
    } catch (err) {
      console.error('Failed to initialize Supabase:', err);
      return null;
    }
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

export const deleteFromSupabase = async (table: string, id: string) => {
  const client = getSupabase();
  if (!client) return;
  
  try {
    const { error } = await client
      .from(table)
      .delete()
      .eq('id', id);
    
    if (error) console.error(`Error deleting from ${table}:`, error);
  } catch (err) {
    console.error(`Supabase delete error for ${table}:`, err);
  }
};
