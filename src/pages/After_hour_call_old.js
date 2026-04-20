import React, { useState, useEffect } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { format } from "date-fns";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import api from "../api";
import "../styles/loader.css";
import { useNavigate } from "react-router-dom";

const AfterHoursCallsOld = () => {
  const [startDate, setStartDate] = useState(null);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showTable, setShowTable] = useState(false);

  const navigate = useNavigate();

  // 🔹 User info
  const userType = localStorage.getItem("user_type");
  const companyId = localStorage.getItem("company_id");

  // 🔹 Client dropdown (Admin / Super Admin)
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState(companyId);

  const activeCompanyId =
    userType === "Super-Admin" || userType === "Admin"
      ? selectedClient
      : companyId;

  // 🔹 Fetch clients
  useEffect(() => {
     const fetchClients = async () => {
       try {
         const res = await api.get("/agents/clients-rights");
         const sorted = res.data.sort((a, b) =>
           a.company_name.localeCompare(b.company_name, "en", {
             sensitivity: "base",
           })
         );
         setClients(sorted);
       } catch (err) {
         console.error("Error fetching clients:", err);
       }
     };
 
     if (userType === "Super-Admin" || userType === "Admin") {
       fetchClients();
     }
   }, [userType]);

  // 🔹 Set default client
  useEffect(() => {
    if (userType !== "Super-Admin" && userType !== "Admin") {
      setSelectedClient(companyId);
    }
  }, [userType, companyId]);

  // 🔹 View handler
  const handleView = async () => {
    if (!activeCompanyId || activeCompanyId === "null") {
      alert("Client not selected");
      return;
    }

    if (!startDate) {
      alert("Please select date");
      return;
    }

    setLoading(true);
    setShowTable(false);

    try {
      const res = await api.get("/report/after-hours-calls_old", {
        params: {
          client_id: activeCompanyId,
          start_date: format(startDate, "yyyy-MM-dd"),
        },
      });

      setData(res.data.data || []);
      setShowTable(true);
    } catch (err) {
      console.error("Error fetching after-hours calls", err);
      alert("Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  // 🔹 Export handler
  const handleExport = async () => {
    if (!activeCompanyId || activeCompanyId === "null") {
      alert("Client not selected");
      return;
    }
    if (!startDate) {
      alert("Please select date");
      return;
    }

    setLoading(true);
    try {
      const res = await api.get("/report/after-hours-calls_old", {
        params: {
          client_id: activeCompanyId,
          start_date: format(startDate, "yyyy-MM-dd"),
        },
      });

      const exportData = res.data.data.map((row, idx) => ({
        "S.No.": idx + 1,
        "START TIME": row.start_time?.replace("T", " "),
        "CALLER NUMBER": row.caller_code,
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "AfterHoursCalls");

      const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
      const file = new Blob([excelBuffer], { type: "application/octet-stream" });

      const fileName = `${getCompanyName()}_AfterHoursCalls_${format(startDate, "yyyy-MM-dd")}.xlsx`;
      saveAs(file, fileName);
    } catch (err) {
      console.error("Error exporting after-hours calls:", err);
      alert("Failed to export data");
    } finally {
      setLoading(false);
    }
  };

  // 🔹 Determine company name
  const getCompanyName = () => {
    if (userType === "Client") {
      const storedUserData = JSON.parse(localStorage.getItem("userData") || "{}");
      return storedUserData?.auth_person || "Company";
    } else {
      const selected = clients.find((c) => String(c.company_id) === String(selectedClient));
      return selected?.company_name || "Company";
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
        <div className="card p-4 mb-4">
          <h5 className="mb-3">AFTER HOURS CALLS OLD</h5>

          <div className="d-flex flex-wrap gap-3 align-items-center">

            {/* Client dropdown */}
            {(userType === "Super-Admin" || userType === "Admin") && (
              <div style={{ maxWidth: "220px" }}>
                <select
                  className="form-select"
                  value={selectedClient}
                  onChange={(e) => setSelectedClient(e.target.value)}
                >
                  <option value="">Select Client</option>
                  {clients.map((c) => (
                    <option key={c.company_id} value={c.company_id}>
                      {c.company_name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Date picker */}
            <div style={{ maxWidth: "220px" }}>
              <DatePicker
                selected={startDate}
                onChange={(date) => setStartDate(date)}
                placeholderText="Select Date"
                className="form-control"
                dateFormat="dd-MM-yyyy"
              />
            </div>

            {/* Buttons */}
            <button className="btn btn-primary" onClick={handleView}>
              View
            </button>

            <button className="btn btn-primary" onClick={handleExport}>
             
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

        {/* TABLE */}
        {!loading && showTable && (
          <div className="card p-4">
            <h6 className="mb-3">AFTER HOURS CALL DETAILS</h6>

            <div className="table-responsive" style={{ maxHeight: "500px" }}>
              <table className="table table-bordered table-sm">
                <thead className="table-light">
                  <tr>
                    <th>S.No.</th>
                    <th>START TIME</th>
                    <th>CALLER NUMBER</th>
                  </tr>
                </thead>
                <tbody>
                  {data.length > 0 ? (
                    data.map((row, idx) => (
                      <tr key={idx}>
                        <td>{idx + 1}</td>
                        <td>{row.start_time?.replace("T", " ")}</td>
                        <td>{row.caller_code}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="3" className="text-center">
                        No after-hours calls found.
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

export default AfterHoursCallsOld;
