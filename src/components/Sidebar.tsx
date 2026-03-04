import { Home, Package, ClipboardList, Settings, Users, Printer, Plus, List, Briefcase, TrendingUp } from 'lucide-react';

interface NavItem {
  icon: typeof Home;
  label: string;
  action?: string;
  subItems?: { label: string; action: string; icon?: typeof List }[];
}

type PageType = 'dashboard' | 'add-roll' | 'roll-list' | 'update-roll' | 'create-job' | 'job-list' | 'update-job' | 'create-entry' | 'entry-list' | 'user-list' | 'settings' | 'reports';

interface SidebarProps {
  onNavigate?: (page: PageType) => void;
}

const navItems: NavItem[] = [
  { icon: Home, label: 'Dashboard', action: 'dashboard' },
  {
    icon: Package,
    label: 'Inventory',
    subItems: [
      { label: 'Roll List', action: 'roll-list', icon: List },
      { label: 'Add Roll', action: 'add-roll', icon: Plus },
    ],
  },
  {
    icon: Briefcase,
    label: 'Jobs',
    subItems: [
      { label: 'Job List', action: 'job-list', icon: List },
      { label: 'Create Job', action: 'create-job', icon: Plus },
    ],
  },
  {
    icon: Printer,
    label: 'Production',
    subItems: [
      { label: 'Entry List', action: 'entry-list', icon: List },
      { label: 'Create Entry', action: 'create-entry', icon: Plus },
    ],
  },
  { icon: TrendingUp, label: 'Reports', action: 'reports' },
  { icon: Users, label: 'Users', action: 'user-list' },
  { icon: Settings, label: 'Settings', action: 'settings' },
];

export default function Sidebar({ onNavigate }: SidebarProps) {
  const handleClick = (action?: string) => {
    const validPages: PageType[] = ['dashboard', 'add-roll', 'roll-list', 'update-roll', 'create-job', 'job-list', 'update-job', 'create-entry', 'entry-list', 'user-list', 'settings', 'reports'];
    if (action && validPages.includes(action as PageType)) {
      onNavigate?.(action as PageType);
    }
  };

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col h-screen">
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
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label}>
              <button
                onClick={() => handleClick(item.action)}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-slate-600 hover:bg-slate-50 rounded-lg transition-colors text-left"
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium text-sm">{item.label}</span>
              </button>
              {item.subItems && (
                <div className="ml-4 mt-1 space-y-1">
                  {item.subItems.map((subItem) => {
                    const SubIcon = subItem.icon || Plus;
                    return (
                      <button
                        key={subItem.label}
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
