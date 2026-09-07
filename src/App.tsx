import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./lib/auth";
import RequireAuth from "./components/RequireAuth";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import ComingSoon from "./pages/ComingSoon";
import AccountsPage from "./pages/accounts/AccountsPage";

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
            <Route index element={<ComingSoon title="Dashboard" />} />
            <Route path="accounts" element={<AccountsPage />} />
            <Route path="accounts/:id" element={<AccountsPage />} />
            <Route path="reps" element={<ComingSoon title="Reps" />} />
            <Route path="telesales" element={<ComingSoon title="Telesales" />} />
            <Route path="inventory" element={<ComingSoon title="Inventory" />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
