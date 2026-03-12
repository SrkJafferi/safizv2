import { useState, useEffect, useRef } from 'react';
import {
  Briefcase,
  Loader2,
  Lock,
  Unlock,
  Trash2,
  CreditCard as Edit,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { useAuth } from '../contexts/AuthContext';
import {
  getJobs,
  updateJob,
  toggleJobLock,
  deleteJob,
} from '../services/jobService';
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
  const [toast, setToast] = useState<ToastState>({
    show: false,
    type: 'success',
    message: '',
  });
  const [updatingJobId, setUpdatingJobId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const topScrollRef = useRef<HTMLDivElement | null>(null);
  const tableScrollRef = useRef<HTMLDivElement | null>(null);
  const topInnerRef = useRef<HTMLDivElement | null>(null);

  const defaultColumns = {
    jobNumber: true,
    client: true,
    roll: true,
    status: true,
    finalCost: true,
    lockStatus: true,
    createdAt: true,
    actions: true,
  } as const;

  const [columns, setColumns] = useState<Record<string, boolean>>(() => {
    try {
      const raw = localStorage.getItem('jobTableColumns');
      if (raw) return JSON.parse(raw);
    } catch (e) {
      // ignore
    }
    return { ...defaultColumns };
  });

  const [showColumns, setShowColumns] = useState(false);

  const dropdownClass = [
    'absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg p-3 max-h-56 overflow-auto transition-transform transform origin-top-right z-50',
    showColumns ? 'scale-100 opacity-100' : 'scale-95 opacity-0 pointer-events-none',
  ].join(' ');

  useEffect(() => {
    try {
      localStorage.setItem('jobTableColumns', JSON.stringify(columns));
    } catch (e) {
      // ignore
    }
  }, [columns]);

  const toggleColumn = (key: keyof typeof defaultColumns) => {
    if (key === 'jobNumber') return; // always visible
    setColumns((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Export displayedJobs to Excel respecting visible columns
  const handleExportExcel = () => {
    try {
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      const filename = `jobs-export-${yyyy}-${mm}-${dd}.xlsx`;

      const rows = displayedJobs.map((j) => {
        const r: Record<string, any> = {};
        r['Job Number'] = j.job_number;
        if (columns.client) r['Client'] = j.client_name ?? '';
        if (columns.roll)
          r['Roll'] = j.selected_roll_id ? 'Assigned' : 'Not assigned';
        if (columns.status) r['Status'] = j.status ?? '';
        if (columns.finalCost)
          r['Final Cost'] =
            typeof j.final_cost === 'number'
              ? j.final_cost
              : j.final_cost ?? '';
        if (columns.lockStatus)
          r['Lock Status'] = j.is_locked ? 'Locked' : 'Unlocked';
        if (columns.createdAt)
          r['Created At'] = j.created_at
            ? new Date(j.created_at).toLocaleDateString()
            : '';
        return r;
      });

      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Jobs');
      XLSX.writeFile(wb, filename);
    } catch (e) {
      // ignore for now
    }
  };

  const [activeJobsToday, setActiveJobsToday] = useState(0);
  const [jobsCompletedToday, setJobsCompletedToday] = useState(0);
  const [totalCompleteJobs, setTotalCompleteJobs] = useState(0);

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

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    let activeToday = 0;
    let completedToday = 0;
    let totalCompleted = 0;

    jobs.forEach((j) => {
      const created = j.created_at
        ? new Date(j.created_at).toISOString().split('T')[0]
        : '';
      if (j.status === 'Closed') {
        totalCompleted += 1;
        if (created === today) completedToday += 1;
      }
      if (j.status === 'Open' || j.status === 'In Progress') {
        if (created === today) activeToday += 1;
      }
    });

    setActiveJobsToday(activeToday);
    setJobsCompletedToday(completedToday);
    setTotalCompleteJobs(totalCompleted);
  }, [jobs]);

  const displayedJobs = jobs.filter((item) =>
    JSON.stringify(item).toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    const top = topScrollRef.current;
    const table = tableScrollRef.current;
    if (!top || !table) return;

    if (topInnerRef.current) {
      try {
        topInnerRef.current.style.width = `${table.scrollWidth}px`;
      } catch (e) {
        // noop
      }
    }

    const onTopScroll = () => {
      if (table) table.scrollLeft = top.scrollLeft;
    };
    const onTableScroll = () => {
      if (top) top.scrollLeft = table.scrollLeft;
    };

    top.addEventListener('scroll', onTopScroll);
    table.addEventListener('scroll', onTableScroll);

    const onResize = () => {
      if (topInnerRef.current) {
        topInnerRef.current.style.width = `${table.scrollWidth}px`;
      }
    };

    window.addEventListener('resize', onResize);

    return () => {
      top.removeEventListener('scroll', onTopScroll);
      table.removeEventListener('scroll', onTableScroll);
      window.removeEventListener('resize', onResize);
    };
  }, [loading, jobs]);

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
      Open: 'px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 border border-blue-200',
      'In Progress':
        'px-3 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-700 border border-orange-200',
      Closed:
        'px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700 border border-green-200',
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
            <h2 className="text-2xl font-bold text-slate-800">
              Job Management
            </h2>
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
            <h2 className="text-2xl font-bold text-slate-800">
              Job Management
            </h2>
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
            <h2 className="text-2xl font-bold text-slate-800">
              Job Management
            </h2>
            <p className="text-slate-500 mt-1">View and manage all jobs</p>
          </div>
        </div>

        <div className="text-right">
          <p className="text-sm text-slate-500">Total Jobs</p>
          <p className="text-2xl font-bold text-slate-800">{jobs.length}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div
          className="bg-white rounded-xl p-6 border border-slate-200"
          style={{ backgroundColor: '#eff6ff' }}
        >
          <p className="text-sm font-medium text-slate-500">
            Active Jobs Today
          </p>
          <p className="text-2xl font-bold text-blue-600 mt-2">
            {activeJobsToday}
          </p>
        </div>
        <div
          className="bg-white rounded-xl p-6 border border-slate-200"
          style={{ backgroundColor: '#f0fdf4' }}
        >
          <p className="text-sm font-medium text-slate-500">
            Jobs Completed Today
          </p>
          <p className="text-2xl font-bold text-green-600 mt-2">
            {jobsCompletedToday}
          </p>
        </div>
        <div
          className="bg-white rounded-xl p-6 border border-slate-200"
          style={{ backgroundColor: '#ffebed' }}
        >
          <p className="text-sm font-medium text-slate-500">
            Total Complete Jobs
          </p>
          <p className="text-2xl font-bold text-red-600 mt-2">
            {totalCompleteJobs}
          </p>
        </div>
      </div>

      {jobs.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Briefcase className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-800 mb-2">
            No Jobs Found
          </h3>
          <p className="text-slate-500">Start by creating your first job.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-visible">
          {/* Search */}
          <div className="px-6 py-4 flex items-center justify-between relative">
            <div className="flex items-center gap-3 w-full">
              <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full md:w-1/3 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />

              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportExcel}
                  type="button"
                  className="inline-flex items-center gap-2 px-3 py-2 bg-white border rounded-md shadow-sm hover:bg-slate-50 text-sm"
                  aria-label="Export Excel"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-4 h-4 text-slate-700"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 3v12m0 0l3-3m-3 3l-3-3M21 8v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h11"
                    />
                  </svg>
                  <span>Export Excel</span>
                </button>

                <div className="relative">
                  <button
                    onClick={() => setShowColumns((s) => !s)}
                    className="inline-flex items-center gap-2 px-3 py-2 bg-white border rounded-md shadow-sm hover:bg-slate-50 text-sm"
                    aria-expanded={showColumns}
                    aria-haspopup="true"
                    type="button"
                  >
                    Columns
                  </button>

                  <div className={dropdownClass} style={{ willChange: 'transform, opacity' }}>
                    <div className="text-sm font-medium mb-2">Show columns</div>
                    {(
                      Object.keys(defaultColumns) as Array<
                        keyof typeof defaultColumns
                      >
                    ).map((key) => (
                      <label key={key} className="flex items-center gap-2 py-1">
                        <input
                          type="checkbox"
                          checked={columns[key]}
                          onChange={() => toggleColumn(key)}
                          disabled={key === 'jobNumber'}
                          className="h-4 w-4"
                        />
                        <span className="text-sm capitalize">
                          {key === 'jobNumber'
                            ? 'Job Number'
                            : key === 'finalCost'
                            ? 'Final Cost'
                            : key === 'lockStatus'
                            ? 'Lock Status'
                            : key === 'createdAt'
                            ? 'Created At'
                            : key.charAt(0).toUpperCase() + key.slice(1)}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="px-6 pb-6">
            {/* Top Scrollbar */}
            <div
              ref={topScrollRef}
              className="overflow-x-auto overflow-y-hidden bg-white"
              style={{ height: 12 }}
            >
              <div ref={topInnerRef} style={{ width: '1px', height: 1 }} />
            </div>

            {/* Table Scroll */}
            <div ref={tableScrollRef} className="overflow-x-auto">
              <table className="min-w-[1200px] w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    {columns.jobNumber && (
                      <th className="sticky left-0 z-10 bg-white text-left px-6 py-4 text-xs font-semibold text-slate-600 uppercase">
                        Job Number
                      </th>
                    )}

                    {columns.client && (
                      <th className="text-left px-6 py-4 text-xs font-semibold text-slate-600 uppercase">
                        Client
                      </th>
                    )}

                    {columns.roll && (
                      <th className="text-left px-6 py-4 text-xs font-semibold text-slate-600 uppercase">
                        Roll
                      </th>
                    )}

                    {columns.status && (
                      <th className="text-center px-6 py-4 text-xs font-semibold text-slate-600 uppercase">
                        Status
                      </th>
                    )}

                    {columns.finalCost && (
                      <th className="text-right px-6 py-4 text-xs font-semibold text-slate-600 uppercase">
                        Final Cost
                      </th>
                    )}

                    {columns.lockStatus && (
                      <th className="text-center px-6 py-4 text-xs font-semibold text-slate-600 uppercase">
                        Lock Status
                      </th>
                    )}

                    {columns.createdAt && (
                      <th className="text-left px-6 py-4 text-xs font-semibold text-slate-600 uppercase">
                        Created At
                      </th>
                    )}

                    {columns.actions &&
                      (profile?.role === 'admin' ||
                        profile?.role === 'manager') && (
                        <th className="text-center px-6 py-4 text-xs font-semibold text-slate-600 uppercase">
                          Actions
                        </th>
                      )}
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-200">
                  {displayedJobs.map((job) => (
                    <tr
                      key={job.id}
                      className="hover:bg-slate-50 transition-colors"
                    >
                      {columns.jobNumber && (
                        <td className="sticky left-0 z-10 bg-white px-6 py-4 whitespace-nowrap">
                          <p className="font-semibold text-slate-800">
                            {job.job_number}
                          </p>
                          {job.description && (
                            <p className="text-xs text-slate-500 mt-1">
                              {job.description}
                            </p>
                          )}
                        </td>
                      )}

                      {columns.client && (
                        <td className="px-6 py-4 whitespace-nowrap">
                          {job.client_name}
                        </td>
                      )}

                      {columns.roll && (
                        <td className="px-6 py-4 whitespace-nowrap">
                          {job.selected_roll_id ? 'Assigned' : 'Not assigned'}
                        </td>
                      )}

                      {columns.status && (
                        <td className="px-6 py-4 text-center whitespace-nowrap">
                          {getStatusBadge(job.status)}
                        </td>
                      )}

                      {columns.finalCost && (
                        <td className="px-6 py-4 text-right whitespace-nowrap">
                          {job.final_cost.toFixed(2)}
                        </td>
                      )}

                      {columns.lockStatus && (
                        <td className="px-6 py-4 text-center whitespace-nowrap">
                          {job.is_locked ? 'Locked' : 'Unlocked'}
                        </td>
                      )}

                      {columns.createdAt && (
                        <td className="px-6 py-4 whitespace-nowrap">
                          {new Date(job.created_at).toLocaleDateString()}
                        </td>
                      )}

                      {columns.actions &&
                        (profile?.role === 'admin' ||
                          profile?.role === 'manager') && (
                          <td className="px-6 py-4 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-2">
                              {!job.is_locked && (
                                <button
                                  onClick={() =>
                                    onNavigateToUpdateJob?.(job.id)
                                  }
                                  className="p-2 hover:bg-blue-50 rounded-lg"
                                >
                                  <Edit className="w-4 h-4 text-blue-600" />
                                </button>
                              )}

                              {profile?.role === 'admin' && (
                                <>
                                  <button
                                    onClick={() =>
                                      handleToggleLock(job.id, job.is_locked)
                                    }
                                    className="p-2 hover:bg-slate-100 rounded-lg"
                                  >
                                    {job.is_locked ? (
                                      <Unlock className="w-4 h-4 text-slate-600" />
                                    ) : (
                                      <Lock className="w-4 h-4 text-slate-600" />
                                    )}
                                  </button>

                                  {!job.is_locked && (
                                    <button
                                      onClick={() =>
                                        handleDeleteJob(job.id, job.job_number)
                                      }
                                      className="p-2 hover:bg-red-50 rounded-lg"
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
        </div>
      )}

      {toast.show && (
        <div
          className={`fixed bottom-6 right-6 rounded-lg shadow-lg p-4 text-white animate-fade-in ${
            toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
          }`}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}
