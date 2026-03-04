import { supabase } from '../lib/supabase';
import { Database } from '../lib/database.types';

type Job = Database['public']['Tables']['jobs']['Row'];
type JobInsert = Database['public']['Tables']['jobs']['Insert'];
type JobUpdate = Database['public']['Tables']['jobs']['Update'];
type JobStatus = Database['public']['Tables']['jobs']['Row']['status'];

export interface CreateJobInput {
  client_name: string;
  description?: string;
  selected_roll_id?: string;
  total_material_cost?: number;
  total_waste_cost?: number;
  labor_cost?: number;
  other_cost?: number;
}

export interface UpdateJobInput {
  client_name?: string;
  description?: string;
  selected_roll_id?: string;
  status?: JobStatus;
  total_material_cost?: number;
  total_waste_cost?: number;
  labor_cost?: number;
  other_cost?: number;
  is_locked?: boolean;
}

export interface JobResponse {
  success: boolean;
  data?: Job;
  error?: string;
}

export interface JobsResponse {
  success: boolean;
  data?: Job[];
  error?: string;
}

export async function createJob(input: CreateJobInput): Promise<JobResponse> {
  try {
    const jobData: JobInsert = {
      client_name: input.client_name,
      description: input.description || null,
      selected_roll_id: input.selected_roll_id || null,
      total_material_cost: input.total_material_cost || 0,
      total_waste_cost: input.total_waste_cost || 0,
      labor_cost: input.labor_cost || 0,
      other_cost: input.other_cost || 0,
      status: 'Open',
    };

    const { data, error } = await supabase
      .from('jobs')
      .insert([jobData])
      .select()
      .single();

    if (error) {
      return {
        success: false,
        error: error.message || 'Failed to create job',
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

export async function getJobs(): Promise<JobsResponse> {
  try {
    const { data, error } = await supabase
      .from('jobs')
      .select(`
        *,
        rolls:selected_roll_id (
          roll_number,
          size,
          type,
          brand
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      return {
        success: false,
        error: error.message || 'Failed to fetch jobs',
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

export async function getJobById(jobId: string): Promise<JobResponse> {
  try {
    const { data, error } = await supabase
      .from('jobs')
      .select(`
        *,
        rolls:selected_roll_id (
          roll_number,
          size,
          type,
          brand
        )
      `)
      .eq('id', jobId)
      .maybeSingle();

    if (error) {
      return {
        success: false,
        error: error.message || 'Failed to fetch job',
      };
    }

    if (!data) {
      return {
        success: false,
        error: 'Job not found',
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

export async function updateJob(jobId: string, input: UpdateJobInput): Promise<JobResponse> {
  try {
    const updateData: JobUpdate = {};

    if (input.client_name !== undefined) updateData.client_name = input.client_name;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.selected_roll_id !== undefined) updateData.selected_roll_id = input.selected_roll_id;
    if (input.status !== undefined) updateData.status = input.status;
    if (input.total_material_cost !== undefined) updateData.total_material_cost = input.total_material_cost;
    if (input.total_waste_cost !== undefined) updateData.total_waste_cost = input.total_waste_cost;
    if (input.labor_cost !== undefined) updateData.labor_cost = input.labor_cost;
    if (input.other_cost !== undefined) updateData.other_cost = input.other_cost;
    if (input.is_locked !== undefined) updateData.is_locked = input.is_locked;

    const { error } = await supabase
      .from('jobs')
      .update(updateData)
      .eq('id', jobId);

    if (error) {
      return {
        success: false,
        error: error.message || 'Failed to update job',
      };
    }

    // Fetch updated row safely
    return await getJobById(jobId);

  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error occurred';
    return {
      success: false,
      error: message,
    };
  }
}

export async function deleteJob(jobId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('jobs')
      .delete()
      .eq('id', jobId);

    if (error) {
      return {
        success: false,
        error: error.message || 'Failed to delete job',
      };
    }

    return {
      success: true,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error occurred';
    return {
      success: false,
      error: message,
    };
  }
}

export async function toggleJobLock(jobId: string, isLocked: boolean): Promise<JobResponse> {
  return updateJob(jobId, { is_locked: isLocked });
}
