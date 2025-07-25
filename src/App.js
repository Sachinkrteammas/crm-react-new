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
import TaggingPage from "./pages/TaggingPage";
import ManageAdminLogins from "./pages/ManageAdminLogins";
import ManageAdminAccess from "./pages/ManageAdminAccess";
import ManageRiskExposure from "./pages/ManageRiskExposure";
import Layout from "./layout/layout";
import ProtectedRoute from "./components/ProtectedRoute";
import { useLocation } from "react-router-dom";
import { useEffect } from "react";


function App() {

    const routeTitles = {
        "/": "Login | DialDesk",
        "/auth-register": "Register | DialDesk",
        "/dashboard": "Dashboard | DialDesk",
        "/tagging": "Call Tagging | DialDesk",
        "/call_details": "In Call Details | DialDesk",
        "/csat_view": "CSAT View | DialDesk",
        "/out_call_details": "Out Call Details | DialDesk",
        "/priority_calls": "Priority Calls | DialDesk",
        "/cdr-report": "CDR Report | DialDesk",
        "/ob-cdr-report": "OB CDR Report | DialDesk",
        "/ivr-report": "IVR Report | DialDesk",
        "/ob-shared-cdr-report": "Shared CDR Report | DialDesk",
        "/ivr-funnel-report": "IVR Funnel Report | DialDesk",
        "/bill_statement": "Billing Statement | DialDesk",
        "/logout": "Logout | DialDesk",
        "/forgot-password": "Forgot Password | DialDesk",
    };

    const location = useLocation();

    useEffect(() => {
        const currentPath = location.pathname;
        const title = routeTitles[currentPath] || "DialDesk";
        document.title = title;
    }, [location.pathname]);

  return (
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
              <Route path="/tagging" element={<TaggingPage />} />
              <Route path="/admin_login" element={<ManageAdminLogins />} />
              <Route path="/admin_access" element={<ManageAdminAccess />} />
              <Route path="/manage_risk" element={<ManageRiskExposure />} />
          </Route>
      </Route>
    </Routes>
  );
}

export default App;
