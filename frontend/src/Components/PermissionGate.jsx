import { usePermissions } from '../hooks/usePermissions';

/**
 * Wrap any UI element to show/hide based on permission.
 *
 * Usage:
 *   <PermissionGate permission="deleteMedicine">
 *     <button>Delete</button>
 *   </PermissionGate>
 *
 *   <PermissionGate role="admin">
 *     <AdminPanel />
 *   </PermissionGate>
 */
export default function PermissionGate({ children, permission, role, fallback = null }) {
  const { can, role: userRole } = usePermissions();

  if (role && userRole !== role)       return fallback;
  if (permission && !can[permission])  return fallback;

  return children;
}