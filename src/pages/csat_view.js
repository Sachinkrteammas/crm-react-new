import React, { useState, useEffect } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import api from "../api";
import { format } from "date-fns";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import "../styles/loader.css";
import { useRef } from "react";

function CsatView() {
  const userType = localStorage.getItem("user_type");
  const companyId = localStorage.getItem("company_id");
  const tableWrapperRef = useRef(null);

  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState(companyId);

  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const ROWS_PER_PAGE = 10; // ✅ fixed page size



  // 🔍 Search filter
  const filteredData = data.filter((row) => {
    const search = searchTerm.toLowerCase();

    const user = row.user?.toLowerCase() || "";
    const name = row.full_name?.toLowerCase() || "";

    return user.includes(search) || name.includes(search);
  });

  // 📄 Pagination
  const indexOfLastRow = currentPage * ROWS_PER_PAGE;
  const indexOfFirstRow = indexOfLastRow - ROWS_PER_PAGE;
  const currentRows = filteredData.slice(indexOfFirstRow, indexOfLastRow);

  const totalPages = Math.ceil(filteredData.length / ROWS_PER_PAGE) || 1; 


  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };



  const activeClientId =
    userType === "Super-Admin" || userType === "Admin"
      ? selectedClient
      : companyId;



  /* ---------------------------
     FETCH CLIENT LIST (ADMIN)
  --------------------------- */
  useEffect(() => {
    if (userType === "Super-Admin" || userType === "Admin") {
      api
        .get("/agents/clients-rights")
        .then((res) => {
          const sorted = res.data.sort((a, b) =>
            a.company_name.localeCompare(b.company_name)
          );
          setClients(sorted);
        })
        .catch((err) => console.error("Error fetching clients:", err));
    }
  }, []);

  /* ---------------------------
     AUTO-SET CLIENT (NON-ADMIN)
  --------------------------- */
  useEffect(() => {
    if (!(userType === "Super-Admin" || userType === "Admin")) {
      setSelectedClient(companyId);
    }
  }, []);



  const handleViewClick = async () => {
    if (!activeClientId) {
      alert("Please select a client.");
      return;
    }

    if (!startDate || !endDate) {
      alert("Please select both start and end dates.");
      return;
    }

    setCurrentPage(1);
    setSearchTerm("");
    setLoading(true);
    const formattedStart = format(startDate, "yyyy-MM-dd");
    const formattedEnd = format(endDate, "yyyy-MM-dd");

    try {
      const response = await api.get(`/call/csat-report/${activeClientId}`, {
        params: {
          client_id: parseInt(activeClientId),
          from_date: formattedStart,
          to_date: formattedEnd,
        },
      });

      setData(response.data || []);
      console.log("CSAT Report Data:", response.data);
    } catch (error) {
      console.error("Failed to fetch CSAT report:", error);
      alert("Error fetching CSAT report");
    } finally {
      setLoading(false);
    }
  };

  const handleExportToExcel = async () => {
    if (!activeClientId) {
      alert("Please select a client.");
      return;
    }

    if (!startDate || !endDate) {
      alert("Please select both start and end dates.");
      return;
    }

    const formattedStart = format(startDate, "yyyy-MM-dd");
    const formattedEnd = format(endDate, "yyyy-MM-dd");

    setLoading(true);
    try {
      // Fetch all data directly from API
      const response = await api.get(`/call/csat-report/${activeClientId}`, {
        params: {
          client_id: parseInt(activeClientId),
          from_date: formattedStart,
          to_date: formattedEnd,
        },
      });

      const exportData = response.data || [];
      if (exportData.length === 0) {
        alert("No data to export.");
        return;
      }

      // Map data to match table columns
      const formattedData = exportData.map((row, index) => ({
        "AGENT": row.user || "-",
        "AGENT NAME": row.full_name || "-",
        "MOBILE NO.": row.phone_number || "-",
        "LANGUAGE": row.language || "-",
        "DTMF": row.dtmf || "-",
        "ENTRY DATE": row.call_date
          ? format(new Date(row.call_date), "dd MMM yyyy HH:mm:ss")
          : "-",
      }));

      // Create Excel
      const worksheet = XLSX.utils.json_to_sheet(formattedData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "CSAT Report");

      const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
      const file = new Blob([excelBuffer], { type: "application/octet-stream" });

      // Determine filename
      let nameForFile = "";

      if (userType === "Super-Admin" || userType === "Admin") {
        // First 7 letters of selected client name
        nameForFile =
          clients.find((c) => c.company_id === parseInt(activeClientId))?.company_name?.substring(0, 7) ||
          "client";
      } else {
        // Logged-in client: use auth_person name
        const storedUserData = JSON.parse(localStorage.getItem("userData"));
        nameForFile = storedUserData?.auth_person || "client";
      }
      const fileName = `${nameForFile.substring(0, 7)}_csat_report_${formattedStart}_to_${formattedEnd}.xlsx`;

      saveAs(file, fileName);

    } catch (error) {
      console.error("Failed to export CSAT report:", error);
      alert("Error exporting CSAT report");
    } finally {
      setLoading(false);
    }
  };


  // Scroll to top whenever visible rows change
  useEffect(() => {
    if (tableWrapperRef.current) {
      tableWrapperRef.current.scrollTop = 0;
    }
  }, [currentRows]);


  useEffect(() => {
    const maxPage = Math.ceil(filteredData.length / ROWS_PER_PAGE) || 1;
    if (currentPage > maxPage) {
      setCurrentPage(1);
    }
  }, [filteredData.length]);


  return (
    <>
      {/* Full-screen loader */}
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

      <div className="card p-4 mb-4">
        <h5 className="mb-3">CSAT View</h5>

        {/* <div className="card-body"> */}

          {/* 🔹 ROW 1 : Client + Dates (ONE LINE) */}
          <div className="d-flex flex-wrap align-items-center gap-3">

            {(userType === "Super-Admin" || userType === "Admin") && (
              <div style={{ maxWidth: "220px" }}>
                <select
                  className="form-select"
                  value={selectedClient}
                  onChange={(e) => setSelectedClient(e.target.value)}
                >
                  <option value="">-- Select Client --</option>
                  {clients.map((c) => (
                    <option key={c.company_id} value={c.company_id}>
                      {c.company_name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div style={{ maxWidth: "220px" }}>
              <DatePicker
                selected={startDate}
                onChange={setStartDate}
                dateFormat="dd-MM-yyyy"
                placeholderText="DD-MM-YYYY"
                className="form-control"
              />
            </div>

            <div style={{ maxWidth: "220px" }}>
              <DatePicker
                selected={endDate}
                onChange={setEndDate}
                dateFormat="dd-MM-yyyy"
                placeholderText="DD-MM-YYYY"
                className="form-control"
              />
            </div>

            {/* VIEW BUTTON */}
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleViewClick}
                >
                  View
                </button>

            {/* EXPORT BUTTON */}
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleExportToExcel}
              >
                Export
              </button>
              </div>
              </div>

              {!loading && data.length > 0 && (
              <div className="card p-4">
                {/* 🔹 Search */}
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <input
                    type="text"
                    className="form-control"
                    style={{ maxWidth: "300px" }}
                    placeholder="Search..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setCurrentPage(1);
                    }}
                  />
                </div>

                {/* Scrollable table */}
                <div
                  ref={tableWrapperRef}
                  className="table-responsive"
                  style={{
                    maxHeight: "500px", // table scroll height
                    overflowY: "auto",
                    overflowX: "auto",
                  }}
                >
                  <table className="table table-bordered table-striped">
                    <thead className="table-dark" style={{ position: "sticky", top: 0, zIndex: 0 }}>
                      <tr>
                        <th>S.NO</th>
                        <th>AGENT</th>
                        <th>AGENT NAME</th>
                        <th>MOBILE NO.</th>
                        <th>LANGUAGE</th>
                        <th>DTMF</th>
                        <th>ENTRY DATE</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentRows.map((row, index) => (
                        <tr>
                          <td>{(currentPage - 1) * ROWS_PER_PAGE + index + 1}</td>
                          <td>{row.user || "-"}</td>
                          <td>{row.full_name || "-"}</td>
                          <td>{row.phone_number || "-"}</td>
                          <td>{row.language || "-"}</td>
                          <td>{row.dtmf || "-"}</td>
                          <td>
                            {row.call_date
                              ? format(new Date(row.call_date), "dd MMM yyyy HH:mm:ss")
                              : "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* ✅ Pagination controls */}
                {totalPages > 1 && (
                  <div className="d-flex justify-content-between align-items-center mt-3">
                    <button
                      className="btn btn-sm btn-outline-primary"
                      disabled={currentPage === 1}
                      onClick={() => handlePageChange(currentPage - 1)}
                    >
                      ⬅ Previous
                    </button>

                    <span>
                      Page {currentPage} of {totalPages}
                    </span>

                    <button
                      className="btn btn-sm btn-outline-primary"
                      disabled={currentPage === totalPages}
                      onClick={() => handlePageChange(currentPage + 1)}
                    >
                      Next ➡
                    </button>
                  </div>
                )}
              </div>
            )}
            </div>
          </div>
    </>
  );
}

export default CsatView;
