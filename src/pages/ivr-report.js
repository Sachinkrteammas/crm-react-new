import React, { useState, useEffect } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { getIVRReport } from "../services/authService";
import { format } from "date-fns";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import "../styles/loader.css";
import api from "../api";
import { useNavigate } from "react-router-dom";

const IVRReport = () => {
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [ivrData, setIVRData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showTable, setShowTable] = useState(false);
  const navigate = useNavigate();

  // 🔹 User info
  const userType = localStorage.getItem("user_type");
  const companyId = localStorage.getItem("company_id");

  // 🔹 Client dropdown list & selection for Admin/SuperAdmin
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState(companyId);

  const activeCompanyId =
  userType === "Super-Admin" || userType === "Admin"
    ? selectedClient
    : companyId;


  // 🔹 Fetch clients (only for SUPER ADMIN / ADMIN)
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

  // 🔹 Set default client for normal client login
  useEffect(() => {
    if (userType !== "Super-Admin" && userType !== "Admin") {
      setSelectedClient(companyId);
    }
  }, [userType, companyId]);
  

  const handleView = async () => {
    if (!activeCompanyId || activeCompanyId === "null"){
      alert("Client not Selected!.")
      return;
    }
    if (!startDate || !endDate){
      alert("Please Select Start and End Dates")
      return;
    }
    setLoading(true);
    try {
      const payload = {
        company_id: activeCompanyId,
        from_date: startDate ? format(startDate, "yyyy-MM-dd") : null,
        to_date: endDate ? format(endDate, "yyyy-MM-dd") : null,
      };

      const data = await getIVRReport(payload);
      setIVRData(data);
      setShowTable(true);
    } catch (error) {
      console.error("Error fetching IVR report:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDateForFile = (date) =>
  date ? format(date, "yyyy-MM-dd") : "NA";


  const handleExport = async () => {
    if (!activeCompanyId || activeCompanyId === "null") {
      alert("Client not Selected!");
      return;
    }

    if (!startDate || !endDate) {
      alert("Please Select Start and End Dates");
      return;
    }
    // ✅ Decide company name (NO return here)
      let companyName = "Company";

      if (userType === "Client") {
      const storedUserData = JSON.parse(localStorage.getItem("userData"));
      companyName = storedUserData?.auth_person || "Company";
    } else {
        const selected = clients.find(
          (c) => String(c.company_id) === String(selectedClient)
        );
        companyName = selected?.company_name || "Company";
      }

    setLoading(true);

    try {
      const payload = {
        company_id: activeCompanyId,
        from_date: format(startDate, "yyyy-MM-dd"),
        to_date: format(endDate, "yyyy-MM-dd"),
      };

      // ✅ Fetch fresh data directly for export
      const data = await getIVRReport(payload);

      if (!data || data.length === 0) {
        alert("No data found for export.");
        setLoading(false);
        return;
      }

      // Create a worksheet
      const worksheet = XLSX.utils.json_to_sheet(data);

      // Create a new workbook and append the worksheet
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "IVRReport");

      // Generate a buffer
      const excelBuffer = XLSX.write(workbook, {
        bookType: "xlsx",
        type: "array",
      });

      // Save file
      const file = new Blob([excelBuffer], {
        type: "application/octet-stream",
      });

      // ✅ Safe filename
      const safeCompanyName = companyName.substring(0, 6);
      const from = formatDateForFile(startDate);
      const to = formatDateForFile(endDate);

      const fileName = `${safeCompanyName}_Ivr_Report_${from}_to_${to}.xlsx`;

      saveAs(file, fileName);      
    } catch (error) {
      console.error("Error exporting IVR report:", error);
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
    <div className="row gy-4 gx-3">
      {/* IVR REPORT CARD */}
     <div className="card p-4 mb-4">
      <h5 className="mb-3">IVR REPORT</h5>

      <div className="d-flex flex-wrap align-items-center gap-3">

        {/* 🔹 Select Client — shows only for Admin / Super Admin */}
        {(userType === "Super-Admin" || userType === "Admin") && (
          <div style={{ maxWidth: "220px" }}>
            <select
              className="form-select"
              value={selectedClient}
              onChange={(e) => setSelectedClient(e.target.value)}
            >
              <option value="">Select Client</option>
              {clients.map((client) => (
                <option key={client.company_id} value={client.company_id}>
                  {client.company_name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Start Date */}
        <div style={{ maxWidth: "220px" }}>
          <DatePicker
            selected={startDate}
            onChange={(date) => setStartDate(date)}
            placeholderText="Start Date"
            className="form-control"
            dateFormat="dd-MM-yyyy"
          />
        </div>

        {/* End Date */}
        <div style={{ maxWidth: "220px" }}>
          <DatePicker
            selected={endDate}
            onChange={(date) => setEndDate(date)}
            placeholderText="End Date"
            className="form-control"
            dateFormat="dd-MM-yyyy"
          />
        </div>

        {/* Buttons */}
        <button className="btn btn-primary" onClick={handleExport}>
          EXPORT
        </button>

        <button className="btn btn-primary" onClick={handleView}>
          VIEW
        </button>     
        <button
            type="button"
            className="btn btn-outline-primary rounded-3"
            onClick={() => navigate(-1)}
          >
            ← Back
          </button>
      </div>
    </div>


      {/* VIEW IVR LOG REPORT */}
      {!loading && showTable && (
      <div className="card p-4">
        <h6 className="mb-3">VIEW IVR LOG REPORT</h6>
        <div className="table-responsive" style={{ maxHeight: "500px", overflow: "auto" }}>
          <table className="table table-bordered table-sm">
            <thead className="table-light">
              <tr>
                <th>DATE</th>
                <th>CALL TYPE</th>
                <th>FROM</th>
                <th>START TIME</th>
                <th>END TIME</th>
                <th>DURATION (SEC.)</th>
                <th>OUTCOME</th>
                <th>OPTIONS CHOSEN</th>
              </tr>
            </thead>
            <tbody>
              {ivrData.length > 0 ? (
                ivrData.map((row, idx) => (
                  <tr key={idx}>
                    <td>{row.Date}</td>
                    <td>{row["Call Type"]}</td>
                    <td>{row.From}</td>
                    <td>{row["Start Time"]}</td>
                    <td>{row["End Time"]}</td>
                    <td>{row["Duration(Sec.)"]}</td>
                    <td>{row.Outcome}</td>
                    <td>{row["Option Chosen"]}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="12" className="text-center">
                    No data available for selected date range.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      )}
    </div>
    </div>
    </>
  );
};

export default IVRReport;
