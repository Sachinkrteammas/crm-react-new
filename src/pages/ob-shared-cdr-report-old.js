import React, { useState, useEffect } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { getOBSharedCDRReportOld } from "../services/authService";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import "../styles/loader.css";
import api from "../api";
import { useNavigate } from "react-router-dom";


const OBSharedCDRReportOld = () => {
  const userType = localStorage.getItem("user_type");
      
  const [clients, setClients] = useState([]);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [cdrData, setCdrData] = useState([]);
  const [loading, setLoading] = useState(false);
  const companyId = localStorage.getItem("company_id");
  const [showTable, setShowTable] = useState(false);
  const [clientName, setClientName] = useState("");
  const [selectedClient, setSelectedClient] = useState(companyId);
  const navigate = useNavigate();

  const handleView = async () => { // add 'async' here
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

          const response = await getOBSharedCDRReportOld(payload);

          // ✅ Extract only the "data" array
          if (response?.status === "success" && Array.isArray(response.data)) {
            setCdrData(response.data);
            setShowTable(true);
          } else {
            setCdrData([]);
            setShowTable(false);
          }
        } catch (error) {
          console.error(error);
        } finally {
          setLoading(false);
        }
    };


  const handleExport = async () => {
  setLoading(true);

  try {
    const payload = {
      company_id: userType === "Client" ? companyId : selectedClient,
      from_date: startDate ? startDate.toLocaleDateString("en-CA") : null,
      to_date: endDate ? endDate.toLocaleDateString("en-CA") : null,
    };

    const response = await getOBSharedCDRReportOld(payload);

    const exportData = response?.status === "success" ? response.data : [];

    if (!Array.isArray(exportData) || exportData.length === 0) {
      alert("No data to export.");
      return;
    }

    let companyName = "Company";

    if (userType === "Client") {
      companyName = clientName || "Company";
    } else {
      const selected = clients.find(
        (c) => String(c.company_id) === String(selectedClient)
      );
      companyName = selected?.company_name || "Company";
    }

    const formatDateForFile = (date) =>
      date ? date.toLocaleDateString("en-CA") : "NA";

    const from = formatDateForFile(startDate);
    const to = formatDateForFile(endDate);

    // ✅ Create Excel
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Report");

    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    });

    const file = new Blob([excelBuffer], {
      type: "application/octet-stream",
    });

    const safeCompanyName = companyName.substring(0, 6);
    const fileName = `${safeCompanyName}_Ob_shared_cdr_report_${from}_to_${to}.xlsx`;

    saveAs(file, fileName);

  } catch (error) {
    console.error("Export failed:", error);
  } finally {
    setLoading(false);
  }
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
      {/* OB Shared CDR Filter Section */}
      <div className="card p-4 mb-4">
        <h5 className="mb-3">OB SHARED CDR REPORT OLD</h5>
        <div className="d-flex flex-wrap align-items-center gap-2">


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
            onChange={(date) => setStartDate(date)}
            placeholderText="Start Date"
            className="form-control"
            dateFormat="dd-MM-yyyy"
          />
          <DatePicker
            selected={endDate}
            onChange={(date) => setEndDate(date)}
            placeholderText="End Date"
            className="form-control"
            dateFormat="dd-MM-yyyy"
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

      {/* CDR Report Table */}
      {!loading && showTable && (
      <div className="card p-4">
        <h6 className="mb-3">VIEW OB SHARED CDR REPORT</h6>
        <div className="table-responsive" style={{ maxHeight: "500px", overflow: "auto" }}>
          <table className="table table-bordered table-sm">
          <thead className="table-light">
            <tr>
              <th>Call Date</th>
              <th>Call Start Time</th>
              <th>Call End Time</th>
              <th>Customer Number</th>
              <th>Agent ID</th>
              <th>Agent Name</th>
              <th>Call Type</th>
              <th>System Disposition</th>
              <th>Dialing Mode</th>
              <th>Client Name</th>
              <th>Lead ID</th>
              <th>ACHT</th>
              <th>Talk Time</th>
              <th>Wait Time</th>
              <th>Dispose Time</th>
              <th>Disconnected by</th>
              <th>Scenario</th>
              <th>Sub Scenario 1</th>
              <th>Sub Scenario 2</th>
              <th>Sub Scenario 3</th>
              <th>Sub Scenario 4</th>
              <th>Recording</th>
            </tr>
          </thead>
          <tbody>
            {cdrData.length > 0 ? (
              cdrData.map((row, idx) => (
                <tr key={idx}>
                  <td>{row.CallDate || "-"}</td>
                  <td>{row.StartTime?.replace("T", " ") || "-"}</td>
                  <td>{row.Endtime?.replace("T", " ") || "-"}</td>
                  <td>{row.CustomerNumber || "-"}</td>
                  <td>{row.AgentID || "-"}</td>
                  <td>{row.AgentName || "-"}</td>
                  <td>{row.CallType || "-"}</td>
                  <td>{row.SystemDisposition || "-"}</td>
                  <td>{row.DialingMode || "-"}</td>
                  <td>{row.ClientName || "-"}</td>
                  <td>{row.LeadID || "-"}</td>
                  <td>{row.ACHT || "-"}</td>
                  <td>{row.TalkTime || "-"}</td>
                  <td>{row.WaitTime || "-"}</td>
                  <td>{row.DispoTime || "-"}</td>
                  <td>{row.DisconnectedBy || "-"}</td>
                  <td>{row.Scenario || "-"}</td>
                  <td>{row.SubScenario1 || "-"}</td>
                  <td>{row.SubScenario2 || "-"}</td>
                  <td>{row.SubScenario3 || "-"}</td>
                  <td>{row.SubScenario4 || "-"}</td>
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

export default OBSharedCDRReportOld;
