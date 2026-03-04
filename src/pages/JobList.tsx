import { useState, useEffect } from 'react';
import { Briefcase, Loader2, Lock, Unlock, Trash2, CreditCard as Edit } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getJobs, updateJob, toggleJobLock, deleteJob } from '../services/jobService';
import type { Database } from '../lib/database.types';

type Job = Database['public']['Tables']['jobs']['Row'];
type JobStatus = Database['public']['Tables']['jobs']['Row']['status'];

interface ToastState {
  show: boolean;
  type: 'success' | 'error';
  message: string;
}

interface JobListProps {
  onNavigateToUpdateJob?: (jobId: string) => void;
}

export default function JobList({ onNavigateToUpdateJob }: JobListProps) {
  const { profile } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState>({ show: false, type: 'success', message: '' });
  const [updatingJobId, setUpdatingJobId] = useState<string | null>(null);

  useEffect(() => {
    loadJobs();
  }, []);

  const loadJobs = async () => {
    setLoading(true);
    setError(null);

    const result = await getJobs();

    if (result.success && result.data) {
      setJobs(result.data);
    } else {
      setError(result.error || 'Failed to load jobs');
    }

    setLoading(false);
  };

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ show: true, type, message });
    setTimeout(() => setToast({ show: false, type, message: '' }), 4000);
  };

  const handleStatusChange = async (jobId: string, newStatus: JobStatus) => {
    if (profile?.role !== 'admin') {
      showToast('error', 'Only admins can change job status');
      return;
    }

    setUpdatingJobId(jobId);
    const result = await updateJob(jobId, { status: newStatus });

    if (result.success) {
      showToast('success', 'Job status updated');
      loadJobs();
    } else {
      showToast('error', result.error || 'Failed to update status');
    }

    setUpdatingJobId(null);
  };

  const handleToggleLock = async (jobId: string, currentLockState: boolean) => {
    if (profile?.role !== 'admin') {
      showToast('error', 'Only admins can lock/unlock jobs');
      return;
    }

    setUpdatingJobId(jobId);
    const result = await toggleJobLock(jobId, !currentLockState);

    if (result.success) {
      showToast('success', currentLockState ? 'Job unlocked' : 'Job locked');
      loadJobs();
    } else {
      showToast('error', result.error || 'Failed to toggle lock');
    }

    setUpdatingJobId(null);
  };

  const handleDeleteJob = async (jobId: string, jobNumber: string) => {
    if (profile?.role !== 'admin') {
      showToast('error', 'Only admins can delete jobs');
      return;
    }

    if (!confirm(`Are you sure you want to delete job ${jobNumber}?`)) {
      return;
    }

    setUpdatingJobId(jobId);
    const result = await deleteJob(jobId);

    if (result.success) {
      showToast('success', 'Job deleted successfully');
      loadJobs();
    } else {
      showToast('error', result.error || 'Failed to delete job');
    }

    setUpdatingJobId(null);
  };

  const getStatusBadge = (status: JobStatus) => {
    const badges = {
      'Open': 'px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 border border-blue-200',
      'In Progress': 'px-3 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-700 border border-orange-200',
      'Closed': 'px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700 border border-green-200',
    };
    return <span className={badges[status]}>{status}</span>;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
            <Briefcase className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Job Management</h2>
            <p className="text-slate-500 mt-1">View and manage all jobs</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-12 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
            <p className="text-slate-600 font-medium">Loading jobs...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
            <Briefcase className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Job Management</h2>
            <p className="text-slate-500 mt-1">View and manage all jobs</p>
          </div>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 font-medium">Error</p>
          <p className="text-red-700 text-sm mt-1">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
            <Briefcase className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Job Management</h2>
            <p className="text-slate-500 mt-1">View and manage all jobs</p>
          </div>
        </div>

        <div className="text-right">
          <p className="text-sm text-slate-500">Total Jobs</p>
          <p className="text-2xl font-bold text-slate-800">{jobs.length}</p>
        </div>
      </div>

      {jobs.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Briefcase className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-800 mb-2">No Jobs Found</h3>
          <p className="text-slate-500">Start by creating your first job.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Job Number
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Client
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Roll
                  </th>
                  <th className="text-center px-6 py-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="text-right px-6 py-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Final Cost
                  </th>
                  <th className="text-center px-6 py-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Lock Status
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Created At
                  </th>
                  {(profile?.role === 'admin' || profile?.role === 'manager') && (
                    <th className="text-center px-6 py-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {jobs.map((job) => (
                  <tr key={job.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-semibold text-slate-800">{job.job_number}</p>
                      {job.description && (
                        <p className="text-xs text-slate-500 mt-1">{job.description}</p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-slate-800">{job.client_name}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-slate-600 text-sm">
                        {job.selected_roll_id ? 'Assigned' : 'Not assigned'}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {profile?.role === 'admin' && !job.is_locked ? (
                        <select
                          value={job.status}
                          onChange={(e) => handleStatusChange(job.id, e.target.value as JobStatus)}
                          disabled={updatingJobId === job.id}
                          className="px-3 py-1 rounded-full text-xs font-semibold border focus:ring-2 focus:ring-blue-500 outline-none"
                        >
                          <option value="Open">Open</option>
                          <option value="In Progress">In Progress</option>
                          <option value="Closed">Closed</option>
                        </select>
                      ) : (
                        getStatusBadge(job.status)
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <p className="font-medium text-slate-800">{job.final_cost.toFixed(2)}</p>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {job.is_locked ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700 border border-red-200">
                          <Lock className="w-3 h-3" />
                          Locked
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700 border border-green-200">
                          <Unlock className="w-3 h-3" />
                          Unlocked
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-slate-600">
                        {new Date(job.created_at).toLocaleDateString()} {new Date(job.created_at).toLocaleTimeString()}
                      </p>
                    </td>
                    {(profile?.role === 'admin' || profile?.role === 'manager') && (
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          {!job.is_locked && (
                            <button
                              onClick={() => {
                                if (onNavigateToUpdateJob) {
                                  onNavigateToUpdateJob(job.id);
                                }
                              }}
                              disabled={updatingJobId === job.id}
                              className="p-2 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
                              title="Edit job"
                            >
                              <Edit className="w-4 h-4 text-blue-600" />
                            </button>
                          )}
                          {profile?.role === 'admin' && (
                            <>
                              <button
                                onClick={() => handleToggleLock(job.id, job.is_locked)}
                                disabled={updatingJobId === job.id}
                                className="p-2 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
                                title={job.is_locked ? 'Unlock job' : 'Lock job'}
                              >
                                {job.is_locked ? (
                                  <Unlock className="w-4 h-4 text-slate-600" />
                                ) : (
                                  <Lock className="w-4 h-4 text-slate-600" />
                                )}
                              </button>
                              {!job.is_locked && (
                                <button
                                  onClick={() => handleDeleteJob(job.id, job.job_number)}
                                  disabled={updatingJobId === job.id}
                                  className="p-2 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                                  title="Delete job"
                                >
                                  <Trash2 className="w-4 h-4 text-red-600" />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {toast.show && (
        <div className={`fixed bottom-6 right-6 rounded-lg shadow-lg p-4 text-white animate-fade-in ${
          toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
        }`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}
