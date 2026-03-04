import { useState, useEffect } from 'react';
import { ArrowLeft, Loader2, FileText } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { createJobEntry } from '../services/jobEntryService';
import { getJobs } from '../services/jobService';
import { getRolls } from '../services/rollService';
import type { Database } from '../lib/database.types';

type Job = Database['public']['Tables']['jobs']['Row'];
type Roll = Database['public']['Tables']['rolls']['Row'];

interface ToastState {
  show: boolean;
  type: 'success' | 'error';
  message: string;
}

interface CreateEntryProps {
  onBack?: () => void;
}

export default function CreateEntry({ onBack }: CreateEntryProps) {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [loadingRolls, setLoadingRolls] = useState(true);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [rolls, setRolls] = useState<Roll[]>([]);
  const [selectedRoll, setSelectedRoll] = useState<Roll | null>(null);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [toast, setToast] = useState<ToastState>({ show: false, type: 'success', message: '' });

  const [formData, setFormData] = useState({
    job_id: '',
    roll_id: '',
    meter_used: '',
    waste_meter: '',
    custom_roll_size: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isDifferentSize, setIsDifferentSize] = useState(false);

  useEffect(() => {
    loadJobs();
    loadRolls();
  }, []);

  const loadJobs = async () => {
    setLoadingJobs(true);
    const result = await getJobs();
    if (result.success && result.data) {
      const openJobs = result.data.filter(job => !job.is_locked && job.status !== 'Closed');
      setJobs(openJobs);
    }
    setLoadingJobs(false);
  };

  const loadRolls = async () => {
    setLoadingRolls(true);
    const result = await getRolls();
    if (result.success && result.data) {
      const activeRolls = result.data.filter(roll => roll.status === 'Active' && roll.remaining_meter > 0);
      setRolls(activeRolls);
    }
    setLoadingRolls(false);
  };

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ show: true, type, message });
    setTimeout(() => setToast({ show: false, type, message: '' }), 4000);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });

    if (name === 'job_id') {
      const job = jobs.find(j => j.id === value);
      setSelectedJob(job || null);
    }

    if (name === 'roll_id') {
      if (value === 'different_size') {
        setIsDifferentSize(true);
        setSelectedRoll(null);
      } else {
        setIsDifferentSize(false);
        const roll = rolls.find(r => r.id === value);
        setSelectedRoll(roll || null);
      }
    }

    if (errors[name]) {
      setErrors({ ...errors, [name]: '' });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.job_id) {
      newErrors.job_id = 'Please select a job';
    }

    if (!formData.roll_id && !isDifferentSize) {
      newErrors.roll_id = 'Please select a roll';
    }

    if (isDifferentSize && !formData.custom_roll_size.trim()) {
      newErrors.custom_roll_size = 'Please enter roll size';
    }

    if (!formData.meter_used || parseFloat(formData.meter_used) <= 0) {
      newErrors.meter_used = 'Meter used must be greater than 0';
    }

    if (formData.waste_meter && parseFloat(formData.waste_meter) < 0) {
      newErrors.waste_meter = 'Waste meter cannot be negative';
    }

    if (selectedRoll) {
      const totalUsed = parseFloat(formData.meter_used || '0') + parseFloat(formData.waste_meter || '0');
      if (totalUsed > selectedRoll.remaining_meter) {
        newErrors.meter_used = `Total usage (${totalUsed.toFixed(2)}m) exceeds remaining meter (${selectedRoll.remaining_meter.toFixed(2)}m)`;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      showToast('error', 'Please fix the errors below');
      return;
    }

    setLoading(true);

    const result = await createJobEntry({
      job_id: formData.job_id,
      roll_id: isDifferentSize ? null : formData.roll_id,
      meter_used: parseFloat(formData.meter_used),
      waste_meter: parseFloat(formData.waste_meter || '0'),
      custom_roll_size: isDifferentSize ? formData.custom_roll_size.trim() : undefined,
    });

    setLoading(false);

    if (result.success) {
      showToast('success', 'Production entry created successfully');
      setFormData({
        job_id: '',
        roll_id: '',
        meter_used: '',
        waste_meter: '',
        custom_roll_size: '',
      });
      setSelectedRoll(null);
      setSelectedJob(null);
      setIsDifferentSize(false);
      loadRolls();
      loadJobs();
    } else {
      showToast('error', result.error || 'Failed to create entry');
    }
  };

  const calculateEstimatedCost = () => {
    if (!selectedRoll || !formData.meter_used) return '0.00';

    const meterUsed = parseFloat(formData.meter_used || '0');
    const wasteMeter = parseFloat(formData.waste_meter || '0');
    const totalCost = (meterUsed + wasteMeter) * selectedRoll.cost_per_meter;

    return totalCost.toFixed(2);
  };

  const getTotalUsage = () => {
    const meterUsed = parseFloat(formData.meter_used || '0');
    const wasteMeter = parseFloat(formData.waste_meter || '0');
    return (meterUsed + wasteMeter).toFixed(2);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </button>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
            <FileText className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Create Production Entry</h2>
            <p className="text-slate-500 mt-1">Record material usage for a job</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 p-8 space-y-6">
        {jobs.length === 0 && !loadingJobs && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <p className="text-orange-800 font-medium">No Open Jobs Available</p>
            <p className="text-orange-700 text-sm mt-1">
              All jobs are either locked or closed. Please contact an admin to unlock a job or create a new one.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Select Job <span className="text-red-500">*</span>
            </label>
            <select
              name="job_id"
              value={formData.job_id}
              onChange={handleInputChange}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all ${
                errors.job_id ? 'border-red-500' : 'border-slate-300'
              }`}
              disabled={loading || loadingJobs}
            >
              <option value="">Select a job</option>
              {jobs.map((job) => (
                <option key={job.id} value={job.id}>
                  {job.job_number} - {job.client_name}
                </option>
              ))}
            </select>
            {loadingJobs && <p className="text-xs text-slate-500 mt-1">Loading jobs...</p>}
            {errors.job_id && <p className="text-xs text-red-600 mt-1">{errors.job_id}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Select Roll <span className="text-red-500">*</span>
            </label>
            <select
              name="roll_id"
              value={formData.roll_id}
              onChange={handleInputChange}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all ${
                errors.roll_id ? 'border-red-500' : 'border-slate-300'
              }`}
              disabled={loading || loadingRolls}
            >
              <option value="">Select a roll</option>
              {rolls.map((roll) => (
                <option key={roll.id} value={roll.id}>
                  {roll.roll_number} - {roll.size || 'N/A'} - Remaining: {roll.remaining_meter.toFixed(2)}m
                </option>
              ))}
              <option value="different_size">Different Size</option>
            </select>
            {loadingRolls && <p className="text-xs text-slate-500 mt-1">Loading rolls...</p>}
            {errors.roll_id && <p className="text-xs text-red-600 mt-1">{errors.roll_id}</p>}
          </div>
        </div>

        {isDifferentSize && (
          <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Enter Roll Size <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="custom_roll_size"
              value={formData.custom_roll_size}
              onChange={handleInputChange}
              placeholder="e.g., 24x36, A4, Custom Size"
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all ${
                errors.custom_roll_size ? 'border-red-500' : 'border-slate-300'
              }`}
              disabled={loading}
            />
            {errors.custom_roll_size && (
              <p className="text-xs text-red-600 mt-1">{errors.custom_roll_size}</p>
            )}
            <p className="text-xs text-slate-500 mt-2">
              Note: Different size rolls are not tracked in inventory. This is for recording purposes only.
            </p>
          </div>
        )}

        {selectedJob && (
          <div className="bg-green-50 rounded-lg p-4 border border-green-200">
            <h3 className="font-semibold text-green-900 mb-2">Job Details</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-green-700">Job Number:</p>
                <p className="font-medium text-green-900">{selectedJob.job_number}</p>
              </div>
              <div>
                <p className="text-green-700">Client:</p>
                <p className="font-medium text-green-900">{selectedJob.client_name}</p>
              </div>
              <div>
                <p className="text-green-700">Status:</p>
                <p className="font-medium text-green-900">{selectedJob.status}</p>
              </div>
              <div>
                <p className="text-green-700">Lock Status:</p>
                <p className="font-medium text-green-900">{selectedJob.is_locked ? 'Locked' : 'Open'}</p>
              </div>
            </div>
          </div>
        )}

        {selectedRoll && (
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <h3 className="font-semibold text-blue-900 mb-2">Roll Details</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-blue-700">Roll Number:</p>
                <p className="font-medium text-blue-900">{selectedRoll.roll_number}</p>
              </div>
              <div>
                <p className="text-blue-700">Remaining Meter:</p>
                <p className="font-medium text-blue-900">{selectedRoll.remaining_meter.toFixed(2)} m</p>
              </div>
              <div>
                <p className="text-blue-700">Cost Per Meter:</p>
                <p className="font-medium text-blue-900">{selectedRoll.cost_per_meter.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-blue-700">Type:</p>
                <p className="font-medium text-blue-900">{selectedRoll.type || 'N/A'}</p>
              </div>
            </div>
          </div>
        )}

        <div className="border-t border-slate-200 pt-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Usage Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Meter Used <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="meter_used"
                value={formData.meter_used}
                onChange={handleInputChange}
                placeholder="0.00"
                step="0.01"
                min="0"
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all ${
                  errors.meter_used ? 'border-red-500' : 'border-slate-300'
                }`}
                disabled={loading}
              />
              {errors.meter_used && (
                <p className="text-xs text-red-600 mt-1">{errors.meter_used}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Waste Meter
              </label>
              <input
                type="number"
                name="waste_meter"
                value={formData.waste_meter}
                onChange={handleInputChange}
                placeholder="0.00"
                step="0.01"
                min="0"
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all ${
                  errors.waste_meter ? 'border-red-500' : 'border-slate-300'
                }`}
                disabled={loading}
              />
              {errors.waste_meter && (
                <p className="text-xs text-red-600 mt-1">{errors.waste_meter}</p>
              )}
            </div>
          </div>
        </div>

        {selectedRoll && formData.meter_used && (
          <div className="bg-green-50 rounded-lg p-4 border border-green-200">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-slate-600">Total Usage</p>
                <p className="text-2xl font-bold text-green-600">{getTotalUsage()} m</p>
              </div>
              <div>
                <p className="text-sm text-slate-600">Estimated Cost</p>
                <p className="text-2xl font-bold text-green-600">{calculateEstimatedCost()}</p>
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={loading || jobs.length === 0}
            className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-slate-400 disabled:cursor-not-allowed text-white font-medium py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Entry'
            )}
          </button>
          <button
            type="reset"
            disabled={loading}
            onClick={() => {
              setFormData({
                job_id: '',
                roll_id: '',
                meter_used: '',
                waste_meter: '',
                custom_roll_size: '',
              });
              setSelectedRoll(null);
              setSelectedJob(null);
              setIsDifferentSize(false);
            }}
            className="px-6 bg-slate-200 hover:bg-slate-300 disabled:bg-slate-100 disabled:cursor-not-allowed text-slate-700 font-medium py-2.5 rounded-lg transition-colors"
          >
            Clear
          </button>
        </div>
      </form>

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
