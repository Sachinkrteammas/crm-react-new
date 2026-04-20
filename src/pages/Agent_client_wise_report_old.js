import React, { useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import api from "../api";

const AgentClientWiseOld = () => {
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [isShared, setIsShared] = useState("all");
  const [loading, setLoading] = useState(false);

  const formatDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
    };

  const handleExport = async () => {
    if (!startDate || !endDate) {
      alert("Please select both dates");
      return;
    }

    if (startDate > endDate) {
      alert("Start date cannot be after end date");
      return;
    }

    const start = formatDate(startDate);
    const end = formatDate(endDate);

    try {
        setLoading(true);
      const response = await api.get(
        `/report/closer-log-report/excel_old?start_date=${start}&end_date=${end}&is_shared=${isShared}`,
        {
          responseType: "blob", // IMPORTANT for file download
        }
      );

      const blob = new Blob([response.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      // Extract filename
      let fileName = "report.xlsx";
      const contentDisposition = response.headers["content-disposition"];

      if (contentDisposition) {
        const match = contentDisposition.match(/filename=(.*)/);
        if (match && match[1]) {
          fileName = match[1];
        }
      }

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();

      window.URL.revokeObjectURL(url);

    } catch (error) {
      console.error("Download error:", error);
      alert("Failed to download file");
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
          <h5 className="mb-3">Agent Client Wise Report Old</h5>

          <div className="d-flex flex-wrap align-items-end gap-3">

            <div className="col-md-2">
                <label className="form-label">Select Type</label>
                <select
                    className="form-control"
                    value={isShared}
                    onChange={(e) => setIsShared(e.target.value)}
                    >
                    <option value="all">All</option>
                    <option value="false">Dedicated</option>
                    <option value="true">Shared</option>
                </select>
              </div>

            {/* Start Date */}
            <div style={{ maxWidth: "220px" }}>
              <label className="form-label">Start Date</label>
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
              <label className="form-label">End Date</label>
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
            >
              EXPORT
            </button>
          </div>
        </div>
      </div>
    </div>
    </div>
    </>
  );
};

export default AgentClientWiseOld;
