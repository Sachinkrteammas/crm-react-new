import React, { useState, useEffect } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import api from "../api";

const RLReportClient = () => {
  const userType = localStorage.getItem("user_type");
  const companyId = localStorage.getItem("company_id");

  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [clientId, setClientId] = useState(companyId);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(false);

  // ✅ Same logic as CSAT
  const activeClientId =
    userType === "Super-Admin" || userType === "Admin"
      ? clientId
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
  }, [userType]);

  /* ---------------------------
     AUTO-SET CLIENT (NON-ADMIN)
  --------------------------- */
  useEffect(() => {
    if (!(userType === "Super-Admin" || userType === "Admin")) {
      setClientId(companyId);
    }
  }, [userType, companyId]);

  const formatDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  };



  
  const handleExport = async () => {
    if (!activeClientId) {
        alert("Please select client");
        return;
    }

    if (!startDate || !endDate) {
        alert("Please select start date and end date");
        return;
    }

    const formattedStartDate = formatDate(startDate);
    const formattedEndDate = formatDate(endDate);

    try {
        setLoading(true);

        const response = await api.get(
        `/report/abandon-callback-report/excel?client_id=${activeClientId}&start_date=${formattedStartDate}&end_date=${formattedEndDate}`,
        {
            responseType: "blob",
        }
        );

        const blob = new Blob([response.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        });

        // ✅ Extract filename from backend response
        let fileName = "RL_Report.xlsx";
        const contentDisposition = response.headers["content-disposition"];

        if (contentDisposition) {
        const match = contentDisposition.match(/filename="?([^"]+)"?/);
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
              <h5 className="mb-3">RL Report</h5>

              <div className="d-flex flex-wrap align-items-end gap-3">

                {/* ✅ Client Dropdown (ONLY ADMIN) */}
                {(userType === "Super-Admin" || userType === "Admin") && (
                  <div style={{ maxWidth: "220px" }}>
                    <label className="form-label">Select Client</label>
                    <select
                      className="form-select"
                      value={clientId}
                      onChange={(e) => setClientId(e.target.value)}
                    >
                      <option value="">-- Select Client --</option>

                      <option value="ALL">ALL</option>
                      
                      {clients.map((c) => (
                        <option key={c.company_id} value={c.company_id}>
                          {c.company_name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Date Picker */}
                <div style={{ maxWidth: "220px" }}>
                  <label className="form-label">Start Date</label>
                  <DatePicker
                    selected={startDate}
                    onChange={setStartDate}
                    placeholderText="Select Start Date"
                    className="form-control"
                    dateFormat="yyyy-MM-dd"
                  />
                </div>

                <div style={{ maxWidth: "220px" }}>
                  <label className="form-label">End Date</label>
                  <DatePicker
                    selected={endDate}
                    onChange={setEndDate}
                    placeholderText="Select End Date"
                    className="form-control"
                    dateFormat="yyyy-MM-dd"
                  />
                </div>

                {/* Export Button */}
                <button
                  className="btn btn-primary fw-semibold"
                  onClick={handleExport}
                >
                  EXPORT
                </button>

              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default RLReportClient;