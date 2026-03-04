import { supabase } from '../lib/supabase';
import { Database } from '../lib/database.types';

type JobEntry = Database['public']['Tables']['job_entries']['Row'];

export interface EntrySummary {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
}

export interface EntrySummaryResponse {
  success: boolean;
  data?: EntrySummary;
  error?: string;
}

export interface MaterialUsageSummary {
  totalApprovedJobs: number;
  totalMeterUsed: number;
  totalWasteMeter: number;
}

export interface MaterialUsageSummaryResponse {
  success: boolean;
  data?: MaterialUsageSummary;
  error?: string;
}

export interface JobWiseUsage {
  jobId: string;
  jobLabel: string;
  totalMeterUsed: number;
  totalWasteMeter: number;
}

export interface JobWiseUsageResponse {
  success: boolean;
  data?: JobWiseUsage[];
  error?: string;
}

export const getEntrySummary = async (
  startDate?: string,
  endDate?: string
): Promise<EntrySummaryResponse> => {
  try {
    let query = supabase
      .from('job_entries')
      .select('*');

    if (startDate) {
      query = query.gte('created_at', startDate);
    }

    if (endDate) {
      query = query.lte('created_at', endDate);
    }

    const { data, error } = await query;

    if (error) {
      return {
        success: false,
        error: error.message || 'Failed to fetch entries',
      };
    }

    const entries = data || [];

    const summary: EntrySummary = {
      total: entries.length,
      pending: entries.filter((entry: JobEntry) => entry.status === 'Pending').length,
      approved: entries.filter((entry: JobEntry) => entry.status === 'Approved').length,
      rejected: entries.filter((entry: JobEntry) => entry.status === 'Rejected').length,
    };

    return {
      success: true,
      data: summary,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error occurred';
    return {
      success: false,
      error: message,
    };
  }
};

export const getMaterialUsageSummary = async (
  startDate?: string,
  endDate?: string
): Promise<MaterialUsageSummaryResponse> => {
  try {
    let query = supabase
      .from('job_entries')
      .select('*')
      .eq('status', 'Approved');

    if (startDate) {
      query = query.gte('created_at', startDate);
    }

    if (endDate) {
      query = query.lte('created_at', endDate);
    }

    const { data, error } = await query;

    if (error) {
      return {
        success: false,
        error: error.message || 'Failed to fetch material usage data',
      };
    }

    const entries = data || [];

    const totalApprovedJobs = entries.length;

    const totalMeterUsed = entries.reduce((sum, entry) => {
      const meterUsed = entry.meter_used || 0;
      return sum + meterUsed;
    }, 0);

    const totalWasteMeter = entries.reduce((sum, entry) => {
      const wasteMeter = entry.waste_meter || 0;
      return sum + wasteMeter;
    }, 0);

    const summary: MaterialUsageSummary = {
      totalApprovedJobs,
      totalMeterUsed,
      totalWasteMeter,
    };

    return {
      success: true,
      data: summary,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error occurred';
    return {
      success: false,
      error: message,
    };
  }
};

export const getJobWiseUsageReport = async (
  startDate?: string,
  endDate?: string
): Promise<JobWiseUsageResponse> => {
  try {
    let query = supabase
      .from('job_entries')
      .select(`
        job_id,
        meter_used,
        waste_meter,
        jobs (
          id,
          job_number,
          description
        )
      `)
      .eq('status', 'Approved');

    if (startDate) {
      query = query.gte('created_at', startDate);
    }

    if (endDate) {
      query = query.lte('created_at', endDate);
    }

    const { data, error } = await query;

    if (error) {
      return {
        success: false,
        error: error.message || 'Failed to fetch job-wise usage data',
      };
    }

    const entries = data || [];

    const groupedByJob = entries.reduce((acc, entry) => {
      const jobId = entry.job_id;
      const meterUsed = entry.meter_used || 0;
      const wasteMeter = entry.waste_meter || 0;

      const job = entry.jobs as { id: string; job_number: string; description: string | null } | null;
      const jobLabel = job?.job_number || job?.description || jobId;

      if (!acc[jobId]) {
        acc[jobId] = {
          jobId: jobId,
          jobLabel: jobLabel,
          totalMeterUsed: 0,
          totalWasteMeter: 0,
        };
      }

      acc[jobId].totalMeterUsed = acc[jobId].totalMeterUsed + meterUsed;
      acc[jobId].totalWasteMeter = acc[jobId].totalWasteMeter + wasteMeter;

      return acc;
    }, {} as Record<string, JobWiseUsage>);

    const result = Object.values(groupedByJob);

    return {
      success: true,
      data: result,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error occurred';
    return {
      success: false,
      error: message,
    };
  }
};
