import React, { useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import api from "../api";

const AdvisorDisconnect = () => {
  const [reportDate, setReportDate] = useState(null);
  const [loading, setLoading] = useState(false);

  const formatDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  };

  const handleExport = async () => {
    if (!reportDate) {
      alert("Please select date");
      return;
    }

    const formattedDate = formatDate(reportDate);

    try {
      setLoading(true);

      // ✅ GET API CALL
      const response = await api.get(
        `/report/advisor-disconnect-report?report_date=${formattedDate}`,
        {
          responseType: "blob",
        }
      );

      // ✅ Create Blob
      const blob = new Blob([response.data], {
        type:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      // ✅ Default filename
      let fileName = `Advisor_Disconnect_Report_${formattedDate}.xlsx`;

      // ✅ Read filename from backend response
      const contentDisposition =
        response.headers["content-disposition"];

      if (contentDisposition) {

        const match =
          contentDisposition.match(/filename="?([^"]+)"?/);

        if (match && match[1]) {
          fileName = match[1];
        }
      }

      // ✅ Download file
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

              <h5 className="mb-3">
                Advisor Disconnect Report
              </h5>

              <div className="d-flex flex-wrap align-items-end gap-3">

                {/* Date Picker */}
                <div style={{ maxWidth: "220px" }}>

                  <label className="form-label">
                    Report Date
                  </label>

                  <DatePicker
                    selected={reportDate}
                    onChange={setReportDate}
                    placeholderText="Select Date"
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
                  {loading ? "EXPORTING..." : "EXPORT"}
                </button>

              </div>

            </div>

          </div>
        </div>
      </div>
    </>
  );
};

export default AdvisorDisconnect;