import { useAuth } from '../context/AuthContext';

export function usePermissions() {
  const { user } = useAuth();
  const role = user?.role || 'pharmacist';

  return {
    role,
    isAdmin:       role === 'admin',
    isDoctor:      role === 'doctor',
    isPharmacist:  role === 'pharmacist',

    // Feature permissions
    can: {
      addMedicine:      role !== 'pharmacist',
      editMedicine:     role !== 'pharmacist',
      deleteMedicine:   role === 'admin',
      addPatient:       role !== 'pharmacist',
      editPatient:      role !== 'pharmacist',
      deletePatient:    role === 'admin',
      createBill:       true,
      deleteBill:       role === 'admin',
      viewReports:      role !== 'pharmacist',
      manageStaff:      role === 'admin',
      storeSettings:    role === 'admin',
      settings:          role === 'admin',
      purchaseOrders:   role !== 'pharmacist',
      viewAuditLog:     role === 'admin',
    },
  };
}