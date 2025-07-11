import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import AuthLoginCover from "./pages/auth-login-cover";
import AuthRegister from "./pages/auth-register-cover";
import Dashboard from "./pages/dashboards-crm";
import ForgotPassword from "./pages/auth-forgot-password-cover";
import CDRReport from "./pages/cdr-report";
import OBCDRReport from "./pages/ob-cdr-report";
import IVRReport from "./pages/ivr-report";
import OBSharedCDRReport from "./pages/ob-shared-cdr-report";
import IVRFunnelReport from "./pages/ivr-funnel-report";
import CallDetails from "./pages/call_details";
import Logout from "./pages/logout";
import OutCallDetails from "./pages/OutCallDetails";
import PriorityCalls from "./pages/PriorityCalls";
import CsatView from "./pages/csat_view";
import CurrentBillStatement from "./pages/CurrentBillStatement";
import Layout from "./layout/layout";
import ProtectedRoute from "./components/ProtectedRoute";

function App() {
  return (
      <Router>
        <Routes>

          <Route path="/" element={<AuthLoginCover />} />
          <Route path="/auth-register" element={<AuthRegister  />} />
          <Route path="/forgot-password" element={<ForgotPassword  />} />
          <Route path="/logout" element={<Logout />} />


          <Route element={<ProtectedRoute />}>
              <Route element={<Layout />}>
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/cdr-report" element={<CDRReport />} />
                  <Route path="/ob-cdr-report" element={<OBCDRReport />} />
                  <Route path="/ivr-report" element={<IVRReport />} />
                  <Route path="/ob-shared-cdr-report" element={<OBSharedCDRReport />} />
                  <Route path="/ivr-funnel-report" element={<IVRFunnelReport />} />
                  <Route path="/call_details" element={<CallDetails />} />
                  <Route path="/out_call_details" element={<OutCallDetails />} />
                  <Route path="/priority_calls" element={<PriorityCalls />} />
                  <Route path="/csat_view" element={<CsatView />} />
                  <Route path="/bill_statement" element={<CurrentBillStatement />} />
              </Route>
          </Route>
        </Routes>
      </Router>
  );
}

export default App;
