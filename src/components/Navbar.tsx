import { useState, useEffect } from 'react';
import { LogOut, User, Bell } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

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

interface Notification {
  id: string;
  title: string;
  createdAt: string;
  read: boolean;
}

export default function Navbar() {
  const { profile, signOut } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [newJobAlert, setNewJobAlert] = useState<{
    show: boolean;
    title: string;
  } | null>(null);
  const [lastJobTimestamp, setLastJobTimestamp] = useState<string | null>(null);

  const notificationSound = new Audio('/notification.mp3');

  useEffect(() => {
    const fetchLatestJob = async () => {
      try {
        const { data, error } = (await supabase
          .from('jobs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()) as {
          data: { id: string; job_number: string; created_at: string } | null;
          error: any;
        };

        if (error) {
          console.error('Error fetching latest job:', error);
          return;
        }

        if (data) {
          if (lastJobTimestamp === null) {
            setLastJobTimestamp(data.created_at);
          } else if (data.created_at > lastJobTimestamp) {
            setUnreadCount((prev) => prev + 1);

            const newNotification: Notification = {
              id: data.id,
              title: data.job_number || 'New Job Created',
              createdAt: data.created_at,
              read: false,
            };

            setNotifications((prev) => [newNotification, ...prev]);

            setNewJobAlert({
              show: true,
              title: data.job_number || 'New Job Created',
            });

            notificationSound.play().catch(() => {});

            setTimeout(() => {
              setNewJobAlert(null);
            }, 600000);

            setLastJobTimestamp(data.created_at);
          }
        }
      } catch (err) {
        console.error('Error in fetchLatestJob:', err);
      }
    };

    fetchLatestJob();

    const pollingInterval = setInterval(() => {
      fetchLatestJob();
    }, 5000);

    return () => {
      clearInterval(pollingInterval);
    };
  }, [lastJobTimestamp]);

  const handleBellClick = () => {
    setIsOpen((prev) => !prev);
    if (!isOpen) {
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    }
  };

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <>
      {newJobAlert && (
        <div className="fixed top-5 right-5 bg-green-600 text-white px-6 py-4 rounded-xl shadow-lg z-50 animate-pulse">
          <div className="font-semibold">New Job Created</div>
          <div className="text-sm">{newJobAlert.title}</div>
        </div>
      )}

      <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6">
        <div>
          <h1 className="text-lg font-semibold text-slate-800">Dashboard</h1>
          <p className="text-xs text-slate-500">Welcome back</p>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative cursor-pointer" onClick={handleBellClick}>
            <Bell className="w-6 h-6 text-slate-600 hover:text-slate-800 transition-colors" />
            {unreadCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-600 text-white text-xs font-semibold px-2 py-0.5 rounded-full min-w-[20px] text-center">
                {unreadCount}
              </span>
            )}

            {isOpen && (
              <div className="absolute right-0 mt-3 w-80 bg-white shadow-xl rounded-xl border z-50 max-h-96 overflow-y-auto">
                <div className="p-4 font-semibold border-b">Notifications</div>

                {notifications.length === 0 && (
                  <div className="p-4 text-sm text-gray-500">
                    No notifications
                  </div>
                )}

                {notifications.slice(0, 10).map((n) => (
                  <div
                    key={n.id}
                    onClick={() => {
                      setNotifications((prev) =>
                        prev.map((item) =>
                          item.id === n.id ? { ...item, read: true } : item
                        )
                      );

                      setUnreadCount((prev) => (prev > 0 ? prev - 1 : 0));
                    }}
                    className={`p-3 border-b text-sm cursor-pointer ${
                      !n.read ? 'bg-blue-50 font-medium' : ''
                    }`}
                  >
                    <div>{n.title}</div>
                    <div className="text-xs text-gray-400">
                      {new Date(n.createdAt).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {profile && (
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-sm font-medium text-slate-800">
                  {profile.full_name || 'User'}
                </p>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full border ${
                    roleColors[profile.role]
                  }`}
                >
                  {roleLabels[profile.role]}
                </span>
              </div>
              <div className="w-9 h-9 bg-slate-200 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-slate-600" />
              </div>
            </div>
          )}

          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </button>
        </div>
      </header>
    </>
  );
}
