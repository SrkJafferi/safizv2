import { useState, useEffect } from 'react';
import { ArrowLeft, Loader2, Briefcase } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getJobById, updateJob } from '../services/jobService';
import { getRolls } from '../services/rollService';
import type { Database } from '../lib/database.types';

type Job = Database['public']['Tables']['jobs']['Row'];
type Roll = Database['public']['Tables']['rolls']['Row'];
type JobStatus = Database['public']['Tables']['jobs']['Row']['status'];

interface ToastState {
  show: boolean;
  type: 'success' | 'error';
  message: string;
}

interface UpdateJobProps {
  jobId: string | null;
  onBack?: () => void;
}

export default function UpdateJob({ jobId, onBack }: UpdateJobProps) {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [loadingRolls, setLoadingRolls] = useState(true);
  const [rolls, setRolls] = useState<Roll[]>([]);
  const [toast, setToast] = useState<ToastState>({ show: false, type: 'success', message: '' });
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    client_name: '',
    description: '',
    selected_roll_id: '',
    status: 'Open' as JobStatus,
    total_material_cost: '',
    total_waste_cost: '',
    labor_cost: '',
    other_cost: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!jobId) {
      setError('Job ID not found');
      setLoading(false);
      return;
    }

    loadJob(jobId);
    loadRolls();
  }, [jobId]);

  const loadJob = async (jobId: string) => {
    setLoading(true);
    const result = await getJobById(jobId);

    if (result.success && result.data) {
      const job = result.data;
      setFormData({
        client_name: job.client_name,
        description: job.description || '',
        selected_roll_id: job.selected_roll_id || '',
        status: job.status,
        total_material_cost: job.total_material_cost.toString(),
        total_waste_cost: job.total_waste_cost.toString(),
        labor_cost: job.labor_cost.toString(),
        other_cost: job.other_cost.toString(),
      });
    } else {
      setError(result.error || 'Failed to load job');
    }

    setLoading(false);
  };

  const loadRolls = async () => {
    setLoadingRolls(true);
    const result = await getRolls();
    if (result.success && result.data) {
      const activeRolls = result.data.filter(roll => roll.status === 'Active');
      setRolls(activeRolls);
    }
    setLoadingRolls(false);
  };

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ show: true, type, message });
    setTimeout(() => setToast({ show: false, type, message: '' }), 4000);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (errors[name]) {
      setErrors({ ...errors, [name]: '' });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.client_name.trim()) {
      newErrors.client_name = 'Client name is required';
    }

    if (formData.total_material_cost && parseFloat(formData.total_material_cost) < 0) {
      newErrors.total_material_cost = 'Material cost cannot be negative';
    }

    if (formData.total_waste_cost && parseFloat(formData.total_waste_cost) < 0) {
      newErrors.total_waste_cost = 'Waste cost cannot be negative';
    }

    if (formData.labor_cost && parseFloat(formData.labor_cost) < 0) {
      newErrors.labor_cost = 'Labor cost cannot be negative';
    }

    if (formData.other_cost && parseFloat(formData.other_cost) < 0) {
      newErrors.other_cost = 'Other cost cannot be negative';
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

    if (!jobId) {
      showToast('error', 'Job ID not found');
      return;
    }

    setSubmitting(true);

    const result = await updateJob(jobId, {
      client_name: formData.client_name.trim(),
      description: formData.description.trim() || undefined,
      selected_roll_id: formData.selected_roll_id || undefined,
      status: formData.status,
      total_material_cost: formData.total_material_cost ? parseFloat(formData.total_material_cost) : 0,
      total_waste_cost: formData.total_waste_cost ? parseFloat(formData.total_waste_cost) : 0,
      labor_cost: formData.labor_cost ? parseFloat(formData.labor_cost) : 0,
      other_cost: formData.other_cost ? parseFloat(formData.other_cost) : 0,
    });

    setSubmitting(false);

    if (result.success) {
      showToast('success', 'Job updated successfully');
      setTimeout(() => {
        if (onBack) onBack();
      }, 1500);
    } else {
      showToast('error', result.error || 'Failed to update job');
    }
  };

  const calculateFinalCost = () => {
    const material = formData.total_material_cost ? parseFloat(formData.total_material_cost) : 0;
    const waste = formData.total_waste_cost ? parseFloat(formData.total_waste_cost) : 0;
    const labor = formData.labor_cost ? parseFloat(formData.labor_cost) : 0;
    const other = formData.other_cost ? parseFloat(formData.other_cost) : 0;
    return (material + waste + labor + other).toFixed(2);
  };

  const canEditJob = profile?.role === 'admin' || profile?.role === 'manager';

  if (!canEditJob) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Update Job</h2>
            <p className="text-slate-500 mt-1">Edit job details</p>
          </div>
        </div>

        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <p className="text-orange-800 font-medium">Access Restricted</p>
          <p className="text-orange-700 text-sm mt-1">Only admins and managers can update jobs.</p>
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
            <Briefcase className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Update Job</h2>
            <p className="text-slate-500 mt-1">Edit job details</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
            <p className="text-slate-600 font-medium">Loading job...</p>
          </div>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 font-medium">Error</p>
          <p className="text-red-700 text-sm mt-1">{error}</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Client Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="client_name"
                value={formData.client_name}
                onChange={handleInputChange}
                placeholder="Enter client name"
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all ${
                  errors.client_name ? 'border-red-500' : 'border-slate-300'
                }`}
                disabled={submitting}
              />
              {errors.client_name && (
                <p className="text-xs text-red-600 mt-1">{errors.client_name}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Select Roll
              </label>
              <select
                name="selected_roll_id"
                value={formData.selected_roll_id}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                disabled={submitting || loadingRolls}
              >
                <option value="">No roll assigned</option>
                {rolls.map((roll) => (
                  <option key={roll.id} value={roll.id}>
                    {roll.roll_number} - {roll.size || 'N/A'} - {roll.type || 'N/A'}
                  </option>
                ))}
              </select>
              {loadingRolls && <p className="text-xs text-slate-500 mt-1">Loading rolls...</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Status
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                disabled={submitting}
              >
                <option value="Open">Open</option>
                <option value="In Progress">In Progress</option>
                <option value="Closed">Closed</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Enter job description"
              rows={3}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              disabled={submitting}
            />
          </div>

          <div className="border-t border-slate-200 pt-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Cost Breakdown</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Material Cost
                </label>
                <input
                  type="number"
                  name="total_material_cost"
                  value={formData.total_material_cost}
                  onChange={handleInputChange}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all ${
                    errors.total_material_cost ? 'border-red-500' : 'border-slate-300'
                  }`}
                  disabled={submitting}
                />
                {errors.total_material_cost && (
                  <p className="text-xs text-red-600 mt-1">{errors.total_material_cost}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Waste Cost
                </label>
                <input
                  type="number"
                  name="total_waste_cost"
                  value={formData.total_waste_cost}
                  onChange={handleInputChange}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all ${
                    errors.total_waste_cost ? 'border-red-500' : 'border-slate-300'
                  }`}
                  disabled={submitting}
                />
                {errors.total_waste_cost && (
                  <p className="text-xs text-red-600 mt-1">{errors.total_waste_cost}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Labor Cost
                </label>
                <input
                  type="number"
                  name="labor_cost"
                  value={formData.labor_cost}
                  onChange={handleInputChange}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all ${
                    errors.labor_cost ? 'border-red-500' : 'border-slate-300'
                  }`}
                  disabled={submitting}
                />
                {errors.labor_cost && (
                  <p className="text-xs text-red-600 mt-1">{errors.labor_cost}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Other Cost
                </label>
                <input
                  type="number"
                  name="other_cost"
                  value={formData.other_cost}
                  onChange={handleInputChange}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all ${
                    errors.other_cost ? 'border-red-500' : 'border-slate-300'
                  }`}
                  disabled={submitting}
                />
                {errors.other_cost && (
                  <p className="text-xs text-red-600 mt-1">{errors.other_cost}</p>
                )}
              </div>
            </div>
          </div>

          {calculateFinalCost() !== '0.00' && (
            <div className="bg-green-50 rounded-lg p-4 border border-green-200">
              <p className="text-sm text-slate-600">Final Cost</p>
              <p className="text-2xl font-bold text-green-600 mt-1">{calculateFinalCost()}</p>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 disabled:cursor-not-allowed text-white font-medium py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update Job'
              )}
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={onBack}
              className="px-6 bg-slate-200 hover:bg-slate-300 disabled:bg-slate-100 disabled:cursor-not-allowed text-slate-700 font-medium py-2.5 rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
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
