import React, { useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { useNavigate } from "react-router-dom";
import api from "../api";
import "../styles/loader.css";

const AgentwiseTaggingVarianceReport = () => {
  const navigate = useNavigate();

  const [reportDate, setReportDate] = useState("");
  const [reportData, setReportData] = useState([]);
  const [showTable, setShowTable] = useState(false);
  const [loading, setLoading] = useState(false);

  const formatDate = (date) => {
    if (!date) return "";

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  };

  const handleView = async () => {
    if (!reportDate) {
      alert("Please select report date");
      return;
    }

    try {
      setLoading(true);

      const response = await api.get(
        `/report/agentwise-tagging-variance-report?report_date=${reportDate}&agent_type=All&process=All`
      );

      setReportData(response.data.data || []);
      setShowTable(true);
    } catch (error) {
      console.error("View Error:", error);
      alert("Failed to fetch report");
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    if (!reportDate) {
      alert("Please select report date");
      return;
    }

    try {
      setLoading(true);

      const response = await api.get(
        `/report/agentwise-tagging-variance-report?report_date=${reportDate}&agent_type=All&process=All`
      );

      const data = response.data.data || [];

      const exportData = data.map((row) => ({
        Date: row.date,
        Process: row.process_type || "-",
        AgentName: row.agent_name,
        EmployeeCode: row.emp_code,
        CallsAnsweredCallsTaken:
          row.calls_answered_calls_taken,
        CallsTagged: row.calls_tagged,
        Variance: row.variance,
        VariancePercent: row.variance_percent,
      }));

      const worksheet =
        XLSX.utils.json_to_sheet(exportData);

      const workbook = XLSX.utils.book_new();

      XLSX.utils.book_append_sheet(
        workbook,
        worksheet,
        "Agentwise Variance Report"
      );

      const excelBuffer = XLSX.write(workbook, {
        bookType: "xlsx",
        type: "array",
      });

      const file = new Blob([excelBuffer], {
        type: "application/octet-stream",
      });

      saveAs(
        file,
        `AGENTWISE_TAGGING_VARIANCE_${reportDate}.xlsx`
      );
    } catch (error) {
      console.error("Export Error:", error);
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

      <div
        className={`priority-wrapper ${
          loading ? "blurred" : ""
        }`}
      >
        <div className="row gy-4 gx-3">

          {/* Filter Section */}
          <div className="card p-4 mb-4">
            <h5 className="mb-3">
              AGENTWISE TAGGING VARIANCE REPORT
            </h5>

            <div className="d-flex flex-wrap align-items-center gap-2">

              <DatePicker
                selected={
                  reportDate ? new Date(reportDate) : null
                }
                onChange={(date) =>
                  setReportDate(formatDate(date))
                }
                placeholderText="Select Date"
                className="form-control"
                dateFormat="dd-MM-yyyy"
              />

              <button
                className="btn btn-primary"
                onClick={handleView}
              >
                VIEW
              </button>

              <button
                className="btn btn-success"
                onClick={handleExport}
              >
                EXPORT
              </button>

              <button
                type="button"
                className="btn btn-outline-primary"
                onClick={() => navigate(-1)}
              >
                ← Back
              </button>

            </div>
          </div>

          {/* Table Section */}
          {!loading && showTable && (
            <div className="card p-4">

              <h6 className="mb-3">
                AGENTWISE TAGGING VARIANCE REPORT
              </h6>

              <div
                className="table-responsive"
                style={{
                  maxHeight: "600px",
                  overflow: "auto",
                }}
              >
                <table className="table table-bordered table-sm">

                  <thead
                    className="table-light"
                    style={{
                      position: "sticky",
                      top: 0,
                      zIndex: 10,
                    }}
                  >
                    <tr>
                      <th>Date</th>
                      <th>Process</th>
                      <th>Agent Name</th>
                      <th>Employee Code</th>
                      <th>Calls Answered / Calls Taken</th>
                      <th>Calls Tagged</th>
                      <th>Variance</th>
                      <th>Variance %</th>
                    </tr>
                  </thead>

                  <tbody>
                    {reportData.length > 0 ? (
                      reportData.map((row, index) => (
                        <tr key={index}>
                          <td>{row.date}</td>
                          <td>{row.process_type || "-"}</td>
                          <td>{row.agent_name}</td>
                          <td>{row.emp_code}</td>
                          <td>
                            {row.calls_answered_calls_taken}
                          </td>
                          <td>{row.calls_tagged}</td>

                          <td
                            style={{
                              color:
                                row.variance < 0
                                  ? "red"
                                  : "green",
                              fontWeight: "bold",
                            }}
                          >
                            {row.variance}
                          </td>

                          <td
                            style={{
                              color:
                                row.variance < 0
                                  ? "red"
                                  : "green",
                              fontWeight: "bold",
                            }}
                          >
                            {row.variance_percent}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan="8"
                          className="text-center"
                        >
                          No Data Available
                        </td>
                      </tr>
                    )}
                  </tbody>

                </table>
              </div>

            </div>
          )}

        </div>
      </div>
    </>
  );
};

export default AgentwiseTaggingVarianceReport;