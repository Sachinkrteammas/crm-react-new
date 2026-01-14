import React, { useState, useEffect } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { getIVRReport } from "../services/authService";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { getIVRFunnelReport } from "../services/authService";
import { format } from "date-fns";
import api from "../api";

const IVRFunnelReport = () => {
  const userType = localStorage.getItem("user_type");
  const companyId = localStorage.getItem("company_id");

  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState(companyId);

  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [loading, setLoading] = useState(false);

  const activeClientId =
    userType === "Super-Admin" || userType === "Admin"
      ? selectedClient
      : companyId;

  
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

  const exportToExcel = (data, filename = "IVR_Funnel_Report.xlsx") => {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "IVR Funnel Report");
    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const blob = new Blob([excelBuffer], { type: "application/octet-stream" });
    saveAs(blob, filename);
  };

  const handleExport = async () => {

    if (!activeClientId) {
      alert("Please select a client");
      return;
    }

    if (!startDate || !endDate) {
      alert("Please select both dates");
      return;
    }
    setLoading(true);

      try {
        const payload = {
          company_id: parseInt(activeClientId),
          from_date: format(startDate, "yyyy-MM-dd"),
          to_date: format(endDate, "yyyy-MM-dd"),
        };

        const data = await getIVRFunnelReport(payload);

        exportToExcel(data, `IVR_Funnel_Report_${payload.from_date}_to_${payload.to_date}.xlsx`);

      } catch (error) {
        console.error("Error exporting IVR Funnel Report:", error);
      } finally {
        setLoading(false);
      }
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
      {/* OB CDR REPORT CARD */}
      <div className="card p-4 mb-4">
        <h5 className="mb-3">IVR FUNNEL REPORT</h5>
        <div className="d-flex flex-wrap align-items-center gap-2">
          {(userType === "Super-Admin" || userType === "Admin") && (
            <div className="col-md-3">
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
          <DatePicker
            selected={startDate}
            onChange={setStartDate}
            placeholderText="Start Date"
            className="form-control"
          />
          <DatePicker
            selected={endDate}
            onChange={setEndDate}
            placeholderText="End Date"
            className="form-control"
          />
          <button className="btn btn-primary" onClick={handleExport}>
            EXPORT
          </button>
        </div>
      </div>
    </div>
    </div>
    </>
  );
};

export default IVRFunnelReport;