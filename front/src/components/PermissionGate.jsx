import React from 'react';
import { useAuth } from '../context/AuthContext';

const PermissionGate = ({ permission, children }) => {
  const { hasPermission } = useAuth();

  if (!hasPermission(permission)) {
    return null; // Yetkisi yoksa hiçbir şey render etme
  }

  return <>{children}</>;
};

export default PermissionGate;