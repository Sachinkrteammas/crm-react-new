import React, { useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import "../styles/loader.css";
import api from "../api";
import { useNavigate } from "react-router-dom";

const RLReport = () => {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [showTable, setShowTable] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sampleData, setSampleData] = useState([]);

  const navigate = useNavigate();

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
  // RL API CALL (FIXED)
  // ===============================
  const fetchRLReport = async () => {
    const res = await api.post(
      "/report/rl_internal_report",
      {}, // empty body
      {
        params: {
          from_date: startDate,
          to_date: endDate,
        },
      }
    );

    return res.data;
  };

  // ===============================
  // VIEW BUTTON
  // ===============================
  const handleViewClick = async () => {
    if (!startDate || !endDate) {
      alert("Select date range");
      return;
    }

    setLoading(true);

    try {
      const data = await fetchRLReport();

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
  // EXPORT BUTTON (NO TABLE VIEW)
  // ===============================
  const handleExport = async () => {
    if (!startDate || !endDate) {
      alert("Select date range");
      return;
    }

    setLoading(true);

    try {
      const data = await fetchRLReport();

      if (!data || data.length === 0) {
        alert("No data available");
        return;
      }

      // Create Excel
      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "RL Report");

      const excelBuffer = XLSX.write(workbook, {
        bookType: "xlsx",
        type: "array",
      });

      const file = new Blob([excelBuffer], {
        type: "application/octet-stream",
      });

      saveAs(
        file,
        `RL_Internal_Report_${startDate}_to_${endDate}.xlsx`
      );

      // Don't show table on export
      setShowTable(false);
    } catch (err) {
      console.error(err);
      alert("Export failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* LOADER */}
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
        {/* FILTER CARD */}
        <div className="card p-4 mb-4">
          <h5>RL INTERNAL REPORT</h5>

          <div className="d-flex gap-2">
            <DatePicker
              selected={startDate ? new Date(startDate) : null}
              onChange={handleStartDateChange}
              placeholderText="Start Date"
              className="form-control"
              dateFormat="dd-MM-yyyy"
            />

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

            <button className="btn btn-primary" onClick={handleExport}>
              EXPORT
            </button>

            <button
              className="btn btn-outline-primary"
              onClick={() => navigate(-1)}
            >
              ← Back
            </button>
          </div>
        </div>

        {/* TABLE VIEW */}
        {showTable && (
          <div className="card p-4">
            <h6>RL REPORT DATA</h6>

            <div
              className="table-responsive"
              style={{
                maxHeight: "600px",
                overflowY: "auto",
                overflowX: "auto",
                position: "relative",
              }}
            >
              <table className="table table-bordered">
                <thead>
                  <tr>
                    {[
                      "Company Name",
                      "Abandon Unique",
                      "Called Back",
                      "Connected",
                      "Not Connected",
                      "Failed to Attempt",
                    ].map((title, index) => (
                      <th
                        key={index}
                        style={{
                          position: "sticky",
                          top: 0,
                          background: "#fff",
                          zIndex: 1000,
                          borderBottom: "2px solid #dee2e6",
                        }}
                      >
                        {title}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {sampleData.length > 0 ? (
                    sampleData.map((row, i) => (
                      <tr key={i}>
                        <td>{row.company_name}</td>
                        <td>{row.Abandon_Unique}</td>
                        <td>{row.Called_Back}</td>
                        <td>{row.Connected}</td>
                        <td>{row.Not_Connected}</td>
                        <td>{row.Failed_to_attempt}</td>
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
