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
import CDRReportOld from "./pages/cdr-report-old";
import OBCDRReport from "./pages/ob-cdr-report";
import OBCDRReportOld from "./pages/ob-cdr-report-old";
import IVRReport from "./pages/ivr-report";
import IVRReportOld from "./pages/ivr-report-old";
import OBSharedCDRReport from "./pages/ob-shared-cdr-report";
import OBSharedCDRReportOld from "./pages/ob-shared-cdr-report-old";
import IVRFunnelReport from "./pages/ivr-funnel-report";
import IVRFunnelReportOld from "./pages/ivr-funnel-report-old";
import CallDetails from "./pages/call_details";
import Logout from "./pages/logout";
import OutCallDetails from "./pages/OutCallDetails";
import PriorityCalls from "./pages/PriorityCalls";
import CsatView from "./pages/csat_view";
import CsatViewOld from "./pages/csat_view_old";
import CurrentBillStatement from "./pages/CurrentBillStatement";
import CurrentBillStatementAudio from "./pages/CurrentBillStatementAudio";
import CurrentBillStatementOld from "./pages/CurrentBillStatement_Old";
import CurrentBillStatementOldAudio from "./pages/CurrentBillStatement_Old_Audio";
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
import ManageCustomizedMIS from "./pages/ManageCustomizedMIS";
import AddCallFlow from "./pages/AddCallFlow";
import PromptCreation from "./pages/PromptCreation";
import ManageUserLogin from "./pages/ManageUserLogin";
import ManageAdminLogin from "./pages/ManageAdminLogin";
import ManageInCallActionAlerts from "./pages/ManageInCallActionAlerts";
import ManageMISReports from "./pages/ManageMISReports";
import ManageTrainingDocs from "./pages/ManageTrainingDocs";
import ManageIVR from "./pages/ManageIVR";
import ManageInCallScenarios from "./pages/ManageInCallScenarios";
import ManageTAT from "./pages/ManageTAT";
import ManageAlertsEscalations from "./pages/ManageAlertsEscalations";
import ManageInCallActions from "./pages/ManageInCallActions";
import OutManageAlertsEscalations from "./pages/OutManageAlertsEscalations";
import OutManageCustomizedMIS from "./pages/OutManageCustomizedMIS";
import ManageReAllocations from "./pages/ManageReAllocations";
import OBAddCallFlow from "./pages/OBAddCallFlow";
import OutManageCallActions from "./pages/OutManageCallActions";
import ManageCampaign from "./pages/ManageCampaign";
import ManageAllocations from "./pages/ManageAllocations";
import OutManageCallScenarios from "./pages/OutManageCallScenarios";
import CreateManualCall from "./pages/CreateManualCall";
import UpdateTicketStatus from "./pages/UpdateTicketStatus";
import OutCreateManualCall from "./pages/OutCreateManualCall";
import SLAReports from "./pages/SLAReports";
import ShopifyReports from "./pages/ShopifyReports";
import TaggingReports from "./pages/TaggingReports";
import CallReports from "./pages/CallReports";
import RealTimeDashboard from "./pages/RealTimeDashboard";
import CompanyRegistration from "./pages/company-registration";
import AbandCallSetting from "./pages/AbandCallSetting";
import TrainingMaster from "./pages/TrainingMasters";
import ManageFields from "./pages/ManageFields";
import ManageCloseField from "./pages/ManageCloseField";
import TemplateCreation from "./pages/TemplateCreation";
import FortumDashboard from "./pages/fortum_dashboard";
import AbandonedCallDetails from "./pages/Abandond_call_details_analysis";
import DialerMapping from "./pages/DialerMapping";
import CloseLooping from "./pages/ViewCloseLooping";
import OutboundDashboard from "./pages/outbound_dashboard";
import IngroupManager from "./pages/Manage_in_groups";
import ManageWorkFlow from "./pages/Manage_work_flow";
import UploadExistingCustomers from "./pages/Upload_existing_customer";
import AuditSheet from "./pages/Audit_sheet";
import AutoTagging from "./pages/Auto_tagging";
import IvrPromptUpload from "./pages/Manage_ivr_prompt";
import MasterFieldMapping from "./pages/Master_field_mapping";
import ManageProcessUpdate from "./pages/Manage_process_update";
import ProcessUpdateReport from "./pages/Process_update_report";
import ProcessUpdates from "./pages/Process_updates";
import LoginLog from "./pages/Login_log";
import TatMis from "./pages/Tat_mis";
import TaggingMis from "./pages/Tagging_mis";
import CallScenario from "./pages/Call_scenario_mis";
import EscalationLevel from "./pages/Escalation_level_mis";
import InCallAction from "./pages/In_call_action_mis";
import CallMIS from "./pages/Call_mis";
import AnswerCall from "./pages/Answer_call_mis";
import AbandonCall from "./pages/Abandon_call_mis";
import AgentWiseMis from "./pages/Agent_wise_mis";
import ExportMisFiles from "./pages/Export_mis_files";
import OutCallManageMISReports from "./pages/OutCallManageMISReports";
import OutMasterFieldMapping from "./pages/OutMasterFieldMapping";
import OutCallSummaryReports from "./pages/OutCallSummaryReports";
import OutCallSummaryReportsAutomation from "./pages/OutCallSummaryReportsAutomation";
import OutCallReportAutomation from "./pages/OutCallReportAutomation";
import ScenarioReportAutomation from "./pages/ScenarioReportAutomation";
import ManageOutCallCloseField from "./pages/ManageOutCallCloseField";
import ManageOutCallRequiredFilled from "./pages/ManageOutCallRequiredFilled";
import ExposureView from "./pages/exposure_view";
import ChannelUtilization from "./pages/ChannelUtilization";
import ChannelUtilizationOld from "./pages/ChannelUtilization_old";
import DidLogsReports from "./pages/DidLogReports";
import DidLogsReportsOld from "./pages/DidLogReports_old";
import AgentProductivity from "./pages/AgentProductivity";
import SlaAgentsReports from "./pages/SlaAgentsReports";
import CampaignsMapping from "./pages/CampaignsMapping";
import DidClientCampaignsMapping from "./pages/DidClientCampaignsMapping";
import SubMenuPage from "./pages/SubMenuPage";
import CorrectiveReport from "./pages/Corrective_report";
import CorrectiveReportOld from "./pages/Corrective_report_old";
// import AllocationPlan from "./pages/AllocationPlan";
import ResetPassword from "./pages/Reset_password";
import UsageSummary from "./pages/Usage_summary";
import StatementSummary from "./pages/statement_summary";
import CreateInvoice from "./pages/Invoice";
import NewOutboundDashboard from "./pages/NewOutboundDashboard";
import CustomerDateWiseDensity from "./pages/customer_date_wise_density_of_calls";
import CustomerDateWiseDensityOld from "./pages/customer_date_wise_density_of_calls_old";
import SLAClientWise from "./pages/SLA_client_wise";
import SLAClientWiseOldReport from "./pages/SLA_client_wise_old";
import SLADayWise from "./pages/SLA_day_wise";
import SLASlotWise from "./pages/SLA_Slot_wise";
import RealtimeAgentMapWithClients from "./pages/Realtime_agent_map";
import OverallAgentSkills from "./pages/overall_agent_skills";
import CampaignWiseAgentSkill from "./pages/campaign_wise_agent_skills";
import AgentAprExport from "./pages/Agent_apr";
import AgentAprExportOld from "./pages/Agent_apr_old";
import DashboardAnest from "./pages/DashboardAnest";
import AfterHoursCalls from "./pages/After_hour_call";
import AfterHoursCallsOld from "./pages/After_hour_call_old";
import RLReport from "./pages/Rl-Internal-Report";
import RLReportOld from "./pages/Rl-Internal-Report-old";
import ObCampaignDetails from "./pages/Create_manual_OB_call";
import CampaignListUI from "./pages/List_id";
import MonthConsumption from "./pages/Month_consumption";
import MonthConsumptionOld from "./pages/Month_consumption_old";
import OutboundReport from "./pages/outbound_report";
import OutboundReportOld from "./pages/outbound_report_old";
import AgentClientWise from "./pages/Agent_client_wise_report";
import AgentClientWiseOld from "./pages/Agent_client_wise_report_old";
import RLReportClient from "./pages/RL_Report";
import RLReportClientOld from "./pages/RL_Report_old";
import AbandonTrend from "./pages/Abandon_trend";
import AbandonTrendOld from "./pages/Abandon_trend_old";
import AbandonCallData from "./pages/Abandon_call_datewise";
import AbandonCallDataOld from "./pages/Abandon_call_datewise_old";
import SLAClientWiseOld from "./pages/SLA_Slot_wise_old";
import SLAClientWisesOld from "./pages/SLA_day_wise_old";
import ManageUserAccess from "./pages/Manage_user_access";
import ReportsAutomation from "./pages/Report_Automation";
import BackUpCdr from "./pages/backup_cdr_report";
import BackUpAgentApr from "./pages/backup_agent_apr";
import BackupStatement from "./pages/backup_statement_summary";
import CheckOutReport from "./pages/Checkout_report";
import BotFieldMapping from "./pages/BotFieldMapping";
import ShopifyIntegration from "./pages/Shopify_integration";
import HVClient from "./pages/HV_Client_report";
import AdvisorDisconnect from "./pages/advisor_disconnect_report";
import PlanSettings from "./pages/Plan_settings";
import C2PCDRReports from "./pages/C2PCDRReports";
import ClientWiseVarianceReport from "./pages/ClientWiseTaggingVarianceReport";
import AgentwiseVarianceReport from "./pages/AgentwiseTaggingVarianceReport";
import SaatvikDashboards from "./pages/Saatvik-dashboards";
import Obd_Managements_report from "./pages/Obd_Managements_report";
import ObdManagements_Data_Upload from "./pages/ObdManagements_Data_Upload";
import Obd_Managements_addlist from "./pages/Obd_Managements_addlist";
import OrderStatus from "./pages/OrderStatus";
import WeeboInformation from "./pages/weebo_information";



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
        "/bill_payment": "Bill Payment | DialDesk",
        "/agent_call_tag": "Agent Call Tagging | DialDesk",
        "/bill_summary_mail": "Bill Summary Mail | DialDesk",
        "/sla_report": "SLA Report | DialDesk",
        "/client_bill_summary": "Client Bill Summary | DialDesk",
        "/manage_customize_mis": "Manage Customized MIS | DialDesk",
        "/add_call_flow": "Call Flow | DialDesk",
        "/Ecrs/prompt": "Prompt Creation | DialDesk",
        "/manage_user_login": "Manage User Login | DialDesk",
        "/manage_in_call_action": "Manage InCall Action Alerts | DialDesk",
        "/manage_mis_reports": "Manage MIS Reports | DialDesk",
        "/manage_training_docs": "Manage Training Docs | DialDesk",
        "/manage_ivr": "Manage IVR | DialDesk",
        "/manage_incal_scenarios": "Manage InCall Scenarios | DialDesk",
        "/manage_tat": "Manage TAT | DialDesk",
        "/manage_alert_escalations": "Manage Alerts Escalations | DialDesk",
        "/manage_call_actions": "Manage InCall Actions | DialDesk",
        "/out_manage_alert_escalations": "Manage OutCall Alerts Escalations | DialDesk",
        "/out_manage_customize_mis": "Manage OutCall Customized MIS | DialDesk",
        "/ObReallocations": "Manage Re Allocations | DialDesk",
        "/ob_add_call_flow": "OB Call Flow | DialDesk",
        "/ObcloseLoopings": "Manage OutCall Actions | DialDesk",
        "/Outbounds/add_campaign": "Manage Campaign | DialDesk",
        "/ObImports": "Manage Allocations | DialDesk",
        "/Obecrs": "Manage OutCall Scenarios | DialDesk",
        "/create_manual_call": "Manual In Call | DialDesk",
        "/update_ticket_status": "Ticket Status | DialDesk",
        "/out_create_manual_call": "Manual Out Call | DialDesk",
        "/sla_reports": "SLA Reports | DialDesk",
        "/shopify_reports": "Shopify Reports | DialDesk",
        "/tagging_reports": "Tagging Reports | DialDesk",
        "/call_reports": "Call Reports | DialDesk",
       "/company_registration": "Company Registration | DialDesk",
       "/AbandCallback": "Aband Call Setting | DialDesk",
        "/training_masters": "Training Masters | DialDesk",
        "/fortum_dashboard": "Fortum Dashboard | DialDesk",
        "/AbandonCallReports/external": "Abandon Call Reports | DialDesk",
        "/dialer_mapping": "Dialer Mapping | DialDesk",
        "/MisAndReportMatrixs/ob_matrix": "Out Call Manage MIS Reports | DialDesk",
        "/MasterField": "Out Master Field Mapping | DialDesk",
        "/ScenarioAutomates/call_summary_out": "Out Call Summary Reports | DialDesk",
        "/OutCallAutomation": "Out Call Automation | DialDesk",
        "/ScenarioReportAutomation": "Scenario Report Automation  | DialDesk",
        "/ObcloseFields": "Manage Out Call Close Field | DialDesk",
        "/ObclientFields": "Manage Out Call Required Filled | DialDesk",
        "/channel_utilization": "Channel Utilization | DialDesk",	
        "/didlogs_reports" : "Did Logs Reports | DialDesk",
        "/agent_avr" : "Agents AVR Productivity Report | DialDesk",
        "/sla_agents_reports" : "SLA Agents Reports | DialDesk",
        "/campaigns_mapping" : "Campaigns Mapping | DialDesk",
        "/mappings" : "Did Client And Campaigns Mapping | DialDesk",
        "/allocation_plan" : "Allocation Plan| DialDesk",
        "/DashboardAnest" : "Dashboard Anest Wata | DialDesk",
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
      <Route path="/reset-password" element={<ResetPassword  />} />
      <Route path="/logout" element={<Logout />} />
      <Route path="/company_registration" element={<CompanyRegistration />} />
      <Route path="/checkout_report" element={<CheckOutReport />} />
      

      <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/real_time_report" element={<RealTimeDashboard />} />
              <Route path="CdrReports/cdrdataview" element={<CDRReport />} />
              <Route path="CdrReports/cdrdataview_old" element={<CDRReportOld />} />
              <Route path="/ObCdrReports/detailscdr" element={<OBCDRReport />} />
              <Route path="/ObCdrReports/detailscdr_old" element={<OBCDRReportOld />} />
              <Route path="/IvrReports" element={<IVRReport />} />
              <Route path="/IvrReports_old" element={<IVRReportOld />} />
              <Route path="ObCdrReports/sharedscdr_external" element={<OBSharedCDRReport />} />
              <Route path="ObCdrReports/sharedscdr_external_old" element={<OBSharedCDRReportOld />} />
              <Route path="/ivr-funnel-report" element={<IVRFunnelReport />} />
              <Route path="/ivr-funnel-report_old" element={<IVRFunnelReportOld />} />
              <Route path="/SrDetails" element={<CallDetails />} />
              <Route path="/ObsrDetails" element={<OutCallDetails />} />
              <Route path="/priority_calls" element={<PriorityCalls />} />
              <Route path="/AbandCallback/csat_view" element={<CsatView />} />
              <Route path="/AbandCallback/csat_view_old" element={<CsatViewOld />} />
              <Route path="/BillingReports/get_stmt" element={<CurrentBillStatement />} />
              <Route path="/BillingReports/get_stmt_audio" element={<CurrentBillStatementAudio />} />
              <Route path="/BillingReports/get_stmt_old" element={<CurrentBillStatementOld />} />
              <Route path="/BillingReports/get_stmt_old_audio" element={<CurrentBillStatementOldAudio />} />
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
              <Route path="/CustomizedReportCreations" element={<ManageCustomizedMIS />} />
              <Route path="/add_call_flow" element={<AddCallFlow />} />
              <Route path="/Ecrs/prompt" element={<PromptCreation />} />
              <Route path="/LoginCreations" element={<ManageUserLogin />} />
              <Route path="/AdminLoginCreations" element={<ManageAdminLogin />} />
              <Route path="/IncallactionAlerts/view_fields" element={<ManageInCallActionAlerts />} />
              <Route path="/MisAndReportMatrixs" element={<ManageMISReports />} />
              <Route path="/manage_training_docs" element={<ManageTrainingDocs />} />
              <Route path="/manage_ivr" element={<ManageIVR />} />
              <Route path="/Ecrs" element={<ManageInCallScenarios />} />
              <Route path="/Ecrs/create_tat" element={<ManageTAT />} />
              <Route path="/alert_mechanism" element={<ManageAlertsEscalations />} />
              <Route path="/CloseLoopings" element={<ManageInCallActions />} />
              <Route path="/out_manage_alert_escalations" element={<OutManageAlertsEscalations />} />
              <Route path="/ObCustomizedReportCreations" element={<OutManageCustomizedMIS />} />
              <Route path="/ObReallocations" element={<ManageReAllocations />} />
              <Route path="/ob_add_call_flow" element={<OBAddCallFlow />} />
              <Route path="/ObcloseLoopings" element={<OutManageCallActions />} />
              <Route path="/Outbounds/add_campaign" element={<ManageCampaign />} />
              <Route path="/ObImports" element={<ManageAllocations />} />
              <Route path="/Obecrs" element={<OutManageCallScenarios />} />
              <Route path="/Agents" element={<CreateManualCall />} />
              <Route path="/closeloops" element={<UpdateTicketStatus />} />
              <Route path="/out_create_manual_call" element={<OutCreateManualCall />} />
              <Route path="/sla_reports" element={<SLAReports />} />
              <Route path="/shopify_reports" element={<ShopifyReports />} />
              <Route path="/tagging_reports" element={<TaggingReports />} />
              <Route path="/call_reports" element={<CallReports />} />
              <Route path="/AbandCallback" element={<AbandCallSetting />} />
              <Route path="/TrainingMasters" element={<TrainingMaster />} />
              <Route path="/ClientFields" element={<ManageFields />} />
              <Route path="/CloseFields" element={<ManageCloseField />} />
              <Route path="/template_creation" element={<TemplateCreation />} />
              <Route path="/fortum_dashboard" element={<FortumDashboard />} />
              <Route path="/AbandonCallReports/external" element={<AbandonedCallDetails />} />
              <Route path="/dialer_mapping" element={<DialerMapping />} />
              <Route path="/view_close_looping/:callId" element={<CloseLooping />} />
              <Route path="/outbound_dashboard_old" element={<OutboundDashboard />} />
              <Route path="/Outbounds/addingroup" element={<IngroupManager />} />
              <Route path="/WorkFlows" element={<ManageWorkFlow />} />
              <Route path="/UploadExistingBases" element={<UploadExistingCustomers />} />
              <Route path="/SrDetails/bot_report" element={<AuditSheet />} />
              <Route path="/SrDetails/index_auto" element={<AutoTagging />} />
              <Route path="/Ivrs/upload_prompt_file" element={<IvrPromptUpload />} />
              <Route path="/MasterField" element={<MasterFieldMapping />} />
              <Route path="/ProcessUpdates/view" element={<ManageProcessUpdate />} />
              <Route path="/ProcessUpdates/report" element={<ProcessUpdateReport />} />
              <Route path="/ProcessUpdates" element={<ProcessUpdates />} />
              <Route path="/LoginLog/" element={<LoginLog />} />
              <Route path="/MisReports/export_tat_mis" element={<TatMis />} />
              <Route path="/MisReports/export_tagging_mis" element={<TaggingMis />} />
              <Route path="/MisReports/category_reports" element={<CallScenario />} />
              <Route path="/MisReports/export_esclation_level_mis" element={<EscalationLevel />} />
              <Route path="/IncallactionReports" element={<InCallAction />} />
              <Route path="/MisReports/export_call_mis" element={<CallMIS />} />
              <Route path="/MisReports/export_answer_call" element={<AnswerCall />} />
              <Route path="/MisReports/export_abend_call" element={<AbandonCall />} />
              <Route path="/MisReports/export_agent_wise_mis" element={<AgentWiseMis />} />
              <Route path="/UploadMisFiles/download" element={<ExportMisFiles />} />
              <Route path="/MisAndReportMatrixs/ob_matrix"  element={<OutCallManageMISReports />} />
              <Route path="/MasterField"  element={<OutMasterFieldMapping />} />
              <Route path="/ScenarioAutomates/call_summary_out" element={<OutCallSummaryReports />} />
              <Route path="/ScenarioAutomates" element={<OutCallSummaryReportsAutomation />} />
              <Route path="/OutCallAutomation" element={<OutCallReportAutomation />} />
              <Route path="/ScenarioReportAutomation" element={<ScenarioReportAutomation />} />
              <Route path="/ObcloseFields" element={<ManageOutCallCloseField />} />
              <Route path="/ObclientFields" element={<ManageOutCallRequiredFilled />} />
              <Route path="/exposure_view" element={<ExposureView />} />
              <Route path="/channel_utilization" element={<ChannelUtilization />} />
              <Route path="/channel_utilization_old" element={<ChannelUtilizationOld />} />
              <Route path="/didlogs_reports"  element={<DidLogsReports />} />
              <Route path="/didlogs_reports_old"  element={<DidLogsReportsOld />} />
              <Route path="/agent_avr" element={<AgentProductivity/>} />
              <Route path="/sla_agents_reports" element={<SlaAgentsReports/>} />
              <Route path="/campaigns_mapping" element={<CampaignsMapping/>} />
              <Route path="/mappings" element={<DidClientCampaignsMapping/>} />
              <Route path="/submenu/:id" element={<SubMenuPage />} />
              <Route path="/CorrectiveReport/index" element={<CorrectiveReport />} />
              <Route path="/CorrectiveReport/index_old" element={<CorrectiveReportOld />} />
              <Route path="/company_registration" element={<CompanyRegistration />} />
              {/* <Route path="/allocation_plan" element={<AllocationPlan />} /> */}
              <Route path="/usage_summary" element={<UsageSummary />} />
              <Route path="/statement_summary" element={<StatementSummary />} />
              <Route path="/InitialInvoices" element={<CreateInvoice />} />
              <Route path="/outbound_dashboard" element={<NewOutboundDashboard />} />
              <Route path="/AbandonReports/customer_wise" element={<CustomerDateWiseDensity />} />
              <Route path="/AbandonReports/customer_wise_old" element={<CustomerDateWiseDensityOld />} />
              <Route path="/CdrReports/dd_clientwise" element={<SLAClientWise />} />
              <Route path="/CdrReports/dd_clientwise_old" element={<SLAClientWiseOldReport />} />
              <Route path="/CdrReports/sla_day_wise" element={<SLADayWise />} />
              <Route path="/CdrReports/report" element={<SLASlotWise />} />
              <Route path="/AbandonReports/client_live_agent" element={<RealtimeAgentMapWithClients />} />
              <Route path="/AbandonReports/skill_wise_excel" element={<OverallAgentSkills />} />
              <Route path="/AbandonReports/agent_wise_skill_excel" element={<CampaignWiseAgentSkill />} />
              <Route path="/AbandonReports/agent_apr" element={<AgentAprExport />} />
              <Route path="/AbandonReports/agent_apr_old" element={<AgentAprExportOld />} />
              <Route path="/DashboardAnest" element={<DashboardAnest />} />
              <Route path="/after_hour_calls" element={<AfterHoursCalls />} />
              <Route path="/after_hour_calls_old" element={<AfterHoursCallsOld />} />
              <Route path="/RLReport" element={<RLReport />} />
              <Route path="/RLReport_old" element={<RLReportOld />} />
              <Route path="/ManualOutbounds" element={<ObCampaignDetails />} />
              <Route path="/Outbounds/addcampaignlistid" element={<CampaignListUI />} />
              <Route path="/MonthConsumption" element={<MonthConsumption />} />
              <Route path="/MonthConsumption_old" element={<MonthConsumptionOld />} />
              <Route path="/Outbound-report" element={<OutboundReport />} />
              <Route path="/Outbound-report_old" element={<OutboundReportOld />} />
              <Route path="/Agent-report" element={<AgentClientWise />} />
              <Route path="/Agent-report_old" element={<AgentClientWiseOld />} />
              <Route path="/RL-report" element={<RLReportClient />} />
              <Route path="/RL-report_old" element={<RLReportClientOld />} />
              <Route path="/AbandonReports/abandon_trend" element={<AbandonTrend />} />
              <Route path="/AbandonReports/abandon_trend_old" element={<AbandonTrendOld />} />
              <Route path="/CdrReports/abandon_call" element={<AbandonCallData />} />
              <Route path="/CdrReports/abandon_call_old" element={<AbandonCallDataOld />} />                                
              <Route path="/CdrReports/report_old" element={<SLAClientWiseOld />} />  
              <Route path="/CdrReports/sla_day_wise_old" element={<SLAClientWisesOld />} />
              <Route path="/UserManages" element={<ManageUserAccess />} />
              <Route path="/Report-Automation" element={<ReportsAutomation />} />
              <Route path="/Backup-Cdr" element={<BackUpCdr />} />
              <Route path="/Backup-AgentApr" element={<BackUpAgentApr />} />
              <Route path="/Backup-Statement" element={<BackupStatement />} />
              <Route path="/BotIntegrationField" element={<BotFieldMapping />} />
              <Route path="/ShopifyIntegrationField" element={<ShopifyIntegration />} />
              <Route path="/HV-Clients" element={<HVClient />} />
              <Route path="/advisor-disconnect" element={<AdvisorDisconnect />} />
              <Route path="/PlanSettings" element={<PlanSettings />} />
              <Route path="/C2PCDRReports" element={<C2PCDRReports />} />
              <Route path="/ClientWiseVarianceReport" element={<ClientWiseVarianceReport />} />
              <Route path="/AgentwiseVarianceReport" element={<AgentwiseVarianceReport />} />
              <Route path="/SaatvikDashboards" element={<SaatvikDashboards />} />
              <Route path="/ObdManagements/report" element={<Obd_Managements_report />} />
              <Route path="/ObdManagements/DataUpload" element={<ObdManagements_Data_Upload />} />
              <Route path="/ObdManagements/addlist" element={<Obd_Managements_addlist />} />
              <Route path="/OrderStatus" element={<OrderStatus />} />
              <Route path="/WeeboInformation" element={<WeeboInformation />} />
              <></>
          </Route>
      </Route>
    </Routes>
  );
}

export default App;
