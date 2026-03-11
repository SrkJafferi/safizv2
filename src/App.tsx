import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import AddRoll from './pages/AddRoll';
import RollList from './pages/RollList';
import UpdateRoll from './pages/UpdateRoll';
import RollDetail from './pages/RollDetail';
import CreateJob from './pages/CreateJob';
import JobList from './pages/JobList';
import UpdateJob from './pages/UpdateJob';
import CreateEntry from './pages/CreateEntry';
import EntryList from './pages/EntryList';
import UserList from './pages/UserList';
import Settings from './pages/Settings';
import Reports from './pages/Reports';

import DashboardLayout from './components/DashboardLayout';
import ProtectedRoute from './components/ProtectedRoute';

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

function AppContent() {
  const { user, loading } = useAuth();

  const [currentPage, setCurrentPage] = useState<PageType>('dashboard');
  const [selectedRollId, setSelectedRollId] = useState<string | null>(null);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);

  /*
  -------------------------
  Handle URL based routing
  -------------------------
  */
  useEffect(() => {
    if (loading) return;

    const path = window.location.pathname;

    if (path.startsWith('/rolls/')) {
      const id = path.split('/')[2];
      if (id) {
        setSelectedRollId(id);
        setCurrentPage('roll-detail');
      }
    } else if (path === '/rolls') {
      setCurrentPage('roll-list');
    } else {
      setCurrentPage('dashboard');
    }

    const handlePop = () => {
      const path = window.location.pathname;

      if (path.startsWith('/rolls/')) {
        const id = path.split('/')[2];
        setSelectedRollId(id);
        setCurrentPage('roll-detail');
      } else if (path === '/rolls') {
        setCurrentPage('roll-list');
      } else {
        setCurrentPage('dashboard');
      }
    };

    window.addEventListener('popstate', handlePop);
    return () => window.removeEventListener('popstate', handlePop);
  }, [loading]);

  /*
  -------------------------
  Navigation Handlers
  -------------------------
  */

  const handleNavigateToUpdateRoll = (rollId: string) => {
    setSelectedRollId(rollId);
    setCurrentPage('update-roll');
  };

  const handleNavigateToRollDetail = (rollId: string) => {
    window.history.pushState({}, '', `/rolls/${rollId}`);
    setSelectedRollId(rollId);
    setCurrentPage('roll-detail');
  };

  const handleNavigateToUpdateJob = (jobId: string) => {
    setSelectedJobId(jobId);
    setCurrentPage('update-job');
  };

  /*
  -------------------------
  Loading Screen
  -------------------------
  */

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  /*
  -------------------------
  Login Page
  -------------------------
  */

  if (!user) {
    return <Login />;
  }

  /*
  -------------------------
  Main Layout
  -------------------------
  */

  return (
    <ProtectedRoute>
      <DashboardLayout onNavigate={setCurrentPage}>
        {currentPage === 'dashboard' && (
          <Dashboard
            onNavigateToAddRoll={() => setCurrentPage('add-roll')}
            onNavigateToCreateJob={() => setCurrentPage('create-job')}
          />
        )}

        {currentPage === 'add-roll' && (
          <AddRoll onBack={() => setCurrentPage('dashboard')} />
        )}

        {currentPage === 'roll-list' && (
          <RollList
            onNavigateToUpdateRoll={handleNavigateToUpdateRoll}
            onNavigateToRollDetail={handleNavigateToRollDetail}
          />
        )}

        {currentPage === 'update-roll' && (
          <UpdateRoll
            rollId={selectedRollId}
            onBack={() => setCurrentPage('roll-list')}
          />
        )}

        {currentPage === 'roll-detail' && (
          <RollDetail
            rollId={selectedRollId}
            onBack={() => setCurrentPage('roll-list')}
          />
        )}

        {currentPage === 'create-job' && (
          <CreateJob onBack={() => setCurrentPage('dashboard')} />
        )}

        {currentPage === 'job-list' && (
          <JobList onNavigateToUpdateJob={handleNavigateToUpdateJob} />
        )}

        {currentPage === 'update-job' && (
          <UpdateJob
            jobId={selectedJobId}
            onBack={() => setCurrentPage('job-list')}
          />
        )}

        {currentPage === 'create-entry' && (
          <CreateEntry onBack={() => setCurrentPage('dashboard')} />
        )}

        {currentPage === 'entry-list' && <EntryList />}

        {currentPage === 'user-list' && <UserList />}

        {currentPage === 'reports' && <Reports />}

        {currentPage === 'settings' && <Settings />}
      </DashboardLayout>
    </ProtectedRoute>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
