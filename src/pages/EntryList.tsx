import { useState, useEffect, useRef } from 'react';
import { FileText, Loader2, Trash2, Filter } from 'lucide-react';
import * as XLSX from 'xlsx';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
  getJobEntries,
  deleteJobEntry,
  updateEntryStatus,
  JobEntryWithDetails,
} from '../services/jobEntryService';

interface ToastState {
  show: boolean;
  type: 'success' | 'error';
  message: string;
}

export default function EntryList() {
  const { profile } = useAuth();
  const [entries, setEntries] = useState<JobEntryWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState>({
    show: false,
    type: 'success',
    message: '',
  });
  const [deletingEntryId, setDeletingEntryId] = useState<string | null>(null);
  const [updatingEntryId, setUpdatingEntryId] = useState<string | null>(null);
  const [filterRole, setFilterRole] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const topScrollRef = useRef<HTMLDivElement | null>(null);
  const tableScrollRef = useRef<HTMLDivElement | null>(null);
  const topInnerRef = useRef<HTMLDivElement | null>(null);

  const [totalMaterialUsage, setTotalMaterialUsage] = useState(0);
  const [totalMeterToday, setTotalMeterToday] = useState(0);
  const [totalWasteToday, setTotalWasteToday] = useState(0);

  useEffect(() => {
    loadEntries();
  }, []);

  const loadEntries = async () => {
    setLoading(true);
    setError(null);

    const result = await getJobEntries();

    if (result.success && result.data) {
      setEntries(result.data as JobEntryWithDetails[]);
    } else {
      setError(result.error || 'Failed to load entries');
    }

    setLoading(false);
  };

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ show: true, type, message });
    setTimeout(() => setToast({ show: false, type, message: '' }), 4000);
  };

  const handleDeleteEntry = async (entryId: string) => {
    if (profile?.role !== 'admin') {
      showToast('error', 'Only admins can delete entries');
      return;
    }

    if (!confirm('Are you sure you want to delete this entry?')) {
      return;
    }

    setDeletingEntryId(entryId);
    const result = await deleteJobEntry(entryId);

    if (result.success) {
      showToast('success', 'Entry deleted successfully');
      loadEntries();
    } else {
      showToast('error', result.error || 'Failed to delete entry');
    }

    setDeletingEntryId(null);
  };

  const handleStatusChange = async (
    entryId: string,
    newStatus: 'Pending' | 'Approved' | 'Rejected'
  ) => {
    if (profile?.role !== 'admin') {
      showToast('error', 'Only admins can change entry status');
      return;
    }

    setUpdatingEntryId(entryId);
    const result = await updateEntryStatus(entryId, newStatus);

    if (result.success) {
      showToast('success', `Entry status updated to ${newStatus}`);
      loadEntries();
    } else {
      showToast('error', result.error || 'Failed to update status');
    }

    setUpdatingEntryId(null);
  };

  const castStatus = (v: string) => v as 'Pending' | 'Approved' | 'Rejected';

  const getRoleBadge = (role: string) => {
    const badges: Record<string, string> = {
      admin:
        'px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700 border border-red-200',
      manager:
        'px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 border border-blue-200',
      machineman:
        'px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700 border border-green-200',
      printer_operator:
        'px-3 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-700 border border-yellow-200',
      laminator:
        'px-3 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-700 border border-orange-200',
    };
    return (
      <span className={badges[role] || badges.admin}>
        {role.replace('_', ' ')}
      </span>
    );
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, string> = {
      Pending:
        'px-3 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-700 border border-yellow-200',
      Approved:
        'px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700 border border-green-200',
      Rejected:
        'px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700 border border-red-200',
    };
    return <span className={badges[status] || badges.Approved}>{status}</span>;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const filteredEntries =
    filterRole === 'all'
      ? entries
      : entries.filter((entry) => entry.role === filterRole);

  const displayedEntries = filteredEntries.filter((item) =>
    JSON.stringify(item).toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Export displayed entries to Excel
  const handleExportExcel = () => {
    try {
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      const filename = `entries-export-${yyyy}-${mm}-${dd}.xlsx`;

      const rows = displayedEntries.map((e) => ({
        Job: e.jobs?.job_number ?? '',
        Roll: e.custom_roll_size ? `Custom: ${e.custom_roll_size}` : e.rolls?.roll_number ?? '',
        User: e.profiles?.full_name ?? '',
        'Meter Used': typeof e.meter_used === 'number' ? e.meter_used : (e.meter_used ?? ''),
        Waste: typeof e.waste_meter === 'number' ? e.waste_meter : (e.waste_meter ?? ''),
        'Material Cost': typeof e.material_cost === 'number' ? e.material_cost : (e.material_cost ?? ''),
        'Waste Cost': typeof e.waste_cost === 'number' ? e.waste_cost : (e.waste_cost ?? ''),
        Status: e.status ?? '',
        'Created At': e.created_at ? new Date(e.created_at).toLocaleDateString() : '',
      }));

      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Entries');
      XLSX.writeFile(wb, filename);
    } catch (err) {
      // ignore errors for now
    }
  };

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
  }, [loading, entries]);

  const totalMaterialCost = filteredEntries.reduce(
    (sum, entry) => sum + entry.material_cost,
    0
  );
  const totalWasteCost = filteredEntries.reduce(
    (sum, entry) => sum + entry.waste_cost,
    0
  );
  const totalCost = totalMaterialCost + totalWasteCost;

  useEffect(() => {
    loadRollStats();
  }, []);

  const loadRollStats = async () => {
    const today = new Date().toISOString().split('T')[0];

    const { data } = await supabase
      .from('job_entries')
      .select('created_at, meter_used, waste_meter, material_cost');

    let materialSum = 0;
    let meterToday = 0;
    let wasteToday = 0;

    if (data) {
      data.forEach((e: any) => {
        materialSum += e.material_cost || 0;
        const entryDate = new Date(e.created_at).toISOString().split('T')[0];
        if (entryDate === today) {
          meterToday += e.meter_used || 0;
          wasteToday += e.waste_meter || 0;
        }
      });
    }

    setTotalMaterialUsage(materialSum);
    setTotalMeterToday(meterToday);
    setTotalWasteToday(wasteToday);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
            <FileText className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-800">
              Production Entries
            </h2>
            <p className="text-slate-500 mt-1">View all production entries</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-12 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-8 h-8 text-green-600 animate-spin mx-auto mb-3" />
            <p className="text-slate-600 font-medium">Loading entries...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
            <FileText className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-800">
              Production Entries
            </h2>
            <p className="text-slate-500 mt-1">View all production entries</p>
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
          <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
            <FileText className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-800">
              Production Entries
            </h2>
            <p className="text-slate-500 mt-1">View all production entries</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-500" />
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none"
            >
              <option value="all">All Roles</option>
              <option value="admin">Admin</option>
              <option value="manager">Manager</option>
              <option value="machineman">Machine Man</option>
              <option value="printer_operator">Printer Operator</option>
              <option value="laminator">Laminator</option>
            </select>
          </div>
          <div className="text-right">
            <p className="text-sm text-slate-500">Total Entries</p>
            <p className="text-2xl font-bold text-slate-800">
              {filteredEntries.length}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div
          className="bg-white rounded-xl p-6 border border-slate-200"
          style={{ backgroundColor: '#eff6ff' }}
        >
          <p className="text-sm font-medium text-slate-500">
            Total Material Usage
          </p>
          <p className="text-2xl font-bold text-blue-600 mt-2">
            {totalMaterialUsage.toFixed(2)}
          </p>
        </div>
        <div
          className="bg-white rounded-xl p-6 border border-slate-200"
          style={{ backgroundColor: '#f0fdf4' }}
        >
          <p className="text-sm font-medium text-slate-500">
            Total Meter Used Today
          </p>
          <p className="text-2xl font-bold text-green-600 mt-2">
            {totalMeterToday.toFixed(2)} m
          </p>
        </div>
        <div
          className="bg-white rounded-xl p-6 border border-slate-200"
          style={{ backgroundColor: '#ffebed' }}
        >
          <p className="text-sm font-medium text-slate-500">
            Total Waste Today
          </p>
          <p className="text-2xl font-bold text-red-600 mt-2">
            {totalWasteToday.toFixed(2)} m
          </p>
        </div>
      </div>

      {filteredEntries.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-800 mb-2">
            No Entries Found
          </h3>
          <p className="text-slate-500">
            Start by creating your first production entry.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
  <div className="px-6 py-4 flex items-center justify-between">
    <div className="flex items-center gap-3 w-full">
      <input
        type="text"
        placeholder="Search..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="w-full md:w-1/3 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none"
      />

      <div className="flex items-center gap-2">
        <button
          onClick={handleExportExcel}
          type="button"
          className="inline-flex items-center gap-2 px-3 py-2 bg-white border rounded-md shadow-sm hover:bg-slate-50 text-sm"
          aria-label="Export Excel"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v12m0 0l3-3m-3 3l-3-3M21 8v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h11" />
          </svg>
          <span>Export Excel</span>
        </button>
      </div>
    </div>
  </div>

  <div className="px-6">

    {/* Top Scrollbar */}
    <div
      ref={topScrollRef}
      className="overflow-x-auto overflow-y-hidden sticky top-0 z-20 bg-white"
      style={{ height: 12 }}
    >
      <div ref={topInnerRef} className="h-[1px]" />
    </div>

    {/* Table Scroll */}
    <div ref={tableScrollRef} className="overflow-x-auto">
      <table className="min-w-[1200px] w-full">

        <thead className="bg-slate-50 border-b border-slate-200">
          <tr>
            <th className="text-left px-6 py-4 text-xs font-semibold text-slate-600 uppercase tracking-wider sticky left-0 bg-white z-20 shadow-sm">
              Job
            </th>

            <th className="text-left px-6 py-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">
              Roll
            </th>

            <th className="text-left px-6 py-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">
              User
            </th>

            <th className="text-right px-6 py-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">
              Meter Used
            </th>

            <th className="text-right px-6 py-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">
              Waste
            </th>

            <th className="text-right px-6 py-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">
              Material Cost
            </th>

            <th className="text-right px-6 py-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">
              Waste Cost
            </th>

            <th className="text-center px-6 py-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">
              Status
            </th>

            <th className="text-left px-6 py-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">
              Created At
            </th>

            {profile?.role === 'admin' && (
              <th className="text-center px-6 py-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Actions
              </th>
            )}
          </tr>
        </thead>

        <tbody className="divide-y divide-slate-200">
          {displayedEntries.map((entry) => (
            <tr
              key={entry.id}
              className={
                entry.jobs?.is_locked
                  ? 'transition-colors bg-red-50 hover:bg-red-100'
                  : 'transition-colors hover:bg-slate-50'
              }
            >
              {/* JOB */}
              <td className="px-6 py-4 whitespace-nowrap sticky left-0 bg-white z-10 shadow-sm">
                <div>
                  <p className="font-semibold text-slate-800">
                    {entry.jobs?.job_number || 'N/A'}
                  </p>
                  <p className="text-xs text-slate-500">
                    {entry.jobs?.client_name || ''}
                  </p>
                </div>
              </td>

              {/* ROLL */}
              <td className="px-6 py-4 whitespace-nowrap">
                {entry.rolls?.roll_number || 'N/A'}
              </td>

              {/* USER */}
              <td className="px-6 py-4 whitespace-nowrap">
                {entry.profiles?.full_name || 'Unknown'}
              </td>

              {/* METER */}
              <td className="px-6 py-4 text-right whitespace-nowrap">
                {entry.meter_used.toFixed(2)} m
              </td>

              {/* WASTE */}
              <td className="px-6 py-4 text-right whitespace-nowrap text-red-600">
                {entry.waste_meter.toFixed(2)} m
              </td>

              {/* MATERIAL COST */}
              <td className="px-6 py-4 text-right whitespace-nowrap text-blue-600">
                {entry.material_cost.toFixed(2)}
              </td>

              {/* WASTE COST */}
              <td className="px-6 py-4 text-right whitespace-nowrap text-red-600">
                {entry.waste_cost.toFixed(2)}
              </td>

              {/* STATUS */}
              <td className="px-6 py-4 text-center whitespace-nowrap">
                {entry.status}
              </td>

              {/* DATE */}
              <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                {formatDate(entry.created_at)}
              </td>

              {/* ACTION */}
              {profile?.role === 'admin' && (
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  <button
                    onClick={() => handleDeleteEntry(entry.id)}
                    className="p-2 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </button>
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
          className={
            'fixed bottom-6 right-6 rounded-lg shadow-lg p-4 text-white animate-fade-in ' +
            (toast.type === 'success' ? 'bg-green-600' : 'bg-red-600')
          }
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}
