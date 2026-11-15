import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";

import { useAuth } from "@/context/AuthContext";
import { isAdminRole, isDriverRole } from "@/lib/role";

export function RequireDriver({ children }: { children: ReactNode }) {
  const { auth } = useAuth();
  if (!auth || (!isDriverRole(auth.user.role) && !isAdminRole(auth.user.role))) {
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
}
