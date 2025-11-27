import React, { useState, useEffect } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import api from "../api";

const SlaAgentsReports = () => {
  const FIXED_COMPANY = 656;
  const userType = localStorage.getItem("user_type");
  const companyId = localStorage.getItem("company_id");

  const [clients, setClients] = useState([]);
  const [clientId, setClientId] = useState(userType === "Client" ? companyId : "");
  const [clientName, setClientName] = useState("");
  const [fromDate, setFromDate] = useState(null);
  const [toDate, setToDate] = useState(null);
  const [rows, setRows] = useState([]);
  const [showTable, setShowTable] = useState(false);
  const [loading, setLoading] = useState(false);

  const formatDate = (date) => (date ? date.toISOString().split("T")[0] : "");

  useEffect(() => {
  const loadClients = async () => {
    try {
      const res = await api.get("/agents/clients-rights");
      const allClients = res.data?.data || [];

      console.log("ALL CLIENTS FROM API:", allClients);

      // Filter only clients with company_id = 656
      const filteredClients = allClients.filter(c => {
        // Make sure company_id exists and convert to number
        const compId = c.company_id ?? c.companyId;
        return Number(compId) === 656;
      });

      console.log("FILTERED CLIENTS:", filteredClients);

      setClients(filteredClients);

      // Auto-select if only 1 client
      if (filteredClients.length === 1 && (userType === "Admin" || userType === "Super-Admin")) {
        setClientId(String(filteredClients[0].client_id ?? filteredClients[0].clientId));
      }
    } catch (err) {
      console.error("CLIENT FETCH ERROR:", err);
    }
  };

  if (["Admin", "Super-Admin", "Client"].includes(userType)) {
    loadClients();
  }

  // For Client user, also set name
  if (userType === "Client") {
    const storedUserData = JSON.parse(localStorage.getItem("userData") || "{}");
    setClientName(storedUserData?.auth_person || "Your Company");
    setClientId(companyId);
  }
}, [userType, companyId]);

  const handleView = async () => {
    if (!clientId) return alert("Please select client");
    if (!fromDate || !toDate) return alert("Please select date range");

    setLoading(true);
    try {
      const payload = {
        company_id: FIXED_COMPANY,
        client_id: Number(clientId),
        from_date: formatDate(fromDate),
        to_date: formatDate(toDate),
      };
      const res = await api.post("/sla_cdr_report", payload);
      setRows(res.data?.data || []);
      setShowTable(true);
    } catch (err) {
      console.error("REPORT LOAD ERROR:", err);
      alert("Unable to fetch SLA report");
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    if (!rows?.length) return alert("No data to export");

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "SLA_CDR");
    const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    saveAs(
      new Blob([excelBuffer]),
      `SLA_CDR_Report_${formatDate(fromDate)}_to_${formatDate(toDate)}.xlsx`
    );
  };

  return (
    <>
      {loading && (
        <div className="loader-overlay">
          <div className="bar"></div>
          <div className="bar"></div>
          <div className="bar"></div>
        </div>
      )}

      <div className={`card p-3 mb-3 ${loading ? "blurred" : ""}`}>
        <h5 className="mb-3 text-primary">SLA Agents CDR Report</h5>
        <div className="d-flex gap-3 flex-wrap align-items-center">
          {userType === "Client" ? (
            <input type="text" className="form-control" value={clientName} disabled />
          ) : (
            <select className="form-control" value={clientId} onChange={(e) => setClientId(e.target.value)}>
              <option value="">-- Select Client --</option>
              {clients.map(c => (
                <option key={c.client_id ?? c.clientId} value={String(c.client_id ?? c.clientId)}>
                  {c.client_name ?? c.clientName}
                </option>
              ))}
            </select>
          )}

          <DatePicker selected={fromDate} onChange={setFromDate} placeholderText="From Date" className="form-control" />
          <DatePicker selected={toDate} onChange={setToDate} placeholderText="To Date" className="form-control" />

          <button className="btn btn-primary" onClick={handleView} disabled={loading}>
            {loading ? "Loading..." : "View"}
          </button>
          <button className="btn btn-success" onClick={handleExport}>Export</button>
        </div>
      </div>

      {showTable && rows.length > 0 && (
        <div className="card p-3">
          <h6>View SLA CDR Report</h6>
          <div className="table-responsive" style={{ maxHeight: 500 }}>
            <table className="table table-bordered table-sm table-hover">
              <thead className="table-light">
                <tr>
                  <th>Agent</th>
                  <th>Phone</th>
                  <th>Call Date</th>
                  <th>Queue Time</th>
                  <th>Queue Start</th>
                  <th>Start</th>
                  <th>End</th>
                  <th>Wrap End</th>
                  <th>Call Duration Sec</th>
                  <th>Wrap Time</th>
                  <th>Source</th>
                  <th>Recording</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i}>
                    <td>{r.agent}</td>
                    <td>{r.phone_number}</td>
                    <td>{r.call_date}</td>
                    <td>{r.queuetime}</td>
                    <td>{r.queue_start}</td>
                    <td>{r.start_time}</td>
                    <td>{r.end_time}</td>
                    <td>{r.wrap_end_time}</td>
                    <td>{r.call_duration1}</td>
                    <td>{r.wrap_time}</td>
                    <td>{r.source}</td>
                    <td>{r.recording ? <a href={r.recording} target="_blank" rel="noreferrer">📥</a> : "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showTable && rows.length === 0 && <div className="text-center">No records found for selected date range.</div>}
    </>
  );
};

export default SlaAgentsReports;
