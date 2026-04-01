import React, { useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { format } from "date-fns";
import api from "../api";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

const LoginLog = () => {
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [logData, setLogData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // 🟢 Fetch Login Log
  const fetchLoginLog = async () => {
    if (!startDate || !endDate) return;

    setLoading(true);
    try {
      const formattedStart = format(startDate, "yyyy-MM-dd");
      const formattedEnd = format(endDate, "yyyy-MM-dd");

      const res = await api.get(
        `/login-log-report?start_date=${formattedStart}&end_date=${formattedEnd}`
      );

      const data = res.data;
      if (data && Array.isArray(data.Data)) {
        setLogData(data.Data);
        setCurrentPage(1);
      } else {
        setLogData([]);
      }
    } catch (error) {
      console.error("Error fetching login log:", error);
    } finally {
      setLoading(false);
    }
  };

  // 🟢 Export Login Log
  const handleExport = async () => {
    if (!startDate || !endDate) {
      alert("Please select both dates first.");
      return;
    }

    setLoading(true);
    try {
      const formattedStart = format(startDate, "yyyy-MM-dd");
      const formattedEnd = format(endDate, "yyyy-MM-dd");

      // 🔥 Always fetch fresh data (independent of VIEW)
      const res = await api.get(
        `/login-log-report?start_date=${formattedStart}&end_date=${formattedEnd}`
      );

      const data = res.data?.Data || [];

      if (!data.length) {
        alert("No data found for export.");
        return;
      }

      // 🔥 Convert JSON → Excel
      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Login Log");

      // 🔥 Generate buffer
      const excelBuffer = XLSX.write(workbook, {
        bookType: "xlsx",
        type: "array",
      });

      // 🔥 Save file
      const file = new Blob([excelBuffer], {
        type: "application/octet-stream",
      });

      const fileName = `Login_Log_${formattedStart}_to_${formattedEnd}.xlsx`;

      saveAs(file, fileName);

    } catch (error) {
      console.error("Error exporting login log:", error);
      alert("Export failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // 🔍 Filter by Name
  const filteredData = logData.filter((item) =>
    item.Name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Pagination based on filtered data
  const totalPages = Math.max(1, Math.ceil(filteredData.length / rowsPerPage));

  const currentData = filteredData.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  const handleRowsPerPageChange = (e) => {
    setRowsPerPage(Number(e.target.value));
    setCurrentPage(1);
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
            <h4 className="mb-4">Login Log</h4>

            {/* Filter Section */}
            <div className="card mb-4">
              <h6 className="card-header fw-semibold">LOGIN LOG</h6>
              <div className="card-body">
                <div className="d-flex flex-wrap align-items-end gap-3">
                  <div>
                    <label className="form-label me-1">Start Date:</label>
                    <DatePicker
                      selected={startDate}
                      onChange={setStartDate}
                      dateFormat="dd-MM-yyyy"
                      placeholderText="dd-mm-yyyy"
                      className="form-control"
                    />
                  </div>

                  <div>
                    <label className="form-label me-1">End Date:</label>
                    <DatePicker
                      selected={endDate}
                      onChange={setEndDate}
                      dateFormat="dd-MM-yyyy"
                      placeholderText="dd-mm-yyyy"
                      className="form-control"
                    />
                  </div>

                  <div className="d-flex gap-2">
                    <button
                      className="btn btn-primary mt-4"
                      onClick={handleExport}
                      disabled={loading}
                    >
                      {loading ? "Exporting..." : "EXPORT"}
                    </button>

                    <button
                      className="btn btn-primary mt-4"
                      onClick={fetchLoginLog}
                      disabled={loading}
                    >
                      {loading ? "Loading..." : "VIEW"}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Table Section */}
            <div className="card">
              <div className="card-header d-flex justify-content-between align-items-center">
                <h6 className="fw-semibold mb-0">VIEW LOGIN LOG</h6>

                <div className="d-flex align-items-center gap-2">

                    <input
                      type="text"
                      className="form-control form-control-sm"
                      placeholder="Search by name..."
                      style={{ width: "200px" }}
                      value={searchTerm}
                      onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setCurrentPage(1); // reset page on search
                      }}
                    />

                    <label className="fw-semibold mb-0">Rows per page:</label>
                    <select
                    className="form-select form-select-sm"
                    style={{ width: "80px" }}
                    value={rowsPerPage}
                    onChange={handleRowsPerPageChange}
                    >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                    </select>
                </div>
                </div>
              <div className="card-body">
                {loading ? (
                  <p className="text-center text-muted my-3">Loading data...</p>
                ) : filteredData.length === 0 ? (
                  <p className="text-center text-muted my-3">
                    No records found.
                  </p>
                ) : (
                  <>
                    <div className="table-responsive">
                      <table className="table table-striped table-bordered align-middle">
                        <thead className="table-light">
                          <tr>
                            <th>SR. NO.</th>
                            <th>NAME</th>
                            <th>ROLE</th>
                            <th>IP ADDRESS</th>
                            <th>PAGE NAME</th>
                            <th>PAGE URL</th>
                            <th>HIT TIME</th>
                          </tr>
                        </thead>
                        <tbody>
                          {currentData.map((log, index) => (
                            <tr key={index}>
                              <td>
                                {(currentPage - 1) * rowsPerPage + index + 1}
                              </td>
                              <td>{log.Name}</td>
                              <td>{log.Role}</td>
                              <td>{log.IpAddress}</td>
                              <td>{log.PageName}</td>
                              <td>{log.PageUrl}</td>
                              <td>{log.HitTime}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* ✅ Pagination + Rows per Page */}
                    <div className="d-flex flex-wrap justify-content-between align-items-center mt-3 text-muted">
                      
                      <span>
                        Showing {(currentPage - 1) * rowsPerPage + 1} to{" "}
                        {Math.min(currentPage * rowsPerPage, filteredData.length)} of{" "}
                        {filteredData.length} entries
                      </span>

                      <div>
                        <button
                          className="btn btn-outline-primary btn-sm me-2"
                          disabled={currentPage === 1}
                          onClick={() =>
                            setCurrentPage((p) => Math.max(p - 1, 1))
                          }
                        >
                          Previous
                        </button>
                        <span className="fw-semibold">
                          Page {currentPage} of {totalPages}
                        </span>
                        <button
                          className="btn btn-outline-primary btn-sm ms-2"
                          disabled={currentPage === totalPages}
                          onClick={() =>
                            setCurrentPage((p) =>
                              Math.min(p + 1, totalPages)
                            )
                          }
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default LoginLog;
