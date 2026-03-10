import { ReactNode, useState } from 'react';
import Sidebar from './Sidebar';
import Navbar from './Navbar';

type PageType =
  | 'dashboard'
  | 'add-roll'
  | 'roll-list'
  | 'update-roll'
  | 'create-job'
  | 'job-list'
  | 'update-job'
  | 'create-entry'
  | 'entry-list'
  | 'user-list'
  | 'settings'
  | 'reports';

interface DashboardLayoutProps {
  children: ReactNode;
  onNavigate?: (page: PageType) => void;
}

export default function DashboardLayout({
  children,
  onNavigate,
}: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar
        onNavigate={onNavigate}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
      />

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 lg:hidden z-30"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar setSidebarOpen={setSidebarOpen} />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
