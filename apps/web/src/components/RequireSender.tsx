import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";

import { useAuth } from "@/context/AuthContext";
import { isAdminRole, isSenderRole } from "@/lib/role";

export function RequireSender({ children }: { children: ReactNode }) {
  const { auth } = useAuth();
  if (!auth || (!isSenderRole(auth.user.role) && !isAdminRole(auth.user.role))) {
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
}
