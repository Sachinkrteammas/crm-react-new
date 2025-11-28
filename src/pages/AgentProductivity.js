import React, { useState, useMemo } from "react";
import DatePicker from "react-datepicker";
import api from "../api";
import "react-datepicker/dist/react-datepicker.css";
import "../styles/loader.css";

export default function AgentProductivityReport() {
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [tableData, setTableData] = useState([]);
  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const formatDate = (d) => {
    if (!d) return "";
    const x = new Date(d);
    return `${x.getFullYear()}-${(x.getMonth() + 1).toString().padStart(2, "0")}-${x
      .getDate()
      .toString()
      .padStart(2, "0")}`;
  };

  const validate = () => {
    if (!startDate || !endDate) {
      alert("Please select both From and To dates");
      return false;
    }
    return true;
  };

  const fetchData = async () => {
    if (!validate()) return;
    setLoading(true);
    const s = formatDate(startDate);
    const e = formatDate(endDate);

    try {
      const res = await api.get("/agents/productivity", {
        params: { start_date: s, end_date: e },
      });
      setTableData(res.data?.data || []);
      setPage(1);
    } catch (err) {
      console.error(err);
      alert("Error fetching data");
    } finally {
      setLoading(false);
    }
  };

  const downloadExcel = async () => {
    if (!validate()) return;
    setLoading(true);
    const s = formatDate(startDate);
    const e = formatDate(endDate);

    try {
      const res = await api.get("/agents/productivity/export", {
        params: { start_date: s, end_date: e },
        responseType: "blob",
      });

      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = `Agent_APR _${s}_to_${e}.xlsx`;
      a.click();
    } catch (err) {
      console.error(err);
      alert("Error downloading Excel");
    } finally {
      setLoading(false);
    }
  };

  // FILTER + PAGINATION
  const filteredData = useMemo(() => {
    return tableData.filter(
      (item) =>
        item.agent_name?.toLowerCase().includes(search.toLowerCase())
    );
  }, [search, tableData]);

  const totalPages = Math.ceil(filteredData.length / pageSize);
  const pageData = filteredData.slice((page - 1) * pageSize, page * pageSize);

  const viewRow = (row) => {
    alert(JSON.stringify(row, null, 2));
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

      <div className={`priority-wrapper ${loading ? "blurred" : ""}`}></div>
      <div className="mt-4 mb-5">
        <h3 className="fw-bold mb-3 text-dark">Agent APR Report</h3>

        {/* FILTER BOX */}
        <div className="card shadow-sm p-4 mb-4">
          <h5 className="fw-bold mb-3">Filters</h5>
          <div className="row g-3">
            <div className="col-md-3">
              <label className="fw-semibold d-block mb-1">From Date</label>
              <DatePicker
                className="form-control"
                selected={startDate}
                onChange={setStartDate}
                dateFormat="yyyy-MM-dd"
              />
            </div>

            <div className="col-md-3">
              <label className="fw-semibold d-block mb-1">To Date</label>

              <DatePicker
                className="form-control"
                selected={endDate}
                onChange={setEndDate}
                dateFormat="yyyy-MM-dd"
              />
            </div>

            <div className="col-md-6 d-flex align-items-end gap-2">
              <button className="btn btn-primary" onClick={fetchData}>
                View Data
              </button>
              <button className="btn btn-success" onClick={downloadExcel}>
                Download Excel
              </button>
            </div>
          </div>
        </div>

        {/* TABLE BOX */}
        <div className="card shadow-sm p-4">
          <h5 className="fw-bold mb-3">View Report</h5>

          {/* SEARCH & PAGE SIZE */}
          <div className="row mb-3 align-items-center">
            <div className="col-md-4">
              <input
                className="form-control"
                placeholder="Search Agent..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="col-md-1">
              <select
                className="form-select"
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
              >
                <option value={10}>10</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={200}>200</option>
              </select>
            </div>
          </div>

          {/* TABLE */}
          <div className="table-responsive">
            <table className="table table-bordered">
              <thead className="table-light fw-bold">
                <tr>
                  <th>S.N</th>
                  <th>Agent Name</th>
                  <th>Calls Taken (IB+OB)</th>
                  <th className="text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {pageData.length > 0 ? (
                  pageData.map((row, i) => (
                    <tr key={i}>
                      <td>{(page - 1) * pageSize + i + 1}</td>
                      <td>{row.agent_name}</td>
                      <td>{row.calls_taken}</td>
                      <td className="text-center">
                        <button
                          className="btn btn-sm btn-primary"
                          onClick={() => viewRow(row)}
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="text-center text-muted py-3">
                      No data available in table
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* PAGINATION */}
          <div className="d-flex justify-content-between mt-3">
            <button
              className="btn btn-outline-secondary"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              Previous
            </button>
            <span className="fw-semibold">
              Page {page} of {totalPages || 1}
            </span>
            <button
              className="btn btn-outline-secondary"
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
