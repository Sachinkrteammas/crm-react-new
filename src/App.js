import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import AuthLoginCover from "./pages/auth-login-cover";
import AuthRegister from "./pages/auth-register-cover";
import Dashboard from "./pages/dashboards-crm";
import ForgotPassword from "./pages/auth-forgot-password-cover";
import CDRReport from "./pages/cdr-report";
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
          </Route>
        </Routes>
      </Router>
  );
}

export default App;
