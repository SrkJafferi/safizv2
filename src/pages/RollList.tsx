import { useState, useEffect, useRef } from 'react';
import { Package, Loader2, CreditCard as Edit, Eye } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { getRolls } from '../services/rollService';
import type { Database } from '../lib/database.types';

type Roll = Database['public']['Tables']['rolls']['Row'];

interface RollListProps {
  onNavigateToUpdateRoll?: (rollId: string) => void;
  onNavigateToRollDetail?: (rollId: string) => void;
}

export default function RollList({
  onNavigateToUpdateRoll,
  onNavigateToRollDetail,
}: RollListProps) {
  const { profile } = useAuth();
  const [rolls, setRolls] = useState<Roll[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const topScrollRef = useRef<HTMLDivElement | null>(null);
  const tableScrollRef = useRef<HTMLDivElement | null>(null);
  const topInnerRef = useRef<HTMLDivElement | null>(null);

  const defaultColumns = {
    rollNumber: true,
    size: true,
    type: true,
    brand: true,
    totalMeter: true,
    remainingMeter: true,
    costPerMeter: true,
    status: true,
    createdAt: true,
    actions: true,
  } as const;

  const [columns, setColumns] = useState<Record<string, boolean>>(() => {
    try {
      const raw = localStorage.getItem('rollTableColumns');
      if (raw) return JSON.parse(raw);
    } catch (e) {
      // ignore
    }
    return { ...defaultColumns };
  });

  const [showColumns, setShowColumns] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem('rollTableColumns', JSON.stringify(columns));
    } catch (e) {
      // ignore
    }
  }, [columns]);

  const toggleColumn = (key: keyof typeof defaultColumns) => {
    if (key === 'rollNumber') return; // always visible
    setColumns((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  useEffect(() => {
    loadRolls();
  }, []);

  const loadRolls = async () => {
    setLoading(true);
    setError(null);

    const result = await getRolls();

    if (result.success && result.data) {
      setRolls(result.data);
    } else {
      setError(result.error || 'Failed to load rolls');
    }

    setLoading(false);
  };

  const getStatusBadge = (status: string) => {
    if (status === 'Active') {
      return (
        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700 border border-green-200">
          Active
        </span>
      );
    }
    return (
      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700 border border-red-200">
        Finished
      </span>
    );
  };

  const canEditRoll = profile?.role === 'admin' || profile?.role === 'manager';

  const displayedRolls = rolls.filter((item) =>
    JSON.stringify(item).toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    const top = topScrollRef.current;
    const table = tableScrollRef.current;
    if (!top || !table) return;

    // ensure the top scrollbar inner width matches the table's full scroll width
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
  }, [loading, rolls]);

  const [totalMaterialUsage, setTotalMaterialUsage] = useState(0);
  const [totalMeterToday, setTotalMeterToday] = useState(0);
  const [totalWasteToday, setTotalWasteToday] = useState(0);

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

  if (profile?.role !== 'admin') {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
            <Package className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-800">
              Roll Inventory
            </h2>
            <p className="text-slate-500 mt-1">View all inventory rolls</p>
          </div>
        </div>

        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <p className="text-orange-800 font-medium">Access Restricted</p>
          <p className="text-orange-700 text-sm mt-1">
            Only administrators can view roll inventory.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div
          className="bg-white rounded-xl p-6 border border-slate-200"
          style={{ backgroundColor: '#eff6ff' }}
        >
          <p className="text-sm font-medium text-slate-500">Total Material Usage</p>
          <p className="text-2xl font-bold text-blue-600 mt-2">{totalMaterialUsage.toFixed(2)}</p>
        </div>
        <div
          className="bg-white rounded-xl p-6 border border-slate-200"
          style={{ backgroundColor: '#f0fdf4' }}
        >
          <p className="text-sm font-medium text-slate-500">Total Meter Used Today</p>
          <p className="text-2xl font-bold text-green-600 mt-2">{totalMeterToday.toFixed(2)} m</p>
        </div>
        <div
          className="bg-white rounded-xl p-6 border border-slate-200"
          style={{ backgroundColor: '#ffebed' }}
        >
          <p className="text-sm font-medium text-slate-500">Total Waste Today</p>
          <p className="text-2xl font-bold text-red-600 mt-2">{totalWasteToday.toFixed(2)} m</p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
            <Package className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Roll Inventory</h2>
            <p className="text-slate-500 mt-1">View all inventory rolls</p>
          </div>
        </div>

        <div className="text-right">
          <p className="text-sm text-slate-500">Total Rolls</p>
          <p className="text-2xl font-bold text-slate-800">{rolls.length}</p>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
            <p className="text-slate-600 font-medium">Loading rolls...</p>
          </div>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 font-medium">Error</p>
          <p className="text-red-700 text-sm mt-1">{error}</p>
        </div>
      ) : rolls.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Package className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-800 mb-2">No Rolls Found</h3>
          <p className="text-slate-500">Start by adding your first roll to the inventory.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-visible">
          <div className="px-6 py-4 flex items-center justify-between relative">
            <div className="flex items-center gap-3 w-full">
              <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full md:w-1/3 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />

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

                <div
                  className={`absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg p-3 max-h-56 overflow-auto transition-transform transform origin-top-right z-50 ${
                    showColumns ? 'scale-100 opacity-100' : 'scale-95 opacity-0 pointer-events-none'
                  }`}
                  style={{ willChange: 'transform, opacity' }}
                >
                  <div className="text-sm font-medium mb-2">Show columns</div>
                  {(
                    Object.keys(defaultColumns) as Array<keyof typeof defaultColumns>
                  ).map((key) => (
                    <label key={key} className="flex items-center gap-2 py-1">
                      <input
                        type="checkbox"
                        checked={columns[key]}
                        onChange={() => toggleColumn(key)}
                        disabled={key === 'rollNumber'}
                        className="h-4 w-4"
                      />
                      <span className="text-sm">
                        {key === 'rollNumber'
                          ? 'Roll Number'
                          : key === 'totalMeter'
                          ? 'Total Meter'
                          : key === 'remainingMeter'
                          ? 'Remaining Meter'
                          : key === 'costPerMeter'
                          ? 'Cost Per Meter'
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

          <div className="px-6">
            <div
              ref={topScrollRef}
              className="overflow-x-auto overflow-y-hidden sticky top-0 z-20 bg-white"
              style={{ height: 12 }}
            >
              <div ref={topInnerRef} style={{ width: '1px', height: 1 }} />
            </div>

            <div ref={tableScrollRef} className="overflow-x-auto">
              <table className="min-w-[1200px]">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    {columns.rollNumber && (
                      <th className="text-left px-6 py-4 text-xs font-semibold text-slate-600 uppercase tracking-wider sticky left-0 bg-white z-10">Roll Number</th>
                    )}
                    {columns.size && (
                      <th className="text-left px-6 py-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">Size</th>
                    )}
                    {columns.type && (
                      <th className="text-left px-6 py-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">Type</th>
                    )}
                    {columns.brand && (
                      <th className="text-left px-6 py-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">Brand</th>
                    )}
                    {columns.totalMeter && (
                      <th className="text-right px-6 py-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">Total Meter</th>
                    )}
                    {columns.remainingMeter && (
                      <th className="text-right px-6 py-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">Remaining Meter</th>
                    )}
                    {columns.costPerMeter && (
                      <th className="text-right px-6 py-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">Cost Per Meter</th>
                    )}
                    {columns.status && (
                      <th className="text-center px-6 py-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">Status</th>
                    )}
                    {columns.createdAt && (
                      <th className="text-center px-6 py-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">Created At</th>
                    )}
                    {columns.actions && canEditRoll && (
                      <th className="text-center px-6 py-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {displayedRolls.map((roll) => (
                    <tr key={roll.id} className="hover:bg-slate-50 transition-colors">

                      {columns.rollNumber && (
                        <td className="px-6 py-4 whitespace-nowrap sticky left-0 bg-white z-20 shadow-sm">
                          <button
                            onClick={() => onNavigateToRollDetail && onNavigateToRollDetail(roll.id)}
                            className="px-2 py-1 bg-blue-50 text-blue-700 rounded hover:bg-blue-100"
                          >
                            {roll.roll_number}
                          </button>
                        </td>
                      )}

                      {columns.size && (
                        <td className="px-6 py-4 whitespace-nowrap"><p className="text-slate-600">{roll.size || '-'}</p></td>
                      )}

                      {columns.type && (
                        <td className="px-6 py-4 whitespace-nowrap"><p className="text-slate-600">{roll.type || '-'}</p></td>
                      )}

                      {columns.brand && (
                        <td className="px-6 py-4 whitespace-nowrap"><p className="text-slate-600">{roll.brand || '-'}</p></td>
                      )}

                      {columns.totalMeter && (
                        <td className="px-6 py-4 text-right whitespace-nowrap"><p className="font-medium text-slate-800">{roll.total_meter.toFixed(2)} m</p></td>
                      )}

                      {columns.remainingMeter && (
                        <td className="px-6 py-4 text-right whitespace-nowrap"><p className={`font-medium ${roll.remaining_meter === 0 ? 'text-red-600' : 'text-green-600'}`}>{roll.remaining_meter.toFixed(2)} m</p></td>
                      )}

                      {columns.costPerMeter && (
                        <td className="px-6 py-4 text-right whitespace-nowrap"><p className="font-medium text-slate-800">{roll.cost_per_meter.toFixed(2)}</p></td>
                      )}

                      {columns.status && (
                        <td className="px-6 py-4 text-center whitespace-nowrap">{getStatusBadge(roll.status)}</td>
                      )}

                      {columns.createdAt && (
                        <td className="px-6 py-4 text-center whitespace-nowrap"><p className="text-sm text-slate-600">{new Date(roll.created_at).toLocaleDateString()} {new Date(roll.created_at).toLocaleTimeString()}</p></td>
                      )}

                      {columns.actions && canEditRoll && (
                        <td className="px-6 py-4 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-2 flex-wrap">
                            <button onClick={() => onNavigateToRollDetail && onNavigateToRollDetail(roll.id)} className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-50 hover:bg-green-100 text-green-600 text-sm font-medium rounded-lg transition-colors"><Eye className="w-4 h-4" />Details</button>
                            <button onClick={() => onNavigateToUpdateRoll && onNavigateToUpdateRoll(roll.id)} className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 text-sm font-medium rounded-lg transition-colors"><Edit className="w-4 h-4" />Update</button>
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
    </div>
  );
}
