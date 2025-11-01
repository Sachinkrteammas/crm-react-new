import React, { useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import "../styles/loader.css";

const AbandonedCallDetails = () => {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(false);

  // 🔹 Static sample data for export
  const sampleData = [
    {
      callerNumber: "9876543210",
      queueName: "Support Queue",
      abandonTime: "2025-10-29 11:42:33",
      waitDuration: "00:01:45",
      agentAvailable: "No",
      callStatus: "Abandoned",
    },
    {
      callerNumber: "9123456780",
      queueName: "Sales Queue",
      abandonTime: "2025-10-29 12:15:20",
      waitDuration: "00:00:59",
      agentAvailable: "Yes",
      callStatus: "Abandoned",
    },
  ];

  const formatDate = (date) => {
    if (!date) return "";
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const handleStartDateChange = (date) => {
    setStartDate(formatDate(date));
  };

  const handleEndDateChange = (date) => {
    setEndDate(formatDate(date));
  };

  // 🔹 Export static data to Excel
  const handleExport = () => {
    if (sampleData.length === 0) {
      alert("No data to export.");
      return;
    }

    setLoading(true);
    try {
      const worksheet = XLSX.utils.json_to_sheet(sampleData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Abandoned Calls");

      const excelBuffer = XLSX.write(workbook, {
        bookType: "xlsx",
        type: "array",
      });

      const file = new Blob([excelBuffer], {
        type: "application/octet-stream",
      });
      saveAs(file, "abandoned_call_details_analysis_report.xlsx");
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
        <div className="row gy-4 gx-3">
          {/* HEADER CARD */}
          <div className="card p-4 mb-4">
            <h5 className="mb-3">Abandon Call Detail Analysis Reports</h5>
            <div className="d-flex flex-wrap align-items-center gap-2">
              <DatePicker
                selected={startDate ? new Date(startDate) : null}
                onChange={handleStartDateChange}
                placeholderText="Start Date"
                className="form-control"
              />
              <DatePicker
                selected={endDate ? new Date(endDate) : null}
                onChange={handleEndDateChange}
                placeholderText="End Date"
                className="form-control"
              />
              <button className="btn btn-primary" onClick={handleExport}>
                EXPORT
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default AbandonedCallDetails;
