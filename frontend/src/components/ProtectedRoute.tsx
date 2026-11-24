import { useEffect, type ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../state/AuthContext";
import { Skeleton } from "./UI";

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <div className="page-shell"><Skeleton className="page-hero-skeleton" /></div>;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <>{children}</>;
}

export function RequireStaff({ children, master = false }: { children: ReactNode; master?: boolean }) {
  const { user, loading, isStaff, isMaster } = useAuth();
  const location = useLocation();
  if (loading) return <div className="page-shell"><Skeleton className="page-hero-skeleton" /></div>;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (!isStaff || (master && !isMaster)) {
    return (
      <div className="page-shell">
        <div className="empty-state" style={{ marginTop: 80 }}>
          <h3>Control room access required</h3>
          <p>This area is limited to authorized 19X staff. Player accounts cannot access network, credit, or audit controls.</p>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}

export function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior }); }, [pathname]);
  return null;
}
