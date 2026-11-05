import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
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
const dropColors = [
  "#ef4444",
  "#f97316",
  "#f59e0b",
  "#eab308",
  "#84cc16",
  "#22c55e",
];

/* ---------------- PAGE LOADER ---------------- */
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
      Loading outbound analytics…
    </div>
    <style>
      {`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}
    </style>
  </div>
);

/* ---------------- KPI CARD ---------------- */
const Kpi = ({ label, value, sub, icon, color }) => (
  <div className="col-12 col-sm-6 col-lg-3">
    <div
      style={{
        ...cardStyle,
        padding: 16,
        height: "100%",
        position: "relative",
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
      {sub && <div style={{ fontSize: 12, color: "#6b7280" }}>{sub}</div>}
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
const NewOutboundDashboard = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const navState = location.state;

  const today = new Date().toISOString().split("T")[0];
  const userType = localStorage.getItem("user_type");
  const companyId = localStorage.getItem("company_id");

  const [clients, setClients] = useState([]);

  const [selectedClient, setSelectedClient] = useState(
    navState?.client ? String(navState.client) : companyId || ""
  );
  const [startDate, setStartDate] = useState(navState?.start_date || today);
  const [endDate, setEndDate] = useState(navState?.end_date || today);
  const [loading, setLoading] = useState(false);

  // ✅ raw CDR rows (jo c2p_cdr se aate hain)
  const [rows, setRows] = useState([]);

  const activeCompanyId =
    userType === "Super-Admin" || userType === "Admin"
      ? selectedClient
      : companyId;

  // ============================================
  // ✅ DATE FORMAT HELPER (YYYY-MM-DD)
  // ============================================
  const formatDate = (dateValue) => {
    if (!dateValue) return "";

    // Agar already YYYY-MM-DD string hai
    if (typeof dateValue === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
      return dateValue;
    }

    const d = new Date(dateValue);
    if (isNaN(d.getTime())) return "";

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // ============================================
  // Clients fetch (Admin / Super-Admin)
  // ============================================
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

  const goToInbound = () => {
    navigate("/new-inbound-dashboard", {
      state: {
        client: activeCompanyId,
        start_date: startDate,
        end_date: endDate,
        autoLoad: true,
      },
    });
  };

  // ============================================
  // ✅ DATA FETCH: sirf /api/webhook/c2p_cdr se
  // ============================================
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

    setLoading(true);
    setRows([]);

    try {
      const res = await api.get("/api/webhook/c2p_cdr", {
        params: {
          start_date: formatDate(startDate),
          end_date: formatDate(endDate),
          queue_name: "",
          client_id: activeCompanyId,
        },
      });

      if (res.data?.status) {
        setRows(res.data.data || []);
      } else {
        setRows([]);
      }
    } catch (e) {
      console.error("C2P CDR fetch error", e);
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!activeCompanyId) return;
    if (navState?.client || navState?.autoLoad) {
      handleViewClick();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCompanyId]);

  // ============================================
  // ✅ DERIVED: raw rows -> dashboard metrics
  // ============================================
  const isConnected = (r) => {
    const s = String(r.call_status || "").toLowerCase();
    return (
      s.includes("answer") ||
      s.includes("connect") ||
      s === "success" ||
      s === "completed"
    );
  };

  const isQualified = (r) => {
    const t = String(r.call_type || "").toLowerCase();
    const s = String(r.call_status || "").toLowerCase();
    return t.includes("qualified") || s.includes("qualified");
  };

  const total = rows.length;

  const connectedRows = rows.filter(isConnected);
  const qualifiedRows = rows.filter(isQualified);

  const uniqueNumbers = new Set(
    rows.map((r) => r.customer_number).filter(Boolean)
  );

  const kpi = {
    totalDataAssigned: uniqueNumbers.size,
    uniqueNumbersDialed: uniqueNumbers.size,
    totalAttempts: total,
    avgAttemptsPerNumber:
      uniqueNumbers.size > 0
        ? (total / uniqueNumbers.size).toFixed(2)
        : 0,
    connectedCalls: connectedRows.length,
    connectionRate:
      total > 0 ? ((connectedRows.length * 100) / total).toFixed(1) : 0,
    qualifiedLeads: qualifiedRows.length,
  };

  const funnel = {
    totaldata: uniqueNumbers.size,
    uniqueDialed: uniqueNumbers.size,
    connectedCalls: connectedRows.length,
    qualifiedLeads: qualifiedRows.length,
    dialRate: uniqueNumbers.size > 0 ? 100 : 0,
    connectRate:
      uniqueNumbers.size > 0
        ? Number(
            ((connectedRows.length * 100) / uniqueNumbers.size).toFixed(1)
          )
        : 0,
    outcomeRate:
      connectedRows.length > 0
        ? Number(
            ((qualifiedRows.length * 100) / connectedRows.length).toFixed(1)
          )
        : 0,
  };

  // ---- Trend: group by date ----
  const byDate = {};
  rows.forEach((r) => {
    const day = String(r.date_time || "").split(" ")[0] || "N/A";
    if (!byDate[day]) byDate[day] = { day, attempts: 0, connect: 0, outcome: 0 };
    byDate[day].attempts += 1;
    if (isConnected(r)) byDate[day].connect += 1;
    if (isQualified(r)) byDate[day].outcome += 1;
  });

  const trend = Object.values(byDate)
    .sort((a, b) => a.day.localeCompare(b.day))
    .map((d) => ({
      day: d.day,
      attempts: d.attempts,
      connect:
        d.attempts > 0 ? Number(((d.connect * 100) / d.attempts).toFixed(1)) : 0,
      outcome:
        d.attempts > 0 ? Number(((d.outcome * 100) / d.attempts).toFixed(1)) : 0,
    }));

  const trendAvg = {
    avgAttempts:
      trend.length > 0
        ? Math.round(
            trend.reduce((s, t) => s + t.attempts, 0) / trend.length
          )
        : 0,
    avgConnect:
      trend.length > 0
        ? (
            trend.reduce((s, t) => s + t.connect, 0) / trend.length
          ).toFixed(1)
        : 0,
    avgOutcome:
      trend.length > 0
        ? (
            trend.reduce((s, t) => s + t.outcome, 0) / trend.length
          ).toFixed(1)
        : 0,
  };

  // ---- Agent-wise ----
  const byAgent = {};
  rows.forEach((r) => {
    const agent = r.agent_name || r.agent_username || "Unknown";
    if (!byAgent[agent])
      byAgent[agent] = {
        agent,
        calls: 0,
        connect: 0,
        outcome: 0,
        talkSec: 0,
      };
    const a = byAgent[agent];
    a.calls += 1;
    if (isConnected(r)) a.connect += 1;
    if (isQualified(r)) a.outcome += 1;
    a.talkSec += Number(r.duration || 0);
  });

  const agentPerformance = Object.values(byAgent).map((a) => ({
    name: a.agent,
    calls: a.calls,
    connection:
      a.calls > 0 ? Number(((a.connect * 100) / a.calls).toFixed(1)) : 0,
    outcome:
      a.calls > 0 ? Number(((a.outcome * 100) / a.calls).toFixed(1)) : 0,
    ahtSec: a.calls > 0 ? Math.round(a.talkSec / a.calls) : 0,
  }));

  const agentData = agentPerformance.map((a) => ({
    name: a.name,
    talk: a.ahtSec,
    wrap: 0,
  }));

  const totalAgents = agentPerformance.length;
  const avgCalls =
    totalAgents > 0
      ? Math.round(
          agentPerformance.reduce((acc, a) => acc + a.calls, 0) / totalAgents
        )
      : 0;
  const avgConnection =
    totalAgents > 0
      ? (
          agentPerformance.reduce((acc, a) => acc + a.connection, 0) /
          totalAgents
        ).toFixed(1)
      : "0.0";
  const avgOutcome =
    totalAgents > 0
      ? (
          agentPerformance.reduce((acc, a) => acc + a.outcome, 0) /
          totalAgents
        ).toFixed(1)
      : "0.0";

  // ---- Efficiency overall ----
  const totalTalk = rows.reduce((s, r) => s + Number(r.duration || 0), 0);
  const totalWrap = rows.reduce(
    (s, r) => s + Number(r.customer_call_setup_time || 0),
    0
  );
  const avgTalk = total > 0 ? Math.round(totalTalk / total) : 0;
  const avgWrap = total > 0 ? Math.round(totalWrap / total) : 0;
  const avgAHT = avgTalk + avgWrap;

  const efficiency = {
    overall: {
      avgAHTSec: avgAHT,
      avgTalkTimeSec: avgTalk,
      avgWrapUpTimeSec: avgWrap,
    },
  };

  // ---- Drop reasons ----
  const byStatus = {};
  rows
    .filter((r) => !isConnected(r))
    .forEach((r) => {
      const reason = r.call_status || "Unknown";
      byStatus[reason] = (byStatus[reason] || 0) + 1;
    });

  const drops = Object.entries(byStatus)
    .map(([reason, value]) => ({ reason, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

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
        <div className="card-body d-flex justify-content-between align-items-center flex-wrap gap-3">
          <div>
            <div style={titleStyle}>Outbound Analytics Dashboard</div>
            <div style={subtitleStyle}>
              Monitor outbound call performance across all clients and campaigns
            </div>
          </div>

          <div className="d-flex align-items-end flex-wrap gap-2">
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
              <label className="form-label fw-semibold mb-1">Start Date</label>
              <input
                type="date"
                className="form-control form-control-sm"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div>
              <label className="form-label fw-semibold mb-1">End Date</label>
              <input
                type="date"
                className="form-control form-control-sm"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
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

      {/* KPI ROW 1 */}
      <div className="row g-3 mb-3">
        <Kpi
          label="Total Data Assigned"
          value={kpi.totalDataAssigned.toLocaleString()}
          icon={<Users size={18} />}
          color="#2563eb"
        />
        <Kpi
          label="Unique Numbers Dialed"
          value={kpi.uniqueNumbersDialed.toLocaleString()}
          sub={
            kpi.totalDataAssigned
              ? `${(
                  (kpi.uniqueNumbersDialed * 100) /
                  kpi.totalDataAssigned
                ).toFixed(1)}% of total`
              : ""
          }
          icon={<Phone size={18} />}
          color="#06b6d4"
        />
        <Kpi
          label="Total Attempts"
          value={kpi.totalAttempts.toLocaleString()}
          icon={<Hash size={18} />}
          color="#00b894"
        />
        <Kpi
          label="Avg Attempts / Number"
          value={kpi.avgAttemptsPerNumber}
          icon={<BarChart3 size={18} />}
          color="#f59e0b"
        />
      </div>

      {/* KPI ROW 2 */}
      <div className="row g-3 mb-4">
        <Kpi
          label="Connected Calls"
          value={kpi.connectedCalls.toLocaleString()}
          sub={`${kpi.connectionRate}% connection rate`}
          icon={<PhoneCall size={18} />}
          color="#00b894"
        />
        <Kpi
          label="Connection Rate"
          value={`${kpi.connectionRate}%`}
          icon={<TrendingUp size={18} />}
          color="#2563eb"
        />
        <Kpi
          label="Qualified Leads"
          value={kpi.qualifiedLeads.toLocaleString()}
          icon={<Target size={18} />}
          color="#06b6d4"
        />
        <Kpi
          label="Outcome Conversion"
          value={
            kpi.connectedCalls > 0
              ? `${(
                  (kpi.qualifiedLeads * 100) /
                  kpi.connectedCalls
                ).toFixed(1)}%`
              : "0%"
          }
          sub="Of connected calls"
          icon={<CheckCircle size={18} />}
          color="#00b894"
        />
      </div>

      {/* FUNNEL + TRENDS */}
      <div className="row g-3">
        <div className="col-md-6">
          <div style={{ ...cardStyle, padding: 18, height: "100%" }}>
            <div style={{ fontWeight: 600, marginBottom: 18 }}>Call Funnel</div>
            {[
              { label: "Total Assigned", val: funnel.totaldata, pct: 100 },
              {
                label: "Unique Dialed",
                val: funnel.uniqueDialed,
                pct: funnel.dialRate,
              },
              {
                label: "Connected Calls",
                val: funnel.connectedCalls,
                pct: funnel.connectRate,
              },
              {
                label: "Qualified Leads",
                val: funnel.qualifiedLeads,
                pct: funnel.outcomeRate,
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
                    {f.val}{" "}
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
                      width: `${f.pct || 0}%`,
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
                <div style={{ fontWeight: 700 }}>{funnel.dialRate}%</div>
              </div>
              <div>
                Connect Rate
                <div style={{ fontWeight: 700 }}>{funnel.connectRate}%</div>
              </div>
              <div>
                Outcome Rate
                <div style={{ fontWeight: 700, color: "#059669" }}>
                  {funnel.outcomeRate}%
                </div>
              </div>
            </div>
          </div>
        </div>

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
                <div style={{ fontWeight: 700 }}>{trendAvg.avgAttempts}</div>
              </div>
              <div>
                Avg Connect
                <div style={{ fontWeight: 700, color: "#2563eb" }}>
                  {trendAvg.avgConnect}%
                </div>
              </div>
              <div>
                Avg Outcome
                <div style={{ fontWeight: 700, color: "#9333ea" }}>
                  {trendAvg.avgOutcome}%
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* EFFICIENCY + DROPS */}
      <div className="row g-3 mt-4">
        <div className="col-md-6">
          <div style={{ ...cardStyle, padding: 16, height: "100%" }}>
            <div style={{ fontWeight: 600, marginBottom: 16 }}>
              Efficiency Metrics
            </div>
            <div className="d-flex gap-3 mb-4">
              {[
                {
                  label: "AHT",
                  value: `${Math.floor(
                    efficiency.overall.avgAHTSec / 60
                  )}:${String(efficiency.overall.avgAHTSec % 60).padStart(
                    2,
                    "0"
                  )}`,
                },
                {
                  label: "Talk Time",
                  value: `${Math.floor(
                    efficiency.overall.avgTalkTimeSec / 60
                  )}:${String(
                    efficiency.overall.avgTalkTimeSec % 60
                  ).padStart(2, "0")}`,
                  highlight: true,
                },
                {
                  label: "Wrap-up",
                  value: `${Math.floor(
                    efficiency.overall.avgWrapUpTimeSec / 60
                  )}:${String(
                    efficiency.overall.avgWrapUpTimeSec % 60
                  ).padStart(2, "0")}`,
                },
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
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
              Agent-wise Talk Time
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={agentData}>
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="talk" fill="#0d9488" radius={[6, 6, 0, 0]} />
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
              <Legend color="#0d9488" label="Talk Time (sec)" />
            </div>
          </div>
        </div>

        <div className="col-md-6">
          <div style={{ ...cardStyle, padding: 16, height: "100%" }}>
            <div style={{ fontWeight: 600, marginBottom: 16 }}>
              Top Drop Reasons
            </div>
            {drops.length > 0 ? (
              <>
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
                        <Cell
                          key={i}
                          fill={
                            [
                              "#ef4444",
                              "#f97316",
                              "#f59e0b",
                              "#eab308",
                              "#84cc16",
                            ][i]
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
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
              </>
            ) : (
              <div
                style={{
                  padding: 40,
                  textAlign: "center",
                  color: "#9ca3af",
                  fontSize: 13,
                }}
              >
                No drop reasons found
              </div>
            )}
          </div>
        </div>
      </div>

      {/* AGENT PERFORMANCE */}
      <div className="row g-3 mt-4">
        <div className="col-12">
          <div style={{ ...cardStyle, padding: 18 }}>
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

            {agentPerformance.length > 0 ? (
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: 13,
                }}
              >
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
                    const status =
                      a.outcome >= 30
                        ? "Excellent"
                        : a.outcome >= 20
                        ? "Average"
                        : "Needs Improvement";
                    const isTop = status === "Excellent";
                    const isPoor = status === "Needs Improvement";
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
                        <td style={{ padding: "10px 6px" }}>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 10,
                            }}
                          >
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
                        <td align="left">{a.calls.toLocaleString()}</td>
                        <td
                          align="left"
                          style={{
                            color:
                              a.connection >= 50 ? "#16a34a" : "#dc2626",
                          }}
                        >
                          {a.connection}%{" "}
                          {a.connection >= 50 ? (
                            <TrendingUp
                              size={14}
                              style={{ verticalAlign: "middle" }}
                            />
                          ) : (
                            <TrendingDown
                              size={14}
                              style={{ verticalAlign: "middle" }}
                            />
                          )}
                        </td>
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
                        <td align="left">
                          {`${Math.floor(a.ahtSec / 60)}:${String(
                            a.ahtSec % 60
                          ).padStart(2, "0")}`}
                        </td>
                        <td align="left">
                          <span
                            style={{
                              padding: "4px 10px",
                              borderRadius: 999,
                              fontSize: 12,
                              fontWeight: 600,
                              background:
                                status === "Excellent"
                                  ? "#16a34a"
                                  : status === "Needs Improvement"
                                  ? "#dc2626"
                                  : "#f3f4f6",
                              color:
                                status === "Average" ? "#111827" : "#fff",
                            }}
                          >
                            {status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div
                style={{
                  padding: 40,
                  textAlign: "center",
                  color: "#9ca3af",
                  fontSize: 13,
                }}
              >
                No agent data found
              </div>
            )}

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
                <div style={{ fontWeight: 700, fontSize: 18 }}>
                  {totalAgents}
                </div>
              </div>
              <div>
                Avg Calls/Agent
                <div style={{ fontWeight: 700, fontSize: 18 }}>
                  {avgCalls.toLocaleString()}
                </div>
              </div>
              <div>
                Avg Connection
                <div
                  style={{ fontWeight: 700, fontSize: 18, color: "#2563eb" }}
                >
                  {avgConnection}%
                </div>
              </div>
              <div>
                Avg Outcome
                <div
                  style={{ fontWeight: 700, fontSize: 18, color: "#059669" }}
                >
                  {avgOutcome}%
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewOutboundDashboard;