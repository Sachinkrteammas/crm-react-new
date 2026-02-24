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
  const [reportType, setReportType] = useState("company"); // company | entry
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
  // RL API CALL
  // ===============================
  const fetchRLReport = async () => {
    const res = await api.post(
      "/report/rl_internal_report",
      {},
      {
        params: {
          from_date: startDate,
          to_date: endDate,
          report_type: reportType, // send dropdown value
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
  // EXPORT BUTTON
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
        `RL_Internal_${reportType}_Report_${startDate}_to_${endDate}.xlsx`
      );

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

          <div className="d-flex gap-2 flex-wrap">
          {/* Report Type Dropdown */}
            <select
              className="form-control w-25"
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
            >
              <option value="company">Company Wise</option>
              <option value="entry">Date Wise</option>
            </select>

            {/* Start Date */}
            <DatePicker
              selected={startDate ? new Date(startDate) : null}
              onChange={handleStartDateChange}
              placeholderText="Start Date"
              className="form-control"
              dateFormat="dd-MM-yyyy"
            />

            {/* End Date */}
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
              }}
            >
              <table className="table table-bordered">
                <thead>
                <tr>
                  {reportType === "company" ? (
                    <>
                      <th>Company Name</th>
                      <th>Total Abandon</th>
                      <th>Abandon Unique</th>
                      <th>Callback</th>
                      <th>Connected</th>
                      <th>Not Connected</th>
                      <th>Failed Attempt</th>
                    </>
                  ) : (
                    <>
                      <th>Date</th>
                      <th>Total Abandon</th>
                      <th>Abandon Unique</th>
                      <th>Callback</th>
                      <th>Connected</th>
                      <th>Not Connected</th>
                      <th>Failed Attempt</th>
                    </>
                  )}
                </tr>
                </thead>

                <tbody>
                {sampleData.length > 0 ? (
                  sampleData.map((row, i) => (
                    <tr key={i}>
                      <td>
                        {reportType === "company"
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