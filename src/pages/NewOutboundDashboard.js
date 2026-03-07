import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import {
  Phone,
  PhoneCall,
  Hash,
  TrendingUp,
  Target,
  Users,
  CheckCircle,
  BarChart3,
  Clock,
  Trophy,
  TrendingDown,
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


/* ---------------- CLIENT COMPARISON ---------------- */
const clientData = [
  {
    name: "Acme Leads",
    type: "Qualified Leads",
    connection: 38,
    outcome: 29,
    totalCalls: 6500,
    aht: "4:15",
    trend: "up",
  },
  {
    name: "TechCorp",
    type: "Meetings Scheduled",
    connection: 42,
    outcome: 32,
    totalCalls: 5200,
    aht: "4:45",
    trend: "up",
  },
  {
    name: "Healthcare Pro",
    type: "Interested",
    connection: 35,
    outcome: 25,
    totalCalls: 4800,
    aht: "3:58",
    trend: "flat",
  },
  {
    name: "Finance Group",
    type: "Conversions",
    connection: 33,
    outcome: 22,
    totalCalls: 3900,
    aht: "5:20",
    trend: "down",
  },
];

const ClientComparisonCard = ({ client }) => {
  const trendBg =
    client.trend === "up"
      ? "#dcfce7"
      : client.trend === "down"
      ? "#fee2e2"
      : "#f3f4f6";

  const trendColor =
    client.trend === "up"
      ? "#16a34a"
      : client.trend === "down"
      ? "#ef4444"
      : "#6b7280";

  const trendIcon =
    client.trend === "up" ? "↗" : client.trend === "down" ? "↘" : "→";

  return (
    <div className="col-12 col-sm-6 col-lg-3">
      <div
        style={{
          background: "#fff",
          border: "1px solid #e5e7eb",
          borderRadius: 14,
          padding: 16,
          height: "100%",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 16,
          }}
        >
          <div style={{ display: "flex", gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: "#ccfbf1",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#0f766e",
              }}
            >
              <BarChart3 size={16} />
            </div>
            <div>
              <div style={{ fontWeight: 600 }}>{client.name}</div>
              <div style={{ fontSize: 12, color: "#6b7280" }}>
                {client.type}
              </div>
            </div>
          </div>

          {/* Trend pill */}
          <div
            style={{
              width: 24,
              height: 24,
              borderRadius: "50%",
              background: trendBg,
              color: trendColor,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            {trendIcon}
          </div>
        </div>

        {/* Connection Rate */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 13,
            marginBottom: 6,
          }}
        >
          <span>Connection Rate</span>
          <strong>{client.connection}%</strong>
        </div>
        <div
          style={{
            height: 6,
            background: "#f1f5f9",
            borderRadius: 6,
            marginBottom: 14,
          }}
        >
          <div
            style={{
              width: `${client.connection}%`,
              height: "100%",
              background: "#2563eb",
              borderRadius: 6,
            }}
          />
        </div>

        {/* Outcome Rate */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 13,
            marginBottom: 6,
          }}
        >
          <span>Outcome Rate</span>
          <strong>{client.outcome}%</strong>
        </div>
        <div
          style={{
            height: 6,
            background: "#f1f5f9",
            borderRadius: 6,
            marginBottom: 18,
          }}
        >
          <div
            style={{
              width: `${client.outcome}%`,
              height: "100%",
              background: "#10b981",
              borderRadius: 6,
            }}
          />
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 12,
            color: "#374151",
          }}
        >
          <div>
            <Phone size={12} style={{ marginRight: 4 }} />
            Total Calls
            <div style={{ fontWeight: 700 }}>
              {client.totalCalls.toLocaleString()}
            </div>
          </div>

          <div>
            <Clock size={12} style={{ marginRight: 4 }} />
            Avg AHT
            <div style={{ fontWeight: 700 }}>{client.aht}</div>
          </div>
        </div>
      </div>
    </div>
  );
};



/* ---------------- STYLES ---------------- */
const cardStyle = {
  background: "#fff",
  border: "1px solid #eef2f7",
  borderRadius: 14,
};

const titleStyle = {
  fontSize: 20,
  fontWeight: 700,
  color: "#111827",
};

const subtitleStyle = {
  fontSize: 13,
  color: "#6b7280",
};

const kpiLabel = {
  fontSize: 13,
  color: "#6b7280",
  marginBottom: 4,
};

const kpiValue = {
  fontSize: 26,
  fontWeight: 700,
  color: "#111827",
};

const trendUp = {
  fontSize: 12,
  color: "#00b894",
  fontWeight: 600,
};

const trendDown = {
  fontSize: 12,
  color: "#ef4444",
  fontWeight: 600,
};


const dropColors = [
  "#ef4444",
  "#f97316",
  "#f59e0b",
  "#eab308",
  "#84cc16",
  "#22c55e",
];


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
      style={{
        marginTop: 14,
        fontSize: 14,
        fontWeight: 600,
        color: "#374151",
      }}
    >
      Loading outbound analytics…
    </div>

    {/* Spinner animation */}
    <style>
      {`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}
    </style>
  </div>
);



/* ---------------- COMPONENT ---------------- */
const NewOutboundDashboard = () => {

  const location = useLocation();
  const navState = location.state;

  const today = new Date().toISOString().split("T")[0];
  const userType = localStorage.getItem("user_type");
  const companyId = localStorage.getItem("company_id");

  const [clients, setClients] = React.useState([]);
  const [selectedClient, setSelectedClient] = useState(
    navState?.client || companyId
  );
  const [startDate, setStartDate] = React.useState(today);
  const [endDate, setEndDate] = React.useState(today);
  const [loading, setLoading] = React.useState(false);


  const [kpi, setKpi] = useState(null);
  const [funnel, setFunnel] = useState(null);
  const [trend, setTrend] = useState([]);
  const [trendAvg, setTrendAvg] = useState([]);
  const [efficiency, setEfficiency] = useState(null);
  const [agents, setAgents] = useState([]);
  const [drops, setDrops] = useState([]);



  const activeCompanyId =
    userType === "Super-Admin" || userType === "Admin"
      ? selectedClient
      : companyId;


  useEffect(() => {
    const fetchClients = async () => {
      try {
        const res = await api.get("/agents/clients-rights");
        setClients(
          res.data.sort((a, b) =>
            a.company_name.localeCompare(b.company_name, "en", {
              sensitivity: "base",
            })
          )
        );
      } catch (err) {
        console.error("Error fetching clients:", err);
      }
    };

    if (userType === "Super-Admin" || userType === "Admin") {
      fetchClients();
    }
  }, [userType]);



  const payload = {
    company_id: Number(activeCompanyId),
    start_date: startDate,
    end_date: endDate,
  };

  const fetchKpi = () =>
    api.post("/outbound/kpi-summary", null, { params: payload })
     .then(r => setKpi(r.data));

  const fetchFunnel = () =>
    api.post("/outbound/call-funnel", null, { params: payload })
         .then(r => setFunnel(r.data));

  const fetchTrend = () =>
    api.post("/outbound/performance-trend", null, { params: payload })
         .then(r => {
            setTrend(r.data.trend);
            setTrendAvg(r.data.averages);
         });

  const fetchEfficiency = () =>
    api.post("/outbound/efficiency-metrics", null, { params: payload })
         .then(r => setEfficiency(r.data));

  const fetchAgents = () =>
    api.post("/outbound/agent-performance", null, { params: payload })
         .then(r => setAgents(r.data));

  const fetchDrops = () =>
    api.post("/outbound/drop-reasons", null, { params: payload })
         .then(r => setDrops(r.data));




    const handleViewClick = async () => {
        if (
          (userType === "Super-Admin" || userType === "Admin") &&
          (!selectedClient || selectedClient === "null")
        ) {
          alert("Please select a client first.");
          return;
        }

        setLoading(true);
        try {
          await Promise.all([
            fetchKpi(),
            fetchFunnel(),
            fetchTrend(),
            fetchEfficiency(),
            fetchAgents(),
            fetchDrops(),
          ]);
        } catch (e) {
          console.error("Dashboard API error", e);
        } finally {
          setLoading(false);
        }
    };

    
  useEffect(() => {
    if (navState) {
      handleViewClick();
    }
  }, []);



  /* ---------------- Agent Performance Data ---------------- */
  const agentPerformance = agents.map(a => ({
      name: a.agent,
      calls: a.calls,
      connection: a.connection,
      outcome: a.outcome,
      aht: `${Math.floor(a.ahtSec / 60)}:${a.ahtSec % 60}`,
      status:
        a.outcome >= 30 ? "Excellent" :
        a.outcome >= 20 ? "Average" :
        "Needs Improvement"
  }));


  const totalAgents = agentPerformance.length;
  const avgCalls = Math.round(agentPerformance.reduce((acc, a) => acc + a.calls, 0) / totalAgents);
  const avgConnection = (agentPerformance.reduce((acc, a) => acc + a.connection, 0) / totalAgents).toFixed(1);
  const avgOutcome = (agentPerformance.reduce((acc, a) => acc + a.outcome, 0) / totalAgents).toFixed(1);

  const getStatusColor = (status) => {
    if (status === "Excellent") return "#d1fae5";
    if (status === "Needs Improvement") return "#fee2e2";
    return "#f3f4f6";
  };

  const getStatusTextColor = (status) => {
    if (status === "Excellent") return "#065f46";
    if (status === "Needs Improvement") return "#b91c1c";
    return "#374151";
  };



  const agentData = efficiency?.agents?.map(a => ({
      name: a.agent,
      talk: a.talkSec,
      wrap: a.wrapSec,
  })) || [];


  const totalDrops = drops.reduce((sum, d) => sum + d.value, 0);

  const dropBreakdown = drops.map((d, i) => ({
      reason: d.reason,
      percent: totalDrops ? Math.round((d.value * 100) / totalDrops) : 0,
      color: dropColors[i % dropColors.length],
  }));


  return (
    <div>
      {loading && <PageLoader />}

      {/* HEADER */}
      <div className="card mb-4">
          <div className="card-body d-flex justify-content-between align-items-center">
            <div>
              <div style={titleStyle}>Outbound Analytics Dashboard</div>
              <div style={subtitleStyle}>
                Monitor outbound call performance across all clients and campaigns
              </div>
            </div>

            <div className="d-flex align-items-end">
              {/* Client Selector */}
              {(userType === "Super-Admin" || userType === "Admin") && (
                <div className="me-3">
                  <label className="form-label fw-semibold mb-1">
                    Select Client
                  </label>
                  <select
                    className="form-select form-select-sm"
                    style={{ width: 200 }}
                    value={selectedClient}
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

              {/* Start Date */}
              <div className="me-3">
                <label className="form-label fw-semibold mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  className="form-control form-control-sm"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>

              {/* End Date */}
              <div className="me-3">
                <label className="form-label fw-semibold mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  className="form-control form-control-sm"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>

              {/* View Button */}
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


      {/* KPI ROW 1 */}
      <div className="row g-3 mb-3">
        <Kpi
          label="Total Data Assigned"
          value={kpi?.totalDataAssigned?.toLocaleString() || "—"}
          // trend="+8%"
          icon={<Users size={18} />}
          color="#2563eb"
        />
        <Kpi
          label="Unique Numbers Dialed"
          value={kpi?.uniqueNumbersDialed?.toLocaleString() || "—"}
          sub={
              kpi
                ? `${((kpi.uniqueNumbersDialed * 100) / kpi.totalDataAssigned).toFixed(1)}% of total`
                : ""
          }
          // trend="+5%"
          icon={<Phone size={18} />}
          color="#06b6d4"
        />
        <Kpi
          label="Total Attempts"
          value={kpi?.totalAttempts?.toLocaleString() || "—"}
          // trend="+12%"
          icon={<Hash size={18} />}
          color="#00b894"
        />
        <Kpi
          label="Avg Attempts / Number"
          value={kpi?.avgAttemptsPerNumber || "—"}
          // trend="-3%"
          down
          icon={<BarChart3 size={18} />}
          color="#f59e0b"
        />
      </div>

      {/* KPI ROW 2 */}
      <div className="row g-3 mb-4">
        <Kpi
          label="Connected Calls"
          value={kpi?.connectedCalls?.toLocaleString() || "—"}
          sub={kpi ? `${kpi.connectionRate}% connection rate` : ""}
          // trend="+7%"
          icon={<PhoneCall size={18} />}
          color="#00b894"
        />
        <Kpi
          label="Connection Rate"
          value={kpi ? `${kpi.connectionRate}%` : "—"}
          // trend="+4%"
          icon={<TrendingUp size={18} />}
          color="#2563eb"
        />
        <Kpi
          label="Qualified Leads"
          value={kpi?.qualifiedLeads?.toLocaleString() || "—"}
          // trend="+15%"
          icon={<Target size={18} />}
          color="#06b6d4"
        />
        <Kpi
          label="Outcome Conversion"
          value={
              kpi
                ? `${((kpi.qualifiedLeads * 100) / kpi.connectedCalls).toFixed(1)}%`
                : "—"
          }
          sub="Of connected calls"
          // trend="+9%"
          icon={<CheckCircle size={18} />}
          color="#00b894"
        />
      </div>

      {/* FUNNEL + TRENDS */}
      {/* FUNNEL + TRENDS */}
      <div className="row g-3">
          {/* CALL FUNNEL */}
          <div className="col-md-6">
            <div style={{ ...cardStyle, padding: 18, height: "100%" }}>
              <div style={{ fontWeight: 600, marginBottom: 18 }}>Call Funnel</div>

              {[
                // { label: "Unique Dialed", val: funnel?.uniqueDialed || "—", pct: 100 },
                { label: "Total Assigned", val: funnel?.totaldata || "—", pct: 100 },
                // { label: "Total Attempts", val: funnel?.totalAttempts || "—", pct: funnel?.dialRate },
                { label: "Unique Dialed", val: funnel?.uniqueDialed || "—", pct: funnel?.dialRate },
                { label: "Connected Calls", val: funnel?.connectedCalls || "—", pct: funnel?.connectRate },
                { label: "Qualified Leads", val: funnel?.qualifiedLeads || "—", pct: funnel?.outcomeRate },
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
                      {f.val} <span style={{ color: "#6b7280" }}>({f.pct}%)</span>
                    </span>
                  </div>

                  <div
                    style={{
                      height: 28,
                      background: "#f3f4f6",
                      borderRadius: 999,
                      overflow: "hidden",
                      position: "relative",
                    }}
                  >
                    <div
                      style={{
                        width: `${f.pct}%`,
                        height: "100%",
                        background:
                          i === 0
                            ? "#059669"
                            : i === 1
                            ? "#14b8a6"
                            : i === 2
                            ? "#10b981"
                            : "#5eead4",
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

                  {i !== 3 && (
                    <div
                      style={{
                        textAlign: "center",
                        color: "#9ca3af",
                        fontSize: 14,
                        marginTop: 4,
                      }}
                    >
                      →
                    </div>
                  )}
                </div>
              ))}

              {/* Funnel Footer */}
              <div
                style={{
                  borderTop: "1px solid #e5e7eb",
                  paddingTop: 12,
                  display: "flex",
                  justifyContent: "space-around",
                  fontSize: 13,
                }}
              >
                <div>
                  Dial Rate
                  <div style={{ fontWeight: 700 }}>{funnel?.dialRate || 0}%</div>
                </div>
                <div>
                  Connect Rate
                  <div style={{ fontWeight: 700 }}>{funnel?.connectRate || 0}%</div>
                </div>
                <div>
                  Outcome Rate
                  <div style={{ fontWeight: 700, color: "#059669" }}>{funnel?.outcomeRate || 0}%</div>
                </div>
              </div>
            </div>
          </div>

          {/* PERFORMANCE TRENDS */}
          <div className="col-md-6">
            <div style={{ ...cardStyle, padding: 18, height: "100%" }}>
              <div style={{ fontWeight: 600, marginBottom: 16 }}>
                Performance Trends
              </div>

              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={trend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="day" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Line
                    yAxisId="left"
                    dataKey="attempts"
                    stroke="#14b8a6"
                    strokeWidth={2}
                    dot
                  />
                  <Line
                    yAxisId="right"
                    dataKey="connect"
                    stroke="#2563eb"
                    strokeWidth={2}
                    dot
                  />
                  <Line
                    yAxisId="right"
                    dataKey="outcome"
                    stroke="#9333ea"
                    strokeWidth={2}
                    dot
                  />
                </LineChart>
              </ResponsiveContainer>

              {/* Legend */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  gap: 16,
                  fontSize: 12,
                  marginTop: 8,
                }}
              >
                <Legend color="#14b8a6" label="Attempts" />
                <Legend color="#2563eb" label="Connect %" />
                <Legend color="#9333ea" label="Outcome %" />
              </div>

              {/* Averages */}
              <div
                style={{
                  borderTop: "1px solid #e5e7eb",
                  marginTop: 14,
                  paddingTop: 12,
                  display: "flex",
                  justifyContent: "space-around",
                  fontSize: 13,
                }}
              >
                <div>
                  Avg Attempts
                  <div style={{ fontWeight: 700 }}>{trendAvg?.avgAttempts || "—"}</div>
                </div>
                <div>
                  Avg Connect
                  <div style={{ fontWeight: 700, color: "#2563eb" }}>{trendAvg?.avgConnect || "—"}%</div>
                </div>
                <div>
                  Avg Outcome
                  <div style={{ fontWeight: 700, color: "#9333ea" }}>{trendAvg?.avgOutcome || "—"}%</div>
                </div>
              </div>
            </div>
          </div>
      </div>

      {/* EFFICIENCY + DROP REASONS */}
      <div className="row g-3 mt-4">
          {/* Efficiency Metrics */}
          <div className="col-md-6">
            <div
              style={{
                background: "#fff",
                border: "1px solid #eef2f7",
                borderRadius: 14,
                padding: 16,
                height: "100%",
              }}
            >
              <div style={{ fontWeight: 600, marginBottom: 16 }}>
                Efficiency Metrics
              </div>

              {/* Metric Cards */}
              <div className="d-flex gap-3 mb-4">
                {[
                  { label: "AHT", value: efficiency ? `${Math.floor(efficiency.overall.avgAHTSec / 60)}:${efficiency.overall.avgAHTSec % 60}` : "—" },
                  { label: "Talk Time", value: efficiency ? `${Math.floor(efficiency.overall.avgTalkTimeSec / 60)}:${efficiency.overall.avgTalkTimeSec % 60}` : "—", highlight: true },
                  { label: "Wrap-up", value: efficiency ? `${Math.floor(efficiency.overall.avgWrapUpTimeSec / 60)}:${efficiency.overall.avgWrapUpTimeSec % 60}` : "—" },
                ].map((m, i) => (
                  <div
                    key={i}
                    style={{
                      flex: 1,
                      background: "#f8fafc",
                      borderRadius: 12,
                      padding: 12,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        fontSize: 12,
                        color: "#6b7280",
                        marginBottom: 4,
                      }}
                    >
                      <Clock size={14} />
                      {m.label}
                    </div>
                    <div
                      style={{
                        fontSize: 18,
                        fontWeight: 700,
                        color: m.highlight ? "#00b894" : "#111827",
                      }}
                    >
                      {m.value}
                    </div>
                  </div>
                ))}
              </div>

              {/* Agent-wise Breakdown */}
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
                Agent-wise Breakdown
              </div>

              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={agentData}>
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="talk" fill="#0d9488" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="wrap" fill="#94a3b8" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>

              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  gap: 16,
                  fontSize: 12,
                  marginTop: 8,
                }}
              >
                <Legend color="#0d9488" label="Talk" />
                <Legend color="#94a3b8" label="Wrap" />
              </div>
            </div>
          </div>

          {/* Top Drop Reasons */}
          <div className="col-md-6">
            <div
              style={{
                background: "#fff",
                border: "1px solid #eef2f7",
                borderRadius: 14,
                padding: 16,
                height: "100%",
              }}
            >
              <div style={{ fontWeight: 600, marginBottom: 16 }}>
                Top Drop Reasons
              </div>

              <ResponsiveContainer width="100%" height={230}>
                <BarChart
                  data={drops}
                  layout="vertical"
                  margin={{ left: 40 }}
                >
                  <XAxis type="number" />
                  <YAxis dataKey="reason" type="category" />
                  <Tooltip />
                  <Bar dataKey="value">
                      {drops.map((d, i) => (
                        <Cell key={i} fill={["#ef4444","#f97316","#f59e0b","#eab308","#84cc16"][i]} />
                      ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>

              {/* Issue Breakdown */}
              {/* Issue Breakdown */}
              <div
                  style={{
                    borderTop: "1px solid #e5e7eb",
                    marginTop: 12,
                    paddingTop: 10,
                    fontSize: 12,
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 10,
                  }}
              >
                  <strong style={{ marginRight: 6 }}>Issue Breakdown</strong>

                  {dropBreakdown.map((d, idx) => (
                    <span
                      key={idx}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "4px 8px",
                        borderRadius: 12,
                        background: "#f8fafc",
                      }}
                    >
                      <span
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          background: d.color,
                        }}
                      />
                      {d.reason} {d.percent}%
                    </span>
                  ))}
              </div>
            </div>
          </div>
      </div>
      {/* ---------------- Agent Performance ---------------- */}
      <div className="row g-3 mt-4">
          <div className="col-12">
            <div style={{ ...cardStyle, padding: 18 }}>
              {/* Header */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 16,
                }}
              >
                <div style={{ fontWeight: 600 }}>Agent Performance</div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 12,
                    padding: "6px 10px",
                    border: "1px solid #e5e7eb",
                    borderRadius: 10,
                    background: "#fff",
                  }}
                >
                  <Trophy size={14} color="#f59e0b" />
                  Top Performers
                </div>
              </div>

              {/* Table */}
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
                    <th align="left">Agent Name</th>
                    <th align="right">Calls Made</th>
                    <th align="right">Connection Rate</th>
                    <th align="right">Outcome Rate</th>
                    <th align="right">Avg Handling Time</th>
                    <th align="right">Performance</th>
                  </tr>
                </thead>

                <tbody>
                  {agentPerformance.map((a, idx) => {
                    const isTop = a.status === "Excellent";
                    const isPoor = a.status === "Needs Improvement";

                    return (
                      <tr
                        key={idx}
                        style={{
                          background: isTop
                            ? "#f0fdf4"
                            : isPoor
                            ? "#fef2f2"
                            : "#fff",
                          borderBottom: "1px solid #e5e7eb",
                        }}
                      >
                        {/* Agent */}
                        <td style={{ padding: "10px 6px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <div
                              style={{
                                width: 32,
                                height: 32,
                                borderRadius: "50%",
                                background: "#ccfbf1",
                                color: "#0f766e",
                                fontWeight: 700,
                                fontSize: 12,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              {a.name
                                .split(" ")
                                .map((n) => n[0])
                                .join("")}
                            </div>

                            <div style={{ fontWeight: 600 }}>
                              {a.name}
                              {isTop && (
                                <Trophy
                                  size={14}
                                  color="#f59e0b"
                                  style={{ marginLeft: 6 }}
                                />
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Calls */}
                        <td align="left">{a.calls.toLocaleString()}</td>

                        {/* Connection */}
                        <td
                          align="left"
                          style={{ color: a.connection >= 50 ? "#16a34a" : "#dc2626" }}
                        >
                          {a.connection}%{" "}
                          {a.connection >= 50 ? (
                            <TrendingUp size={14} style={{ verticalAlign: "middle" }} />
                          ) : (
                            <TrendingDown size={14} style={{ verticalAlign: "middle" }} />
                          )}
                        </td>

                        {/* Outcome */}
                        <td
                          align="left"
                          style={{
                            color: a.outcome >= 25 ? "#16a34a" : "#dc2626",
                          }}
                        >
                          {a.outcome}%{" "}
                          {a.outcome >= 25 ? (
                            <TrendingUp size={14} />
                          ) : (
                            <TrendingDown size={14} />
                          )}
                        </td>

                        {/* AHT */}
                        <td align="left">{a.aht}</td>

                        {/* Status */}
                        <td align="left">
                          <span
                            style={{
                              padding: "4px 10px",
                              borderRadius: 999,
                              fontSize: 12,
                              fontWeight: 600,
                              background:
                                a.status === "Excellent"
                                  ? "#16a34a"
                                  : a.status === "Needs Improvement"
                                  ? "#dc2626"
                                  : "#f3f4f6",
                              color:
                                a.status === "Average" ? "#111827" : "#fff",
                            }}
                          >
                            {a.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Footer Summary */}
              <div
                style={{
                  marginTop: 16,
                  paddingTop: 16,
                  display: "flex",
                  justifyContent: "space-around",
                  textAlign: "center",
                  fontSize: 13,
                }}
              >
                <div>
                  Total Agents
                  <div style={{ fontWeight: 700, fontSize: 18 }}>{totalAgents}</div>
                </div>
                <div>
                  Avg Calls/Agent
                  <div style={{ fontWeight: 700, fontSize: 18 }}>
                    {avgCalls.toLocaleString()}
                  </div>
                </div>
                <div>
                  Avg Connection
                  <div style={{ fontWeight: 700, fontSize: 18, color: "#2563eb" }}>
                    {avgConnection}%
                  </div>
                </div>
                <div>
                  Avg Outcome
                  <div style={{ fontWeight: 700, fontSize: 18, color: "#059669" }}>
                    {avgOutcome}%
                  </div>
                </div>
              </div>
            </div>
          </div>
      </div>


      {/* CLIENT COMPARISON */}
      {/* <div style={{ marginBottom: 28 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 14,
              marginTop: 18,
            }}
          >
            <div style={{ fontSize: 18, fontWeight: 700 }}>
              Client Comparison
            </div>
            <div style={{ fontSize: 13, color: "#6b7280" }}>
              Performance across all clients
            </div>
          </div>

          <div className="row g-3">
            {clientData.map((client, idx) => (
              <ClientComparisonCard key={idx} client={client} />
            ))}
          </div>
      </div> */}
    </div>
  );
};

/* ---------------- KPI CARD ---------------- */
const Kpi = ({ label, value, sub, trend, down, icon, color }) => (
  <div className="col-12 col-sm-6 col-lg-3">
    <div
      style={{
        ...cardStyle,
        padding: 16,
        height: "100%",
        position: "relative",
      }}
    >
      {/* ICON */}
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
      {sub && <div style={{ fontSize: 12, color: "#6b7280" }}>{sub}</div>}

      <div style={down ? trendDown : trendUp}>{trend}</div>
    </div>
  </div>
);

const Legend = ({ color, label }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
    <span
      style={{
        width: 10,
        height: 10,
        background: color,
        borderRadius: 2,
      }}
    />
    {label}
  </div>
);


export default NewOutboundDashboard;
