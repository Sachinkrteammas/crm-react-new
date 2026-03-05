import React, { useState, useEffect } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { format } from "date-fns";
import api from "../api";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx-js-style";
import { saveAs } from "file-saver";

const OutboundReport = () => {

  const userType = localStorage.getItem("user_type");
  const companyId = localStorage.getItem("company_id");

  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState(companyId);

  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);

  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const activeClientId =
    userType === "Super-Admin" || userType === "Admin"
      ? selectedClient
      : companyId;

  /* ---------------------------
     FETCH CLIENT LIST
  ---------------------------- */

  useEffect(() => {
    if (userType === "Super-Admin" || userType === "Admin") {

      api.get("/agents/clients-rights")
        .then((res) => {

          const sorted = res.data.sort((a, b) =>
            a.company_name.localeCompare(b.company_name)
          );

          setClients(sorted);

        })
        .catch((err) =>
          console.error("Error fetching clients:", err)
        );
    }
  }, []);

  /* ---------------------------
     AUTO SET CLIENT
  ---------------------------- */

  useEffect(() => {
    if (!(userType === "Super-Admin" || userType === "Admin")) {
      setSelectedClient(companyId);
    }
  }, []);

  /* ---------------------------
     FETCH REPORT
  ---------------------------- */

  const handleView = async () => {

    if (!activeClientId) {
      alert("Please select a client");
      return;
    }

    if (!startDate || !endDate) {
      alert("Please select start and end date");
      return;
    }

    setLoading(true);

    try {

      const formattedStart = format(startDate, "yyyy-MM-dd");
      const formattedEnd = format(endDate, "yyyy-MM-dd");

      const res = await api.post(
        `/report/outbound/Report?company_id=${activeClientId}&start_date=${formattedStart}&end_date=${formattedEnd}`
      );

      setReport(res.data);

    } catch (err) {

      console.error("Error fetching report:", err);
      alert("Failed to fetch report");

    } finally {
      setLoading(false);
    }
  };

  const exportReportExcel = async () => {

  if (!activeClientId) {
    alert("Please select a client");
    return;
  }

  if (!startDate || !endDate) {
    alert("Please select start and end date");
    return;
  }

  try {

    setLoading(true);

    const formattedStart = format(startDate, "yyyy-MM-dd");
    const formattedEnd = format(endDate, "yyyy-MM-dd");

    const res = await api.post(
      `/report/outbound/Report?company_id=${activeClientId}&start_date=${formattedStart}&end_date=${formattedEnd}`
    );

    const data = res.data;


    const companyName =
        clients.find((c) => String(c.company_id) === String(activeClientId))
            ?.company_name || "Company";

    const rows = [];
    const titleRows = [];
    const headerRows = [];

    /* ---------------- OVERALL SUMMARY ---------------- */

    titleRows.push(rows.length);
    rows.push([
        `${companyName} - Report (${formattedStart} to ${formattedEnd})`
    ]);

    headerRows.push(rows.length);
    rows.push(["Connected Calls", "Not Connected Calls", "Total Calls"]);

    rows.push([
    data.overall.connected,
    data.overall.notConnected,
    data.overall.totalCalls
    ]);

    rows.push([]);

    /* ---------------- AGENT PERFORMANCE ---------------- */

    titleRows.push(rows.length);
    rows.push(["Agent Performance"]);

    headerRows.push(rows.length);
    rows.push(["Agent Name", "Connected", "Not Connected", "Total Calls"]);

    Object.entries(data.agents).forEach(([agent, stats]) => {
    rows.push([
        agent.trim(),
        stats.connected,
        stats.notConnected,
        stats.totalCalls
    ]);
    });

    rows.push([]);

    /* ---------------- AUTO DIAL ---------------- */

    titleRows.push(rows.length);
    rows.push(["Drop Calls"]);

    headerRows.push(rows.length);
    rows.push(["Not Connected"]);

    rows.push([
    data.obAutoDial.notConnected
    ]);

    rows.push([]);

    /* ---------------- STATUS BREAKDOWN ---------------- */

    titleRows.push(rows.length);
    rows.push(["Status Breakdown"]);

    headerRows.push(rows.length);
    rows.push(["Status", "Count"]);

    Object.entries(data.statusBreakdown_From_SubScenario2 || {}).forEach(
    ([status, count]) => {

        rows.push([
        status?.trim() || "Blank",
        count || 0
        ]);

    }
    );

    rows.push([]);
    rows.push([]);

    /* ---------------- DEMO BOOKED ---------------- */

    titleRows.push(rows.length);
    rows.push(["Demo Booked Details"]);

    headerRows.push(rows.length);
    rows.push([
    "Name",
    "Email Address",
    "Contact Number",
    "App Installation Done",
    "Meeting Arrange Date",
    "Location",
    "Agent Name",
    "Call Date"
    ]);

    data.demoBookedCalls.forEach((d) => {

      const callDate = new Date(d["Call Date"]);

      rows.push([
        d["Name"],
        d["Email Address"],
        d["Contact Number"],
        d["App Installation Done"],
        d["Meeting Arrange Date"],
        d["Location"],
        d["Agent"].trim(),
        format(callDate, "yyyy-MM-dd HH:mm:ss")
      ]);

    });

    /* ---------------- CREATE SHEET ---------------- */

    const worksheet = XLSX.utils.aoa_to_sheet(rows);

    /* Column widths */

    worksheet["!cols"] = [
      { wch: 25 },
      { wch: 25 },
      { wch: 20 },
      { wch: 25 },
      { wch: 25 },
      { wch: 20 },
      { wch: 20 },
      { wch: 22 },
    ];

    const range = XLSX.utils.decode_range(worksheet["!ref"]);

    const borderStyle = {
      top: { style: "thin" },
      bottom: { style: "thin" },
      left: { style: "thin" },
      right: { style: "thin" }
    };

    const headerStyle = {
      font: { bold: true, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: "4472C4" } },
      alignment: { horizontal: "center" },
      border: borderStyle
    };

    const titleStyle = {
      font: { bold: true, sz: 14 },
      alignment: { horizontal: "left" }
    };

    /* Apply border to all cells */

    for (let R = range.s.r; R <= range.e.r; ++R) {
      for (let C = range.s.c; C <= range.e.c; ++C) {

        const cell = XLSX.utils.encode_cell({ r: R, c: C });

        if (!worksheet[cell]) continue;

        worksheet[cell].s = {
          border: borderStyle
        };
      }
    }

    /* ---------------- APPLY TITLE STYLING ---------------- */

    titleRows.forEach((r) => {

    const cell = XLSX.utils.encode_cell({ r: r, c: 0 });

    if (worksheet[cell]) {
        worksheet[cell].s = {
        ...titleStyle,
        border: borderStyle
        };
    }

    });


    /* ---------------- APPLY HEADER STYLING ---------------- */

    headerRows.forEach((r) => {

    const row = rows[r];

    row.forEach((_, c) => {

        const cell = XLSX.utils.encode_cell({ r: r, c: c });

        if (worksheet[cell]) {

        worksheet[cell].s = {
            ...headerStyle
        };

        }

    });

    });
   

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Outbound Report");

    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array"
    });

    const fileData = new Blob([excelBuffer], {
      type: "application/octet-stream",
    });

    saveAs(
      fileData,
      `${companyName}_Report_${formattedStart}_to_${formattedEnd}.xlsx`
    );

  } catch (err) {

    console.error("Export error:", err);
    alert("Failed to export report");

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

          {/* FILTER CARD */}

          <div className="col-12">
            <div className="card p-4 mb-4">

              <h5 className="mb-3">Outbound Call Report</h5>

              <div className="d-flex flex-wrap align-items-center gap-3">

                {/* CLIENT SELECT */}

                {(userType === "Super-Admin" || userType === "Admin") && (
                  <div style={{ maxWidth: "220px" }}>
                    <select
                      className="form-select"
                      value={selectedClient}
                      onChange={(e) =>
                        setSelectedClient(e.target.value)
                      }
                    >
                      <option value="">--Select Client--</option>

                      {clients.map((c) => (
                        <option
                          key={c.company_id}
                          value={c.company_id}
                        >
                          {c.company_name}
                        </option>
                      ))}

                    </select>
                  </div>
                )}

                {/* START DATE */}

                <div style={{ maxWidth: "200px" }}>
                  <DatePicker
                    selected={startDate}
                    onChange={setStartDate}
                    placeholderText="Start Date"
                    dateFormat="dd-MM-yyyy"
                    className="form-control"
                  />
                </div>

                {/* END DATE */}

                <div style={{ maxWidth: "200px" }}>
                  <DatePicker
                    selected={endDate}
                    onChange={setEndDate}
                    placeholderText="End Date"
                    dateFormat="dd-MM-yyyy"
                    className="form-control"
                  />
                </div>

                {/* BUTTONS */}

                {/* <button
                  className="btn btn-primary fw-semibold"
                  onClick={handleView}
                >
                  VIEW
                </button> */}

                <button
                  className="btn btn-success fw-semibold"
                  onClick={exportReportExcel}
                  disabled={!startDate || !endDate || !activeClientId}
                >
                  Export
                </button>

                <button
                  className="btn btn-outline-primary"
                  onClick={() => navigate(-1)}
                >
                  ← Back
                </button>

              </div>
            </div>
          </div>

          {/* REPORT */}

          {report && (
            <>
              {/* SUMMARY CARDS */}

              <div className="card p-4 shadow-sm border-0">

                <div className="d-flex justify-content-between align-items-center mb-4">
                    <h5 className="fw-semibold mb-0">Overall Call Summary</h5>
                </div>

                <div className="row g-3">

                    {/* Connected */}
                    <div className="col-md-4">
                    <div className="p-4 rounded-3 border shadow-sm h-100">
                        <div className="d-flex justify-content-between align-items-center">

                        <div>
                            <p className="text-muted mb-1">Connected Calls</p>
                            <h3 className="fw-bold text-success">
                            {report.overall.connected}
                            </h3>
                        </div>

                        <div
                            className="d-flex align-items-center justify-content-center rounded-circle"
                            style={{
                            width: "50px",
                            height: "50px",
                            background: "#e8f7ee",
                            fontSize: "22px",
                            }}
                        >
                            📞
                        </div>

                        </div>
                    </div>
                    </div>

                    {/* Not Connected */}
                    <div className="col-md-4">
                    <div className="p-4 rounded-3 border shadow-sm h-100">
                        <div className="d-flex justify-content-between align-items-center">

                        <div>
                            <p className="text-muted mb-1">Not Connected</p>
                            <h3 className="fw-bold text-danger">
                            {report.overall.notConnected}
                            </h3>
                        </div>

                        <div
                            className="d-flex align-items-center justify-content-center rounded-circle"
                            style={{
                            width: "50px",
                            height: "50px",
                            background: "#fdeaea",
                            fontSize: "22px",
                            }}
                        >
                            ❌
                        </div>

                        </div>
                    </div>
                    </div>

                    {/* Total Calls */}
                    <div className="col-md-4">
                    <div className="p-4 rounded-3 border shadow-sm h-100">
                        <div className="d-flex justify-content-between align-items-center">

                        <div>
                            <p className="text-muted mb-1">Total Calls</p>
                            <h3 className="fw-bold text-primary">
                            {report.overall.totalCalls}
                            </h3>
                        </div>

                        <div
                            className="d-flex align-items-center justify-content-center rounded-circle"
                            style={{
                            width: "50px",
                            height: "50px",
                            background: "#e7f1ff",
                            fontSize: "22px",
                            }}
                        >
                            📊
                        </div>

                        </div>
                    </div>
                    </div>

                </div>
                </div>

              {/* AGENT PERFORMANCE */}

              <div className="col-12 mb-4">
                <div className="card p-4">

                  <h6 className="mb-3">Agent Performance</h6>

                  <div style={{ overflowX: "auto" }}>
                    <table className="table table-bordered">

                      <thead className="table-dark">
                        <tr>
                          <th>Agent</th>
                          <th>Connected</th>
                          <th>Not Connected</th>
                          <th>Total Calls</th>
                        </tr>
                      </thead>

                      <tbody>

                        {Object.entries(report.agents).map(
                          ([agent, stats]) => (
                            <tr key={agent}>
                              <td>{agent.trim()}</td>
                              <td className="text-success">
                                {stats.connected}
                              </td>
                              <td className="text-danger">
                                {stats.notConnected}
                              </td>
                              <td>{stats.totalCalls}</td>
                            </tr>
                          )
                        )}

                      </tbody>

                    </table>
                  </div>

                </div>
              </div>

              {/* AUTO DIAL */}

              <div className="col-12 mb-4">
                <div className="card p-4">

                  <h6 className="mb-3">Auto Dial Performance</h6>

                  <table className="table table-bordered text-center">

                    <thead className="table-dark">
                      <tr>
                        <th>Connected</th>
                        <th>Not Connected</th>
                        <th>Total Calls</th>
                      </tr>
                    </thead>

                    <tbody>
                      <tr>
                        <td className="text-success">
                          {report.obAutoDial.connected}
                        </td>
                        <td className="text-danger">
                          {report.obAutoDial.notConnected}
                        </td>
                        <td>{report.obAutoDial.totalCalls}</td>
                      </tr>
                    </tbody>

                  </table>

                </div>
              </div>

              {/* STATUS BREAKDOWN */}

              <div className="col-12 mb-4">
                <div className="card p-4">

                  <h6 className="mb-3">Call Status Breakdown</h6>

                  <table className="table table-bordered">

                    <thead className="table-dark">
                      <tr>
                        <th>Status</th>
                        <th>Count</th>
                      </tr>
                    </thead>

                    <tbody>

                      {Object.entries(
                        report.statusBreakdown_From_SubScenario2
                      ).map(([status, count]) => (
                        <tr key={status}>
                          <td>{status}</td>
                          <td>{count}</td>
                        </tr>
                      ))}

                    </tbody>

                  </table>

                </div>
              </div>

            </>
          )}

        </div>
      </div>
    </>
  );
};

export default OutboundReport;