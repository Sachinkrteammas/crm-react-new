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
import Layout from "./layout/layout";


function App() {
  return (
      <Router>
        <Routes>

          <Route path="/" element={<AuthLoginCover />} />
          <Route path="/auth-register" element={<AuthRegister  />} />
          <Route path="/forgot-password" element={<ForgotPassword  />} />


          <Route path="/" element={<Layout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/cdr-report" element={<CDRReport />} />
              <Route path="/ob-cdr-report" element={<OBCDRReport />} />
              <Route path="/ivr-report" element={<IVRReport />} />
              <Route path="/ob-shared-cdr-report" element={<OBSharedCDRReport />} />
              <Route path="/ivr-funnel-report" element={<IVRFunnelReport />} />
          </Route>
        </Routes>
      </Router>
  );
}

export default App;
