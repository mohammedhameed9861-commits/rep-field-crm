import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { RequireRole } from "@/components/RequireRole";
import { FullScreenLoader } from "@/components/FullScreenLoader";
import { Login } from "@/pages/Login";
import { NewVisit } from "@/pages/rep/NewVisit";
import { MyVisits } from "@/pages/rep/MyVisits";

// Manager dashboard pulls in Leaflet/react-leaflet — keep it out of the
// rep's bundle, since reps are the ones on weak mobile data outdoors.
const DashboardLayout = lazy(() =>
  import("@/components/DashboardLayout").then((m) => ({ default: m.DashboardLayout })),
);
const Overview = lazy(() => import("@/pages/manager/Overview").then((m) => ({ default: m.Overview })));
const Reps = lazy(() => import("@/pages/manager/Reps").then((m) => ({ default: m.Reps })));
const RepDetail = lazy(() => import("@/pages/manager/RepDetail").then((m) => ({ default: m.RepDetail })));
const Shops = lazy(() => import("@/pages/manager/Shops").then((m) => ({ default: m.Shops })));
const ShopDetail = lazy(() => import("@/pages/manager/ShopDetail").then((m) => ({ default: m.ShopDetail })));
const VisitDetail = lazy(() => import("@/pages/manager/VisitDetail").then((m) => ({ default: m.VisitDetail })));
const ManageReps = lazy(() => import("@/pages/manager/ManageReps").then((m) => ({ default: m.ManageReps })));
const Products = lazy(() => import("@/pages/manager/Products").then((m) => ({ default: m.Products })));
const InvoicePrep = lazy(() => import("@/pages/manager/InvoicePrep").then((m) => ({ default: m.InvoicePrep })));

function Root() {
  const { session, profile, loading } = useAuth();
  if (loading) return <FullScreenLoader />;
  if (!session) return <Navigate to="/login" replace />;
  if (!profile) return <FullScreenLoader />;
  return <Navigate to={profile.role === "manager" ? "/dashboard/overview" : "/visit/new"} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Root />} />
      <Route path="/login" element={<Login />} />

      <Route
        path="/visit/new"
        element={
          <RequireRole role="rep">
            <NewVisit />
          </RequireRole>
        }
      />
      <Route
        path="/my-visits"
        element={
          <RequireRole role="rep">
            <MyVisits />
          </RequireRole>
        }
      />

      <Route
        path="/dashboard"
        element={
          <RequireRole role="manager">
            <Suspense fallback={<FullScreenLoader />}>
              <DashboardLayout />
            </Suspense>
          </RequireRole>
        }
      >
        <Route path="overview" element={<Overview />} />
        <Route path="reps" element={<Reps />} />
        <Route path="reps/manage" element={<ManageReps />} />
        <Route path="reps/:repId" element={<RepDetail />} />
        <Route path="shops" element={<Shops />} />
        <Route path="shops/:shopId" element={<ShopDetail />} />
        <Route path="products" element={<Products />} />
        <Route path="invoices" element={<InvoicePrep />} />
        <Route path="visit/:id" element={<VisitDetail />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
