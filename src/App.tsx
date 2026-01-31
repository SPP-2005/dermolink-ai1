import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { UserRole } from './types/index';
import Login from './pages/Auth/Login';
import PatientDashboard from './pages/Patient/Dashboard';
import DoctorDashboard from './pages/Doctor/Dashboard';

const PrivateRoute: React.FC<{ children: React.ReactNode, role: UserRole }> = ({ children, role }) => {
  const { isAuthenticated, role: userRole } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  if (userRole !== role) {
    return <Navigate to="/" replace />; // Or unauthorized page
  }

  return <>{children}</>;
}

const App: React.FC = () => {
  const { isAuthenticated, role } = useAuth();
  const location = useLocation();

  // If visiting root while logged in, redirect to appropriate dashboard
  if (location.pathname === '/' && isAuthenticated) {
    if (role === UserRole.PATIENT) return <Navigate to="/patient/dashboard" replace />;
    if (role === UserRole.DOCTOR) return <Navigate to="/doctor/dashboard" replace />;
  }

  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route
        path="/patient/dashboard"
        element={
          <PrivateRoute role={UserRole.PATIENT}>
            <PatientDashboardWrapper />
          </PrivateRoute>
        }
      />
      <Route
        path="/doctor/dashboard"
        element={
          <PrivateRoute role={UserRole.DOCTOR}>
            <DoctorDashboardWrapper />
          </PrivateRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

// Wrapper components to handle logout navigation and props
import { useNavigate } from 'react-router-dom';

const PatientDashboardWrapper: React.FC = () => {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  // Use context user ID or fallback
  const patientId = user?.patientId || '1';

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return <PatientDashboard onLogout={handleLogout} patientId={patientId} />;
};

const DoctorDashboardWrapper: React.FC = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return <DoctorDashboard onLogout={handleLogout} />;
};

export default App;