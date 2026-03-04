import { useState, useEffect } from 'react';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getRollById, updateRoll, checkRollNumberExists } from '../services/rollService';
import type { Database } from '../lib/database.types';

type Roll = Database['public']['Tables']['rolls']['Row'];

interface ToastState {
  show: boolean;
  type: 'success' | 'error';
  message: string;
}

interface UpdateRollFormData {
  roll_number: string;
  size: string;
  type: string;
  brand: string;
  total_meter: string;
  purchase_cost: string;
  status: string;
}

interface UpdateRollProps {
  rollId: string | null;
  onBack?: () => void;
}

export default function UpdateRoll({ rollId, onBack }: UpdateRollProps) {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<ToastState>({ show: false, type: 'success', message: '' });
  const [checkingRollNumber, setCheckingRollNumber] = useState(false);
  const [rollNumberExists, setRollNumberExists] = useState(false);
  const [originalRollNumber, setOriginalRollNumber] = useState('');

  const [formData, setFormData] = useState<UpdateRollFormData>({
    roll_number: '',
    size: '',
    type: '',
    brand: '',
    total_meter: '',
    purchase_cost: '',
    status: 'Active',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!rollId) {
      setError('Roll ID not found');
      setLoading(false);
      return;
    }

    loadRoll(rollId);
  }, [rollId]);

  const loadRoll = async (rollId: string) => {
    setLoading(true);
    const result = await getRollById(rollId);

    if (result.success && result.data) {
      const roll = result.data;
      setFormData({
        roll_number: roll.roll_number,
        size: roll.size || '',
        type: roll.type || '',
        brand: roll.brand || '',
        total_meter: roll.total_meter.toString(),
        purchase_cost: roll.purchase_cost.toString(),
        status: roll.status,
      });
      setOriginalRollNumber(roll.roll_number);
    } else {
      setError(result.error || 'Failed to load roll');
    }

    setLoading(false);
  };

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ show: true, type, message });
    setTimeout(() => setToast({ show: false, type, message: '' }), 4000);
  };

  const handleRollNumberChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData({ ...formData, roll_number: value });

    if (errors.roll_number) {
      setErrors({ ...errors, roll_number: '' });
    }

    if (value !== originalRollNumber && value.trim()) {
      setCheckingRollNumber(true);
      const exists = await checkRollNumberExists(value);
      setRollNumberExists(exists);
      setCheckingRollNumber(false);
    } else {
      setRollNumberExists(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (errors[name]) {
      setErrors({ ...errors, [name]: '' });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.roll_number.trim()) {
      newErrors.roll_number = 'Roll number is required';
    } else if (rollNumberExists) {
      newErrors.roll_number = 'This roll number already exists';
    }

    if (!formData.total_meter || parseFloat(formData.total_meter) <= 0) {
      newErrors.total_meter = 'Total meter must be greater than 0';
    }

    if (formData.purchase_cost && parseFloat(formData.purchase_cost) < 0) {
      newErrors.purchase_cost = 'Purchase cost must be 0 or greater';
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

    if (!rollId) {
      showToast('error', 'Roll ID not found');
      return;
    }

    setSubmitting(true);

    const result = await updateRoll({
      id: rollId,
      roll_number: formData.roll_number.trim(),
      size: formData.size.trim() || undefined,
      type: formData.type.trim() || undefined,
      brand: formData.brand.trim() || undefined,
      total_meter: parseFloat(formData.total_meter),
      purchase_cost: formData.purchase_cost ? parseFloat(formData.purchase_cost) : 0,
      status: formData.status,
    });

    setSubmitting(false);

    if (result.success) {
      showToast('success', `Roll ${result.data?.roll_number} updated successfully`);
      setOriginalRollNumber(formData.roll_number);
    } else {
      showToast('error', result.error || 'Failed to update roll');
    }
  };

  const costPerMeter = formData.total_meter && formData.purchase_cost
    ? (parseFloat(formData.purchase_cost) / parseFloat(formData.total_meter)).toFixed(2)
    : '0.00';

  const canEditRoll = profile?.role === 'admin' || profile?.role === 'manager';

  if (!canEditRoll) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Update Roll</h2>
            <p className="text-slate-500 mt-1">Edit roll inventory details</p>
          </div>
        </div>

        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <p className="text-orange-800 font-medium">Access Restricted</p>
          <p className="text-orange-700 text-sm mt-1">Only admins and managers can update rolls.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </button>
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Update Roll</h2>
          <p className="text-slate-500 mt-1">Edit roll inventory details</p>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
            <p className="text-slate-600 font-medium">Loading roll...</p>
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
                Roll Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="roll_number"
                value={formData.roll_number}
                onChange={handleRollNumberChange}
                placeholder="e.g., ROLL-001"
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all ${
                  errors.roll_number ? 'border-red-500' : 'border-slate-300'
                }`}
                disabled={submitting || checkingRollNumber}
              />
              {checkingRollNumber && (
                <p className="text-xs text-slate-500 mt-1">Checking availability...</p>
              )}
              {rollNumberExists && (
                <p className="text-xs text-red-600 mt-1">This roll number already exists</p>
              )}
              {errors.roll_number && (
                <p className="text-xs text-red-600 mt-1">{errors.roll_number}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Size</label>
              <input
                type="text"
                name="size"
                value={formData.size}
                onChange={handleInputChange}
                placeholder="e.g., A4, A3"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                disabled={submitting}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Type</label>
              <input
                type="text"
                name="type"
                value={formData.type}
                onChange={handleInputChange}
                placeholder="e.g., Plain, Glossy"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                disabled={submitting}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Brand</label>
              <input
                type="text"
                name="brand"
                value={formData.brand}
                onChange={handleInputChange}
                placeholder="e.g., Brand Name"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                disabled={submitting}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Total Meter <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="total_meter"
                value={formData.total_meter}
                onChange={handleInputChange}
                placeholder="0.00"
                step="0.01"
                min="0"
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all ${
                  errors.total_meter ? 'border-red-500' : 'border-slate-300'
                }`}
                disabled={submitting}
              />
              {errors.total_meter && (
                <p className="text-xs text-red-600 mt-1">{errors.total_meter}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Purchase Cost
              </label>
              <input
                type="number"
                name="purchase_cost"
                value={formData.purchase_cost}
                onChange={handleInputChange}
                placeholder="0.00"
                step="0.01"
                min="0"
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all ${
                  errors.purchase_cost ? 'border-red-500' : 'border-slate-300'
                }`}
                disabled={submitting}
              />
              {errors.purchase_cost && (
                <p className="text-xs text-red-600 mt-1">{errors.purchase_cost}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Status</label>
              <select
                name="status"
                value={formData.status}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                disabled={submitting}
              >
                <option value="Active">Active</option>
                <option value="Finished">Finished</option>
              </select>
            </div>
          </div>

          {formData.total_meter && formData.purchase_cost && (
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <p className="text-sm text-slate-600">Auto-calculated Cost Per Meter</p>
              <p className="text-2xl font-bold text-blue-600 mt-1">{costPerMeter}</p>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={submitting || rollNumberExists}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 disabled:cursor-not-allowed text-white font-medium py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update Roll'
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
