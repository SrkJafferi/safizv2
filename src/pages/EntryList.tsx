import { useState, useEffect } from 'react';
import { FileText, Loader2, Trash2, Filter } from 'lucide-react';
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

  const totalMaterialCost = filteredEntries.reduce(
    (sum, entry) => sum + entry.material_cost,
    0
  );
  const totalWasteCost = filteredEntries.reduce(
    (sum, entry) => sum + entry.waste_cost,
    0
  );
  const totalCost = totalMaterialCost + totalWasteCost;

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
        <div className="bg-white rounded-xl p-6 border border-slate-200">
          <p className="text-sm font-medium text-slate-500">Material Cost</p>
          <p className="text-2xl font-bold text-blue-600 mt-2">
            {totalMaterialCost.toFixed(2)}
          </p>
        </div>
        <div className="bg-white rounded-xl p-6 border border-slate-200">
          <p className="text-sm font-medium text-slate-500">Waste Cost</p>
          <p className="text-2xl font-bold text-red-600 mt-2">
            {totalWasteCost.toFixed(2)}
          </p>
        </div>
        <div className="bg-white rounded-xl p-6 border border-slate-200">
          <p className="text-sm font-medium text-slate-500">Total Cost</p>
          <p className="text-2xl font-bold text-green-600 mt-2">
            {totalCost.toFixed(2)}
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
          <div className="px-6 py-4">
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full md:w-1/3 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none"
            />
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">
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
                    className={`transition-colors ${
                      entry.jobs?.is_locked
                        ? 'bg-red-50 hover:bg-red-100'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div>
                          <p className="font-semibold text-slate-800">
                            {entry.jobs?.job_number || 'N/A'}
                          </p>
                          <p className="text-xs text-slate-500">
                            {entry.jobs?.client_name || ''}
                          </p>
                        </div>
                        {entry.jobs?.is_locked && (
                          <span className="px-2 py-0.5 rounded text-xs font-semibold bg-red-200 text-red-800">
                            Locked
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {entry.custom_roll_size ? (
                        <>
                          <p className="text-slate-800">Custom Size</p>
                          <p className="text-xs text-slate-500">
                            {entry.custom_roll_size}
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="text-slate-800">
                            {entry.rolls?.roll_number || 'N/A'}
                          </p>
                          <p className="text-xs text-slate-500">
                            {entry.rolls?.size || 'N/A'} -{' '}
                            {entry.rolls?.type || 'N/A'}
                          </p>
                        </>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <p className="text-slate-700">
                        {entry.profiles?.full_name || 'Unknown'}
                      </p>
                    </td>

                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <p className="font-medium text-slate-800">
                        {entry.meter_used.toFixed(2)} m
                      </p>
                    </td>
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <p className="font-medium text-red-600">
                        {entry.waste_meter.toFixed(2)} m
                      </p>
                    </td>
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <p className="font-medium text-blue-600">
                        {entry.material_cost.toFixed(2)}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <p className="font-medium text-red-600">
                        {entry.waste_cost.toFixed(2)}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-center whitespace-nowrap">
                      {profile?.role === 'admin' && !entry.jobs?.is_locked ? (
                        <select
                          value={entry.status}
                          onChange={(e) =>
                            handleStatusChange(
                              entry.id,
                              e.target.value as
                                | 'Pending'
                                | 'Approved'
                                | 'Rejected'
                            )
                          }
                          disabled={updatingEntryId === entry.id}
                          className="px-3 py-1 rounded-full text-xs font-semibold border focus:ring-2 focus:ring-green-500 outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                          style={{
                            backgroundColor:
                              entry.status === 'Pending'
                                ? '#fef3c7'
                                : entry.status === 'Approved'
                                ? '#d1fae5'
                                : '#fee2e2',
                            color:
                              entry.status === 'Pending'
                                ? '#92400e'
                                : entry.status === 'Approved'
                                ? '#065f46'
                                : '#991b1b',
                            borderColor:
                              entry.status === 'Pending'
                                ? '#fcd34d'
                                : entry.status === 'Approved'
                                ? '#6ee7b7'
                                : '#fca5a5',
                          }}
                        >
                          <option value="Pending">Pending</option>
                          <option value="Approved">Approved</option>
                          <option value="Rejected">Rejected</option>
                        </select>
                      ) : (
                        getStatusBadge(entry.status)
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <p className="text-sm text-slate-600">
                        {formatDate(entry.created_at)}
                      </p>
                    </td>
                    {profile?.role === 'admin' && (
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center justify-center flex-wrap">
                          {entry.jobs?.is_locked ? (
                            <button
                              disabled
                              className="p-2 rounded-lg opacity-50 cursor-not-allowed"
                              title="Cannot delete - job is locked"
                            >
                              <Trash2 className="w-4 h-4 text-slate-400" />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleDeleteEntry(entry.id)}
                              disabled={deletingEntryId === entry.id}
                              className="p-2 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                              title="Delete entry"
                            >
                              <Trash2 className="w-4 h-4 text-red-600" />
                            </button>
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
