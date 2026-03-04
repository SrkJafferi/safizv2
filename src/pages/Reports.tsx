import { useEffect, useState } from 'react';
import { FileText, TrendingUp, Clock, CheckCircle, XCircle, Calendar, Package, AlertTriangle } from 'lucide-react';
import { getEntrySummary, EntrySummary, getMaterialUsageSummary, MaterialUsageSummary, getJobWiseUsageReport, JobWiseUsage } from '../services/reportService';

export default function Reports() {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [summary, setSummary] = useState<EntrySummary | null>(null);
  const [materialSummary, setMaterialSummary] = useState<MaterialUsageSummary | null>(null);
  const [jobUsageReport, setJobUsageReport] = useState<JobWiseUsage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSummary();
  }, []);

  const loadSummary = async (start?: string, end?: string) => {
    setLoading(true);
    setError(null);

    const result = await getEntrySummary(start, end);

    if (result.success && result.data) {
      setSummary(result.data);
    } else {
      setError(result.error || 'Failed to load report data');
    }

    const materialResult = await getMaterialUsageSummary(start, end);

    if (materialResult.success && materialResult.data) {
      setMaterialSummary(materialResult.data);
    } else {
      setError(materialResult.error || 'Failed to load material usage data');
    }

    const jobUsageResult = await getJobWiseUsageReport(start, end);

    if (jobUsageResult.success && jobUsageResult.data) {
      setJobUsageReport(jobUsageResult.data);
    } else {
      setError(jobUsageResult.error || 'Failed to load job usage data');
    }

    setLoading(false);
  };

  const handleApplyFilter = () => {
    loadSummary(startDate, endDate);
  };

  const handleClearFilter = () => {
    setStartDate('');
    setEndDate('');
    loadSummary();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
          <TrendingUp className="w-6 h-6 text-blue-600" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Reports</h2>
          <p className="text-slate-500 mt-1">Production entry statistics and insights</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="w-5 h-5 text-slate-600" />
          <h3 className="text-lg font-semibold text-slate-800">Filter by Date Range</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
            />
          </div>

          <div className="flex items-end gap-2">
            <button
              onClick={handleApplyFilter}
              disabled={loading}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              {loading ? 'Loading...' : 'Apply Filter'}
            </button>
            {(startDate || endDate) && (
              <button
                onClick={handleClearFilter}
                disabled={loading}
                className="bg-slate-200 hover:bg-slate-300 disabled:bg-slate-100 disabled:cursor-not-allowed text-slate-700 font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 font-medium">Error</p>
          <p className="text-red-700 text-sm mt-1">{error}</p>
        </div>
      )}

      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center">
                <FileText className="w-6 h-6 text-slate-600" />
              </div>
            </div>
            <h3 className="text-sm font-medium text-slate-600 mb-1">Total Entries</h3>
            <p className="text-3xl font-bold text-slate-800">{summary.total}</p>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
            <h3 className="text-sm font-medium text-yellow-700 mb-1">Pending</h3>
            <p className="text-3xl font-bold text-yellow-600">{summary.pending}</p>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
            <h3 className="text-sm font-medium text-green-700 mb-1">Approved</h3>
            <p className="text-3xl font-bold text-green-600">{summary.approved}</p>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <XCircle className="w-6 h-6 text-red-600" />
              </div>
            </div>
            <h3 className="text-sm font-medium text-red-700 mb-1">Rejected</h3>
            <p className="text-3xl font-bold text-red-600">{summary.rejected}</p>
          </div>
        </div>
      )}

      {loading && !summary && (
        <div className="bg-white rounded-xl border border-slate-200 p-12 flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            <p className="text-slate-600 font-medium">Loading report data...</p>
          </div>
        </div>
      )}

      {materialSummary && (
        <>
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center gap-2 mb-6">
              <Package className="w-5 h-5 text-slate-600" />
              <h3 className="text-lg font-semibold text-slate-800">Material Usage Summary</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="bg-slate-50 rounded-lg p-6 border border-slate-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
                <h3 className="text-sm font-medium text-slate-600 mb-1">Total Approved Jobs</h3>
                <p className="text-3xl font-bold text-blue-600">{materialSummary.totalApprovedJobs}</p>
              </div>

              <div className="bg-slate-50 rounded-lg p-6 border border-slate-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-green-600" />
                  </div>
                </div>
                <h3 className="text-sm font-medium text-slate-600 mb-1">Total Meter Used</h3>
                <p className="text-3xl font-bold text-green-600">{materialSummary.totalMeterUsed.toFixed(2)}</p>
              </div>

              <div className="bg-slate-50 rounded-lg p-6 border border-slate-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                    <AlertTriangle className="w-6 h-6 text-orange-600" />
                  </div>
                </div>
                <h3 className="text-sm font-medium text-slate-600 mb-1">Total Waste Meter</h3>
                <p className="text-3xl font-bold text-orange-600">{materialSummary.totalWasteMeter.toFixed(2)}</p>
              </div>
            </div>
          </div>

          {jobUsageReport.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="p-6 border-b border-slate-200">
                <h3 className="text-lg font-semibold text-slate-800">Job-wise Material Breakdown</h3>
                <p className="text-slate-500 text-sm mt-1">Detailed usage per job</p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="text-left px-6 py-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                        Job
                      </th>
                      <th className="text-right px-6 py-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                        Total Meter Used
                      </th>
                      <th className="text-right px-6 py-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                        Total Waste Meter
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {jobUsageReport.map((job) => (
                      <tr key={job.jobId} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4">
                          <p className="font-medium text-slate-800">{job.jobLabel}</p>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <p className="font-medium text-green-600">{job.totalMeterUsed.toFixed(2)} m</p>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <p className="font-medium text-orange-600">{job.totalWasteMeter.toFixed(2)} m</p>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
