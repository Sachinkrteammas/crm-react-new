import React, { useState, useEffect } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import api from "../api";
import * as XLSX from "xlsx";

const WeeboInformation = () => {
  const userType = localStorage.getItem("user_type");
  const companyId = localStorage.getItem("company_id");

  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [clientId, setClientId] = useState(companyId);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(false);


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
    if (!startDate || !endDate) {
        alert("Please select start date and end date");
        return;
    }

    const formattedStartDate = formatDate(startDate);
    const formattedEndDate = formatDate(endDate);

    try {
        setLoading(true);

        const response = await api.get(
        `/report/information-log?start_date=${formattedStartDate}&end_date=${formattedEndDate}`
        );

        const rows = response.data || [];

        if (!rows.length) {
        alert("No data found.");
        return;
        }

        // Remove uniqueid column
        const excelData = rows.map(
        ({ uniqueid, ...row }) => ({
            ID: row.id,
            "Caller Number": row.caller_number,
            DID: row.did,
            "Call Time": row.call_time,
            Duration: row.duration,
        })
        );

        // Create workbook
        const worksheet = XLSX.utils.json_to_sheet(excelData);
        const workbook = XLSX.utils.book_new();

        XLSX.utils.book_append_sheet(
        workbook,
        worksheet,
        "Weebo Information"
        );

        // Download
        XLSX.writeFile(
        workbook,
        `Weebo_Information_${formattedStartDate}_to_${formattedEndDate}.xlsx`
        );

    } catch (error) {
        console.error(error);
        alert("Failed to export data");
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
              <h5 className="mb-3">Weebo Information</h5>

              <div className="d-flex flex-wrap align-items-end gap-3">

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

export default WeeboInformation;