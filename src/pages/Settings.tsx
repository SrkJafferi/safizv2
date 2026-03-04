import { useEffect, useState } from 'react';
import { getSetting, updateSetting } from '../services/settingsService';

export default function Settings() {
  const [approvalEnabled, setApprovalEnabled] = useState(false);
  const [entryLockEnabled, setEntryLockEnabled] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [timezone, setTimezone] = useState('UTC');
  const [currency, setCurrency] = useState('USD');
  const [approvalRoles, setApprovalRoles] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    const approvalValue = await getSetting('approval_enabled');
    const lockValue = await getSetting('entry_lock_enabled');
    const company = await getSetting('company_name');
    const tz = await getSetting('timezone');
    const curr = await getSetting('currency');
    const roles = await getSetting('approval_roles');

    setApprovalEnabled(approvalValue === 'true');
    setEntryLockEnabled(lockValue === 'true');
    setCompanyName(company || 'My Company');
    setTimezone(tz || 'UTC');
    setCurrency(curr || 'USD');
    setApprovalRoles(roles || '');
    setLoading(false);
  };

  const handleApprovalToggle = async () => {
    setSaving(true);
    const newValue = !approvalEnabled;
    const success = await updateSetting('approval_enabled', String(newValue));

    if (success) {
      setApprovalEnabled(newValue);
    }
    setSaving(false);
  };

  const handleLockToggle = async () => {
    setSaving(true);
    const newValue = !entryLockEnabled;
    const success = await updateSetting('entry_lock_enabled', String(newValue));

    if (success) {
      setEntryLockEnabled(newValue);
    }
    setSaving(false);
  };

  const handleCompanyNameChange = async (value: string) => {
    setCompanyName(value);
    setSaving(true);
    await updateSetting('company_name', value);
    setSaving(false);
  };

  const handleTimezoneChange = async (value: string) => {
    setTimezone(value);
    setSaving(true);
    await updateSetting('timezone', value);
    setSaving(false);
  };

  const handleCurrencyChange = async (value: string) => {
    setCurrency(value);
    setSaving(true);
    await updateSetting('currency', value);
    setSaving(false);
  };

  const handleApprovalRolesChange = async (value: string) => {
    setApprovalRoles(value);
    setSaving(true);
    await updateSetting('approval_roles', value);
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-slate-600">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="max-w-2xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Settings</h1>
          <p className="text-slate-600">Manage system configuration and behavior</p>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 divide-y">
          <div className="p-6 border-b-2 border-slate-100">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">System Controls</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Company Name</label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => handleCompanyNameChange(e.target.value)}
                  disabled={saving}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
                  placeholder="Enter company name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Timezone</label>
                <select
                  value={timezone}
                  onChange={(e) => handleTimezoneChange(e.target.value)}
                  disabled={saving}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
                >
                  <option value="UTC">UTC</option>
                  <option value="Asia/Dubai">Asia/Dubai</option>
                  <option value="Asia/Karachi">Asia/Karachi</option>
                  <option value="Europe/London">Europe/London</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Currency</label>
                <select
                  value={currency}
                  onChange={(e) => handleCurrencyChange(e.target.value)}
                  disabled={saving}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
                >
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="PKR">PKR</option>
                  <option value="AED">AED</option>
                </select>
              </div>
            </div>
          </div>

          <div className="p-6 border-b-2 border-slate-100">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">Security</h2>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Approval Roles</label>
              <input
                type="text"
                value={approvalRoles}
                onChange={(e) => handleApprovalRolesChange(e.target.value)}
                disabled={saving}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
                placeholder="e.g., admin,manager"
              />
              <p className="text-xs text-slate-500 mt-1">Comma-separated list of roles that can approve entries</p>
            </div>
          </div>

          <div className="p-6 border-b-2 border-slate-100">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">Feature Toggles</h2>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-1">Approval Required</h3>
                  <p className="text-sm text-slate-600">Require approval for production entries</p>
                </div>
                <button
                  onClick={handleApprovalToggle}
                  disabled={saving}
                  className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                    approvalEnabled ? 'bg-blue-600' : 'bg-slate-300'
                  } ${saving ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <span
                    className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                      approvalEnabled ? 'translate-x-7' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-1">Entry Lock</h3>
                  <p className="text-sm text-slate-600">Lock entries to prevent modifications</p>
                </div>
                <button
                  onClick={handleLockToggle}
                  disabled={saving}
                  className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                    entryLockEnabled ? 'bg-blue-600' : 'bg-slate-300'
                  } ${saving ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <span
                    className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                      entryLockEnabled ? 'translate-x-7' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 p-4 bg-slate-50 border border-slate-200 rounded-lg">
          <p className="text-sm text-slate-600">
            <span className="font-semibold">Note:</span> Changes to these settings will affect how production entries are processed system-wide.
          </p>
        </div>
      </div>
    </div>
  );
}
