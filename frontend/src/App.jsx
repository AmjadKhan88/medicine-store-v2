import { Routes, Route, Navigate } from 'react-router-dom';
import { lazy } from 'react'
import { useAuth } from './context/AuthContext';
import Layout from './Components/Layout';
const Login = lazy(() => import('./Auth/Login'));
const Register = lazy(() => import('./Auth/Register'));
import Dashboard from './Pages/Dashboard';
const Medicines = lazy(() => import('./Pages/Medicines'));
import Loader from './Components/Loader';
const Patients = lazy(() => import('./Pages/Patients'));
const Billing = lazy(() => import('./Pages/Billing'));
const CreateBill = lazy(() => import('./Pages/CreateBill'));
const ExpiryAlerts = lazy(() => import('./Pages/ExpiryAlerts'));
const PatientBalance = lazy(() => import('./Pages/PatientBalance'));
const Reports = lazy(() => import('./Pages/Reports'));
const Settings = lazy(() => import('./Pages/Settings'));
const PurchaseOrders = lazy(() => import('./Pages/PurchaseOrders'));
const AuditLog = lazy(() => import('./Pages/AuditLog'));
const StaffManagement = lazy(() => import('./Pages/StaffManagement'));
const Backup = lazy(() => import('./Pages/Backup'));
const SubscriptionPage = lazy(() => import('./Pages/Subscription'));
const SuperAdmin = lazy(() => import('./Pages/SuperAdmin'));
const Landing = lazy(() => import('./Pages/Landing'));
const VerifyEmail = lazy(() => import('./Pages/VerifyEmail'));
const ForgotPassword = lazy(() => import('./Pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./Pages/ResetPassword'));
const Onboarding = lazy(() => import('./Pages/Onboarding'));

const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return (
    <Loader />
  );
  return user ? children : <Navigate to="/login" replace />;
};

export default function App() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/" element={user ? <Navigate to="/app" replace /> :<Landing />} />
      <Route path="/login" element={user ? <Navigate to="/app" replace /> : <Login />} />
      <Route path="/register" element={user ? <Navigate to="/app" replace /> : <Register />} />
      <Route path="/verify-email" element={<VerifyEmail />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/onboarding" element={<PrivateRoute><Onboarding /></PrivateRoute>} />

      <Route path="/app" element={<PrivateRoute><Layout /></PrivateRoute>}>
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
        <Route path="staff" element={<StaffManagement />} />
        <Route path="backup" element={<Backup />} />
        <Route path="subscription" element={<SubscriptionPage />} />
        <Route path="super-admin" element={<SuperAdmin />} />
        <Route path="settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />

    </Routes>
  );
}
