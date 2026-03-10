import { useState, useEffect } from 'react';
import {
  Package,
  ClipboardList,
  Printer,
  TrendingUp,
  Plus,
  Briefcase,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getRolls } from '../services/rollService';
import { getJobs } from '../services/jobService';
import { supabase } from '../lib/supabase';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';

interface StatCardProps {
  icon: typeof Package;
  title: string;
  value: string;
  bgColor: string;
  iconColor: string;
  backgroundColor?: string;
}

interface DashboardProps {
  onNavigateToAddRoll?: () => void;
  onNavigateToCreateJob?: () => void;
}

function StatCard({
  icon: Icon,
  title,
  value,
  bgColor,
  iconColor,
  backgroundColor = '#eff6ff',
}: StatCardProps) {
  return (
    <div
      className="bg-white rounded-xl p-6 border border-slate-200"
      style={{ backgroundColor }}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="text-2xl font-bold text-slate-800 mt-2">{value}</p>
        </div>
        <div
          className={`w-12 h-12 ${bgColor} rounded-lg flex items-center justify-center`}
        >
          <Icon className={`w-6 h-6 ${iconColor}`} />
        </div>
      </div>
    </div>
  );
}

export default function Dashboard({
  onNavigateToAddRoll,
  onNavigateToCreateJob,
}: DashboardProps) {
  const { profile } = useAuth();
  const [rollCount, setRollCount] = useState(0);
  const [activeJobsCount, setActiveJobsCount] = useState(0);
  const [approvedEntriesCount, setApprovedEntriesCount] = useState(0);
  const [completedTodayCount, setCompletedTodayCount] = useState(0);
  const [statusData, setStatusData] = useState<
    { name: string; value: number }[]
  >([]);
  const [meterUsageData, setMeterUsageData] = useState<
    { date: string; total: number }[]
  >([]);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    const rollsResult = await getRolls();
    if (rollsResult.success && rollsResult.data) {
      setRollCount(rollsResult.data.length);
    }

    const jobsResult = await getJobs();
    if (jobsResult.success && jobsResult.data) {
      const activeJobs = jobsResult.data.filter(
        (job) => job.status === 'Open' || job.status === 'In Progress'
      );
      setActiveJobsCount(activeJobs.length);
    }

    const { count: approvedCount } = await supabase
      .from('job_entries')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'Approved');

    if (approvedCount !== null) {
      setApprovedEntriesCount(approvedCount);
    }

    const today = new Date().toISOString().split('T')[0];
    const { count: todayCount } = await supabase
      .from('job_entries')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'Approved')
      .gte('created_at', today)
      .lt('created_at', `${today}T23:59:59.999Z`);

    if (todayCount !== null) {
      setCompletedTodayCount(todayCount);
    }

    const { data: entriesData } = await supabase
      .from('job_entries')
      .select('status');

    if (entriesData) {
      const pendingCount = entriesData.filter(
        (entry) => entry.status === 'Pending'
      ).length;
      const approvedCount = entriesData.filter(
        (entry) => entry.status === 'Approved'
      ).length;
      const rejectedCount = entriesData.filter(
        (entry) => entry.status === 'Rejected'
      ).length;

      setStatusData([
        { name: 'Pending', value: pendingCount },
        { name: 'Approved', value: approvedCount },
        { name: 'Rejected', value: rejectedCount },
      ]);
    }

    const last7Days: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      last7Days.push(date.toISOString().split('T')[0]);
    }

    const { data: meterData } = await supabase
      .from('job_entries')
      .select('created_at, meter_used')
      .eq('status', 'Approved');

    const usageByDate: Record<string, number> = {};
    last7Days.forEach((date) => {
      usageByDate[date] = 0;
    });

    if (meterData) {
      meterData.forEach((entry) => {
        const entryDate = new Date(entry.created_at)
          .toISOString()
          .split('T')[0];
        if (usageByDate[entryDate] !== undefined) {
          usageByDate[entryDate] += entry.meter_used || 0;
        }
      });
    }

    const chartData = last7Days.map((date) => ({
      date,
      total: usageByDate[date],
    }));

    setMeterUsageData(chartData);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Overview</h2>
          <p className="text-slate-500 mt-1">
            Your production management dashboard
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={Package}
          title="Inventory Items"
          value={rollCount.toString()}
          bgColor="bg-blue-50"
          iconColor="text-blue-600"
          backgroundColor="#eff6ff"
        />
        <StatCard
          icon={ClipboardList}
          title="Active Jobs"
          value={activeJobsCount.toString()}
          bgColor="bg-green-50"
          iconColor="text-green-600"
          backgroundColor="#f0fdf4"
        />
        <StatCard
          icon={Printer}
          title="Production Entries"
          value={approvedEntriesCount.toString()}
          bgColor="bg-orange-50"
          iconColor="text-orange-600"
          backgroundColor="#fff7ed"
        />
        <StatCard
          icon={TrendingUp}
          title="Completed Today"
          value={completedTodayCount.toString()}
          bgColor="bg-amber-50"
          iconColor="text-amber-600"
          backgroundColor="#fffbeb"
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-8 border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-800 mb-2">
                Inventory Management
              </h3>
              <p className="text-slate-500">
                Manage your production rolls and materials.
              </p>
            </div>
            {profile?.role === 'admin' && (
              <button
                onClick={onNavigateToAddRoll}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-2.5 rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Roll
              </button>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl p-8 border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-800 mb-2">
                Job Management
              </h3>
              <p className="text-slate-500">
                Create and manage production jobs.
              </p>
            </div>
            {profile?.role === 'admin' && (
              <button
                onClick={onNavigateToCreateJob}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-medium px-6 py-2.5 rounded-lg transition-colors"
              >
                <Briefcase className="w-4 h-4" />
                Create Job
              </button>
            )}
          </div>
        </div>
      </div>
      <div className="bg-white rounded-xl p-8 border border-slate-200">
        <h3 className="text-lg font-semibold text-slate-800 mb-6">
          Meter Usage Trend (Last 7 Days)
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={meterUsageData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="total"
              stroke="#3b82f6"
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white rounded-xl p-8 border border-slate-200">
        <h3 className="text-lg font-semibold text-slate-800 mb-6">
          Jobs by Status
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={statusData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, value }) => `${name}: ${value}`}
              outerRadius={100}
              fill="#8884d8"
              dataKey="value"
            >
              {statusData.map((entry, index) => {
                const colors = ['#fbbf24', '#10b981', '#ef4444'];
                return (
                  <Cell
                    key={`cell-${index}`}
                    fill={colors[index % colors.length]}
                  />
                );
              })}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
