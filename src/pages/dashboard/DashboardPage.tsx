import { Navigate } from "react-router-dom";
import { useAuth } from "../../lib/auth";
import ManagerDashboard from "./ManagerDashboard";
import TelesalesDashboard from "./TelesalesDashboard";

/** Reps have no dashboard of their own — their nav is just New Visit/My Visits,
 * so send anyone who lands on "/" straight to their visit history instead. */
export default function DashboardPage() {
  const { profile } = useAuth();

  if (profile?.role === "rep") return <Navigate to="/visits" replace />;
  if (profile?.role === "telesales") return <TelesalesDashboard />;
  return <ManagerDashboard />;
}
