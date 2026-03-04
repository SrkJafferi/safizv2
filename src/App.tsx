import { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import AddRoll from './pages/AddRoll';
import RollList from './pages/RollList';
import UpdateRoll from './pages/UpdateRoll';
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

type PageType = 'dashboard' | 'add-roll' | 'roll-list' | 'update-roll' | 'create-job' | 'job-list' | 'update-job' | 'create-entry' | 'entry-list' | 'user-list' | 'settings' | 'reports';

function AppContent() {
  const { user, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState<PageType>('dashboard');
  const [selectedRollId, setSelectedRollId] = useState<string | null>(null);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);

  const handleNavigateToUpdateRoll = (rollId: string) => {
    setSelectedRollId(rollId);
    setCurrentPage('update-roll');
  };

  const handleNavigateToUpdateJob = (jobId: string) => {
    setSelectedJobId(jobId);
    setCurrentPage('update-job');
  };

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

  if (!user) {
    return <Login />;
  }

  return (
    <ProtectedRoute>
      <DashboardLayout onNavigate={setCurrentPage}>
        {currentPage === 'dashboard' && (
          <Dashboard
            onNavigateToAddRoll={() => setCurrentPage('add-roll')}
            onNavigateToCreateJob={() => setCurrentPage('create-job')}
          />
        )}
        {currentPage === 'add-roll' && <AddRoll />}
        {currentPage === 'roll-list' && <RollList onNavigateToUpdateRoll={handleNavigateToUpdateRoll} />}
        {currentPage === 'update-roll' && <UpdateRoll rollId={selectedRollId} onBack={() => setCurrentPage('roll-list')} />}
        {currentPage === 'create-job' && <CreateJob onBack={() => setCurrentPage('dashboard')} />}
        {currentPage === 'job-list' && <JobList onNavigateToUpdateJob={handleNavigateToUpdateJob} />}
        {currentPage === 'update-job' && <UpdateJob jobId={selectedJobId} onBack={() => setCurrentPage('job-list')} />}
        {currentPage === 'create-entry' && <CreateEntry onBack={() => setCurrentPage('dashboard')} />}
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
