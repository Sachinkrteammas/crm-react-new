import React, { useState, useEffect } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import api from "../api";
import { format } from "date-fns";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import "../styles/loader.css";

function CsatView() {
  const userType = localStorage.getItem("user_type");
  const companyId = localStorage.getItem("company_id");

  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState(companyId);

  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

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

  const customColStyle = {
    flex: "0 0 auto",
    width: "19.666667%",
  };

  const handleViewClick = async () => {
    if (!activeClientId) {
      alert("Please select a client.");
      return;
    }

    if (!startDate || !endDate) {
      alert("Please select both start and end dates.");
      return;
    }

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

  const handleExportToExcel = () => {
    if (data.length === 0) {
      alert("No data to export.");
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Report");

    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    });

    const file = new Blob([excelBuffer], {
      type: "application/octet-stream",
    });
    saveAs(file, "csat_report.xlsx");
  };

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
                  <div
                    className="table-responsive"
                    style={{
                      maxHeight: "600px",
                      overflowX: "auto",
                      overflowY: "auto",
                    }}
                  >
                    <table className="table table-bordered table-striped">
                      <thead
                        className="table-dark"
                      >
                        <tr>
                          {Object.keys(data[0]).map((key) => (
                            <th key={key}>{key}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {data.map((row, index) => (
                          <tr key={index}>
                            {Object.values(row).map((val, idx) => (
                              <td key={idx}>{val ?? "-"}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
    </>
  );
}

export default CsatView;
