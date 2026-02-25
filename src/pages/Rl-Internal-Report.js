import React, { useState, useEffect } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import "../styles/loader.css";
import api from "../api";
import { useNavigate } from "react-router-dom";

const RLReport = () => {
  const userType = localStorage.getItem("user_type");
  const companyId = localStorage.getItem("company_id");

  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState("");

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // ⭐ radio selection
  const [reportType, setReportType] = useState("company");
  const [appliedReportType, setAppliedReportType] = useState("company");

  const [showTable, setShowTable] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sampleData, setSampleData] = useState([]);

  const navigate = useNavigate();

  // ===============================
  // FETCH CLIENT LIST (ADMIN ONLY)
  // ===============================
  useEffect(() => {
    if (userType === "Super-Admin" || userType === "Admin") {
      api
        .get("/agents/clients-rights")
        .then((res) => {
          const sorted = res.data.sort((a, b) =>
            a.company_name.localeCompare(b.company_name)
          );
          setClients(sorted);
        })
        .catch((err) => console.error(err));
    } else {
      setSelectedClient(companyId);
    }
  }, []);

  // ===============================
  // FORMAT DATE yyyy-mm-dd
  // ===============================
  const formatDate = (date) => {
    if (!date) return "";
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  const handleStartDateChange = (date) => setStartDate(formatDate(date));
  const handleEndDateChange = (date) => setEndDate(formatDate(date));

  // ===============================
  // RL API CALL
  // ===============================
  const fetchRLReport = async (type) => {
    const params = {
      from_date: startDate,
      to_date: endDate,
      report_type: type,
    };

    // ⭐ send company_id only if selected
    if (selectedClient) {
      params.company_id = selectedClient;
    }

    const res = await api.post("/report/rl_internal_report", {}, { params });
    return res.data;
  };

  // ===============================
  // VIEW
  // ===============================
  const handleViewClick = async () => {
    if (!startDate || !endDate) {
      alert("Select date range");
      return;
    }

    setLoading(true);

    try {
      setAppliedReportType(reportType);
      const data = await fetchRLReport(reportType);
      setSampleData(data || []);
      setShowTable(true);
    } catch (err) {
      console.error(err);
      alert("Failed to fetch report");
    } finally {
      setLoading(false);
    }
  };

  // ===============================
  // EXPORT
  // ===============================
  const handleExport = async () => {
    if (!startDate || !endDate) {
      alert("Select date range");
      return;
    }

    setLoading(true);

    try {
      const data = await fetchRLReport(reportType);

      if (!data?.length) {
        alert("No data available");
        return;
      }

      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "RL Report");

      const buffer = XLSX.write(workbook, {
        bookType: "xlsx",
        type: "array",
      });

      saveAs(
        new Blob([buffer]),
        `RL_Internal_${reportType}_${startDate}_to_${endDate}.xlsx`
      );
    } catch (err) {
      console.error(err);
      alert("Export failed");
    } finally {
      setLoading(false);
    }
  };

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
        <div className="card p-4 mb-4">
          <h5>RL INTERNAL REPORT</h5>

          <div className="d-flex gap-3 flex-wrap align-items-center">

            {/* CLIENT DROPDOWN */}
            {(userType === "Super-Admin" || userType === "Admin") && (
              <select
                className="form-control w-25"
                value={selectedClient}
                onChange={(e) => setSelectedClient(e.target.value)}
              >
                <option value="">All Clients</option>
                {clients.map((c) => (
                  <option key={c.company_id} value={c.company_id}>
                    {c.company_name}
                  </option>
                ))}
              </select>
            )}

            {/* RADIO BUTTONS */}
            <div className="d-flex gap-3">
              <label>
                <input
                  type="radio"
                  value="company"
                  checked={reportType === "company"}
                  onChange={() => setReportType("company")}
                />{" "}
                Client
              </label>

              <label>
                <input
                  type="radio"
                  value="entry"
                  checked={reportType === "entry"}
                  onChange={() => setReportType("entry")}
                />{" "}
                Date
              </label>
            </div>

            {/* START DATE */}
            <DatePicker
              selected={startDate ? new Date(startDate) : null}
              onChange={handleStartDateChange}
              placeholderText="Start Date"
              className="form-control"
              dateFormat="dd-MM-yyyy"
            />

            {/* END DATE */}
            <DatePicker
              selected={endDate ? new Date(endDate) : null}
              onChange={handleEndDateChange}
              placeholderText="End Date"
              className="form-control"
              dateFormat="dd-MM-yyyy"
            />

            <button className="btn btn-primary" onClick={handleViewClick}>
              VIEW
            </button>

            <button className="btn btn-success" onClick={handleExport}>
              EXPORT
            </button>

            <button
              className="btn btn-outline-primary"
              onClick={() => navigate(-1)}
            >
              Back
            </button>
          </div>
        </div>

        {/* TABLE */}
        {showTable && (
          <div className="card p-4">
            <div className="table-responsive"
            style={{
                maxHeight: "500px",
                overflowY: "auto",
                overflowX: "auto",
              }}>
              <table className="table table-bordered">
                <thead>
                  <tr>
                    <th>
                      {appliedReportType === "company"
                        ? "Company Name"
                        : "Date"}
                    </th>
                    <th>Total Abandon</th>
                    <th>Abandon Unique</th>
                    <th>Callback</th>
                    <th>Connected</th>
                    <th>Not Connected</th>
                    <th>Failed Attempt</th>
                  </tr>
                </thead>

                <tbody>
                  {sampleData.length > 0 ? (
                    sampleData.map((row, i) => (
                      <tr key={i}>
                        <td>
                          {appliedReportType === "company"
                            ? row.CompanyName
                            : row.EntryDate}
                        </td>
                        <td>{row.Total_Abandon}</td>
                        <td>{row.Abandon_Unique}</td>
                        <td>{row.callback}</td>
                        <td>{row.Connected}</td>
                        <td>{row.NcConnected}</td>
                        <td>{row.faild_attempt}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="7" className="text-center">
                        No data available
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default RLReport;