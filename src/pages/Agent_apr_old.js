import React, { useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { saveAs } from "file-saver";
import api from "../api";

const AgentAprExportOld = () => {
  const [agentType, setAgentType] = useState("");
  const [dialer, setDialer] = useState("ALL");
  const [processType, setProcessType] = useState("");
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [loading, setLoading] = useState(false);

  // Function to download Excel file

    const handleExport = async () => {
      if (!startDate || !endDate || !agentType || !processType) {
        alert("Please select all filters before exporting.");
        return;
      }

      setLoading(true);

      try {
        const formatDate = (date) => {
          const d = new Date(date); 
          const year = d.getFullYear();
          const month = String(d.getMonth() + 1).padStart(2, "0");
          const day = String(d.getDate()).padStart(2, "0");
          return `${year}-${month}-${day}`;
        };

        const query = new URLSearchParams({
          query_date: formatDate(startDate),  // changed
          end_date: formatDate(endDate),
          agent_type: agentType,
          process: processType,              // changed
          shift: "ALL",                      // new param
        });

        const response = await api.get(`/apr-report/xlsx_old?${query.toString()}`, {
          responseType: "blob",
        });

        const blob = new Blob([response.data], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        });

        let filename = "APR_Report.xlsx";
        const disposition = response.headers["content-disposition"];
        if (disposition && disposition.includes("filename=")) {
          filename = disposition.split("filename=")[1].replace(/"/g, "").trim();
        }

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
          <h5 className="mb-3">AGENT APR EXPORT OLD</h5>

          <div className="d-flex flex-wrap align-items-center gap-3">
            {/* Dialer */}
            {/* <div style={{ maxWidth: "220px" }}>
              <select
                className="form-select"
                value={dialer}
                onChange={(e) => setDialer(e.target.value)}
              >
                <option value="ALL">Dialer 5</option>
                <option value="Dialer 8">Dialer 8</option>
              </select>
            </div> */}


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

            {/* Process Type */}
            <div style={{ maxWidth: "220px" }}>
              <select
                className="form-select"
                value={processType}
                onChange={(e) => setProcessType(e.target.value)}
              >
                <option value="">Select Process</option>
                <option value="All">All</option>
                <option value="C2P">C2P</option>
                <option value="Dialdesk DSC">Dialdesk DSC</option>
                <option value="IB Dedicated">IB Dedicated</option>
                <option value="MAS/Others">MAS/Others</option>
                <option value="OB Dedicated">OB Dedicated</option>
                <option value="Others">Others</option>
                <option value="Shared IB">Shared IB</option>
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

export default AgentAprExportOld;
