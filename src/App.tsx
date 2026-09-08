import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./lib/auth";
import RequireAuth from "./components/RequireAuth";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import ComingSoon from "./pages/ComingSoon";
import AccountsPage from "./pages/accounts/AccountsPage";
import RepsPage from "./pages/reps/RepsPage";
import NewVisitPage from "./pages/visits/NewVisitPage";
import MyVisitsPage from "./pages/visits/MyVisitsPage";
import NewCallPage from "./pages/calls/NewCallPage";
import MyCallsPage from "./pages/calls/MyCallsPage";
import InventoryPage from "./pages/inventory/InventoryPage";
import DashboardPage from "./pages/dashboard/DashboardPage";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            element={
              <RequireAuth>
                <Layout />
              </RequireAuth>
            }
          >
            <Route index element={<DashboardPage />} />
            <Route path="accounts" element={<AccountsPage />} />
            <Route path="accounts/:id" element={<AccountsPage />} />
            <Route path="reps" element={<RepsPage />} />
            <Route path="visits/new" element={<NewVisitPage />} />
            <Route path="visits" element={<MyVisitsPage />} />
            <Route path="calls/new" element={<NewCallPage />} />
            <Route path="calls" element={<MyCallsPage />} />
            <Route path="telesales" element={<ComingSoon title="Telesales" />} />
            <Route path="inventory" element={<InventoryPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
