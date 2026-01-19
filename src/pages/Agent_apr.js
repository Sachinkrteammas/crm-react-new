import React, { useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { saveAs } from "file-saver";
import api from "../api";

const AgentAprExport = () => {
  const [agentType, setAgentType] = useState("");
  const [dialer, setDialer] = useState("ALL");
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [loading, setLoading] = useState(false);

  // Function to download Excel file

    const handleExport = async () => {
    if (!startDate || !endDate || !agentType) {
        alert("Please select all filters before exporting.");
        return;
    }

    setLoading(true);

    try {
        // Format date locally to avoid one-day-back issue
        const formatDate = (date) => {
        const d = new Date(date);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
        };

        // Build query string
        const query = new URLSearchParams({
        start_date: formatDate(startDate),
        end_date: formatDate(endDate),
        agent_type: agentType,
        dialer: dialer,
        });

        // Use api.get like in OverallAgentSkills
        const response = await api.get(`/agent-apr-export?${query.toString()}`, {
        responseType: "blob", // important for binary files
        });

        // Convert to blob
        const blob = new Blob([response.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        });

        // Extract filename from content-disposition header
        let filename = "APR_Report.xlsx";
        const disposition = response.headers["content-disposition"];
        if (disposition && disposition.includes("filename=")) {
        filename = disposition
            .split("filename=")[1]
            .replace(/"/g, "")
            .trim();
        }

        // Save using file-saver
        saveAs(blob, filename);
    } catch (err) {
        console.error("Error exporting Excel:", err);
        alert("Failed to export Excel");
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
    <div className="row">
      <div className="col-12">
        <div className="card p-4 mb-4">
          <h5 className="mb-3">AGENT APR EXPORT</h5>

          <div className="d-flex flex-wrap align-items-center gap-3">
            {/* Dialer */}
            <div style={{ maxWidth: "220px" }}>
              <select
                className="form-select"
                value={dialer}
                onChange={(e) => setDialer(e.target.value)}
              >
                <option value="ALL">Dialer 5</option>
                <option value="Dialer 8">Dialer 8</option>
              </select>
            </div>


            {/* Agent Type */}
            <div style={{ maxWidth: "220px" }}>
              <select
                className="form-select"
                value={agentType}
                onChange={(e) => setAgentType(e.target.value)}
              >
                <option value="">Select</option>
                <option value="All">ALL</option>
                <option value="Unit 1">Unit 1</option>
                <option value="Unit 2">Unit 2</option>
              </select>
            </div>
            

            {/* Start Date */}
            <div style={{ maxWidth: "220px" }}>
              <DatePicker
                selected={startDate}
                onChange={setStartDate}
                placeholderText="Start Date"
                className="form-control"
                dateFormat="yyyy-MM-dd"
              />
            </div>

            {/* End Date */}
            <div style={{ maxWidth: "220px" }}>
              <DatePicker
                selected={endDate}
                onChange={setEndDate}
                placeholderText="End Date"
                className="form-control"
                dateFormat="yyyy-MM-dd"
              />
            </div>

            {/* Export Button */}
            <button
              className="btn btn-primary fw-semibold"
              onClick={handleExport}
              disabled={loading}
            >
              {loading ? "Exporting..." : "EXPORT"}
            </button>
          </div>
        </div>
      </div>
    </div>
    </div>
    </>
  );
};

export default AgentAprExport;
