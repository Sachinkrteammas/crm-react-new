import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Phone,
  PhoneCall,
  TrendingUp,
  TrendingDown,
  Target,
  CheckCircle,
  Clock,
  Trophy,
  Users,
  Hash,
  BarChart3,
  Mail,
  MessageCircle,
  PhoneIncoming,
  PhoneOutgoing,
  Repeat,
  Timer,
  CreditCard,
  Wallet,
  Calendar,
  AlertCircle,
  Tag,
  ArrowUpRight,
  PhoneForwarded,
  IndianRupee,
} from "lucide-react";

import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  Cell,
} from "recharts";
import api from "../api";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

/* ---------------- STYLES ---------------- */
const cardStyle = {
  background: "#fff",
  border: "1px solid #eef2f7",
  borderRadius: 14,
};

const titleStyle = { fontSize: 20, fontWeight: 700, color: "#111827" };
const subtitleStyle = { fontSize: 13, color: "#6b7280" };
const kpiLabel = { fontSize: 13, color: "#6b7280", marginBottom: 4 };
const kpiValue = { fontSize: 26, fontWeight: 700, color: "#111827" };
const ticketTypeColors = ["#2563eb", "#f97316", "#14b8a6", "#9333ea", "#6b7280"];

/* ---------------- HELPERS ---------------- */
const fmtMoney = (n) => {
  if (n === undefined || n === null || n === "") return "—";
  return Number(n).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const getToday = () => new Date().toISOString().split("T")[0];

const getDateRange = (period) => {
  const today = new Date();
  const end = new Date(today);
  const start = new Date(today);

  switch (period) {
    case "today":
      return { start: getToday(), end: getToday() };
    case "yesterday": {
      const y = new Date(today);
      y.setDate(y.getDate() - 1);
      const yStr = y.toISOString().split("T")[0];
      return { start: yStr, end: yStr };
    }
    case "weekly": {
      start.setDate(today.getDate() - 6);
      return {
        start: start.toISOString().split("T")[0],
        end: end.toISOString().split("T")[0],
      };
    }
    case "monthly": {
      const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      return {
        start: firstOfMonth.toISOString().split("T")[0],
        end: end.toISOString().split("T")[0],
      };
    }
    default:
      return { start: getToday(), end: getToday() };
  }
};

/* ---------------- SMALL COMPONENTS ---------------- */
const PageLoader = () => (
  <div
    style={{
      position: "fixed",
      inset: 0,
      background: "rgba(255,255,255,0.85)",
      zIndex: 9999,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "column",
    }}
  >
    <div
      style={{
        width: 48,
        height: 48,
        border: "4px solid #e5e7eb",
        borderTop: "4px solid #2563eb",
        borderRadius: "50%",
        animation: "spin 1s linear infinite",
      }}
    />
    <div
      style={{ marginTop: 14, fontSize: 14, fontWeight: 600, color: "#374151" }}
    >
      Loading inbound analytics…
    </div>
    <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
  </div>
);

const EmptyChart = () => (
  <div style={{ textAlign: "center", color: "#9ca3af", padding: 60, fontSize: 13 }}>
    No data available
  </div>
);

const NoData = () => (
  <div style={{ textAlign: "center", color: "#9ca3af", padding: 30, fontSize: 13 }}>
    No data
  </div>
);

const Kpi = ({ label, value, sub, icon, color, title }) => (
  <div className="col-12 col-sm-6 col-lg-3">
    <div
      title={title || ""}
      style={{
        ...cardStyle,
        padding: 16,
        height: "100%",
        position: "relative",
        cursor: title ? "help" : "default",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 14,
          right: 14,
          width: 38,
          height: 38,
          borderRadius: 10,
          background: `${color}15`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color,
        }}
      >
        {icon}
      </div>
      <div style={kpiLabel}>{label}</div>
      <div style={kpiValue}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>{sub}</div>}
    </div>
  </div>
);

const Legend = ({ color, label }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
    <span style={{ width: 10, height: 10, background: color, borderRadius: 2 }} />
    {label}
  </div>
);

/* ================================================================
                        MAIN COMPONENT
================================================================ */
const NewInboundDashboard = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const navState = location.state;

  const userType = localStorage.getItem("user_type");
  const companyId = localStorage.getItem("company_id");

  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState(
    navState?.client ? String(navState.client) : companyId || ""
  );

  const [period, setPeriod] = useState("today");
  const [startDate, setStartDate] = useState(navState?.start_date || getToday());
  const [endDate, setEndDate] = useState(navState?.end_date || getToday());

  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("overall");
  const [apiError, setApiError] = useState("");

  const [dashboardReport, setDashboardReport] = useState(null);
  const [callAnalysis, setCallAnalysis] = useState(null);
  const [callDistribution, setCallDistribution] = useState([]);
  const [activeServices, setActiveServices] = useState(null);
  const [ticketCaseAnalysis, setTicketCaseAnalysis] = useState(null);
  const [ticketBySource, setTicketBySource] = useState([]);

  const activeCompanyId =
    userType === "Super-Admin" || userType === "Admin"
      ? selectedClient
      : companyId;

  /* ---------------- FETCH CLIENTS ---------------- */
  useEffect(() => {
    const fetchClients = async () => {
      try {
        const res = await api.get("/agents/clients-rights");
        const sorted = (res.data || []).sort((a, b) =>
          (a.company_name || "").localeCompare(b.company_name || "", "en", {
            sensitivity: "base",
          })
        );
        setClients(sorted);
      } catch (err) {
        console.error("Error fetching clients:", err);
      }
    };

    if (userType === "Super-Admin" || userType === "Admin") {
      fetchClients();
    }
  }, [userType]);

  /* ---------------- PERIOD HANDLER ---------------- */
  const handlePeriodChange = (newPeriod) => {
    setPeriod(newPeriod);
    if (newPeriod !== "custom") {
      const range = getDateRange(newPeriod);
      setStartDate(range.start);
      setEndDate(range.end);
    }
  };

  const getViewType = () => {
    switch (period) {
      case "today":
        return "Today";
      case "yesterday":
        return "Yesterday";
      case "weekly":
        return "Weekly";
      case "monthly":
        return "Monthly";
      case "custom":
        return "Custom";
      default:
        return "Today";
    }
  };

  /* ============================================================
     ✅ NAVIGATE TO OUTBOUND — WITH CLIENT GUARD
     ============================================================ */
  const goToOutbound = () => {
    // Admin/Super-Admin must pick a client before switching
    if (userType === "Super-Admin" || userType === "Admin") {
      if (
        !selectedClient ||
        selectedClient === "null" ||
        selectedClient === "" ||
        selectedClient === "undefined"
      ) {
        alert("Please select a client first before switching to Outbound.");
        return;
      }
    }

    // Regular user must have a companyId in localStorage
    if (!activeCompanyId || activeCompanyId === "null" || activeCompanyId === "") {
      alert("No client available. Please contact your administrator.");
      return;
    }

    navigate("/outbound_dashboard", {
      state: {
        client: activeCompanyId,
        start_date: startDate,
        end_date: endDate,
        autoLoad: true,
      },
    });
  };

  /* ---------------- PAYLOADS ---------------- */
  const dashboardReqPayload = () => ({
    company_id: Number(activeCompanyId),
    view_type: getViewType(),
    from_date: startDate,
    to_date: endDate,
  });

  const activeServicesPayload = () => ({
    company_id: Number(activeCompanyId),
  });

  /* =============================================================
     API CALLS — PREFIXED WITH /dashboard
     ============================================================= */
  const fetchDashboardReport = () =>
    api
      .post("/dashboard/dashboard_report", dashboardReqPayload())
      .then((r) => setDashboardReport(r.data))
      .catch((e) => {
        console.error("dashboard_report error", e);
        setApiError((prev) => `${prev}\ndashboard_report: ${e.message}`);
        setDashboardReport(null);
      });

  const fetchCallAnalysis = () =>
    api
      .post("/dashboard/call_analysis_report", dashboardReqPayload())
      .then((r) => setCallAnalysis(r.data))
      .catch((e) => {
        console.error("call_analysis_report error", e);
        setCallAnalysis(null);
      });

  const fetchCallDistribution = () =>
    api
      .post("/dashboard/call_distribution_report", dashboardReqPayload())
      .then((r) => setCallDistribution(r.data || []))
      .catch((e) => {
        console.error("call_distribution_report error", e);
        setCallDistribution([]);
      });

  const fetchActiveServices = () =>
    api
      .post("/dashboard/active_services", activeServicesPayload())
      .then((r) => setActiveServices(r.data))
      .catch((e) => {
        console.error("active_services error", e);
        setActiveServices(null);
      });

  const fetchTicketCaseAnalysis = () =>
    api
      .post(
        `/dashboard/ticket_case_analysis?company_id=${Number(activeCompanyId)}`,
        dashboardReqPayload()
      )
      .then((r) => setTicketCaseAnalysis(r.data))
      .catch((e) => {
        console.error("ticket_case_analysis error", e);
        setTicketCaseAnalysis(null);
      });

  const fetchTicketBySource = () =>
    api
      .post("/dashboard/ticket_by_source", dashboardReqPayload())
      .then((r) => setTicketBySource(r.data || []))
      .catch((e) => {
        console.error("ticket_by_source error", e);
        setTicketBySource([]);
      });

  /* ---------------- HANDLE VIEW ---------------- */
  const handleViewClick = async () => {
    if (
      (userType === "Super-Admin" || userType === "Admin") &&
      (!selectedClient || selectedClient === "null" || selectedClient === "")
    ) {
      alert("Please select a client first.");
      return;
    }
    if (!activeCompanyId) {
      alert("No client selected.");
      return;
    }

    setApiError("");
    setLoading(true);
    try {
      await Promise.all([
        fetchDashboardReport(),
        fetchCallAnalysis(),
        fetchCallDistribution(),
        fetchActiveServices(),
        fetchTicketCaseAnalysis(),
        fetchTicketBySource(),
      ]);
    } catch (e) {
      console.error("Dashboard API error", e);
    } finally {
      setLoading(false);
    }
  };

  /* ---------------- AUTO-LOAD ON NAVIGATION FROM OUTBOUND ---------------- */
  useEffect(() => {
    if (!activeCompanyId) return;
    if (navState?.client || navState?.autoLoad) {
      handleViewClick();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCompanyId]);

  /* ---------------- DERIVED ---------------- */
  const totalCallsOffered =
    dashboardReport?.days?.reduce((s, d) => s + (d.Total || 0), 0) || 0;
  const answeredCalls =
    dashboardReport?.days?.reduce((s, d) => s + (d.Answered || 0), 0) || 0;
  const abandonedCalls =
    dashboardReport?.days?.reduce((s, d) => s + (d.Abandon || 0), 0) || 0;
  const uniqueCallsOffered =
    dashboardReport?.days?.reduce((s, d) => s + (d.Unique || 0), 0) || 0;
  const uniqueAbandoned =
    dashboardReport?.days?.reduce((s, d) => s + (d.Unique_abandon || 0), 0) || 0;

  const totalTagged = dashboardReport?.total_tagged || 0;
  const totalAbandonCb = dashboardReport?.total_abandon_cb || 0;
  const callbackTaggedCalls = dashboardReport?.total_callback_tagged ?? 0;

  const alPercent =
    totalCallsOffered > 0
      ? ((answeredCalls / totalCallsOffered) * 100).toFixed(1)
      : "0.0";
  const finalAlPercent =
    totalCallsOffered > 0
      ? (((answeredCalls + totalAbandonCb) / totalCallsOffered) * 100).toFixed(1)
      : "0.0";
  const taggingPercent =
    answeredCalls > 0
      ? ((totalTagged / answeredCalls) * 100).toFixed(1)
      : "0.0";

  const callAnalysisAnswered = callAnalysis?.answered || 0;
  const callAnalysisAbandon = callAnalysis?.abandon || 0;

  const totalTickets = ticketBySource.reduce((s, t) => s + (t.total || 0), 0);
  const totalOpen = ticketBySource.reduce((s, t) => s + (t.open || 0), 0);
  const totalClosed = ticketBySource.reduce((s, t) => s + (t.close || 0), 0);

  const openTat = ticketCaseAnalysis?.open_tat?.[0] || { InTAT: 0, OutOfTAT: 0 };
  const closeTat = ticketCaseAnalysis?.close_tat?.[0] || { InTAT: 0, OutOfTAT: 0 };

  const trendData = (dashboardReport?.days || []).map((d) => ({
    day: d.gdate,
    offered: d.Total,
    answered: d.Answered,
    abandoned: d.Abandon,
    unique: d.Unique,
    tagged:
      answeredCalls > 0
        ? Math.round((d.Answered / answeredCalls) * totalTagged)
        : 0,
    alPercent:
      d.Total > 0 ? Number(((d.Answered / d.Total) * 100).toFixed(1)) : 0,
  }));

  const callDistributionData = callDistribution.map((d) => ({
    day: d.date,
    answered: d.Answered,
    abandoned: d.Abandon,
  }));

  /* ✅ True if client is selected (used for UI hint) */
  const hasClientSelected =
    userType === "Super-Admin" || userType === "Admin"
      ? !!selectedClient &&
        selectedClient !== "null" &&
        selectedClient !== "" &&
        selectedClient !== "undefined"
      : !!companyId;

  return (
    <div>
      {loading && <PageLoader />}

      {/* HEADER */}
      <div className="card mb-4">
        <div className="card-body d-flex justify-content-between align-items-center flex-wrap gap-3">
          <div>
            <div style={titleStyle}>Inbound Dashboard</div>
            <div style={subtitleStyle}>
              Monitor inbound call performance, tagging, and tickets
            </div>
          </div>

          <div className="d-flex align-items-end flex-wrap gap-2">
            {/* ✅ Switch Dashboard */}
            <div>
              <label className="form-label fw-semibold mb-1">
                Switch Dashboard
              </label>
              <div className="dropdown">
                <button
                  className="btn btn-outline-primary btn-sm dropdown-toggle d-flex align-items-center gap-2"
                  type="button"
                  data-bs-toggle="dropdown"
                  aria-expanded="false"
                  style={{ minWidth: 180 }}
                >
                  <PhoneForwarded size={14} />
                  Inbound (current)
                </button>
                <ul className="dropdown-menu" style={{ minWidth: 240 }}>
                  <li>
                    <button className="dropdown-item d-flex align-items-center gap-2 active">
                      <Phone size={14} />
                      Inbound Dashboard
                    </button>
                  </li>
                  <li>
                    <button
                      className={`dropdown-item d-flex align-items-center gap-2 ${
                        !hasClientSelected ? "disabled" : ""
                      }`}
                      onClick={(e) => {
                        e.preventDefault();
                        if (!hasClientSelected) {
                          alert(
                            "Please select a client first before switching to Outbound."
                          );
                          return;
                        }
                        goToOutbound();
                      }}
                      style={
                        !hasClientSelected
                          ? { opacity: 0.5, cursor: "not-allowed" }
                          : {}
                      }
                      title={
                        !hasClientSelected
                          ? "Select a client first"
                          : "Open Outbound Dashboard"
                      }
                    >
                      <PhoneOutgoing size={14} />
                      Outbound Dashboard
                      <ArrowUpRight
                        size={12}
                        style={{ marginLeft: "auto", opacity: 0.6 }}
                      />
                    </button>
                  </li>
                  {!hasClientSelected && (
                    <li>
                      <div
                        className="dropdown-item-text text-muted"
                        style={{ fontSize: 11 }}
                      >
                        ⚠ Select a client to unlock Outbound
                      </div>
                    </li>
                  )}
                </ul>
              </div>
            </div>

            {(userType === "Super-Admin" || userType === "Admin") && (
              <div>
                <label className="form-label fw-semibold mb-1">
                  Select Client
                </label>
                <select
                  className="form-select form-select-sm"
                  style={{ width: 200 }}
                  value={selectedClient || ""}
                  onChange={(e) => setSelectedClient(e.target.value)}
                >
                  <option value="">-- Select Client --</option>
                  {clients.map((c) => (
                    <option key={c.company_id} value={c.company_id}>
                      {c.company_name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="form-label fw-semibold mb-1">Period</label>
              <select
                className="form-select form-select-sm"
                style={{ width: 140 }}
                value={period}
                onChange={(e) => handlePeriodChange(e.target.value)}
              >
                <option value="today">Today</option>
                <option value="yesterday">Yesterday</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="custom">Custom</option>
              </select>
            </div>

            <div>
              <label className="form-label fw-semibold mb-1">Start Date</label>
              <input
                type="date"
                className="form-control form-control-sm"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setPeriod("custom");
                }}
                disabled={period !== "custom"}
              />
            </div>

            <div>
              <label className="form-label fw-semibold mb-1">End Date</label>
              <input
                type="date"
                className="form-control form-control-sm"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setPeriod("custom");
                }}
                disabled={period !== "custom"}
              />
            </div>

            <button
              className="btn btn-primary btn-sm"
              onClick={handleViewClick}
              disabled={loading}
            >
              {loading ? "Loading..." : "VIEW"}
            </button>
          </div>
        </div>
      </div>

      {apiError && (
        <div
          className="alert alert-warning"
          style={{ whiteSpace: "pre-wrap", fontSize: 12 }}
        >
          <strong>Some APIs failed:</strong>
          {apiError}
        </div>
      )}

      {/* TABS */}
      <div className="d-flex gap-2 mb-4">
        <button
          className={`btn btn-sm ${
            activeTab === "overall" ? "btn-primary" : "btn-outline-secondary"
          }`}
          onClick={() => setActiveTab("overall")}
        >
          Overall
        </button>
        <button
          className={`btn btn-sm ${
            activeTab === "rl" ? "btn-primary" : "btn-outline-secondary"
          }`}
          onClick={() => setActiveTab("rl")}
        >
          RL · abandoned-call recovery
        </button>
        <button
          className={`btn btn-sm ${
            activeTab === "billing" ? "btn-primary" : "btn-outline-secondary"
          }`}
          onClick={() => setActiveTab("billing")}
        >
          Billing &amp; usage
        </button>
      </div>

      {/* ============== OVERALL TAB ============== */}
      {activeTab === "overall" && (
        <>
          <div className="row g-3 mb-3">
            <Kpi
              label="Total Calls Offered"
              value={totalCallsOffered.toLocaleString()}
              icon={<PhoneCall size={18} />}
              color="#2563eb"
            />
            <Kpi
              label="Answered Calls"
              value={answeredCalls.toLocaleString()}
              icon={<Phone size={18} />}
              color="#00b894"
            />
            <Kpi
              label="Total Abandoned Calls"
              value={abandonedCalls.toLocaleString()}
              icon={<TrendingDown size={18} />}
              color="#ef4444"
            />
            <Kpi
              label="AL %"
              value={`${alPercent}%`}
              icon={<Target size={18} />}
              color="#06b6d4"
            />
          </div>

          <div className="row g-3 mb-4">
            <Kpi
              label="SL % (20 s)"
              value="—"
              icon={<Clock size={18} />}
              color="#f59e0b"
            />
            <Kpi
              label="Connected Calls (Abandon Callbacks)"
              value={totalAbandonCb.toLocaleString()}
              icon={<PhoneCall size={18} />}
              color="#8b5cf6"
            />
            <Kpi
              label="Final AL %"
              value={`${finalAlPercent}%`}
              icon={<CheckCircle size={18} />}
              color="#00b894"
            />
            <Kpi
              label="Final Unique AL %"
              value="—"
              icon={<Trophy size={18} />}
              color="#059669"
            />
          </div>

          <div className="row g-3 mb-4">
            <Kpi
              label="Tagged Calls"
              value={totalTagged.toLocaleString()}
              sub={`${taggingPercent}% of answered calls`}
              icon={<Tag size={18} />}
              color="#2563eb"
            />
            <Kpi
              label="Tagging %"
              value={`${taggingPercent}%`}
              sub={`${totalTagged} of ${answeredCalls} answered`}
              icon={<Hash size={18} />}
              color="#14b8a6"
            />
            <Kpi
              label="CallBack Tagged Calls"
              value={callbackTaggedCalls.toLocaleString()}
              sub="Tagged callbacks (in this period)"
              icon={<PhoneIncoming size={18} />}
              color="#f97316"
            />
            <Kpi
              label="Email Tickets"
              value={
                ticketBySource.find((t) => t.source?.toLowerCase() === "email")
                  ?.total ?? 0
              }
              icon={<Mail size={18} />}
              color="#f59e0b"
            />
          </div>

          <div className="row g-3 mb-4">
            <div className="col-md-4">
              <div style={{ ...cardStyle, padding: 16 }}>
                <div style={kpiLabel}>Unique Calls Offered</div>
                <div style={kpiValue}>{uniqueCallsOffered.toLocaleString()}</div>
              </div>
            </div>
            <div className="col-md-4">
              <div style={{ ...cardStyle, padding: 16 }}>
                <div style={kpiLabel}>Unique Answered Calls</div>
                <div style={kpiValue}>{callAnalysisAnswered.toLocaleString()}</div>
              </div>
            </div>
            <div className="col-md-4">
              <div style={{ ...cardStyle, padding: 16 }}>
                <div style={kpiLabel}>Unique Abandoned Calls</div>
                <div style={kpiValue}>{uniqueAbandoned.toLocaleString()}</div>
              </div>
            </div>
          </div>

          <div className="row g-3 mb-4">
            <div className="col-md-6">
              <div style={{ ...cardStyle, padding: 18 }}>
                <div style={{ fontWeight: 600, marginBottom: 12 }}>
                  Calls by Day
                </div>
                {trendData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={trendData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="day" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="answered" stackId="a" fill="#2563eb" />
                      <Bar dataKey="abandoned" stackId="a" fill="#f97316" />
                      <Bar dataKey="tagged" stackId="a" fill="#14b8a6" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyChart />
                )}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    gap: 16,
                    fontSize: 12,
                    marginTop: 8,
                  }}
                >
                  <Legend color="#2563eb" label="Answered" />
                  <Legend color="#f97316" label="Abandoned" />
                  <Legend color="#14b8a6" label="Tagged" />
                </div>
              </div>
            </div>

            <div className="col-md-6">
              <div style={{ ...cardStyle, padding: 18 }}>
                <div style={{ fontWeight: 600, marginBottom: 12 }}>
                  Call Distribution %
                </div>
                {callDistributionData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={callDistributionData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="day" />
                      <YAxis domain={[0, 100]} />
                      <Tooltip />
                      <Bar dataKey="answered" fill="#2563eb" />
                      <Bar dataKey="abandoned" fill="#f97316" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyChart />
                )}
              </div>
            </div>
          </div>

          <div className="row g-3 mb-4">
            <div className="col-md-6">
              <div style={{ ...cardStyle, padding: 18 }}>
                <div style={{ fontWeight: 600, marginBottom: 12 }}>
                  Tickets by Source
                </div>
                {ticketBySource.length > 0 ? (
                  <table
                    style={{
                      width: "100%",
                      borderCollapse: "collapse",
                      fontSize: 13,
                    }}
                  >
                    <thead>
                      <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
                        <th align="left">Source</th>
                        <th align="right">Total</th>
                        <th align="right">Open</th>
                        <th align="right">Closed</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ticketBySource.map((s, i) => (
                        <tr
                          key={i}
                          style={{ borderBottom: "1px solid #f3f4f6" }}
                        >
                          <td style={{ padding: "8px 0" }}>{s.source}</td>
                          <td align="right">{s.total}</td>
                          <td align="right">{s.open}</td>
                          <td align="right">{s.close}</td>
                        </tr>
                      ))}
                      <tr
                        style={{
                          fontWeight: 700,
                          borderTop: "1px solid #e5e7eb",
                        }}
                      >
                        <td style={{ padding: "8px 0" }}>All sources</td>
                        <td align="right">{totalTickets}</td>
                        <td align="right">{totalOpen}</td>
                        <td align="right">{totalClosed}</td>
                      </tr>
                    </tbody>
                  </table>
                ) : (
                  <NoData />
                )}
              </div>
            </div>

            <div className="col-md-6">
              <div style={{ ...cardStyle, padding: 18 }}>
                <div style={{ fontWeight: 600, marginBottom: 12 }}>
                  TAT Analysis
                </div>
                {ticketCaseAnalysis ? (
                  <div className="row g-3">
                    <div className="col-6">
                      <div
                        style={{
                          background: "#f8fafc",
                          borderRadius: 12,
                          padding: 16,
                        }}
                      >
                        <div style={kpiLabel}>Open Tickets</div>
                        <div style={{ display: "flex", gap: 16, marginTop: 8 }}>
                          <div>
                            <div
                              style={{
                                fontSize: 24,
                                fontWeight: 700,
                                color: "#16a34a",
                              }}
                            >
                              {openTat.InTAT}
                            </div>
                            <div style={{ fontSize: 12, color: "#6b7280" }}>
                              In TAT
                            </div>
                          </div>
                          <div>
                            <div
                              style={{
                                fontSize: 24,
                                fontWeight: 700,
                                color: "#dc2626",
                              }}
                            >
                              {openTat.OutOfTAT}
                            </div>
                            <div style={{ fontSize: 12, color: "#6b7280" }}>
                              Out of TAT
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="col-6">
                      <div
                        style={{
                          background: "#f8fafc",
                          borderRadius: 12,
                          padding: 16,
                        }}
                      >
                        <div style={kpiLabel}>Closed Tickets</div>
                        <div style={{ display: "flex", gap: 16, marginTop: 8 }}>
                          <div>
                            <div
                              style={{
                                fontSize: 24,
                                fontWeight: 700,
                                color: "#16a34a",
                              }}
                            >
                              {closeTat.InTAT}
                            </div>
                            <div style={{ fontSize: 12, color: "#6b7280" }}>
                              In TAT
                            </div>
                          </div>
                          <div>
                            <div
                              style={{
                                fontSize: 24,
                                fontWeight: 700,
                                color: "#dc2626",
                              }}
                            >
                              {closeTat.OutOfTAT}
                            </div>
                            <div style={{ fontSize: 12, color: "#6b7280" }}>
                              Out of TAT
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <NoData />
                )}
              </div>
            </div>
          </div>

          {ticketCaseAnalysis?.cases?.[0]?.data && (
            <div className="row g-3 mb-4">
              <div className="col-12">
                <div style={{ ...cardStyle, padding: 18 }}>
                  <div style={{ fontWeight: 600, marginBottom: 12 }}>
                    Tickets by Category
                  </div>
                  <div
                    style={{ display: "flex", flexWrap: "wrap", gap: 12, fontSize: 12 }}
                  >
                    {Object.entries(ticketCaseAnalysis.cases[0].data).map(
                      ([key, value], i) => (
                        <div
                          key={i}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            padding: "6px 12px",
                            background: "#f8fafc",
                            borderRadius: 8,
                          }}
                        >
                          <span
                            style={{
                              width: 10,
                              height: 10,
                              borderRadius: 2,
                              background:
                                ticketTypeColors[i % ticketTypeColors.length],
                            }}
                          />
                          <span style={{ fontWeight: 600 }}>{key}</span>
                          <span style={{ color: "#6b7280" }}>{value}</span>
                        </div>
                      )
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="row g-3">
            <div className="col-md-6">
              <div style={{ ...cardStyle, padding: 18, height: "100%" }}>
                <div style={{ fontWeight: 600, marginBottom: 18 }}>
                  Call Funnel
                </div>
                {[
                  { label: "Total Offered", val: totalCallsOffered, pct: 100 },
                  {
                    label: "Answered",
                    val: answeredCalls,
                    pct:
                      totalCallsOffered > 0
                        ? Number(
                            ((answeredCalls / totalCallsOffered) * 100).toFixed(1)
                          )
                        : 0,
                  },
                  {
                    label: "Abandoned",
                    val: abandonedCalls,
                    pct:
                      totalCallsOffered > 0
                        ? Number(
                            ((abandonedCalls / totalCallsOffered) * 100).toFixed(1)
                          )
                        : 0,
                  },
                  {
                    label: "Tagged",
                    val: totalTagged,
                    pct:
                      totalCallsOffered > 0
                        ? Number(
                            ((totalTagged / totalCallsOffered) * 100).toFixed(1)
                          )
                        : 0,
                  },
                ].map((f, i) => (
                  <div key={i} style={{ marginBottom: 18 }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: 13,
                        fontWeight: 600,
                        marginBottom: 6,
                      }}
                    >
                      <span>{f.label}</span>
                      <span style={{ color: "#111827" }}>
                        {f.val?.toLocaleString()}{" "}
                        <span style={{ color: "#6b7280" }}>({f.pct}%)</span>
                      </span>
                    </div>
                    <div
                      style={{
                        height: 28,
                        background: "#f3f4f6",
                        borderRadius: 999,
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          width: `${Math.min(f.pct, 100)}%`,
                          height: "100%",
                          background:
                            i === 0
                              ? "#059669"
                              : i === 1
                              ? "#14b8a6"
                              : i === 2
                              ? "#10b981"
                              : "#2563eb",
                          display: "flex",
                          alignItems: "center",
                          paddingLeft: 12,
                          color: "#fff",
                          fontSize: 12,
                          fontWeight: 600,
                        }}
                      >
                        {f.pct}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="col-md-6">
              <div style={{ ...cardStyle, padding: 18, height: "100%" }}>
                <div style={{ fontWeight: 600, marginBottom: 16 }}>
                  Performance Trends
                </div>
                {trendData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={240}>
                    <LineChart data={trendData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="day" />
                      <YAxis yAxisId="left" />
                      <YAxis yAxisId="right" orientation="right" />
                      <Tooltip />
                      <Line
                        yAxisId="left"
                        dataKey="offered"
                        stroke="#14b8a6"
                        strokeWidth={2}
                        dot
                      />
                      <Line
                        yAxisId="left"
                        dataKey="answered"
                        stroke="#2563eb"
                        strokeWidth={2}
                        dot
                      />
                      <Line
                        yAxisId="left"
                        dataKey="tagged"
                        stroke="#8b5cf6"
                        strokeWidth={2}
                        dot
                      />
                      <Line
                        yAxisId="right"
                        dataKey="alPercent"
                        stroke="#9333ea"
                        strokeWidth={2}
                        dot
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyChart />
                )}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    gap: 16,
                    fontSize: 12,
                    marginTop: 8,
                  }}
                >
                  <Legend color="#14b8a6" label="Offered" />
                  <Legend color="#2563eb" label="Answered" />
                  <Legend color="#8b5cf6" label="Tagged" />
                  <Legend color="#9333ea" label="AL %" />
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ============== RL TAB ============== */}
      {activeTab === "rl" && (
        <>
          <div className="row g-3 mb-3">
            <Kpi
              label="Total Abandoned Calls"
              value={abandonedCalls.toLocaleString()}
              icon={<TrendingDown size={18} />}
              color="#ef4444"
            />
            <Kpi
              label="Unique Abandoned Numbers"
              value={uniqueAbandoned.toLocaleString()}
              icon={<Users size={18} />}
              color="#f59e0b"
            />
            <Kpi
              label="Abandon Callbacks"
              value={totalAbandonCb.toLocaleString()}
              icon={<PhoneOutgoing size={18} />}
              color="#2563eb"
            />
            <Kpi
              label="Recovery Rate"
              value={
                uniqueAbandoned > 0
                  ? `${((totalAbandonCb / uniqueAbandoned) * 100).toFixed(1)}%`
                  : "—"
              }
              icon={<Target size={18} />}
              color="#00b894"
            />
          </div>
        </>
      )}

      {/* ============== BILLING TAB ============== */}
      {activeTab === "billing" && (
        <>
          <div className="row g-3 mb-3">
            <Kpi
              label="Plan Name"
              value={activeServices?.plan_name || "—"}
              icon={<CreditCard size={18} />}
              color="#2563eb"
            />
            <Kpi
              label="Period Type"
              value={activeServices?.period_type || "—"}
              icon={<Calendar size={18} />}
              color="#f59e0b"
            />
            <Kpi
              label="Credit Value"
              value={fmtMoney(activeServices?.credit_value)}
              icon={<Wallet size={18} />}
              color="#8b5cf6"
            />
            <Kpi
              label="Subscription Value"
              value={fmtMoney(activeServices?.subscription_value)}
              icon={<IndianRupee size={18} />}
              color="#00b894"
            />
          </div>
        </>
      )}
    </div>
  );
};

export default NewInboundDashboard;