import React, { useState, useEffect } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { getOBCDRReport } from '../services/authService';
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import "../styles/loader.css";
import api from "../api";
import { useNavigate } from "react-router-dom";


const OBCDRReport = () => {

  const userType = localStorage.getItem("user_type");
    
  const [clients, setClients] = useState([]);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const companyId = localStorage.getItem("company_id");
  const [selectedClient, setSelectedClient] = useState(companyId);
  const [obCdrData, setObCdrData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showTable, setShowTable] = useState(false);
  const [clientName, setClientName] = useState("");
  const navigate = useNavigate();

  const handleView = async () => {
      setLoading(true);
      try {
        const payload = {
          company_id:
                  userType === "Client"
                    ? companyId
                    : selectedClient,
          from_date: startDate ? startDate.toLocaleDateString("en-CA") : null, // yyyy-mm-dd
          to_date: endDate ? endDate.toLocaleDateString("en-CA") : null,
        };

        const data = await getOBCDRReport(payload);

        // Optional: console.log(data, "OB CDR DATA==");
        setObCdrData(data);
        setShowTable(true);
      } catch (error) {
          console.error(error);
      } finally {
          setLoading(false);
      }
  };

  const handleExport = () => {
      if (obCdrData.length === 0) {
        alert("No data to export.");
        return;
      }

      // Create a worksheet
      const worksheet = XLSX.utils.json_to_sheet(obCdrData);

      // Create a new workbook and append the worksheet
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Report");

      // Generate a buffer
      const excelBuffer = XLSX.write(workbook, {
        bookType: "xlsx",
        type: "array",
      });

      // Save file
      const file = new Blob([excelBuffer], {
        type: "application/octet-stream",
      });
      saveAs(file, "ob_cdr_report.xlsx");
  };



  // ✅ Fetch clients (Super-Admin/Admin only)
    useEffect(() => {
      const fetchClients = async () => {
        try {
          const res = await api.get("/agents/clients-rights");
  
          // Sort alphabetically (case-insensitive)
          const sortedClients = res.data.sort((a, b) =>
            a.company_name.localeCompare(b.company_name, "en", {
              sensitivity: "base",
            })
          );
  
          setClients(sortedClients);
        } catch (err) {
          console.error("Error fetching clients:", err);
        }
      };
  
      if (userType === "Super-Admin" || userType === "Admin") {
        fetchClients();
      }
    }, [userType]);




    // ✅ Auto-select logic (same as in Dashboard)
    useEffect(() => {
        if (userType === "Client") {
          // Client users → directly set companyId
          setSelectedClient(companyId);
          // Try to find and show their company name
          const storedUserData = JSON.parse(localStorage.getItem("userData"));
          setClientName(storedUserData?.auth_person || "Your Company");
        } else if (
          (userType === "Super-Admin" || userType === "Admin") &&
          clients.length === 1
        ) {
          // Auto-select if only one client is available
          setSelectedClient(clients[0].company_id);
        }
    }, [userType, companyId, clients]);

//   useEffect(() => {
//   // If companyId is present, ensure it is set if user refreshes the page
//   if (companyId) {
//     setSelectedClient(companyId);
//   }
// }, [companyId]);

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
      {/* OB CDR REPORT CARD */}
      <div className="card p-4 mb-4">
        <h5 className="mb-3">OB CDR REPORT</h5>
        <div className="d-flex flex-wrap align-items-center gap-2">
          {/* <div style={{ minWidth: "200px" }}>
            <select
              className="form-select"
              value={selectedClient}
              onChange={(e) => setSelectedClient(e.target.value)}
            >
              <option value={companyId}>{companyId ? `Selected Client (${companyId})` : "Select Client"}</option>
            </select>
          </div> */}


           {userType === "Client" ? (
          <div style={{ maxWidth: "250px" }}>
            {/* <label className="form-label fw-semibold">Client</label> */}
            <input
              type="text"
              className="form-control"
              value={clientName}
              disabled
            />
          </div>
        ) : (
          (userType === "Super-Admin" || userType === "Admin") && (
            <div style={{ maxWidth: "250px" }}>
              {/* <label className="form-label fw-semibold">Select Client</label> */}
              <select
                className="form-select"
                value={selectedClient}
                onChange={(e) => setSelectedClient(e.target.value)}
              >
                <option value="">-- Select Client --</option>
                {clients.map((client) => (
                  <option
                    key={client.company_id}
                    value={client.company_id}
                  >
                    {client.company_name}
                  </option>
                ))}
              </select>
            </div>
          )
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

      {/* VIEW OB CDR REPORT TABLE */}
      {!loading && showTable && (
      <div className="card p-4">
        <h6 className="mb-3">VIEW OB CDR REPORT</h6>
        <div className="table-responsive" style={{ maxHeight: "500px", overflow: "auto" }}>
          <table className="table table-bordered table-sm">
            <thead className="table-light">
              <tr>
                <th>Agent</th>
                <th>Phone Number</th>
                <th>Call Date</th>
                <th>Start Time</th>
                <th>End Time</th>
                <th>Call Duration</th>
                <th>Wrap Time</th>
                <th>Recording</th>
                <th>Scenario</th>
                <th>Sub Scenario 1</th>
                <th>Sub Scenario 2</th>
                <th>Sub Scenario 3</th>
                <th>Sub Scenario 4</th>
              </tr>
            </thead>
            <tbody>
              {obCdrData.length > 0 ? (
                obCdrData.map((row, idx) => (
                <tr key={idx}>
                  <td>{row.Agent || "-"}</td>
                  <td>{row.PhoneNumber || "-"}</td>
                  <td>{row.CallDate || "-"}</td>
                  <td>{row.StartTime ? row.StartTime.slice(0, 19).replace("T", " ") : "-"}</td>
                  <td>{row.Endtime ? row.Endtime.slice(0, 19).replace("T", " ") : "-"}</td>
                  <td>{row.CallDuration || "-"}</td>
                  <td>{row.WrapTime || "-"}</td>
                  <td>
                    <a 
                      href={row.Recording} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-center"
                      title="Download"
                      style={{ 
                        textDecoration: "none", 
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center", 
                          }}
                    >
                      📥
                    </a>
                  </td>
                  <td>{row.Scenario || "-"}</td>
                  <td>{row.SubScenario1 || "-"}</td>
                  <td>{row.SubScenario2 || "-"}</td>
                  <td>{row.SubScenario3 || "-"}</td>
                  <td>{row.SubScenario4 || "-"}</td>
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

export default OBCDRReport;
