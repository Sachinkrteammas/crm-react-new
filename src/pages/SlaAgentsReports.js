import React, { useState, useMemo } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import api from "../api";
import "../styles/loader.css";

export default function SlaAgentsReports() {
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [loading, setLoading] = useState(false);

  const validate = () => {
    console.log(startDate, "start tsting");
    console.log(endDate, "end testing");
    if (!startDate || !endDate) {
      alert("Please select both From and To dates");
      return false;
    }
    return true;
  };

  const pct = (v) => (v !== null && v !== undefined ? `${(v * 100).toFixed(2)}%` : "-");

  const fetchReport = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const formatDate = (date) => {
        const d = new Date(date);
        const month = `${d.getMonth() + 1}`.padStart(2, "0");
        const day = `${d.getDate()}`.padStart(2, "0");
        const year = d.getFullYear();
        return `${year}-${month}-${day}`;
      };

      const s = formatDate(startDate);
      const e = formatDate(endDate);

      console.log(s, "startDate", e, "endDate");

      const res = await api.get("/sla/agents", { params: { start_date: s, end_date: e } });
      setRows(res.data?.data || []);
      setPage(1);
    } catch (err) {
      console.error(err);
      alert("Failed to load SLA Report");
    } finally {
      setLoading(false);
    }
  };


  const downloadExcel = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      // Format date in local timezone
      const formatDate = (date) => {
        const d = new Date(date);
        const month = `${d.getMonth() + 1}`.padStart(2, "0");
        const day = `${d.getDate()}`.padStart(2, "0");
        const year = d.getFullYear();
        return `${year}-${month}-${day}`;
      };

      const s = formatDate(startDate);
      const e = formatDate(endDate);

      const res = await api.get("/sla/agents/export", {
        params: { start_date: s, end_date: e },
        responseType: "blob",
      });

      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = `SLA_Agents_${s}_to_${e}.xlsx`;
      a.click();
    } catch (err) {
      console.error(err);
      alert("Failed to download Excel");
    } finally {
      setLoading(false);
    }
  };


  // Search + Pagination
  const filteredData = useMemo(() => {
    return rows.filter(
      (r) =>
        r.date?.toLowerCase().includes(search.toLowerCase()) ||
        String(r.hour).includes(search)
    );
  }, [rows, search]);

  const totalPages = Math.ceil(filteredData.length / pageSize);
  const pageData = filteredData.slice((page - 1) * pageSize, page * pageSize);

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

      <div className={`priority-wrapper ${loading ? "blurred" : ""}`}></div>

      <div className="mt-4">
        <h3 className="fw-bold mb-4">SLA Report</h3>

        {/* Filters */}
        <div className="card shadow-sm p-4 mb-4">
          <div className="row g-2">
            <div className="col-md-3">
              <label className="fw-semibold d-block mb-1">From Date</label>
              <DatePicker
                selected={startDate}
                onChange={(d) => setStartDate(d)}
                className="form-control"
                placeholderText="dd-mm-yyyy"
              />
            </div>
            <div className="col-md-3">
              <label className="fw-semibold d-block mb-1">To Date</label>
              <DatePicker
                selected={endDate}
                onChange={(d) => setEndDate(d)}
                className="form-control"
                placeholderText="dd-mm-yyyy"
              />
            </div>
            <div className="col-md-6 d-flex align-items-end gap-2">
              <button className="btn btn-primary" onClick={fetchReport}>
                View Data
              </button>
              <button className="btn btn-success" onClick={downloadExcel}>
                Download Excel
              </button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="card shadow-sm p-4">
          <div className="d-flex mb-3 gap-2">
            <input
              className="form-control"
              placeholder="Search by Date / Hour..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select
              className="form-select"
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              style={{ width: "100px" }}
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </div>

          <div className="table-responsive">
            <table className="table table-bordered table-hover">
              <thead className="table-dark">
                <tr>
                  <th>S.N</th>
                  <th>Date</th>
                  <th>Hour</th>
                  <th>Total Calls</th>
                  <th>Answered</th>
                  <th>Manpower</th>
                  <th>AI %</th>
                  <th>SL %</th>
                  <th>RL %</th>
                </tr>
              </thead>
              <tbody>
                {pageData.length > 0 ? (
                  pageData.map((r, i) => (
                    <tr key={i}>
                      <td>{(page - 1) * pageSize + i + 1}</td>
                      <td>{r.date}</td>
                      <td>{r.hour}</td>
                      <td>{r.total_calls}</td>
                      <td>{r.answered}</td>
                      <td>{r.manpower}</td>
                      <td>{pct(r.ai_percent)}</td>
                      <td>{pct(r.sl_percent)}</td>
                      <td>{pct(r.rl_percent)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="9" className="text-center py-3">
                      No data available in table
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="d-flex justify-content-between mt-2">
            <button
              className="btn btn-outline-secondary btn-sm"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              Previous
            </button>
            <span>
              Page {page} of {totalPages || 1}
            </span>
            <button
              className="btn btn-outline-secondary btn-sm"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
