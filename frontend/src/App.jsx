import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './Components/Layout';
import Login from './Auth/Login';
import Register from './Auth/Register';
import Dashboard from './Pages/Dashboard';
import Medicines from './Pages/Medicines';
import Patients from './Pages/Patients';
import Billing from './Pages/Billing';
import CreateBill from './Pages/CreateBill';
import ExpiryAlerts from './Pages/ExpiryAlerts';
import PatientBalance from './Pages/PatientBalance';
import Reports from './Pages/Reports';
import Settings from './Pages/Settings';

const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="loading-page">
      <div style={{ textAlign:'center' }}>
        <div style={{ fontSize:32, fontWeight:800, color:'var(--accent)', marginBottom:16 }}>Medi<span style={{color:'var(--text-muted)'}}>Store</span></div>
        <div className="text-muted text-sm">Loading...</div>
      </div>
    </div>
  );
  return user ? children : <Navigate to="/login" replace />;
};

export default function App() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/register" element={user ? <Navigate to="/" replace /> : <Register />} />
      <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="medicines" element={<Medicines />} />
        <Route path="patients" element={<Patients />} />
        <Route path="billing" element={<Billing />} />
        <Route path="billing/create" element={<CreateBill />} />
        <Route path="expiry-alerts" element={<ExpiryAlerts />} />
        <Route path="patient-balance" element={<PatientBalance />} />
        <Route path="reports" element={<Reports />} />
        <Route path="settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
