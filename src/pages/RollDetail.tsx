import { useState, useEffect } from 'react';
import { ArrowLeft, Loader2, Package, TrendingUp, AlertTriangle, Activity } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getRollById, getRollConsumptionStats, getRollUsageHistory, type RollConsumptionStats, type RollUsageHistoryItem } from '../services/rollService';
import type { Database } from '../lib/database.types';

type Roll = Database['public']['Tables']['rolls']['Row'];

interface RollDetailProps {
  rollId: string | null;
  onBack?: () => void;
}

export default function RollDetail({ rollId, onBack }: RollDetailProps) {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [roll, setRoll] = useState<Roll | null>(null);
  const [stats, setStats] = useState<RollConsumptionStats | null>(null);
  const [history, setHistory] = useState<RollUsageHistoryItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!rollId) {
      setError('Roll ID not found');
      setLoading(false);
      return;
    }

    loadRollData();
    loadUsageHistory();
  }, [rollId]);

  const loadRollData = async () => {
    if (!rollId) return;

    setLoading(true);
    setError(null);

    const rollResult = await getRollById(rollId);

    if (rollResult.success && rollResult.data) {
      setRoll(rollResult.data);
    } else {
      setError(rollResult.error || 'Failed to load roll');
    }

    const statsResult = await getRollConsumptionStats(rollId);

    if (statsResult.success && statsResult.data) {
      setStats(statsResult.data);
    }

    setLoading(false);
  };

  const loadUsageHistory = async () => {
    if (!rollId) return;

    setLoadingHistory(true);

    const historyResult = await getRollUsageHistory(rollId);

    if (historyResult.success && historyResult.data) {
      setHistory(historyResult.data);
    }

    setLoadingHistory(false);
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

  const canViewRoll = profile?.role === 'admin' || profile?.role === 'manager';

  if (!canViewRoll) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Roll Details</h2>
            <p className="text-slate-500 mt-1">View roll information and usage history</p>
          </div>
        </div>

        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <p className="text-orange-800 font-medium">Access Restricted</p>
          <p className="text-orange-700 text-sm mt-1">Only administrators and managers can view roll details.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </button>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
            <Package className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Roll Details</h2>
            <p className="text-slate-500 mt-1">View roll information and usage history</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
            <p className="text-slate-600 font-medium">Loading roll details...</p>
          </div>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 font-medium">Error</p>
          <p className="text-red-700 text-sm mt-1">{error}</p>
        </div>
      ) : roll ? (
        <>
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-slate-800">Roll Information</h3>
                <p className="text-slate-500 text-sm mt-1">{roll.roll_number}</p>
              </div>
              <div className={`px-4 py-2 rounded-full text-sm font-semibold ${
                roll.status === 'Active'
                  ? 'bg-green-100 text-green-700 border border-green-200'
                  : 'bg-red-100 text-red-700 border border-red-200'
              }`}>
                {roll.status}
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div>
                <p className="text-slate-500 text-sm">Size</p>
                <p className="font-medium text-slate-800 mt-1">{roll.size || 'N/A'}</p>
              </div>
              <div>
                <p className="text-slate-500 text-sm">Type</p>
                <p className="font-medium text-slate-800 mt-1">{roll.type || 'N/A'}</p>
              </div>
              <div>
                <p className="text-slate-500 text-sm">Brand</p>
                <p className="font-medium text-slate-800 mt-1">{roll.brand || 'N/A'}</p>
              </div>
              <div>
                <p className="text-slate-500 text-sm">Cost Per Meter</p>
                <p className="font-medium text-slate-800 mt-1">{roll.cost_per_meter.toFixed(2)}</p>
              </div>
            </div>
          </div>

          {stats && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-xl p-6 border border-slate-200" style={{ backgroundColor: '#eff6ff' }}>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Package className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
                <h3 className="text-sm font-medium text-slate-600 mb-1">Total Meter</h3>
                <p className="text-3xl font-bold text-blue-600">{stats.total_meter.toFixed(2)} m</p>
              </div>

              <div className="bg-white rounded-xl p-6 border border-slate-200" style={{ backgroundColor: '#f0fdf4' }}>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-green-600" />
                  </div>
                </div>
                <h3 className="text-sm font-medium text-slate-600 mb-1">Used Meter</h3>
                <p className="text-3xl font-bold text-green-600">{stats.total_used.toFixed(2)} m</p>
              </div>

              <div className="bg-white rounded-xl p-6 border border-slate-200" style={{ backgroundColor: '#fff7ed' }}>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                    <AlertTriangle className="w-6 h-6 text-orange-600" />
                  </div>
                </div>
                <h3 className="text-sm font-medium text-slate-600 mb-1">Waste Meter</h3>
                <p className="text-3xl font-bold text-orange-600">{stats.total_waste.toFixed(2)} m</p>
              </div>

              <div className="bg-white rounded-xl p-6 border border-slate-200" style={{ backgroundColor: '#fef3c7' }}>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
                    <Activity className="w-6 h-6 text-amber-600" />
                  </div>
                </div>
                <h3 className="text-sm font-medium text-slate-600 mb-1">Remaining Meter</h3>
                <p className="text-3xl font-bold text-amber-600">{stats.remaining.toFixed(2)} m</p>
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-slate-600" />
                <h3 className="text-lg font-semibold text-slate-800">Roll Usage History</h3>
              </div>
              <p className="text-slate-500 text-sm mt-1">Detailed usage log for this roll</p>
            </div>

            {loadingHistory ? (
              <div className="p-12 flex items-center justify-center">
                <div className="text-center">
                  <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
                  <p className="text-slate-600 font-medium">Loading usage history...</p>
                </div>
              </div>
            ) : history.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Activity className="w-8 h-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-800 mb-2">No Usage History</h3>
                <p className="text-slate-500">This roll has not been used in any production entries yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="text-left px-6 py-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                        Job Number
                      </th>
                      <th className="text-right px-6 py-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                        Meter Used
                      </th>
                      <th className="text-right px-6 py-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                        Waste Meter
                      </th>
                      <th className="text-left px-6 py-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                        Date
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {history.map((entry, index) => (
                      <tr key={index} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <p className="font-semibold text-slate-800">{entry.job_number}</p>
                        </td>
                        <td className="px-6 py-4 text-right whitespace-nowrap">
                          <p className="font-medium text-green-600">{entry.meter_used.toFixed(2)} m</p>
                        </td>
                        <td className="px-6 py-4 text-right whitespace-nowrap">
                          <p className="font-medium text-orange-600">{entry.waste_meter.toFixed(2)} m</p>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <p className="text-sm text-slate-600">{formatDate(entry.created_at)}</p>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
