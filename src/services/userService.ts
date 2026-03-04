import { supabase } from '../lib/supabase';
import { Database } from '../lib/database.types';

type Profile = Database['public']['Tables']['profiles']['Row'];

export interface UsersResponse {
  success: boolean;
  data?: Profile[];
  error?: string;
}

export async function getAllUsers(): Promise<UsersResponse> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return {
        success: false,
        error: error.message || 'Failed to fetch users',
      };
    }

    return {
      success: true,
      data: data || [],
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error occurred';
    return {
      success: false,
      error: message,
    };
  }
}

export async function getClientUsers(): Promise<UsersResponse> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .in('role', ['machineman', 'printer_operator', 'laminator'])
      .order('full_name', { ascending: true });

    if (error) {
      return {
        success: false,
        error: error.message || 'Failed to fetch client users',
      };
    }

    return {
      success: true,
      data: data || [],
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error occurred';
    return {
      success: false,
      error: message,
    };
  }
}
