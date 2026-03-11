import {
  Home,
  Package,
  ClipboardList,
  Settings,
  Users,
  Printer,
  Plus,
  List,
  Briefcase,
  TrendingUp,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface NavItem {
  id: string;
  icon: typeof Home;
  label: string;
  action?: string;
  subItems?: {
    id?: string;
    label: string;
    action: string;
    icon?: typeof List;
  }[];
}

type PageType =
  | 'dashboard'
  | 'add-roll'
  | 'roll-list'
  | 'update-roll'
  | 'roll-detail'
  | 'create-job'
  | 'job-list'
  | 'update-job'
  | 'create-entry'
  | 'entry-list'
  | 'user-list'
  | 'settings'
  | 'reports';

interface SidebarProps {
  onNavigate?: (page: PageType) => void;
  sidebarOpen?: boolean;
  setSidebarOpen?: (v: boolean) => void;
}

const navItems: NavItem[] = [
  { id: 'dashboard', icon: Home, label: 'Dashboard', action: 'dashboard' },
  {
    id: 'inventory',
    icon: Package,
    label: 'Inventory',
    subItems: [
      { id: 'inventory', label: 'Roll List', action: 'roll-list', icon: List },
      { id: 'inventory', label: 'Add Roll', action: 'add-roll', icon: Plus },
    ],
  },
  {
    id: 'jobs',
    icon: Briefcase,
    label: 'Jobs',
    subItems: [
      { id: 'jobs', label: 'Job List', action: 'job-list', icon: List },
      {
        id: 'create_job',
        label: 'Create Job',
        action: 'create-job',
        icon: Plus,
      },
    ],
  },
  {
    id: 'entries',
    icon: Printer,
    label: 'Production',
    subItems: [
      { id: 'entries', label: 'Entry List', action: 'entry-list', icon: List },
      {
        id: 'create_entry',
        label: 'Create Entry',
        action: 'create-entry',
        icon: Plus,
      },
    ],
  },
  { id: 'reports', icon: TrendingUp, label: 'Reports', action: 'reports' },
  { id: 'users', icon: Users, label: 'Users', action: 'user-list' },
  { id: 'settings', icon: Settings, label: 'Settings', action: 'settings' },
];

export default function Sidebar({
  onNavigate,
  sidebarOpen = false,
  setSidebarOpen,
}: SidebarProps) {
  const { profile } = useAuth();
  const role = profile?.role || '';

  const rolePermissions: Record<string, string[]> = {
    admin: [
      'dashboard',
      'inventory',
      'jobs',
      'create_job',
      'entries',
      'create_entry',
      'reports',
      'users',
      'settings',
    ],

    manager: [
      'dashboard',
      'inventory',
      'jobs',
      'create_job',
      'entries',
      'create_entry',
      'reports',
      'users',
      'settings',
    ],

    machineman: [
      'dashboard',
      'jobs',
      'create_job',
      'entries',
      'create_entry',
      'reports',
    ],

    printer_operator: [
      'dashboard',
      'jobs',
      'entries',
      'create_entry',
      'reports',
    ],

    laminator: ['dashboard', 'jobs', 'entries', 'create_entry', 'reports'],
  };

  const perms = rolePermissions[role] || [];

  const allowedItems = navItems.filter((item) => {
    if (item.subItems && item.subItems.length > 0) {
      const someSubAllowed = item.subItems.some(
        (s) => s.id && perms.includes(s.id)
      );
      return perms.includes(item.id) || someSubAllowed;
    }
    return perms.includes(item.id);
  });
  const handleClick = (action?: string) => {
    const validPages: PageType[] = [
      'dashboard',
      'add-roll',
      'roll-list',
      'update-roll',
      'roll-detail',
      'create-job',
      'job-list',
      'update-job',
      'create-entry',
      'entry-list',
      'user-list',
      'settings',
      'reports',
    ];
    if (action && validPages.includes(action as PageType)) {
      onNavigate?.(action as PageType);
      if (
        setSidebarOpen &&
        typeof window !== 'undefined' &&
        window.innerWidth < 1024
      ) {
        setSidebarOpen(false);
      }
    }
  };

  return (
    <aside
      className={`fixed top-0 left-0 h-full w-64 bg-white shadow-lg transform transition-transform duration-300 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } lg:translate-x-0 lg:static lg:w-64 lg:shadow-none border-r border-slate-200 flex flex-col z-40`}
    >
      <div className="p-6 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center">
            <Printer className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="font-bold text-slate-800">SAFIZ Production</h2>
            <p className="text-xs text-slate-500">Management System</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {allowedItems.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.id}>
              <button
                onClick={() => handleClick(item.action)}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-slate-600 hover:bg-slate-50 rounded-lg transition-colors text-left"
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium text-sm">{item.label}</span>
              </button>
              {item.subItems && (
                <div className="ml-4 mt-1 space-y-1">
                  {item.subItems
                    .filter((sub) => sub.id && perms.includes(sub.id))
                    .map((subItem) => {
                      const SubIcon = subItem.icon || Plus;
                      return (
                        <button
                          key={subItem.id || subItem.label}
                          onClick={() => handleClick(subItem.action)}
                          className="w-full flex items-center gap-2 px-4 py-2 text-slate-500 hover:bg-slate-50 rounded-lg transition-colors text-left text-sm"
                        >
                          <SubIcon className="w-4 h-4" />
                          <span className="font-medium">{subItem.label}</span>
                        </button>
                      );
                    })}
                </div>
              )}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
