import { supabase } from '../lib/supabase';
import { Database } from '../lib/database.types';
import { logAction } from './auditService';
import { getSetting } from './settingsService';

type JobEntry = Database['public']['Tables']['job_entries']['Row'];
type JobEntryInsert = Database['public']['Tables']['job_entries']['Insert'];

export interface CreateJobEntryInput {
  job_id: string;
  roll_id: string | null;
  meter_used: number;
  waste_meter: number;
  custom_roll_size?: string;
}

export interface JobEntryResponse {
  success: boolean;
  data?: JobEntry;
  error?: string;
}

export interface JobEntriesResponse {
  success: boolean;
  data?: JobEntry[];
  error?: string;
}

export interface JobEntryWithDetails extends JobEntry {
  jobs?: {
    job_number: string;
    client_name: string;
    is_locked: boolean;
  } | null;
  rolls?: {
    roll_number: string;
    size: string | null;
    type: string | null;
  } | null;
  profiles?: {
    full_name: string | null;
  } | null;
}


export async function createJobEntry(input: CreateJobEntryInput): Promise<JobEntryResponse> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return {
        success: false,
        error: 'User not authenticated',
      };
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    if (!profile) {
      return {
        success: false,
        error: 'User profile not found',
      };
    }

    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('is_locked')
      .eq('id', input.job_id)
      .maybeSingle();

    if (jobError) {
      return {
        success: false,
        error: 'Failed to verify job status',
      };
    }

    if (!job) {
      return {
        success: false,
        error: 'Job not found',
      };
    }

    if (job.is_locked) {
      return {
        success: false,
        error: 'Job is locked',
      };
    }

    const { data: settings } = await supabase
      .from('settings')
      .select('approval_required')
      .maybeSingle();

    const approvalRequired = settings?.approval_required ?? false;

    const isDifferentSize = input.roll_id === null;

    const entryData: JobEntryInsert = {
      job_id: input.job_id,
      roll_id: input.roll_id || null,
      custom_roll_size: input.custom_roll_size || null,
      user_id: user.id,
      role: profile.role,
      meter_used: input.meter_used,
      waste_meter: input.waste_meter,
      material_cost: isDifferentSize ? 0 : undefined,
      waste_cost: isDifferentSize ? 0 : undefined,
      status: approvalRequired ? 'Pending' : 'Approved',
    };
console.log("FINAL INSERT PAYLOAD:", entryData);

    const { data, error } = await supabase
      .from('job_entries')
      .insert([entryData])
      .select()
      .single();

    if (error) {
      return {
        success: false,
        error: error.message || 'Failed to create job entry',
      };
    }

    // Log audit trail (non-blocking)
    try {
      await logAction('ENTRY_CREATED', 'job_entry', data.id);
    } catch (auditError) {
      console.error('Failed to log audit trail:', auditError);
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

export async function getJobEntries(jobId?: string): Promise<JobEntriesResponse> {
  try {
    let query = supabase
      .from('job_entries')
      .select(`
        *,
        jobs:job_id (
          job_number,
          client_name,
          is_locked
        ),
        rolls:roll_id (
          roll_number,
          size,
          type
        ),
        profiles!job_entries_user_id_fkey (
  full_name
        )
      `)
      .order('created_at', { ascending: false });

    if (jobId) {
      query = query.eq('job_id', jobId);
    }

    const { data, error } = await query;

    if (error) {
      return {
        success: false,
        error: error.message || 'Failed to fetch job entries',
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

export async function getJobEntryById(entryId: string): Promise<JobEntryResponse> {
  try {
    const { data, error } = await supabase
      .from('job_entries')
      .select('*')
      .eq('id', entryId)
      .maybeSingle();

    if (error) {
      return {
        success: false,
        error: error.message || 'Failed to fetch job entry',
      };
    }

    if (!data) {
      return {
        success: false,
        error: 'Job entry not found',
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

export async function deleteJobEntry(entryId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return {
        success: false,
        error: 'User not authenticated',
      };
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    if (!profile || profile.role !== 'admin') {
      return {
        success: false,
        error: 'Only admins can delete entries',
      };
    }

    const { data: entry, error: entryError } = await supabase
      .from('job_entries')
      .select('job_id')
      .eq('id', entryId)
      .maybeSingle();

    if (entryError || !entry) {
      return {
        success: false,
        error: 'Entry not found',
      };
    }

    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('is_locked')
      .eq('id', entry.job_id)
      .maybeSingle();

    if (jobError || !job) {
      return {
        success: false,
        error: 'Failed to verify job status',
      };
    }

    if (job.is_locked) {
      return {
        success: false,
        error: 'Job is locked',
      };
    }

    const { error } = await supabase
      .from('job_entries')
      .delete()
      .eq('id', entryId);

    if (error) {
      return {
        success: false,
        error: error.message || 'Failed to delete job entry',
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

export async function approveEntry(entryId: string): Promise<JobEntryResponse> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return {
        success: false,
        error: 'Unauthorized',
      };
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    if (!profile) {
      return {
        success: false,
        error: 'User profile not found',
      };
    }

    const approvalRolesSetting = await getSetting('approval_roles');
    const allowedRoles = approvalRolesSetting
      ? approvalRolesSetting.split(',').map(role => role.trim())
      : ['admin', 'manager'];

    if (!allowedRoles.includes(profile.role)) {
      return {
        success: false,
        error: 'Permission denied',
      };
    }

    const { data: currentEntry, error: fetchError } = await supabase
      .from('job_entries')
      .select('status')
      .eq('id', entryId)
      .single();

    if (fetchError || !currentEntry) {
      return {
        success: false,
        error: 'Entry not found',
      };
    }

    if (currentEntry.status !== 'Pending') {
      return {
        success: false,
        error: 'Only Pending entries can be approved or rejected',
      };
    }

    const { data, error } = await supabase
      .from('job_entries')
      .update({ status: 'Approved' })
      .eq('id', entryId)
      .select()
      .single();

    if (error) {
      return {
        success: false,
        error: error.message || 'Failed to approve entry',
      };
    }

    const { error: rpcError } = await supabase.rpc('apply_entry_financial_impact', {
      p_entry_id: entryId,
    });

    if (rpcError) {
      throw new Error(rpcError.message || 'Failed to apply financial impact');
    }

    // Log audit trail (non-blocking)
    try {
      await logAction('ENTRY_APPROVED', 'job_entry', entryId);
    } catch (auditError) {
      console.error('Failed to log audit trail:', auditError);
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

export async function rejectEntry(entryId: string): Promise<JobEntryResponse> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return {
        success: false,
        error: 'Unauthorized',
      };
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    if (!profile) {
      return {
        success: false,
        error: 'User profile not found',
      };
    }

    const approvalRolesSetting = await getSetting('approval_roles');
    const allowedRoles = approvalRolesSetting
      ? approvalRolesSetting.split(',').map(role => role.trim())
      : ['admin', 'manager'];

    if (!allowedRoles.includes(profile.role)) {
      return {
        success: false,
        error: 'Permission denied',
      };
    }

    const { data: currentEntry, error: fetchError } = await supabase
      .from('job_entries')
      .select('status')
      .eq('id', entryId)
      .single();

    if (fetchError || !currentEntry) {
      return {
        success: false,
        error: 'Entry not found',
      };
    }

    if (currentEntry.status !== 'Pending') {
      return {
        success: false,
        error: 'Only Pending entries can be approved or rejected',
      };
    }

    const { data, error } = await supabase
      .from('job_entries')
      .update({ status: 'Rejected' })
      .eq('id', entryId)
      .select()
      .single();

    if (error) {
      return {
        success: false,
        error: error.message || 'Failed to reject entry',
      };
    }

    // Log audit trail (non-blocking)
    try {
      await logAction('ENTRY_REJECTED', 'job_entry', entryId);
    } catch (auditError) {
      console.error('Failed to log audit trail:', auditError);
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

export async function updateEntryStatus(
  entryId: string,
  newStatus: 'Pending' | 'Approved' | 'Rejected'
): Promise<JobEntryResponse> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return {
        success: false,
        error: 'Unauthorized',
      };
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    if (!profile) {
      return {
        success: false,
        error: 'User profile not found',
      };
    }

    const approvalRolesSetting = await getSetting('approval_roles');
    const allowedRoles = approvalRolesSetting
      ? approvalRolesSetting.split(',').map(role => role.trim())
      : ['admin', 'manager'];

    if (!allowedRoles.includes(profile.role)) {
      return {
        success: false,
        error: 'Permission denied',
      };
    }

    const { data: currentEntry, error: fetchError } = await supabase
      .from('job_entries')
      .select('status, job_id')
      .eq('id', entryId)
      .single();

    if (fetchError || !currentEntry) {
      return {
        success: false,
        error: 'Entry not found',
      };
    }

    const { data: job } = await supabase
      .from('jobs')
      .select('is_locked')
      .eq('id', currentEntry.job_id)
      .maybeSingle();

    if (job?.is_locked) {
      return {
        success: false,
        error: 'Cannot change status - job is locked',
      };
    }

    const oldStatus = currentEntry.status;

    if (oldStatus === newStatus) {
      return {
        success: false,
        error: 'Status is already set to this value',
      };
    }

    const { data, error } = await supabase
      .from('job_entries')
      .update({ status: newStatus })
      .eq('id', entryId)
      .select()
      .maybeSingle();

    if (error) {
      return {
        success: false,
        error: error.message || 'Failed to update status',
      };
    }

    if (oldStatus === 'Pending' && newStatus === 'Approved') {
      const { error: rpcError } = await supabase.rpc('apply_entry_financial_impact', {
        p_entry_id: entryId,
      });

      if (rpcError) {
        return {
          success: false,
          error: rpcError.message || 'Failed to apply financial impact',
        };
      }

      try {
        await logAction('ENTRY_APPROVED', 'job_entry', entryId);
      } catch (auditError) {
        console.error('Failed to log audit trail:', auditError);
      }
    } else if (oldStatus === 'Pending' && newStatus === 'Rejected') {
      try {
        await logAction('ENTRY_REJECTED', 'job_entry', entryId);
      } catch (auditError) {
        console.error('Failed to log audit trail:', auditError);
      }
    } else {
      try {
        await logAction('ENTRY_STATUS_CHANGED', 'job_entry', entryId, {
          from: oldStatus,
          to: newStatus,
        });
      } catch (auditError) {
        console.error('Failed to log audit trail:', auditError);
      }
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
