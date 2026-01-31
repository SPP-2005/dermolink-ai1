import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Auth/Login';
import PatientDashboard from './pages/Patient/Dashboard';
import DoctorDashboard from './pages/Doctor/Dashboard';

const App: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/patient/dashboard" element={<PatientDashboardWrapper />} />
      <Route path="/doctor/dashboard" element={<DoctorDashboardWrapper />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

// Wrapper components to handle logout navigation and props
import { useNavigate, useLocation } from 'react-router-dom';

const PatientDashboardWrapper: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const patientId = location.state?.patientId || '1'; // Default to '1' for fallback if state is lost in dev

  const handleLogout = () => {
    navigate('/');
  };

  return <PatientDashboard onLogout={handleLogout} patientId={patientId} />;
};

const DoctorDashboardWrapper: React.FC = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    navigate('/');
  };

  return <DoctorDashboard onLogout={handleLogout} />;
};

export default App;