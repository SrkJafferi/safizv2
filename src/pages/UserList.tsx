import { useState, useEffect } from 'react';
import { Users, Loader2, Mail, Calendar } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getAllUsers } from '../services/userService';
import type { Database } from '../lib/database.types';

type Profile = Database['public']['Tables']['profiles']['Row'];

const roleColors: Record<string, string> = {
  admin: 'bg-red-100 text-red-700 border-red-200',
  manager: 'bg-blue-100 text-blue-700 border-blue-200',
  machineman: 'bg-green-100 text-green-700 border-green-200',
  printer_operator: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  laminator: 'bg-orange-100 text-orange-700 border-orange-200',
};

const roleLabels: Record<string, string> = {
  admin: 'Admin',
  manager: 'Manager',
  machineman: 'Machine Man',
  printer_operator: 'Printer Operator',
  laminator: 'Laminator',
};

export default function UserList() {
  const { profile } = useAuth();
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    setError(null);

    const result = await getAllUsers();

    if (result.success && result.data) {
      setUsers(result.data);
    } else {
      setError(result.error || 'Failed to load users');
    }

    setLoading(false);
  };

  const getRoleBadge = (role: string) => {
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${roleColors[role] || roleColors.admin}`}>
        {roleLabels[role] || role}
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-slate-50 rounded-lg flex items-center justify-center">
            <Users className="w-6 h-6 text-slate-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-800">User Management</h2>
            <p className="text-slate-500 mt-1">View all system users</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-12 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-8 h-8 text-slate-600 animate-spin mx-auto mb-3" />
            <p className="text-slate-600 font-medium">Loading users...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-slate-50 rounded-lg flex items-center justify-center">
            <Users className="w-6 h-6 text-slate-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-800">User Management</h2>
            <p className="text-slate-500 mt-1">View all system users</p>
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
          <div className="w-10 h-10 bg-slate-50 rounded-lg flex items-center justify-center">
            <Users className="w-6 h-6 text-slate-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-800">User Management</h2>
            <p className="text-slate-500 mt-1">View all system users</p>
          </div>
        </div>

        <div className="text-right">
          <p className="text-sm text-slate-500">Total Users</p>
          <p className="text-2xl font-bold text-slate-800">{users.length}</p>
        </div>
      </div>

      {users.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-800 mb-2">No Users Found</h3>
          <p className="text-slate-500">No users in the system yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {users.map((user) => (
            <div key={user.id} className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center">
                  <Users className="w-6 h-6 text-slate-600" />
                </div>
                {getRoleBadge(user.role)}
              </div>

              <div className="space-y-3">
                <div>
                  <h3 className="text-lg font-semibold text-slate-800">
                    {user.full_name || 'Unnamed User'}
                  </h3>
                  <p className="text-sm text-slate-500 flex items-center gap-1 mt-1">
                    <Mail className="w-3 h-3" />
                    User ID: {user.id.slice(0, 8)}...
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-200">
                  <p className="text-xs text-slate-500 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Joined: {formatDate(user.created_at)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
