export const ROLE_LABELS = {
  admin:         { label: 'Admin / Owner',    icon: '👑', color: '#dc2626' },
  doctor:        { label: 'Doctor',           icon: '🩺', color: '#0ea5e9' },
  pharmacist:    { label: 'Pharmacist',       icon: '💊', color: '#10b981' },
  nurse:         { label: 'Nurse',            icon: '👩‍⚕️', color: '#8b5cf6' },
  receptionist:  { label: 'Receptionist',     icon: '🎧', color: '#f59e0b' },
  lab_technician:{ label: 'Lab Technician',   icon: '🔬', color: '#ec4899' },
};

export const getRoleLabel  = (role) => ROLE_LABELS[role]?.label || role;
export const getRoleIcon   = (role) => ROLE_LABELS[role]?.icon  || '👤';
export const getRoleColor  = (role) => ROLE_LABELS[role]?.color || '#6b7280';

export const ALL_ROLES = Object.entries(ROLE_LABELS).map(([value, { label, icon }]) => ({
  value, label, icon,
}));