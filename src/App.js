import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import Layout from "./layout/layout";
import ProtectedRoute from "./components/ProtectedRoute";
import { useLocation } from "react-router-dom";
import { useEffect } from "react";
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
import CampaignListPage from "./pages/CampaignListPage";
import CampaignSubTypePage from "./pages/CampaignSubTypePage";
import ShopifyIntegrationPage from "./pages/ShopifyIntegrationPage";
import EmailMapPage from "./pages/EmailMapPage";
import ViewClient from "./pages/ViewClient";
import DidCreation from "./pages/DidCreation";
import CampaignPage from "./pages/CampaignPage";
import SocialMediaForm from "./pages/SocialMediaForm";
import ClientRequestPage from "./pages/ClientRequestPage";
import ViewAgent from "./pages/ViewAgent";
import CreateAgent from "./pages/CreateAgent";
import PdCallAllocation from "./pages/PdCallAllocation";
import ClientRightsAllocation from "./pages/ClientRightsAllocation";
import ReAllocatePlan from "./pages/ReAllocatePlan";
import ViewPlan from "./pages/ViewPlan";
import AllocatePlan from "./pages/AllocatePlan";
import PlanCreation from "./pages/PlanCreation";
import PlanPending from "./pages/PlanPending";
import PlanApproval from "./pages/PlanApproval";
import BillPayment from "./pages/BillPayment";
import AgentWiseCallTagging from "./pages/AgentWiseCallTagging";
import BillSummaryMail from "./pages/BillSummaryMail";
import SLAReport from "./pages/SlaReport";
import ClientBillSummary from "./pages/ClientBillSummary";


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
        "/admin_login": "Admin Access | DialDesk",
        "/admin_access": "Admin Rights | DialDesk",
        "/manage_risk": "Bill Risk Management | DialDesk",
        "/campaign_list": "Campaign List | DialDesk",
        "/campaign_subtype": "Campaign Sub Type | DialDesk",
        "/shopify_integration": "Shopify Integration | DialDesk",
        "/email_map": "Email Map | DialDesk",
        "/view_client": "Client Details | DialDesk",
        "/did_creation": "DID Creation | DialDesk",
        "/campaign_page": "Campaign | DialDesk",
        "/social_media_form": "Social Media | DialDesk",
        "/client_request": "Client Request | DialDesk",
        "/view_agent": "View Agent | DialDesk",
        "/create_agent": "Agent Creation | DialDesk",
        "/call_allocation": "PD Call Allocation | DialDesk",
        "/client_rights_allocation": "Client Rights Allocation | DialDesk",
        "/re_allocate_plan": "RE-ALLOCATE PLAN | DialDesk",
        "/view_plan": "VIEW PLAN | DialDesk",
        "/allocate_plan": "ALLOCATE PLAN | DialDesk",
        "/plan_creation": "PLAN CREATION | DialDesk",
        "/plan_pending": "PLAN PENDING | DialDesk",
        "/plan_approval": "PLAN APPROVAL | DialDesk",
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
              <Route path="/campaign_list" element={<CampaignListPage />} />
              <Route path="/campaign_subtype" element={<CampaignSubTypePage />} />
              <Route path="/shopify_integration" element={<ShopifyIntegrationPage />} />
              <Route path="/email_map" element={<EmailMapPage />} />
              <Route path="/view_client" element={<ViewClient />} />
              <Route path="/did_creation" element={<DidCreation />} />
              <Route path="/campaign_page" element={<CampaignPage />} />
              <Route path="/social_media_form" element={<SocialMediaForm />} />
              <Route path="/client_request" element={<ClientRequestPage />} />
              <Route path="/view_agent" element={<ViewAgent />} />
              <Route path="/create_agent" element={<CreateAgent />} />
              <Route path="/call_allocation" element={<PdCallAllocation />} />
              <Route path="/client_rights_allocation" element={<ClientRightsAllocation />} />
              <Route path="/re_allocate_plan" element={<ReAllocatePlan />} />
              <Route path="/view_plan" element={<ViewPlan />} />
              <Route path="/allocate_plan" element={<AllocatePlan />} />
              <Route path="/plan_creation" element={<PlanCreation />} />
              <Route path="/plan_pending" element={<PlanPending />} />
              <Route path="/plan_approval" element={<PlanApproval />} />
              <Route path="/bill_payment" element={<BillPayment />} />
              <Route path="/agent_call_tag" element={<AgentWiseCallTagging />} />
              <Route path="/bill_summary_mail" element={<BillSummaryMail />} />
              <Route path="/sla_report" element={<SLAReport />} />
              <Route path="/client_bill_summary" element={<ClientBillSummary />} />
          </Route>
      </Route>
    </Routes>
  );
}

export default App;
