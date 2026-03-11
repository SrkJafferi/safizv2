import { supabase } from '../lib/supabase';
import { Database } from '../lib/database.types';

type RollInsert = Database['public']['Tables']['rolls']['Insert'];

export interface CreateRollInput {
  roll_number: string;
  size?: string;
  type?: string;
  brand?: string;
  total_meter: number;
  purchase_cost: number;
}

export interface UpdateRollInput {
  id: string;
  roll_number?: string;
  size?: string;
  type?: string;
  brand?: string;
  total_meter?: number;
  purchase_cost?: number;
  status?: string;
}

export interface CreateRollResponse {
  success: boolean;
  data?: Database['public']['Tables']['rolls']['Row'];
  error?: string;
}

export async function createRoll(input: CreateRollInput): Promise<CreateRollResponse> {
  try {
    const rollData: RollInsert = {
      roll_number: input.roll_number,
      size: input.size || null,
      type: input.type || null,
      brand: input.brand || null,
      total_meter: input.total_meter,
      remaining_meter: input.total_meter,
      purchase_cost: input.purchase_cost,
      status: 'Active',
    };

    const { data, error } = await supabase
      .from('rolls')
      .insert([rollData])
      .select()
      .single();

    if (error) {
      return {
        success: false,
        error: error.message || 'Failed to create roll',
      };
    }

    return {
      success: true,
      data,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error occurred';
    return {
      success: false,
      error: message,
    };
  }
}

export async function checkRollNumberExists(rollNumber: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('rolls')
      .select('id')
      .eq('roll_number', rollNumber)
      .maybeSingle();

    if (error) {
      console.error('Error checking roll number:', error);
      return false;
    }

    return !!data;
  } catch (err) {
    console.error('Error in checkRollNumberExists:', err);
    return false;
  }
}

export interface GetRollsResponse {
  success: boolean;
  data?: Database['public']['Tables']['rolls']['Row'][];
  error?: string;
}

export async function getRollById(id: string): Promise<{ success: boolean; data?: Database['public']['Tables']['rolls']['Row']; error?: string }> {
  try {
    const { data: roll, error } = await supabase
      .from('rolls')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      return {
        success: false,
        error: error.message || 'Failed to fetch roll',
      };
    }

    if (!roll) {
      return {
        success: false,
        error: 'Roll not found',
      };
    }

    return {
      success: true,
      data: roll,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error occurred';
    return {
      success: false,
      error: message,
    };
  }
}

export async function updateRoll(input: UpdateRollInput): Promise<{ success: boolean; data?: Database['public']['Tables']['rolls']['Row']; error?: string }> {
  try {
    const updateData: Record<string, any> = {};

    if (input.roll_number !== undefined) updateData.roll_number = input.roll_number;
    if (input.size !== undefined) updateData.size = input.size || null;
    if (input.type !== undefined) updateData.type = input.type || null;
    if (input.brand !== undefined) updateData.brand = input.brand || null;
    if (input.total_meter !== undefined) updateData.total_meter = input.total_meter;
    if (input.purchase_cost !== undefined) updateData.purchase_cost = input.purchase_cost;
    if (input.status !== undefined) updateData.status = input.status;

    const { data, error } = await supabase
      .from('rolls')
      .update(updateData)
      .eq('id', input.id)
      .select()
      .single();

    if (error) {
      return {
        success: false,
        error: error.message || 'Failed to update roll',
      };
    }

    return {
      success: true,
      data,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error occurred';
    return {
      success: false,
      error: message,
    };
  }
}

export async function getRolls(): Promise<GetRollsResponse> {
  try {
    const { data: rolls, error } = await supabase
      .from('rolls')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return {
        success: false,
        error: error.message || 'Failed to fetch rolls',
      };
    }

    if (!rolls || rolls.length === 0) {
      return {
        success: true,
        data: [],
      };
    }

    // Calculate remaining_meter dynamically for each roll
    const rollsWithCalculatedMeter = await Promise.all(
      rolls.map(async (roll) => {
        // Get sum of meter_used from approved job_entries for this roll
        const { data: entries, error: entriesError } = await supabase
          .from('job_entries')
          .select('meter_used, waste_meter')
          .eq('roll_id', roll.id)
          .eq('status', 'Approved');

        if (entriesError) {
          console.error(`Error fetching entries for roll ${roll.id}:`, entriesError);
          // Return roll with DB stored remaining_meter on error
          return roll;
        }

        // Calculate total used meter (meter_used + waste_meter)
        const totalUsedMeter = (entries || []).reduce(
          (sum, entry) => sum + (entry.meter_used || 0) + (entry.waste_meter || 0),
          0
        );

        // Compute remaining_meter = total_meter - used_meter
        const calculatedRemainingMeter = roll.total_meter - totalUsedMeter;

        // Return roll with dynamically calculated remaining_meter
        return {
          ...roll,
          remaining_meter: calculatedRemainingMeter,
        };
      })
    );

    return {
      success: true,
      data: rollsWithCalculatedMeter,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error occurred';
    return {
      success: false,
      error: message,
    };
  }
}

export interface RollConsumptionStats {
  total_meter: number;
  total_used: number;
  total_waste: number;
  remaining: number;
}

export interface RollConsumptionStatsResponse {
  success: boolean;
  data?: RollConsumptionStats;
  error?: string;
}

export interface RollUsageHistoryItem {
  job_number: string;
  meter_used: number;
  waste_meter: number;
  created_at: string;
}

export interface RollUsageHistoryResponse {
  success: boolean;
  data?: RollUsageHistoryItem[];
  error?: string;
}

export async function getRollConsumptionStats(rollId: string): Promise<RollConsumptionStatsResponse> {
  try {
    const { data: roll, error: rollError } = await supabase
      .from('rolls')
      .select('total_meter')
      .eq('id', rollId)
      .maybeSingle();

    if (rollError) {
      return {
        success: false,
        error: rollError.message || 'Failed to fetch roll',
      };
    }

    if (!roll) {
      return {
        success: false,
        error: 'Roll not found',
      };
    }

    const { data: entries, error: entriesError } = await supabase
      .from('job_entries')
      .select('meter_used, waste_meter')
      .eq('roll_id', rollId);

    if (entriesError) {
      return {
        success: false,
        error: entriesError.message || 'Failed to fetch job entries',
      };
    }

    const total_used = (entries || []).reduce(
      (sum, entry) => sum + (entry.meter_used || 0),
      0
    );

    const total_waste = (entries || []).reduce(
      (sum, entry) => sum + (entry.waste_meter || 0),
      0
    );

    const remaining = roll.total_meter - total_used - total_waste;

    const stats: RollConsumptionStats = {
      total_meter: roll.total_meter,
      total_used,
      total_waste,
      remaining,
    };

    return {
      success: true,
      data: stats,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error occurred';
    return {
      success: false,
      error: message,
    };
  }
}

export async function getRollUsageHistory(rollId: string): Promise<RollUsageHistoryResponse> {
  try {
    const { data, error } = await supabase
      .from('job_entries')
      .select(`
        meter_used,
        waste_meter,
        created_at,
        jobs(job_number)
      `)
      .eq('roll_id', rollId)
      .order('created_at', { ascending: false });

    if (error) {
      return {
        success: false,
        error: error.message || 'Failed to fetch roll usage history',
      };
    }

    if (!data || data.length === 0) {
      return {
        success: true,
        data: [],
      };
    }

    const usageHistory: RollUsageHistoryItem[] = data.map((entry) => ({
      job_number: (entry.jobs as { job_number: string } | null)?.job_number || 'N/A',
      meter_used: entry.meter_used,
      waste_meter: entry.waste_meter,
      created_at: entry.created_at,
    }));

    return {
      success: true,
      data: usageHistory,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error occurred';
    return {
      success: false,
      error: message,
    };
  }
}
