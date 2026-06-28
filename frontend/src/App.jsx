import { Routes, Route, Navigate } from 'react-router-dom';
import {lazy} from 'react'
import { useAuth } from './context/AuthContext';
import Layout from './Components/Layout';
const Login = lazy(()=> import ('./Auth/Login'));
const Register = lazy(()=> import ('./Auth/Register'));
import Dashboard from './Pages/Dashboard';
const Medicines = lazy(()=> import('./Pages/Medicines'));
import Loader from './Components/Loader';
const Patients = lazy(()=> import('./Pages/Patients'));
const Billing = lazy(()=> import('./Pages/Billing'));
const CreateBill = lazy(()=> import('./Pages/CreateBill')) ;
const ExpiryAlerts = lazy(()=> import('./Pages/ExpiryAlerts'));
const PatientBalance = lazy(()=> import('./Pages/PatientBalance'));
const Reports = lazy(()=> import('./Pages/Reports'));
const Settings = lazy(()=> import('./Pages/Settings'));
const PurchaseOrders = lazy(()=> import('./Pages/PurchaseOrders'));
const AuditLog = lazy(()=> import('./Pages/AuditLog'));

const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return (
    <Loader/>
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
        <Route path="purchase-orders" element={<PurchaseOrders />} />
        <Route path="audit-log" element={<AuditLog />} />
        <Route path="settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
      
    </Routes>
  );
}
