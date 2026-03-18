import React, { useState, useMemo } from "react";
import api from "../api";
import "../styles/loader.css";

export default function ChannelUtilization() {
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [tableData, setTableData] = useState([]);
  const [maxData, setMaxData] = useState([]);
  const [showMax, setShowMax] = useState(false);

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [loading, setLoading] = useState(false);

  const BASE = "/channel-utilizations";

  const validate = () => {
    if (!fromDate || !toDate) {
      alert("Please select both From and To dates");
      return false;
    }
    return true;
  };

  const fetchData = async () => {
    
    if (!validate()) return;
    setLoading(true);
    const res = await api.get(`${BASE}/list`, { params: { fromDate, toDate } });
    setTableData(res.data.data || []);
    setShowMax(false); // show normal table
    setPage(1);
    setLoading(false);
  };

  const fetchMaxCount = async () => {
    
    if (!validate()) return;
    setLoading(true);
    const res = await api.get(`${BASE}/max-count`, {
      params: { fromDate, toDate },
    });
    setMaxData(res.data.data || []);
    setShowMax(true); // show max count table
    setPage(1);
    setLoading(false);
  };

  const downloadExcel = async () => {
    
    if (!validate()) return;
    setLoading(true);

    const res = await api.get(`${BASE}/download`, {
      params: { fromDate, toDate },
      responseType: "blob",
    });

    const url = window.URL.createObjectURL(new Blob([res.data]));
    const a = document.createElement("a");
    a.href = url;
    a.download = `Channel_Utilization_${fromDate}_to_${toDate}.xlsx`;
    a.click();
    setLoading(false);
  };

  const viewRow = (row) => {
    alert(JSON.stringify(row, null, 2));
  };

  // FILTER + PAGINATION
  const filteredData = useMemo(() => {
    const source = showMax ? maxData : tableData;
    return source.filter(
      (item) =>
        item.vendor?.toLowerCase().includes(search.toLowerCase()) ||
        item.update_date?.toLowerCase().includes(search.toLowerCase())
    );
  }, [search, tableData, maxData, showMax]);

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
      <div className="mt-4 mb-5">
        {/* HEADER */}
        <h3 className="fw-bold mb-3 text-dark">Channel Report</h3>

        {/* FILTER BOX */}
        <div className="card shadow-sm p-4 mb-4">
          <h5 className="fw-bold mb-3">Channel Utilization Filters</h5>
          <div className="row g-3">
            <div className="col-md-3">
              <label className="fw-semibold">From Date</label>
              <input
                type="date"
                className="form-control"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
            </div>

            <div className="col-md-3">
              <label className="fw-semibold">To Date</label>
              <input
                type="date"
                className="form-control"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
            </div>

            <div className="col-md-6 d-flex align-items-end gap-2">
              <button className="btn btn-primary" onClick={fetchData}>
                View Data
              </button>
              <button
                className="btn btn-info text-white"
                onClick={fetchMaxCount}
              >
                View Max Count
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
                placeholder="Search Vendor / Date..."
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
                  setPage(1); // reset to first page
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
                  <th>Vendor</th>
                  <th>Count</th>
                  <th>Date</th>
                  <th className="text-center">Action</th>
                </tr>
              </thead>

              <tbody>
                {pageData.length > 0 ? (
                  pageData.map((row, i) => (
                    <tr key={i}>
                      <td>{(page - 1) * pageSize + i + 1}</td>
                      <td>{row.vendor}</td>
                      <td>{row.channel_count || row.max_count}</td>
                      <td>{row.update_date}</td>
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
                    <td colSpan="5" className="text-center text-muted py-3">
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
