import { Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react'
import { useAuth } from './context/AuthContext';

import Layout    from './Components/Layout';
import Dashboard from './Pages/Dashboard';
import Loader    from './Components/Loader';

const Login               = lazy(() => import('./Auth/Login'));
const Register            = lazy(() => import('./Auth/Register'));
const Medicines           = lazy(() => import('./Pages/Medicines'));
const Patients            = lazy(() => import('./Pages/Patients'));
const Billing             = lazy(() => import('./Pages/Billing'));
const CreateBill          = lazy(() => import('./Pages/CreateBill'));
const ExpiryAlerts        = lazy(() => import('./Pages/ExpiryAlerts'));
const PatientBalance      = lazy(() => import('./Pages/PatientBalance'));
const Reports             = lazy(() => import('./Pages/Reports'));
const Settings            = lazy(() => import('./Pages/Settings'));
const PurchaseOrders      = lazy(() => import('./Pages/PurchaseOrders'));
const AuditLog            = lazy(() => import('./Pages/AuditLog'));
const StaffManagement     = lazy(() => import('./Pages/StaffManagement'));
const Backup              = lazy(() => import('./Pages/Backup'));
const SubscriptionPage    = lazy(() => import('./Pages/Subscription'));
const SuperAdminDashboard = lazy(() => import('./Pages/SuperAdminDashboard'));
const Prescriptions       = lazy(()=>  import('./Pages/Prescriptions'));
const CreatePrescription  = lazy(()=>  import('./Pages/CreatePrescription'));
const Landing             = lazy(() => import('./Pages/Landing'));
const VerifyEmail         = lazy(() => import('./Pages/VerifyEmail'));
const ForgotPassword      = lazy(() => import('./Pages/ForgotPassword'));
const ResetPassword       = lazy(() => import('./Pages/ResetPassword'));
const Onboarding          = lazy(() => import('./Pages/Onboarding'));
const Appointments        = lazy(()=>  import('./Pages/Appointments'));
const LabTests            = lazy(()=>  import('./Pages/LabTests'));
const Suppliers           = lazy(()=>  import('./Pages/Suppliers'));
const PatientPortal       = lazy(()=>  import('./Pages/PatientPortal'));
const AIAssistant         = lazy(()=>  import('./Pages/AIAssistant'));
const SupportCenter       = lazy(()=>  import('./Pages/SupportCenter'));
const InvoiceSettings     = lazy(()=>  import('./Pages/InvoiceSettings'));
const Documents           = lazy(()=>  import('./Pages/Documents'));
const WardManagement      = lazy(() => import('./Pages/WardManagement'));
const IPDManagement       = lazy(() => import('./Pages/IPDManagement'));
const OPDQueue            = lazy(() => import('./Pages/OPDQueue'));
const OPDDisplay          = lazy(() => import('./Pages/OPDDisplay'));
const NurseStation        = lazy(() => import('./Pages/NurseStation'));
const OTScheduling        = lazy(() => import('./Pages/OTScheduling'));
const BloodBank           = lazy(() => import('./Pages/BloodBank'));
const DoctorOrders        = lazy(() => import('./Pages/DoctorOrders'));
const Radiology           = lazy(() => import('./Pages/Radiology'));
const RadiologyViewer     = lazy(() => import('./Pages/RadiologyViewer'));
const VitalSigns          = lazy(() => import('./Pages/VitalSigns'));
const EMRPage             = lazy(() => import('./Pages/EMR'));
const Accounting          = lazy(() => import('./Pages/Accounting'));
const Insurance           = lazy(() => import('./Pages/Insurance'));
const Payroll             = lazy(() => import('./Pages/Payroll'));
const BroadcastPage       = lazy(() => import('./Pages/Broadcast'));

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
      <Route path="/portal/:token"        element={<PatientPortal      />} />
      <Route path="/radiology/:token"     element={<RadiologyViewer    />} />
      <Route path="/opd-display/:storeId" element={<OPDDisplay         />} />
      <Route path="/login"                element={user ? <Navigate to="/app" /> : <Login    />} />
      <Route path="/register"             element={user ? <Navigate to="/app" /> : <Register />} />
      <Route path="/verify-email"         element={<VerifyEmail        />} />
      <Route path="/forgot-password"      element={<ForgotPassword     />} />
      <Route path="/reset-password"       element={<ResetPassword      />} />
      <Route path="/onboarding"           element={<PrivateRoute><Onboarding /></PrivateRoute>} />

      <Route path="/app" element={<PrivateRoute><Layout /></PrivateRoute>  }>
        <Route index                       element={<Dashboard           />} />
        <Route path="medicines"            element={<Medicines           />} />
        <Route path="patients"             element={<Patients            />} />
        <Route path="billing"              element={<Billing             />} />
        <Route path="documents"            element={<Documents           />} />
        <Route path="wards"                element={<WardManagement      />} />
        <Route path="ipd"                  element={<IPDManagement       />} />
        <Route path="opd"                  element={<OPDQueue            />} />
        <Route path="nurse"                element={<NurseStation        />} />
        <Route path="ot"                   element={<OTScheduling        />} />
        <Route path="blood-bank"           element={<BloodBank           />} />
        <Route path="doctor-orders"        element={<DoctorOrders        />} />
        <Route path="radiology"            element={<Radiology           />} />
        <Route path="vitals"               element={<VitalSigns          />} />
        <Route path="emr"                  element={<EMRPage             />} />
        <Route path="accounting"           element={<Accounting          />} />
        <Route path="insurance"            element={<Insurance           />} />
        <Route path="payroll"              element={<Payroll             />} />
        <Route path="broadcast"            element={<BroadcastPage       />} />
        <Route path="billing/create"       element={<CreateBill          />} />
        <Route path="expiry-alerts"        element={<ExpiryAlerts        />} />
        <Route path="patient-balance"      element={<PatientBalance      />} />
        <Route path="reports"              element={<Reports             />} />
        <Route path="purchase-orders"      element={<PurchaseOrders      />} />
        <Route path="audit-log"            element={<AuditLog            />} />
        <Route path="staff"                element={<StaffManagement     />} />
        <Route path="backup"               element={<Backup              />} />
        <Route path="subscription"         element={<SubscriptionPage    />} />
        <Route path="prescriptions"        element={<Prescriptions       />} />
        <Route path="appointments"         element={<Appointments        />} />
        <Route path="prescriptions/create" element={<CreatePrescription  />} />
        <Route path="lab-tests"            element={<LabTests            />} />
        <Route path="suppliers"            element={<Suppliers           />} />
        <Route path="ai-assistant"         element={<AIAssistant         />} />
        <Route path="invoice-settings"     element={<InvoiceSettings     />} />
        <Route path="super-admin"          element={<SuperAdminDashboard />} />
        <Route path="support"              element={<SupportCenter       />} />
        <Route path="settings"             element={<Settings            />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />

    </Routes>
    </Suspense>
  );
}
