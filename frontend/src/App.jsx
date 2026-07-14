import { Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react'
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
// const SuperAdmin = lazy(() => import('./Pages/SuperAdmin'));
const SuperAdminDashboard = lazy(() => import('./Pages/SuperAdminDashboard'));
const Prescriptions      = lazy(()=> import('./Pages/Prescriptions'));
const CreatePrescription = lazy(()=> import('./Pages/CreatePrescription'));
const Landing = lazy(() => import('./Pages/Landing'));
const VerifyEmail = lazy(() => import('./Pages/VerifyEmail'));
const ForgotPassword = lazy(() => import('./Pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./Pages/ResetPassword'));
const Onboarding = lazy(() => import('./Pages/Onboarding'));
const Appointments = lazy(()=> import('./Pages/Appointments'));
const LabTests = lazy(()=> import('./Pages/LabTests'));
const Suppliers = lazy(()=> import('./Pages/Suppliers'));
const PatientPortal = lazy(()=> import('./Pages/PatientPortal'));
const AIAssistant = lazy(()=> import('./Pages/AIAssistant'));
const SupportCenter = lazy(()=> import('./Pages/SupportCenter'));
const InvoiceSettings = lazy(()=> import('./Pages/InvoiceSettings'));
const Documents = lazy(()=> import('./Pages/Documents'));
const WardManagement = lazy(() => import('./Pages/WardManagement'));

const PrivateRoute = ({ children }) => {
  const { user, loading} = useAuth();
  if (loading) return (
    <Loader />
  );
  return user ? children : <Navigate to="/login" />;
};

export default function App() {
    const { user, loading } = useAuth();

  // Don't render any routes until auth is resolved
  // Prevents flash of login page for already-logged-in users
  if (loading) return <Loader />;
  return (
    <Suspense fallback={<Loader />}>
    <Routes>
      <Route path="/" element={user ? <Navigate to="/app" /> :<Landing />} />
      <Route path="/portal/:token" element={<PatientPortal />} />
      <Route path="/login" element={user ? <Navigate to="/app" /> : <Login />} />
      <Route path="/register" element={user ? <Navigate to="/app" /> : <Register />} />
      <Route path="/verify-email" element={<VerifyEmail />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/onboarding" element={<PrivateRoute><Onboarding /></PrivateRoute>} />

      <Route path="/app" element={<PrivateRoute><Layout /></PrivateRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="medicines" element={<Medicines />} />
        <Route path="patients" element={<Patients />} />
        <Route path="billing" element={<Billing />} />
        <Route path="documents" element={<Documents />} />
        <Route path="wards"      element={<WardManagement />} />
        <Route path="billing/create" element={<CreateBill />} />
        <Route path="expiry-alerts" element={<ExpiryAlerts />} />
        <Route path="patient-balance" element={<PatientBalance />} />
        <Route path="reports" element={<Reports />} />
        <Route path="purchase-orders" element={<PurchaseOrders />} />
        <Route path="audit-log" element={<AuditLog />} />
        <Route path="staff" element={<StaffManagement />} />
        <Route path="backup" element={<Backup />} />
        <Route path="subscription" element={<SubscriptionPage />} />
        <Route path="prescriptions"        element={<Prescriptions />} />
        <Route path="appointments" element={<Appointments />} />
        <Route path="prescriptions/create" element={<CreatePrescription />} />
        <Route path="lab-tests" element={<LabTests />} />
        <Route path="suppliers" element={<Suppliers />} />
        <Route path="ai-assistant" element={<AIAssistant />} />
        <Route path="invoice-settings" element={<InvoiceSettings />} />
        {/* <Route path="super-admin" element={<SuperAdmin />} /> */}
        <Route path="super-admin"    element={<SuperAdminDashboard />} />
        <Route path="support"        element={<SupportCenter />} />
        <Route path="settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />

    </Routes>
    </Suspense>
  );
}
