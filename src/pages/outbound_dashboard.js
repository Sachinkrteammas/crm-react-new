import React, { useState, useEffect } from "react";
import {
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import api from "../api";
import "../styles/loader.css";



const OutboundDashboard = () => {
  const today = new Date().toISOString().split("T")[0];
  const userType = localStorage.getItem("user_type");
  const companyId = localStorage.getItem("company_id");

  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState(companyId);
  const [clientName, setClientName] = useState("");

  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState({
    totalCalls: 0,
    connected: 0,
    conversions: 0,
    avgTalkTimeSec: 0,
  });
  const [trendData, setTrendData] = useState([]);
  const [campaignData, setCampaignData] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [qaSummary, setQasummary] = useState([]);

  const activeCompanyId =
  userType === "Super-Admin" || userType === "Admin"
    ? selectedClient
    : companyId;


    // ✅ Fetch clients if Super-Admin/Admin
  useEffect(() => {
    const fetchClients = async () => {
      try {
        const res = await api.get("/agents/clients-rights");
        const sorted = res.data.sort((a, b) =>
          a.company_name.localeCompare(b.company_name, "en", { sensitivity: "base" })
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

  // ✅ Auto-select client for logged-in users
  useEffect(() => {
    if (userType === "Client") {
      setSelectedClient(companyId);
      const storedUserData = JSON.parse(localStorage.getItem("userData"));
      setClientName(storedUserData?.auth_person || "Your Company");
    } else if (
      (userType === "Super-Admin" || userType === "Admin") &&
      clients.length === 1
    ) {
      setSelectedClient(clients[0].company_id);
    }
  }, [userType, companyId, clients]);



  // 🟢 Function to fetch summary from API
  const fetchSummary = async () => {
    if (!startDate || !endDate) return;
    setLoading(true);


    try {
      // Call your API exactly like the curl example
      const res = await api.post(
        `/vicidial-summary/?company_id=${activeCompanyId}&start_date=${startDate}&end_date=${endDate}`
      );


      const data = res.data;


       // Map response fields to lowercase summary state
       setSummary({
        totalCalls: data.TotalCalls || 0,
        connected: data.Connected || 0,
        conversions: data.Conversions || 0,
        avgTalkTimeSec: data.AvgTalkTimeSec || 0,
      });
    } catch (error) {
      console.error("Error fetching summary:", error);
      // alert("Failed to load summary data.");
    } finally {
      setLoading(false);
    }
  };


  // Load both summary + trend on first render
  useEffect(() => {
  if (!selectedClient || selectedClient === "null") return;

    const loadInitialData = async () => {
      setLoading(true);
      await Promise.all([fetchSummary(), fetchConversionTrend(), fetchPieChart(), fetchCampaignSummary(), fetchAgentLeaderboard(), fetchQaSummary(),]);
      setLoading(false);
    };
    loadInitialData();
  }, [selectedClient]);


  
  // Button handler
  const handleViewClick = async () => {

    if ((userType === "Super-Admin" || userType === "Admin") && !selectedClient || selectedClient === "null") {
    alert("Please select a client first.");
    return;
  }

  setLoading(true);
    await Promise.all([fetchSummary(), fetchConversionTrend(), fetchPieChart(), fetchCampaignSummary(), fetchAgentLeaderboard(), fetchQaSummary(),]);
    setLoading(false);
  };


  // ✅ Format seconds into "m s" format
  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return "0 m 0 s";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins} m ${secs} s`;
  };



  const fetchConversionTrend = async () => {
  if (!startDate || !endDate) return;
  try {
    const res = await api.post(
      `/vicidial-conversion-trend?company_id=${activeCompanyId}&start_date=${startDate}&end_date=${endDate}`
    );
    const data = res.data;

    // Transform API data into recharts-compatible format
    const formatted = data.map((item) => ({
      day: item.date,          // X-axis
      calls: item.calls || 0,
      conversions: item.conversions || 0,
    }));

    setTrendData(formatted);
  } catch (error) {
    console.error("Error fetching conversion trend:", error);
    // alert("Failed to load conversion trend data.");
  }
};



  // 🟢 Fetch Pie Chart Data
  const [pieData, setPieData] = useState([
    { name: "Connected", value: 0 },
    // { name: "Busy", value: 0 },
    { name: "NotConnected", value: 0 },
  ]);

  const fetchPieChart = async () => {
  try {
    const res = await api.post(
      `/vicidial-pie-chart?company_id=${activeCompanyId}&start_date=${startDate}&end_date=${endDate}`
    );

    const data = res.data;

    // Map backend response into chart format
    setPieData([
      { name: "Connected", value: data.Connected || 0 },
      // { name: "Busy", value: data.Busy || 0 },
      { name: "NotConnected", value: data.NotConnected || 0 },
    ]);
  } catch (error) {
    console.error("Error fetching pie chart data:", error);
  }
};

  const COLORS = ["#4caf50", "#f44336"];


  // ⚡ Fetch Campaign Summary
  const fetchCampaignSummary = async () => {
    if (!startDate || !endDate) return;
    try {
      const res = await api.post(
        `/vicidial-campaign-summary?company_id=${activeCompanyId}&start_date=${startDate}&end_date=${endDate}`
      );

      const data = Array.isArray(res.data) ? res.data : [];

      // Backend returns:
      // [
      //   { "CampaignID": "SOTRU000", "TotalCalls": 9013, "Connected": 2239 }
      // ]

      const formatted = data.map((item) => ({
        name: item.CampaignID,
        calls: item.TotalCalls || 0,
        connected: item.Connected || 0,
        status: item.Connected > 0 ? "Active" : "Completed",
      }));

      setCampaignData(formatted);
    } catch (error) {
      console.error("Error fetching campaign summary:", error);
    }
  };




  // 🟢 Fetch Agent Leaderboard
  const fetchAgentLeaderboard = async () => {
    if (!startDate || !endDate) return;
    try {
      const res = await api.post(
        `/vicidial-agent-leaderboard?company_id=${activeCompanyId}&start_date=${startDate}&end_date=${endDate}`
      );

      const data = Array.isArray(res.data) ? res.data : []; // ✅ force array

      // Transform API data → use conversion count directly
      const formatted = data
        .map((item) => ({
          agent: item.AgentName,
          conversions: item.conversions,
        }))
        .sort((a, b) => b.conversions - a.conversions) // Sort by conversions
        .map((item, index) => ({
          rank: index + 1,
          agent: item.agent,
          conv: item.conversions, // directly show conversion value
        }));

      setLeaderboard(formatted);
    } catch (error) {
      console.error("Error fetching agent leaderboard:", error);
    }
  };


  // 🟢 Fetch QA Summary
  const fetchQaSummary = async () => {
    if(!startDate || !endDate) return;

    try {
      const res = await api.post(
        `/vicidial-qa-summary?company_id=${activeCompanyId}&start_date=${startDate}&end_date=${endDate}`
        );

        const data = res.data;
        
        // Map response fields to lowercase summary state
        setQasummary({
          qaScore: data.QaScore || 0,
          positivity: data.Positivity || 0,
          negativity: data.Negativity || 0,
          issue: data.Issue || "Null",
          trend: data.Trend || "Checking",
        });
      } catch (error) {
        console.error("Error fetching Qa summary:", error);
      }
      
    }
  


  

  // const lineData = [
  //   { day: "Mon", calls: 100, conversions: 30 },
  //   { day: "Tue", calls: 200, conversions: 50 },
  //   { day: "Wed", calls: 300, conversions: 70 },
  //   { day: "Thu", calls: 250, conversions: 60 },
  //   { day: "Fri", calls: 400, conversions: 100 },
  // ];

  // const campaignData = [
  //   { name: "Diwali Sale", calls: 200, connected: 160, status: "Active" },
  //   { name: "Loyalty Plan", calls: 150, connected: 90, status: "Completed" },
  //   { name: "New Launch", calls: 300, connected: 130, status: "Active" },
  // ];

  // const leaderboard = [
  //   { rank: 1, agent: "Asha", conv: "18%" },
  //   { rank: 2, agent: "Raj", conv: "14%" },
  //   { rank: 3, agent: "Nisha", conv: "13%" },
  // ];

  // const qaSummary = {
  //   qaScore: "88%",
  //   positivity: "72%",
  //   negativity: "28%",
  //   issue: "Script deviation",
  //   trend: "Improving",
  // };


  return (
     <>
    {loading && (
      <div className="loader-overlay">
        <div className="bar"></div>
        <div className="bar"></div>
        <div className="bar"></div>
        <div className="bar"></div>
        <div className="bar"></div>
      </div>
    )}

    <div className={`priority-wrapper ${loading ? "blurred" : ""}`}>
    <div>
      {/* Header inside card */}
        <div className="card mb-4">
        <div className="card-body d-flex justify-content-between align-items-center">
            <h4 className="fw-bold mb-0">
            📞 Outbound Dashboard
            </h4>
            <div className="d-flex align-items-end mb-3">
              {/* ✅ Show select only for Super-Admin/Admin */}
              {(userType === "Super-Admin" || userType === "Admin") && (
                <div className="me-3">
                  <label className="form-label fw-semibold mb-1">Select Client:</label>
                  <select
                    className="form-select form-select-sm"
                    style={{ width: "200px" }}
                    value={selectedClient}
                    onChange={(e) => setSelectedClient(e.target.value)}
                  >
                    <option value="">-- Select Client --</option>
                    {clients.map((client) => (
                      <option key={client.company_id} value={client.company_id}>
                        {client.company_name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="d-flex flex-column me-3">
                <label className="form-label fw-semibold mb-1">Start Date:</label>
                <input
                  type="date"
                  className="form-control form-control-sm"
                  style={{ width: "150px" }}
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>

              <div className="d-flex flex-column me-3">
                <label className="form-label fw-semibold mb-1">End Date:</label>
                <input
                  type="date"
                  className="form-control form-control-sm"
                  style={{ width: "150px" }}
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>

              <div>
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
        </div>


      {/* Top Summary */}
      <div className="row g-3 mb-4">
        <div className="col-md-3">
          <div className="card text-center py-3">
            <h6 className="text-muted">Total Calls</h6>
            <h3 className="fw-bold">{summary.totalCalls.toLocaleString()}</h3>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card text-center py-3">
            <h6 className="text-muted">Connected</h6>
            <h3 className="fw-bold">{summary.connected}</h3>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card text-center py-3">
            <h6 className="text-muted">Conversions</h6>
            <h3 className="fw-bold">{summary.conversions}</h3>
          </div>
        </div>
        <div className="col-md-3"> 
          <div className="card text-center py-3">
            <h6 className="text-muted">Avg Talk Time</h6>
            <h3 className="fw-bold">
              {formatTime(summary.avgTalkTimeSec)}
            </h3>
          </div>
        </div>

      </div>

      {/* Charts Row */}
      <div className="row g-3 mb-4">
        <div className="col-md-6">
          <div className="card h-100 p-3">
            <h6 className="fw-semibold mb-3">Call Outcome Pie Chart</h6>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="col-md-6">
          <div className="card h-100 p-3">
            <h6 className="fw-semibold mb-3">Conversion Trend</h6>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={trendData.length > 0 ? trendData : []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" 

                  // Customize the date formate
                  //   tickFormatter={(dateStr) => {
                  //   const date = new Date(dateStr);
                  //   return date.toLocaleDateString("en-US", {
                  //     month: "short",
                  //     day: "numeric",
                  //   });
                  // }}
                />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="calls" stroke="#4caf50" />
                <Line type="monotone" dataKey="conversions" stroke="#2196f3" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Campaign Summary */}
      <div className="card mb-4">
        <div className="card-body">
          <h6 className="fw-semibold mb-3">Campaign Summary</h6>
          <div className="table-responsive">
            <table className="table table-bordered text-center align-middle mb-0">
              <thead className="table-primary" style={{
                    backgroundColor: "var(--bs-primary-bg-subtle, #cfe2ff)"
                  }}>
                <tr>
                  <th>Campaign</th>
                  <th>Calls</th>
                  <th>Connected</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {campaignData.map((row, i) => (
                  <tr key={i}>
                    <td>{row.name}</td>
                    <td>{row.calls}</td>
                    <td>{row.connected}</td>
                    <td>
                      <span
                        className={`badge ${
                          row.status === "Active" ? "bg-label-success" : "bg-label-secondary"
                        }`}
                      >
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="row g-3">
        <div className="col-md-6">
          <div className="card p-3 h-100">
            <h6 className="fw-semibold mb-3">Agent Leaderboard</h6>
            <div className="table-responsive" style={{ maxHeight: "200px", overflowY: "auto" }}>
              <table className="table table-bordered text-center align-middle mb-0">
                <thead className="table-primary" style={{ position: "sticky", top: 0, zIndex: 3,  backgroundColor: "var(--bs-primary-bg-subtle, #cfe2ff)" }}>
                  <tr>
                    <th>Rank</th>
                    <th>Agent</th>
                    <th>Conv%</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((a, i) => (
                    <tr key={i}>
                      <td>{a.rank}</td>
                      <td>{a.agent}</td>
                      <td>{a.conv}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        <div className="col-md-6">
          <div className="card h-100">
            <div className="card-header pb-2">
              <h6 className="card-title mb-0 fw-semibold">QA & Sentiment Summary</h6>
            </div>
            <div className="card-body">
              <div className="row gy-2">
                <div className="col-6">
                  {/* <p className="mb-4 d-flex justify-content-between align-items-center">
                    <span className="text-muted">Avg QA Score</span>
                    <span className="fw-semibold">{qaSummary.qaScore}%</span>
                  </p> */}
                  <p className="mb-4 d-flex justify-content-between align-items-center">
                    <span className="text-muted">Positivity %</span>
                    <span className="fw-semibold">{qaSummary.positivity}%</span>
                  </p>
                  <p className="mb-4 d-flex justify-content-between align-items-center">
                    <span className="text-muted">Negativity %</span>
                    <span className="fw-semibold">{qaSummary.negativity}%</span>
                  </p>
                </div>

                <div className="col-6 border-start">
                  <p className="mb-4 d-flex justify-content-between align-items-center ps-3">
                    <span className="text-muted">Top Issue</span>
                    <span className="fw-semibold">{qaSummary.issue}</span>
                  </p>
                  <p className="mb-4 d-flex justify-content-between align-items-center ps-3">
                    <span className="text-muted">Overall Trend</span>
                    <span
                      className={`badge ${
                        qaSummary.trend === "Improving"
                          ? "bg-label-success"
                          : "bg-label-warning"
                      }`}
                    >
                      {qaSummary.trend}
                    </span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    </div>
    </>
  );
};

export default OutboundDashboard;
