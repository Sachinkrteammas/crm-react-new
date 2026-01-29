
// Final Version with Calls + Billings Toggle Design Same Like Old Daildesk..
// import React, { useState, useEffect } from "react";
// import { useNavigate } from "react-router-dom";
// import api from "../api";

// // ===== Chart Imports =====
// import {
//   Chart as ChartJS,
//   ArcElement,
//   BarElement,
//   CategoryScale,
//   LinearScale,
//   Tooltip,
//   Legend,
// } from "chart.js";
// import { Pie, Bar } from "react-chartjs-2";

// ChartJS.register(
//   ArcElement,
//   BarElement,
//   CategoryScale,
//   LinearScale,
//   Tooltip,
//   Legend,
// );

// const DashboardAnest = () => {
//   const navigate = useNavigate();

//   const companyId = 627;
//   const userType = localStorage.getItem("user_type");

//   // ===== Access Check =====
//   useEffect(() => {
//     if (
//       !(
//         userType === "Super-Admin" ||
//         userType === "Admin" ||
//         (userType === "Client" && companyId === 627)
//       )
//     ) {
//       navigate("/dashboard");
//     }
//   }, [userType, navigate]);

//   // ===== State =====
//   const [activeTab, setActiveTab] = useState("calls"); // calls | billings
//   const [dateRange, setDateRange] = useState("30days");
//   const [fromDate, setFromDate] = useState("");
//   const [toDate, setToDate] = useState("");
//   const [tempFromDate, setTempFromDate] = useState("");
//   const [tempToDate, setTempToDate] = useState("");
//   const [callType, setCallType] = useState("Inbound");
//   const [data, setData] = useState({});
//   const [loading, setLoading] = useState(false);

//   const formatDate = (d) => d.toISOString().split("T")[0];

//   // const handleDateRangeChange = (range) => {
//   //   setDateRange(range);
//   //   const today = new Date();

//   //   switch (range) {
//   //     case "today":
//   //       setFromDate(formatDate(today));
//   //       setToDate(formatDate(today));
//   //       break;
//   //     case "yesterday": {
//   //       const y = new Date(today);
//   //       y.setDate(today.getDate() - 1);
//   //       setFromDate(formatDate(y));
//   //       setToDate(formatDate(y));
//   //       break;
//   //     }
//   //     case "7days": {
//   //       const w = new Date(today);
//   //       w.setDate(today.getDate() - 6);
//   //       setFromDate(formatDate(w));
//   //       setToDate(formatDate(today));
//   //       break;
//   //     }
//   //     case "30days": {
//   //       const m = new Date(today);
//   //       m.setDate(today.getDate() - 29);
//   //       setFromDate(formatDate(m));
//   //       setToDate(formatDate(today));
//   //       break;
//   //     }
//   //     case "custom":
//   //       setFromDate("");
//   //       setToDate("");
//   //       break;
//   //     default:
//   //       break;
//   //   }
//   // };

//   const handleDateRangeChange = (range) => {
//   setDateRange(range);
//   const today = new Date();

//   switch (range) {
//     case "today":
//       setFromDate(formatDate(today));
//       setToDate(formatDate(today));
//       break;

//     case "yesterday": {
//       const y = new Date(today);
//       y.setDate(today.getDate() - 1);
//       setFromDate(formatDate(y));
//       setToDate(formatDate(y));
//       break;
//     }

//     case "7days": {
//       const w = new Date(today);
//       w.setDate(today.getDate() - 6);
//       setFromDate(formatDate(w));
//       setToDate(formatDate(today));
//       break;
//     }

//     case "30days": {
//       const m = new Date(today);
//       m.setDate(today.getDate() - 29);
//       setFromDate(formatDate(m));
//       setToDate(formatDate(today));
//       break;
//     }

//     case "custom":
//       // ✅ do NOT touch real dates
//       setTempFromDate("");
//       setTempToDate("");
//       break;

//     default:
//       break;
//   }
// };

//   // ===== API Call =====
//   useEffect(() => {
//     if (!fromDate || !toDate) return;

//     const fetchData = async () => {
//       try {
//         setLoading(true);
//         const res = await api.get("/dashboard-summary", {
//           params: {
//             client_id: companyId,
//             startdate: fromDate,
//             enddate: toDate,
//             call_type: callType,
//           },
//         });
//         setData(res.data || {});
//       } catch (err) {
//         console.error(err);
//         setData({});
//       } finally {
//         setLoading(false);
//       }
//     };

//     fetchData();
//   }, [fromDate, toDate, callType]);

//   useEffect(() => {
//     handleDateRangeChange("30days");
//   }, []);

//   // ===== Card =====
//   const Card = ({ title, value, bg }) => (
//     <div className="col-xl-3 col-lg-4 col-md-6 mb-3 px-3">
//       <div
//         className="d-flex shadow-sm rounded overflow-hidden"
//         style={{ width: 300, height: 90 }}
//       >
//         <div
//           className="text-white text-center flex-grow-1 d-flex flex-column justify-content-center"
//           style={{ backgroundColor: bg }}
//         >
//           <div className="small">{title}</div>
//           <h5 className="mb-0">{value ?? 0}</h5>
//         </div>
//         <div style={{ width: 45, backgroundColor: bg, opacity: 0.6 }} />
//       </div>
//     </div>
//   );

//   return (
//     <div className="mt-5 mb-2">
//       {/* ===== HEADER ===== */}
//       <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
//         <h4>{activeTab === "calls" ? "Dashboard" : "Billing Dashboard"}</h4>

//         <div className="d-flex gap-3 align-items-start">
//           {/* Calls / Billings */}
//           <div className="d-flex gap-2">
//             <button
//               className={`btn btn-sm ${
//                 activeTab === "calls" ? "btn-primary" : "btn-outline-primary"
//               }`}
//               onClick={() => setActiveTab("calls")}
//             >
//               Calls
//             </button>
//             <button
//               className={`btn btn-sm ${
//                 activeTab === "billings" ? "btn-primary" : "btn-outline-primary"
//               }`}
//               onClick={() => setActiveTab("billings")}
//             >
//               Billings
//             </button>
//           </div>

//           {/* Date Filter (SAME) */}
//           <div className="bg-white shadow-sm rounded px-3 py-2">
//             <span className="text-muted small">Select Date Range</span>

//             <div className="d-flex gap-2 flex-wrap my-2">
//               {["today", "yesterday", "7days", "30days", "custom"].map((k) => (
//                 <button
//                   key={k}
//                   className={`btn btn-sm ${
//                     dateRange === k ? "btn-primary" : "btn-outline-dark"
//                   }`}
//                   onClick={() => handleDateRangeChange(k)}
//                 >
//                   {k === "7days"
//                     ? "Last 7 Days"
//                     : k === "30days"
//                       ? "Last 30 Days"
//                       : k}
//                 </button>
//               ))}
//             </div>

//             {/* ✅ CUSTOM DATE INPUTS */}
//             {dateRange === "custom" && (
//               <form
//                 onSubmit={(e) => e.preventDefault()}
//                 className="d-flex align-items-center gap-2 mt-2"
//               >
//                 <input
//                   type="date"
//                   className="form-control form-control-sm"
//                   value={fromDate}
//                   onChange={(e) => setFromDate(e.target.value)}
//                 />
//                 <span className="small">to</span>
//                 <input
//                   type="date"
//                   className="form-control form-control-sm"
//                   value={toDate}
//                   onChange={(e) => setToDate(e.target.value)}
//                 />
//                 <button
//                   type="button"
//                   className="btn btn-sm btn-primary"
//                   onClick={() => {
//                     if (!fromDate || !toDate) return;
//                   }}
//                 >
//                   Apply
//                 </button>
//               </form>
//             )}

//             {activeTab === "calls" && (
//               <select
//                 className="form-select form-select-sm mt-2"
//                 value={callType}
//                 onChange={(e) => setCallType(e.target.value)}
//               >
//                 <option value="Inbound">Inbound</option>
//                 <option value="Outbound">Outbound</option>
//               </select>
//             )}
//           </div>
//         </div>
//       </div>

//       {/* ================= CALLS DASHBOARD (FULL ORIGINAL CONTENT) ================= */}

//       {activeTab === "calls" && (
//         <>
//           {/* ================= INBOUND ================= */}
//           {!loading && callType === "Inbound" && (
//             <>
//               {/* CARDS */}
//               <div className="row">
//                 <Card
//                   title="Total Complaints"
//                   value={data.total_complaints}
//                   bg="#03A9F4"
//                 />
//                 <Card title="Open" value={data.open} bg="#F44336" />
//                 <Card title="In-Process" value={data.in_process} bg="#FFC107" />
//                 <Card title="Closed" value={data.closed} bg="#8BC34A" />
//               </div>

//               <div className="row">
//                 <Card
//                   title="Escalation 1"
//                   value={data.escalation_1}
//                   bg="#03A9F4"
//                 />
//                 <Card
//                   title="Escalation 2"
//                   value={data.escalation_2}
//                   bg="#FFC107"
//                 />
//                 <Card
//                   title="Escalation 3"
//                   value={data.escalation_3}
//                   bg="#F44336"
//                 />
//               </div>

//               <div className="row">
//                 <Card
//                   title="Total Answered Calls"
//                   value={data.total_answered_calls}
//                   bg="#3F51B5"
//                 />
//                 <Card
//                   title="Unique Abandon Calls"
//                   value={data.unique_abandon_calls}
//                   bg="#F44336"
//                 />
//                 <Card
//                   title="Total Tagged Calls"
//                   value={data.total_tagged_calls}
//                   bg="#03A9F4"
//                 />
//                 <Card
//                   title="Total Abandon Call Back"
//                   value={data.total_abandon_call_back}
//                   bg="#4CAF50"
//                 />
//               </div>

//               {/* 🔽 EVERYTHING BELOW ONLY FOR INBOUND 🔽 */}
//               {/* ===== MY PLAN TABLE ===== */}
//               <div className="row mt-4 justify-content-center">
//                 <div className="col-10">
//                   <div className="bg-white shadow-sm rounded overflow-hidden">
//                     <table className="table table-bordered mb-0 text-center align-middle">
//                       <thead style={{ background: "#bed3f3", color: "#fff" }}>
//                         <tr>
//                           <th>My Plan</th>
//                           <th>Plan Mode</th>
//                           <th>Credit Value</th>
//                           <th>Subscription Value</th>
//                           <th>Inbound Call - Day Charges</th>
//                           <th>Inbound Call - Night Charges</th>
//                           <th>Outbound Call Charges</th>
//                           <th>SMS Charges</th>
//                           <th>Email Charges</th>
//                         </tr>
//                       </thead>
//                       <tbody>
//                         <tr>
//                           <td>Anest Iwata Motherson Private Limited</td>
//                           <td>Yearly</td>
//                           <td>Rs. 72600.00</td>
//                           <td>Rs. 72600.00</td>
//                           <td>Rs. 5.00 / Min.</td>
//                           <td>Rs. 5.00 / Min.</td>
//                           <td>Rs. 5.00 / Min.</td>
//                           <td>0.25</td>
//                           <td>0.25</td>
//                         </tr>
//                       </tbody>
//                     </table>
//                   </div>
//                 </div>
//               </div>

//               {/* ===== CALL ANALYSIS ===== */}
//               <div className="row mt-4 justify-content-center">
//                 <div className="col-lg-10">
//                   <div className="bg-white shadow-sm rounded p-4">
//                     <h5 className="fw-bold ps-10 mb-4">Call Analysis</h5>

//                     <div
//                       className="d-flex justify-content-start ps-4 mt-2 mb-5"
//                       style={{ height: 260 }}
//                     >
//                       <Pie
//                         data={{
//                           labels: ["Abandon", "Total Answered"],
//                           datasets: [
//                             {
//                               data: [
//                                 data.unique_abandon_calls || 1,
//                                 data.total_answered_calls || 30,
//                               ],
//                               backgroundColor: ["#2E8B57", "#90EE90"],
//                             },
//                           ],
//                         }}
//                       />
//                     </div>

//                     <Bar
//                       data={{
//                         labels: [
//                           "04-Jan-2026",
//                           "06-Jan-2026",
//                           "07-Jan-2026",
//                           "08-Jan-2026",
//                           "09-Jan-2026",
//                           "10-Jan-2026",
//                           "12-Jan-2026",
//                           "13-Jan-2026",
//                           "14-Jan-2026",
//                           "15-Jan-2026",
//                           "17-Jan-2026",
//                           "19-Jan-2026",
//                           "20-Jan-2026",
//                           "21-Jan-2026",
//                           "23-Jan-2026",
//                         ],
//                         datasets: [
//                           {
//                             label: "Abandon",
//                             data: [
//                               0, 20, 20, 20, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
//                             ],
//                             backgroundColor: "#F44336",
//                           },
//                           {
//                             label: "Answered",
//                             data: [
//                               20, 0, 60, 100, 40, 20, 20, 60, 60, 60, 20, 20,
//                               20, 20, 20,
//                             ],
//                             backgroundColor: "#8BC34A",
//                           },
//                         ],
//                       }}
//                       options={{
//                         scales: {
//                           y: {
//                             beginAtZero: true,
//                             max: 100,
//                             ticks: { callback: (v) => `${v}%` },
//                             title: { display: true, text: "Percentage" },
//                           },
//                         },
//                         plugins: { legend: { position: "bottom" } },
//                       }}
//                     />
//                   </div>
//                 </div>
//               </div>

//               {/* ===== TICKET ANALYSIS (FULL) ===== */}
//               {/* ===== TICKET ANALYSIS SECTION (2x2 GRID) ===== */}
//               <div className="row mt-4 justify-content-center">
//                 <div className="col-lg-10">
//                   <div className="row g-3">
//                     {" "}
//                     {/* Inner row for proper left/right columns */}
//                     {/* TOP LEFT - Ticket Case Analysis (Sales Inquiry) */}
//                     <div className="col-lg-6 d-flex flex-column gap-3">
//                       <div className="bg-white rounded p-3 flex-grow-1">
//                         <h6 className="fw-bold text-center mb-3">
//                           Ticket Case Analysis
//                         </h6>
//                         <Bar
//                           data={{
//                             labels: [
//                               "DEC-25-WK5",
//                               "JAN-26-WK1",
//                               "JAN-26-WK2",
//                               "JAN-26-WK3",
//                               "JAN-26-WK4",
//                               "MTD",
//                             ],
//                             datasets: [
//                               {
//                                 label: "Sales Inquiry",
//                                 data: [2, 0, 3, 2, 0, 7],
//                                 backgroundColor: "#1E90FF",
//                               },
//                               {
//                                 label: "Service Support",
//                                 data: [2, 2, 8, 3, 2, 17],
//                                 backgroundColor: "#4169E1",
//                               },
//                             ],
//                           }}
//                           options={{
//                             responsive: true,
//                             plugins: { legend: { position: "bottom" } },
//                             scales: {
//                               y: { beginAtZero: true, ticks: { stepSize: 2 } },
//                             },
//                           }}
//                         />
//                       </div>

//                       {/* BOTTOM LEFT - Open Ticket Analysis */}
//                       <div
//                         className="bg-white rounded p-3 flex-grow-1"
//                         style={{ height: 250 }}
//                       >
//                         <h6 className="fw-bold text-center mb-2">
//                           Open Ticket Analysis
//                         </h6>
//                         <Pie
//                           data={{
//                             labels: ["In TAT", "Out of TAT"],
//                             datasets: [
//                               {
//                                 data: [0, 18],
//                                 backgroundColor: ["#1E90FF", "#E67332"],
//                               },
//                             ],
//                           }}
//                           options={{
//                             plugins: { legend: { position: "top" } },
//                             responsive: true,
//                             maintainAspectRatio: false,
//                             layout: { padding: 10 },
//                             radius: "80%",
//                           }}
//                           height={200}
//                           width={200}
//                         />
//                       </div>
//                     </div>
//                     {/* TOP RIGHT - Ticket Case Analysis (Open vs Close) */}
//                     <div className="col-lg-6 d-flex flex-column gap-3">
//                       <div className="bg-white rounded p-3 flex-grow-1">
//                         <h6 className="fw-bold text-center mb-3">
//                           Ticket Case Analysis
//                         </h6>
//                         <Bar
//                           data={{
//                             labels: ["Open", "Close"],
//                             datasets: [
//                               {
//                                 label: "Today",
//                                 data: [0, 0],
//                                 backgroundColor: "#006400",
//                               },
//                               {
//                                 label: "MTD",
//                                 data: [0, 18],
//                                 backgroundColor: "#90EE90",
//                               },
//                             ],
//                           }}
//                           options={{
//                             plugins: { legend: { position: "top" } },
//                             scales: {
//                               y: { beginAtZero: true, ticks: { stepSize: 2 } },
//                             },
//                           }}
//                         />
//                       </div>

//                       {/* BOTTOM RIGHT - Close Ticket Analysis */}
//                       <div
//                         className="bg-white rounded p-3 flex-grow-1"
//                         style={{ height: 250 }}
//                       >
//                         <h6 className="fw-bold text-center mb-2">
//                           Close Ticket Analysis
//                         </h6>
//                         <Pie
//                           data={{
//                             labels: ["In TAT", "Out of TAT"],
//                             datasets: [
//                               {
//                                 data: [0, 18],
//                                 backgroundColor: ["#1E90FF", "#E67332"],
//                               },
//                             ],
//                           }}
//                           options={{
//                             plugins: { legend: { position: "top" } },
//                             responsive: true,
//                             maintainAspectRatio: false,
//                             layout: { padding: 10 },
//                             radius: "80%",
//                           }}
//                           height={200}
//                           width={200}
//                         />
//                       </div>
//                     </div>
//                   </div>
//                 </div>
//               </div>
//             </>
//           )}

//           {/* ================= OUTBOUND ================= */}
//           {!loading && callType === "Outbound" && (
//             <div className="row">
//               <Card
//                 title="Total Connected Calls"
//                 value={data.total_answered_calls}
//                 bg="#3F51B5"
//               />
//               <Card
//                 title="Total Not Connected Calls"
//                 value={data.total_not_connected_calls}
//                 bg="#F44336"
//               />
//               <Card
//                 title="Total Tagged Calls"
//                 value={data.total_tagged_calls}
//                 bg="#03A9F4"
//               />
//             </div>
//           )}
//         </>
//       )}

//       {/* ================= BILLINGS DASHBOARD ================= */}
//       {activeTab === "billings" && (
//         <>
//           <h5 className="text-center mb-4">LEDGER BALANCE (FY 2025-2026)</h5>
//           <div className="row justify-content-center">
//             <Card title="OPENING BALANCE" value="0" bg="#4CAF50" />
//             <Card title="BILLED" value="0" bg="#3F51B5" />
//             <Card title="PAID" value="0" bg="#8BC34A" />
//             <Card title="OUTSTANDING" value="0" bg="#F44336" />
//           </div>

//           <h5 className="text-center my-4">USAGE VALUE BALANCE</h5>
//           <div className="row justify-content-center">
//             <Card title="OPENING BALANCE" value="-11,570.64" bg="#4CAF50" />
//             <Card title="VALUE ADDED" value="0.00" bg="#3F51B5" />
//             <Card title="TODAY CONSUMED VALUE" value="0.00" bg="#8BC34A" />
//             <Card title="CLOSING BALANCE" value="-11,570.64" bg="#F44336" />
//           </div>
//         </>
//       )}
//     </div>
//   );
// };

// export default DashboardAnest;






// Final Version with Calls + Billings Toggle but here on ly design for calls have outbonds and billings have.. 
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";

import {
  PieChart,
  Pie,
  Cell,
  Legend,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import {
  getDashboardReport,
  getActiveServices,
  getCallAnalysisReport,
  getCallDistributionReport,
  getTicketCaseAnalysis,
  getTicketBySource,
} from "../services/authService";

const DashboardAnest = () => {
  const navigate = useNavigate();

  const companyId = 627;
  const userType = localStorage.getItem("user_type");
  // const companyId = Number(localStorage.getItem("company_id")); // for Client users only
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState("");

  // ===== Access Check =====
  useEffect(() => {
    if (
      !(
        userType === "Super-Admin" ||
        userType === "Admin" ||
        (userType === "Client" && companyId === 627)
      )
    ) {
      navigate("/dashboard");
    }
  }, [userType, navigate]);


//   useEffect(() => {
//   if (userType === "Client") {
//     setSelectedClient(companyId);
//   } else if (
//     (userType === "Admin" || userType === "Super-Admin") &&
//     clients.length === 1
//   ) {
//     setSelectedClient(clients[0].id);
//   }
// }, [userType, companyId, clients]);


  // ===== State =====
  const [activeTab, setActiveTab] = useState("calls"); // calls | billings
  const [dateRange, setDateRange] = useState("30days");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [tempFromDate, setTempFromDate] = useState("");
  const [tempToDate, setTempToDate] = useState("");
  const [callType, setCallType] = useState("Inbound");  // fixed
  const [loading, setLoading] = useState(false);

  const [dashboardData, setDashboardData] = useState({
    total: 0,
    unique: 0,
    answered: 0,
    abandon: 0,
    Unique_abandon: 0,
    tagged: 0,
    abandon_callback: 0,
  });

  const [data, setData] = useState({});
  const [pieData, setPieData] = useState([
    { name: "Answered", value: 0 },
    { name: "Abandon", value: 0 },
  ]);

  const [callData, setCallData] = useState([]);

  const [plan, setPlan] = useState(null);

  const [ticketCaseData, setTicketCaseData] = useState([]);
  const [openCloseTicketData, setOpenCloseTicketData] = useState([]);

  const [ticketSourceData, setTicketSourceData] = useState([]);

  const formatDate = (d) => d.toISOString().split("T")[0];


  const handleDateRangeChange = (range) => {
    setDateRange(range);
    const today = new Date();

    switch (range) {
      case "today":
        setFromDate(formatDate(today));
        setToDate(formatDate(today));
        break;

      case "yesterday": {
        const y = new Date(today);
        y.setDate(today.getDate() - 1);
        setFromDate(formatDate(y));
        setToDate(formatDate(y));
        break;
      }

      case "7days": {
        const w = new Date(today);
        w.setDate(today.getDate() - 6);
        setFromDate(formatDate(w));
        setToDate(formatDate(today));
        break;
      }

      case "30days": {
        const m = new Date(today);
        m.setDate(today.getDate() - 29);
        setFromDate(formatDate(m));
        setToDate(formatDate(today));
        break;
      }

      case "custom":
        // ✅ do NOT touch real dates
        setTempFromDate("");
        setTempToDate("");
        break;

      default:
        break;
    }
  };


  // const getViewType = () => {
  //   if (dateRange === "custom") return "Custom";
  //   if (dateRange === "today") return "Today";
  //   if (dateRange === "yesterday") return "Yesterday";
  //   if (dateRange === "7days") return "7days";
  //   return "30days";
  // };

    const getViewType = (range) => {
    switch (range) {
      case "today":
        return "Today";
      case "yesterday":
        return "Yesterday";
      case "7days":
        return "Weekly";
      case "30days":
        return "Monthly";
      case "custom":
        return "Custom";
      default:
        return "Monthly";
    }
  };

  const fetchCallAnalysis = async () => {
    // if (!selectedClient) return;

    try {
      const payload = {
        company_id: 627,
        view_type: getViewType(dateRange),
        from_date: fromDate || null,
        to_date: toDate || null,
      };
      const res = await getCallAnalysisReport(payload);
      setPieData([
        { name: "Answered", value: res.answered ?? 0 },
        { name: "Abandon", value: res.abandon ?? 0 },
      ]);
    } catch (err) {
      console.error("Failed to load call analysis", err);
    }
  };

  const fetchCallDistribution = async () => {
    // if (!selectedClient) return;
    try {
      const payload = {
        company_id: 627,
        view_type: getViewType(dateRange),
        from_date: fromDate || null,
        to_date: toDate || null,
      };
      const data = await getCallDistributionReport(payload);
      setCallData(data);
    } catch (err) {
      console.error("Failed to fetch call distribution report", err);
    }
  };

  useEffect(() => {
    // if (!selectedClient || !fromDate || !toDate) return;

    const fetchAllData = async () => {
      try {
        setLoading(true);
        await Promise.all([
          fetchDashboardData(),
          fetchCallAnalysis(),
          fetchCallDistribution(),
          fetchData(),
          fetchTicketBySource(),
        ]);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, [selectedClient, fromDate, toDate]);

  const fetchDashboardData = async () => {
    try {
      const payload = {
        company_id: Number(selectedClient),
        view_type: getViewType(dateRange),
        from_date: fromDate || null,
        to_date: toDate || null,
      };

      const { days, total_tagged, total_abandon_cb } =
        await getDashboardReport(payload);

      const answered = days.reduce((sum, d) => sum + (d.Answered ?? 0), 0);
      const abandon = days.reduce((sum, d) => sum + (d.Abandon ?? 0), 0);
      const Unique_abandon = days.reduce(
        (sum, d) => sum + (d.Unique_abandon ?? 0),
        0,
      );
      const total = days.reduce((sum, d) => sum + (d.Total ?? 0), 0);
      const unique = days.reduce((sum, d) => sum + (d.Unique ?? 0), 0);

      setDashboardData({
        total,
        unique,
        answered,
        abandon,
        Unique_abandon,
        tagged: total_tagged,
        abandon_callback: total_abandon_cb,
      });
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    }
  };

  const fetchData = async () => {

    // const viewType = dateRange.charAt(0).toUpperCase() + dateRange.slice(1);

    const payload = {
      company_id: 627,
      view_type: getViewType(dateRange),
      from_date: fromDate || null,
      to_date: toDate || null,
    };

    try {
      const { cases, open_tat, close_tat } =
        await getTicketCaseAnalysis(payload);

      setTicketCaseData(cases);
      setOpenCloseTicketData([
        {
          name: "Open",
          InTAT: open_tat[0]?.InTAT ?? 0,
          OutOfTAT: open_tat[0]?.OutOfTAT ?? 0,
        },
        {
          name: "Close",
          InTAT: close_tat[0]?.InTAT ?? 0,
          OutOfTAT: close_tat[0]?.OutOfTAT ?? 0,
        },
      ]);
    } catch (err) {
      console.error("Failed to load Ticket Case Analysis", err);
    }
  };

//   const fetchTicketBySource = async () => {
//   try {
//     const payload = {
//       company_id: 627,
//       view_type:
//         dateRange === "today"
//           ? "Today"
//           : dateRange === "yesterday"
//           ? "Yesterday"
//           : dateRange === "7days"
//           ? "Last 7 Days"
//           : dateRange === "30days"
//           ? "Last 30 Days"
//           : "Custom",
//       from_date: fromDate,
//       to_date: toDate,
//     };

//     const res = await api.post("/dashboard/ticket_by_source", payload);
//     setTicketSourceData(res.data || []);
//   } catch (err) {
//     console.error("Failed to load Ticket By Source", err);
//     setTicketSourceData([]);
//   }
// };

 
  const fetchTicketBySource = async () => {
    try {
      const payload = {
        company_id: 627,
        view_type: getViewType(dateRange),
        from_date: fromDate || null,
        to_date: toDate || null,
      };

      const res = await api.post("/dashboard/ticket_by_source", payload);
      setTicketSourceData(res.data || []);
    } catch (err) {
      console.error("Failed to load Ticket By Source", err);
      setTicketSourceData([]);
    }
  };


  //   useEffect(() => {
  //   const fetchClients = async () => {
  //     try {
  //       const res = await api.get("/agents/clients-rights"); // 👈 use api
  //       setClients(res.data);
  //     } catch (err) {
  //       console.error("Error fetching clients:", err);
  //     }
  //   };

  //   fetchClients();
  // }, []);

  useEffect(() => {
    const fetchClients = async () => {
      try {
        const res = await api.get("/agents/clients-rights");

        // Sort alphabetically (case-insensitive)
        const sortedClients = res.data.sort((a, b) =>
          a.company_name.localeCompare(b.company_name, "en", {
            sensitivity: "base",
          }),
        );

        setClients(sortedClients);
      } catch (err) {
        console.error("Error fetching clients:", err);
      }
    };

    fetchClients();
  }, []);

  //  useEffect(() => {
  //     if ((userType === "Admin" || userType !== "Super-Admin") && clients.length > 0) {
  //       setSelectedClient(companyId);
  //     }
  //   }, [userType, clients, companyId]);

  useEffect(() => {
    if (userType === "Client") {
      // For client users → directly set companyId
      setSelectedClient(companyId);
    } else if (
      (userType === "Super-Admin" || userType === "Admin") &&
      clients.length === 1
    ) {
      // Auto-select if only one client is available
      setSelectedClient(clients[0].id);
    }
  }, [userType, companyId, clients]);

  useEffect(() => {
  const fetchActiveServices = async () => {
    try {
      const res = await api.post("/dashboard/active_services", {
        company_id: 627, // 🔒 hard-coded
      });

      setPlan(res.data);
    } catch (error) {
      console.error("Failed to fetch active services", error);
      setPlan(null);
    }
  };

  fetchActiveServices();
}, []);


  const COLORS = ["#36A2EB", "#4BC0C0"];

  const handleSubmit = async () => {

    try {
      setLoading(true);
      await Promise.all([
        fetchDashboardData(),
        fetchCallAnalysis(),
        fetchCallDistribution(),
        fetchData(),
        fetchTicketBySource(),
      ]);
    } catch (error) {
      console.error("Error during submission data fetch:", error);
    } finally {
      setLoading(false);
    }
  };

  // ===== API Call =====
  useEffect(() => {
    if (!fromDate || !toDate) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        const res = await api.get("/anest-dashboard/dashboard-summary", {
          params: {
            client_id: companyId,
            startdate: fromDate,
            enddate: toDate,
            call_type: callType,
          },
        });
        setData(res.data || {});
      } catch (err) {
        console.error(err);
        setData({});
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    handleSubmit();


  }, [fromDate, toDate, callType]);

  useEffect(() => {
    handleDateRangeChange("30days");
  }, []);

  // ===== Card =====
  const Card = ({ title, value, bg }) => (
    <div className="col-xl-3 col-lg-4 col-md-6 mb-3 px-3">
      <div
        className="d-flex shadow-sm rounded overflow-hidden"
        style={{ width: 300, height: 90 }}
      >
        <div
          className="text-white text-center flex-grow-1 d-flex flex-column justify-content-center"
          style={{ backgroundColor: bg }}
        >
          <div className="small">{title}</div>
          <h5 className="mb-0">{value ?? 0}</h5>
        </div>
        <div style={{ width: 45, backgroundColor: bg, opacity: 0.6 }} />
      </div>
    </div>
  );

  return (

    

    <div className="mt-5 mb-2">
      {/* ===== HEADER ===== */}

         <div className="col-md-4">
          {userType === "Super-Admin" || userType === "Admin" ? (
            <>
              <label className="form-label fw-semibold">Select Client</label>
              <select
                className="form-select"
                value={selectedClient}
                onChange={(e) => setSelectedClient(e.target.value)}
              >
                <option value="">-- Select Client --</option>
                {clients.map((client) => (
                  <option
                    key={client.company_id}
                    value={String(client.company_id)}
                  >
                    {client.company_name}
                  </option>
                ))}
              </select>
            </>
          ) : (
            <p>
    
            </p>
          )}
        </div>

      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
        <h4>{activeTab === "calls" ? "Dashboard" : "Billing Dashboard"}</h4>

        <div className="d-flex gap-3 align-items-start">
          {/* Calls / Billings */}
          {/* <div className="d-flex gap-2">
            <button
              className={`btn btn-sm ${
                activeTab === "calls" ? "btn-primary" : "btn-outline-primary"
              }`}
              onClick={() => setActiveTab("calls")}
            >
              Calls
            </button>
            <button
              className={`btn btn-sm ${
                activeTab === "billings" ? "btn-primary" : "btn-outline-primary"
              }`}
              onClick={() => setActiveTab("billings")}
            >
              Billings
            </button>
          </div> */}

          {/* Calls / Billings but right now disabled billings*/}
          <div className="d-flex gap-2">
            <button
              className="btn btn-sm btn-primary"  // always calls
              disabled
            >
              Calls
            </button>
          </div>



          {/* Date Filter (SAME) */}
          <div className="bg-white shadow-sm rounded px-3 py-2">
            <span className="text-muted small">Select Date Range</span>

            <div className="d-flex gap-2 flex-wrap my-2">
              {["today", "yesterday", "7days", "30days", "custom"].map((k) => (
                <button
                  key={k}
                  className={`btn btn-sm ${
                    dateRange === k ? "btn-primary" : "btn-outline-dark"
                  }`}
                  onClick={() => handleDateRangeChange(k)}
                >
                  {k === "7days"
                    ? "Last 7 Days"
                    : k === "30days"
                      ? "Last 30 Days"
                      : k}
                </button>
              ))}
            </div>

            {/* ✅ CUSTOM DATE INPUTS */}
            {dateRange === "custom" && (
              <form
                onSubmit={(e) => e.preventDefault()}
                className="d-flex align-items-center gap-2 mt-2"
              >
                <input
                  type="date"
                  className="form-control form-control-sm"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                />
                <span className="small">to</span>
                <input
                  type="date"
                  className="form-control form-control-sm"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                />
                <button
                  type="button"
                  className="btn btn-sm btn-primary"
                  onClick={() => {
                    if (!fromDate || !toDate) return;
                  }}
                >
                  Apply
                </button>
              </form>
            )}

            {/* {activeTab === "calls" && (
              <select
                className="form-select form-select-sm mt-2"
                value={callType}
                onChange={(e) => setCallType(e.target.value)}
              >
                <option value="Inbound">Inbound</option>
                <option value="Outbound">Outbound</option>
              </select>
            )} */}

            {/* Calls / Inbound and Outbound but right now disabled Outbound*/}
            {activeTab === "calls" && (
              <select
                className="form-select form-select-sm mt-2"
                value={callType}
                disabled   // 🔒 prevents change
              >
                <option value="Inbound">Inbound</option>
              </select>
            )}


          </div>
        </div>
      </div>

      {/* ================= CALLS DASHBOARD (FULL ORIGINAL CONTENT) ================= */}

      {activeTab === "calls" && (
        <>
          {/* ================= INBOUND ================= */}
          {!loading && callType === "Inbound" && (
            <>
              {/* CARDS */}
              <div className="row">
                <Card
                  title="Total Complaints"
                  value={data.total_complaints}
                  bg="#03A9F4"
                />
                <Card title="Open" value={data.open} bg="#F44336" />
                <Card title="In-Process" value={data.in_process} bg="#FFC107" />
                <Card title="Closed" value={data.closed} bg="#8BC34A" />
              </div>

              <div className="row">
                <Card
                  title="Escalation 1"
                  value={data.escalation_1}
                  bg="#03A9F4"
                />
                <Card
                  title="Escalation 2"
                  value={data.escalation_2}
                  bg="#FFC107"
                />
                <Card
                  title="Escalation 3"
                  value={data.escalation_3}
                  bg="#F44336"
                />
              </div>

              <div className="row">
                <Card
                  title="Total Answered Calls"
                  value={data.total_answered_calls}
                  bg="#3F51B5"
                />
                <Card
                  title="Unique Abandon Calls"
                  value={data.unique_abandon_calls}
                  bg="#F44336"
                />
                <Card
                  title="Total Tagged Calls"
                  value={data.total_tagged_calls}
                  bg="#03A9F4"
                />
                <Card
                  title="Total Abandon Call Back"
                  value={data.total_abandon_call_back}
                  bg="#4CAF50"
                />
              </div>

              {/* ===== ROW 1 ===== */}
              <div className="row mt-3">
                {/* Active Services Table */}
                <div className="col-lg-7 col-12 mb-3">
                  <div className="card h-100">
                    <div className="card-header d-flex justify-content-between">
                      <div className="card-title m-0">
                        <h5 className="mb-1">Active Services</h5>
                        <p className="card-subtitle">
                          Currently Active Plan Details
                        </p>
                      </div>
                    </div>
                    <div className="card-body">
                      {!plan ||
                      (typeof plan === "object" &&
                        Object.keys(plan).length === 0) ? (
                        <div className="text-center text-muted">
                          No active plan found.
                        </div>
                      ) : (
                        <div className="table-responsive">
                          <table className="table table-hover table-bordered mb-0">
                            <thead className="text-center align-middle">
                              <tr>
                                <th className="bg-label-primary text-primary">
                                  My Plan
                                </th>
                                <th>Plan Mode</th>
                                <th className="bg-label-primary text-primary">
                                  Credit Value
                                </th>
                                <th>Subscription Value</th>
                                <th className="bg-label-primary text-primary">
                                  Inbound Call - Day Charges
                                </th>
                                <th>Inbound Call - Night Charges</th>
                                <th className="bg-label-primary text-primary">
                                  Outbound Call Charges
                                </th>
                                <th>SMS Charges</th>
                                <th>Email Charges</th>
                              </tr>
                            </thead>
                            <tbody className="text-center align-middle">
                              <tr>
                                <td className="fw-semibold">
                                  {plan.plan_name}
                                </td>
                                <td>{plan.period_type}</td>
                                <td>
                                  Rs.{" "}
                                  {plan.credit_value.toLocaleString(undefined, {
                                    minimumFractionDigits: 2,
                                  })}
                                </td>
                                <td>
                                  Rs.{" "}
                                  {plan.subscription_value.toLocaleString(
                                    undefined,
                                    { minimumFractionDigits: 2 },
                                  )}
                                </td>
                                <td>
                                  Rs. {plan.inbound_call_day_charge.toFixed(2)}{" "}
                                  / Min.
                                </td>
                                <td>
                                  Rs.{" "}
                                  {plan.inbound_call_night_charge.toFixed(2)} /
                                  Min.
                                </td>
                                <td>
                                  Rs. {plan.outbound_call_charge.toFixed(2)} /
                                  Min.
                                </td>
                                <td>{plan.sms_charge.toFixed(2)}</td>
                                <td>{plan.email_charge.toFixed(2)}</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Call Analysis */}
                <div className="col-lg-5 col-12 mb-3">
                  <div className="card h-100">
                    <div className="card-header d-flex justify-content-between pb-4">
                      <div className="card-title mb-0">
                        <h5 className="mb-1">Call Analysis</h5>
                        <p className="card-subtitle">Answered vs Abandon</p>
                      </div>
                      <div className="dropdown">
                        <button
                          className="btn btn-text-secondary rounded-pill text-body-secondary border-0 p-2 me-n1"
                          type="button"
                          id="callAnalysisMenu"
                          data-bs-toggle="dropdown"
                          aria-haspopup="true"
                          aria-expanded="false"
                        >
                          <i className="icon-base ti tabler-dots-vertical icon-md text-body-secondary"></i>
                        </button>
                        <div
                          className="dropdown-menu dropdown-menu-end"
                          aria-labelledby="callAnalysisMenu"
                        >
                          <a className="dropdown-item" href="#">
                            View More
                          </a>
                          <a className="dropdown-item" href="#">
                            Delete
                          </a>
                        </div>
                      </div>
                    </div>
                    <div className="card-body">
                      <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                          <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            outerRadius={80}
                            dataKey="value"
                            startAngle={90}
                            endAngle={-270}
                          >
                            {pieData.map((entry, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={COLORS[index]}
                                stroke="#fff"
                                strokeWidth={2}
                              />
                            ))}
                          </Pie>

                          <Tooltip />
                          <Legend
                            verticalAlign="top"
                            iconType="circle"
                            align="center"
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </div>

              {/* ===== ROW 2 ===== */}
              <div className="row mt-3">
                {/* Call Answer vs Abandon */}
                <div className="col-lg-5 col-12 mb-3">
                  <div className="card h-100">
                    <div className="card-header d-flex justify-content-between align-items-start pb-0">
                      <div className="card-title mb-0">
                        <h5 className="mb-1">Call Answer vs Abandon</h5>
                        <p className="card-subtitle">Daily Call Distribution</p>
                      </div>
                      <div className="dropdown">
                        <button
                          className="btn btn-text-secondary btn-icon rounded-pill border-0 p-1"
                          type="button"
                          data-bs-toggle="dropdown"
                          aria-haspopup="true"
                          aria-expanded="false"
                        >
                          <i className="icon-base ti tabler-dots-vertical icon-md text-body-secondary"></i>
                        </button>
                        <div className="dropdown-menu dropdown-menu-end">
                          <a className="dropdown-item" href="#">
                            Download
                          </a>
                          <a className="dropdown-item" href="#">
                            Refresh
                          </a>
                        </div>
                      </div>
                    </div>
                    <div className="card-body">
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart
                          data={callData}
                          layout="vertical"
                          margin={{ top: 10, right: 30, left: 40, bottom: 10 }}
                        >
                          <XAxis
                            type="number"
                            domain={[0, 100]}
                            tickFormatter={(tick) => `${tick}%`}
                            stroke="#b4b7bd"
                            fontSize={12}
                          />
                          <YAxis
                            type="category"
                            dataKey="date"
                            stroke="#b4b7bd"
                            fontSize={12}
                          />
                          <Tooltip formatter={(value) => `${value}%`} />
                          <Legend verticalAlign="top" height={36} />
                          <Bar
                            dataKey="Answered"
                            stackId="a"
                            fill="#66bb6a"
                            radius={[4, 4, 0, 0]}
                          />
                          <Bar
                            dataKey="Abandon"
                            stackId="a"
                            fill="#ef5350"
                            radius={[4, 4, 0, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                {/* Ticket By Source */}
                <div className="col-lg-7 col-12 mb-3">
                  <div className="card h-100 shadow-sm rounded-2xl">
                    <div className="card-header d-flex justify-between items-center border-b border-gray-200 p-4">
                      <h5 className="text-lg font-semibold flex items-center gap-2">
                        <i className="ti ti-ticket text-primary"></i>
                        Ticket By Source
                      </h5>
                      <div className="dropdown">
                        <button
                          className="btn btn-sm btn-light rounded-full"
                          type="button"
                          id="ticketBySourceDropdown"
                          data-bs-toggle="dropdown"
                          aria-haspopup="true"
                          aria-expanded="false"
                        >
                          <i className="ti ti-dots-vertical text-gray-500"></i>
                        </button>
                        <div
                          className="dropdown-menu dropdown-menu-end"
                          aria-labelledby="ticketBySourceDropdown"
                        >
                          <a className="dropdown-item" href="#">
                            Download
                          </a>
                          <a className="dropdown-item" href="#">
                            Refresh
                          </a>
                          <a className="dropdown-item" href="#">
                            Share
                          </a>
                        </div>
                      </div>
                    </div>
                    <div className="table-responsive">
                      <table className="table mb-0 text-sm">
                        <thead className="bg-gray-50 text-gray-600">
                          <tr>
                            <th className="font-medium py-3 px-4">Source</th>
                            <th className="font-medium py-3 px-4 text-center">
                              Total
                            </th>
                            <th className="font-medium py-3 px-4 text-center">
                              Open
                            </th>
                            <th className="font-medium py-3 px-4 text-center">
                              Close
                            </th>
                            <th className="font-medium py-3 px-4 text-center">
                              As On Date
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {ticketSourceData.map((item, index) => (
                            <tr
                              key={index}
                              className="hover:bg-gray-50 transition"
                            >
                              <td className="py-3 px-4 font-medium text-gray-700">
                                {item.source}
                              </td>
                              <td className="py-3 px-4 text-center text-gray-600">
                                {item.total}
                              </td>
                              <td className="py-3 px-4 text-center text-gray-600">
                                {item.open}
                              </td>
                              <td className="py-3 px-4 text-center text-gray-600">
                                {item.close}
                              </td>
                              <td className="py-3 px-4 text-center text-gray-600">
                                {item.as_on_date}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>

              {/* Activity Timeline */}
              <div className="col-12">
                <div className="card h-100">
                  <div className="card-header d-flex justify-content-between align-items-start pb-0">
                    <div className="card-title mb-0">
                      <h5 className="mb-1">Ticket Case Analysis</h5>
                      <p className="card-subtitle">
                        Current Ticket Distribution
                      </p>
                    </div>
                    <div className="dropdown">
                      <button
                        className="btn btn-text-secondary btn-icon rounded-pill border-0 p-1"
                        type="button"
                        data-bs-toggle="dropdown"
                        aria-haspopup="true"
                        aria-expanded="false"
                      >
                        <i className="icon-base ti tabler-dots-vertical icon-md text-body-secondary"></i>
                      </button>
                      <div className="dropdown-menu dropdown-menu-end">
                        <a className="dropdown-item" href="#">
                          Download
                        </a>
                        <a className="dropdown-item" href="#">
                          Refresh
                        </a>
                      </div>
                    </div>
                  </div>
                  <div className="card-body">
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart
                        data={ticketCaseData}
                        margin={{ top: 10, right: 20, left: 0, bottom: 10 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" stroke="#b4b7bd" />
                        <YAxis stroke="#b4b7bd" />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="Enquiry" stackId="a" fill="#6366F1" />
                        <Bar dataKey="Complaint" stackId="a" fill="#EC4899" />
                        <Bar dataKey="BulkOrder" stackId="a" fill="#F59E0B" />
                        <Bar dataKey="Request" stackId="a" fill="#10B981" />
                        <Bar dataKey="Other" stackId="a" fill="#F43F5E" />
                      </BarChart>
                    </ResponsiveContainer>

                    <div className="row mt-4">
                      <div className="col-md-6">
                        <h6 className="text-center mb-2">
                          Open Ticket Analysis
                        </h6>
                        <ResponsiveContainer width="100%" height={200}>
                          <BarChart data={openCloseTicketData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" stroke="#b4b7bd" />
                            <YAxis stroke="#b4b7bd" />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="InTAT" stackId="b" fill="#22D3EE" />
                            <Bar
                              dataKey="OutOfTAT"
                              stackId="b"
                              fill="#FB923C"
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="col-md-6">
                        <h6 className="text-center mb-2">
                          Close Ticket Analysis
                        </h6>
                        <ResponsiveContainer width="100%" height={200}>
                          <BarChart data={openCloseTicketData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" stroke="#b4b7bd" />
                            <YAxis stroke="#b4b7bd" />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="InTAT" stackId="c" fill="#22D3EE" />
                            <Bar
                              dataKey="OutOfTAT"
                              stackId="c"
                              fill="#FB923C"
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ================= OUTBOUND ================= */}
          {!loading && callType === "Outbound" && (
            <div className="row">
              <Card
                title="Total Connected Calls"
                value={data.total_answered_calls}
                bg="#3F51B5"
              />
              <Card
                title="Total Not Connected Calls"
                value={data.total_not_connected_calls}
                bg="#F44336"
              />
              <Card
                title="Total Tagged Calls"
                value={data.total_tagged_calls}
                bg="#03A9F4"
              />
            </div>
          )}
        </>
      )}

      {/* ================= BILLINGS DASHBOARD ================= */}
      {activeTab === "billings" && (
        <>
          <h5 className="text-center mb-4">LEDGER BALANCE (FY 2025-2026)</h5>
          <div className="row justify-content-center">
            <Card title="OPENING BALANCE" value="0" bg="#4CAF50" />
            <Card title="BILLED" value="0" bg="#3F51B5" />
            <Card title="PAID" value="0" bg="#8BC34A" />
            <Card title="OUTSTANDING" value="0" bg="#F44336" />
          </div>

          <h5 className="text-center my-4">USAGE VALUE BALANCE</h5>
          <div className="row justify-content-center">
            <Card title="OPENING BALANCE" value="-11,570.64" bg="#4CAF50" />
            <Card title="VALUE ADDED" value="0.00" bg="#3F51B5" />
            <Card title="TODAY CONSUMED VALUE" value="0.00" bg="#8BC34A" />
            <Card title="CLOSING BALANCE" value="-11,570.64" bg="#F44336" />
          </div>
        </>
      )}
    </div>
  );
};

export default DashboardAnest;
