import React, { useState, useEffect } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { fetchCDRReport } from '../services/authService';
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import "../styles/loader.css";
import api from "../api";
import { useNavigate } from "react-router-dom";


const CDRReport = () => {

  const userType = localStorage.getItem("user_type");
  
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState("");

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const companyId = localStorage.getItem("company_id");
  const [showTable, setShowTable] = useState(false);
  const [loading, setLoading] = useState(false);

  const [sampleData, setSampleData] = useState([]);
  const [clientName, setClientName] = useState("");
  const navigate = useNavigate();



    const formatDate = (date) => {
      if (!date) return "";
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    };

const handleStartDateChange = (date) => {
  const formattedDate = formatDate(date);

  setStartDate(formattedDate);

  // If All client selected, keep end date same as start date
  if (selectedClient === "All") {
    setEndDate(formattedDate);
  }
};

const handleEndDateChange = (date) => {
  setEndDate(formatDate(date));
};


    useEffect(() => {
      if (selectedClient === "All" && startDate) {
        setEndDate(startDate);
      }
    }, [selectedClient, startDate]);



  // Helper: convert ISO 8601 duration (PT1M15S) to HH:MM:SS
function isoDurationToHHMMSS(duration) {
    if (!duration) return "00:00:00";
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return "00:00:00";
    const hours = parseInt(match[1] || 0);
    const minutes = parseInt(match[2] || 0);
    const seconds = parseInt(match[3] || 0);
    return [hours, minutes, seconds]
        .map((x) => x.toString().padStart(2, "0"))
        .join(":");
}

// Helper: sum multiple HH:MM:SS durations
function sumDurations(...durations) {
    let totalSeconds = 0;
    durations.forEach((d) => {
        const parts = d.split(":").map(Number);
        totalSeconds += parts[0] * 3600 + parts[1] * 60 + parts[2];
    });
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return [h, m, s].map((x) => x.toString().padStart(2, "0")).join(":");
}

  const handleViewClick = async () => {
    setLoading(true);

    try {
        const payload = {
            from_date: startDate,
            to_date: endDate,
            company_id: userType === "Client" ? companyId : selectedClient,
        };

        const response = await fetchCDRReport(payload);

        const formatted = response.map((row) => {
            const callDuration = isoDurationToHHMMSS(row.call_duration);
            const queueDuration = isoDurationToHHMMSS(row.queuetime);
            const holdTime = isoDurationToHHMMSS(row.parked_time);
            const talkDuration = isoDurationToHHMMSS(row.call_duration);
            const acwDuration = isoDurationToHHMMSS(row.wrap_time);

            return {
                agent: row.agent,
                phone: row.phone_number,
                CallSource: row.CallSource,
                callDate: row.call_date,
                startTimeQueue: row.queue_start,
                startTime: row.start_time,
                endTime: row.end_time,
                endTimeWrap: row.wrap_end_time,
                leadid: row.leadid,

                queueTime: queueDuration,
                callDurationSec: row.call_duration1,
                callDurationTime: callDuration,
                wrapTime: acwDuration,
                holdTime: holdTime,
                talkDuration: talkDuration,
                totalHandledTime: sumDurations(talkDuration, acwDuration, holdTime),

                Category1: row.Category1,
                Category2: row.Category2,
                Category3: row.Category3,
                Category4: row.Category4,
                Category5: row.Category5,

                Recording: row.Recording
                    ? row.Recording
                    : `http://your-server.com/recordings/${row.uniqueid}.wav`,
            };
        });

        setSampleData(formatted);
        setShowTable(true);

    } catch (err) {
        console.error("Failed to fetch report", err);
    } finally {
        setLoading(false);
    }
};




const handleExport = async () => {
    setLoading(true);

    try {
        const payload = {
            from_date: startDate,
            to_date: endDate,
            company_id: userType === "Client" ? companyId : selectedClient,
        };

        // 🔹 API call
        const response = await fetchCDRReport(payload);

        // 🔹 Format response for Excel
        const formatted = response.map((row) => {
            const callDuration = isoDurationToHHMMSS(row.call_duration);
            const queueDuration = isoDurationToHHMMSS(row.queuetime);
            const holdTime = isoDurationToHHMMSS(row.parked_time);
            const talkDuration = isoDurationToHHMMSS(row.call_duration);
            const acwDuration = isoDurationToHHMMSS(row.wrap_time);
            const startDate = new Date(row.start_time);
            const hour = String(startDate.getHours()).padStart(2, "0");

            return {
                CallDate: row.call_date,
                Time: row.start_time,
                CallSource: row.CallSource,
                AgentId: row.agent,
                AgentName: row.full_name,
                Calltype: 'Inbound',
                CampaignName: row.campaign_id,
                PhoneNumber: row.phone_number,
                Disposition: row.status,
                DisconnBy: row.term_reason,
                CallDurationSecond: row.call_duration1,
                CallDurationMinute: callDuration,
                QueueDuration: queueDuration,
                HoldTime: holdTime,
                Talkduration: talkDuration,
                AcwDuration: acwDuration,
                HoursSlot: `${hour}:00:00`, // optional: calculate if needed
                TotalHandledTime: sumDurations(talkDuration, acwDuration),
                Call20SecSL: row.call20,
                EndTime: row.end_time,
                CallTransferId: row.xfercallid,
                Scenario: row.Category1,
                SubScenario1: row.Category2,
                SubScenario2: row.Category3,
                SubScenario3: row.Category4,
                SubScenario4: row.Category5,
                Source: row.Source === "Other_client"
                    ? (row.Source ?? row.campaign_id)
                    : row.Source,
                RecordingUrl: row.Recording
                    ? row.Recording
                    : `http://your-server.com/recordings/${row.uniqueid}.wav`,
            };
        });

        // 🔹 Create Excel
        const worksheet = XLSX.utils.json_to_sheet(formatted);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "CDR Report");

        const excelBuffer = XLSX.write(workbook, {
            bookType: "xlsx",
            type: "array",
        });

        const file = new Blob([excelBuffer], {
            type: "application/octet-stream",
        });

        // 🔹 File name
        let companyName = "Company";
        if (userType === "Client") {
            companyName = clientName || "Company";
        } else {
            const selected = clients.find(
                (c) => String(c.company_id) === String(selectedClient)
            );
            companyName = selected?.company_name || "Company";
        }

        const safeCompanyName = companyName.substring(0, 6);
        const from = startDate || "from";
        const to = endDate || "to";
        const fileName = `${safeCompanyName}_CDR_Report_${from}_to_${to}.xlsx`;

        saveAs(file, fileName);

    } catch (error) {
        console.error("Excel export failed", error);
        alert("Failed to generate Excel report");
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
      {/* CDR REPORT CARD */}
      <div className="card p-4 mb-4">
        <h5 className="mb-3">CDR REPORT</h5>
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
                <option value="All">All</option>
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
          selected={startDate ? new Date(startDate) : null}
          onChange={handleStartDateChange}
          placeholderText="Start Date"
          className="form-control"
          dateFormat="dd-MM-yyyy"
        />

        <DatePicker
          selected={endDate ? new Date(endDate) : null}
          onChange={handleEndDateChange}
          placeholderText="End Date"
          className="form-control"
          dateFormat="dd-MM-yyyy"
          disabled={selectedClient === "All"}
        />
          <button className="btn btn-primary" onClick={handleExport}>EXPORT</button>
          <button className="btn btn-primary" onClick={handleViewClick}>
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

      {/* VIEW CDR REPORT CARD */}
      {!loading && showTable && (
      <div className="card p-4">
        <h6 className="mb-3">VIEW CDR REPORT</h6>
        <div className="table-responsive" style={{ maxHeight: "500px", overflow: "auto" }}>
          <table className="table table-bordered table-sm">
            <thead className="table-light">
              <tr>
                <th>Agent</th>
                <th>Phone Number</th>
                <th>Call Source</th>
                <th>Call Date</th>
                <th>Queue Time</th>
                <th>Start Time - Queue</th>
                <th>Start Time</th>
                <th>End Time</th>
                <th>End time with Wrap Time</th>
                <th>Call Duration Sec</th>
                <th>Call Duration Time</th>
                <th>Wrap Time</th>
                <th>Hold Time</th>
                <th>Scenario</th>
                <th>Sub Scenario 1</th>
                <th>Sub Scenario 2</th>
                <th>Sub Scenario 3</th>
                <th>Sub Scenario 4</th>
                <th>Recording</th>
              </tr>
            </thead>
            <tbody>
              {sampleData.length > 0 ? (
                sampleData.map((row, idx) => (
                <tr key={idx}>
                  <td>{row.agent}</td>
                  <td>{row.phone}</td>
                  <td>{row.CallSource}</td>
                  <td>{row.callDate}</td>
                  <td>{row.queueTime}</td>
                  <td>{row.startTimeQueue}</td>
                  <td>{row.startTime}</td>
                  <td>{row.endTime}</td>
                  <td>{row.endTimeWrap}</td>
                  <td>{row.callDurationSec}</td>
                  <td>{row.callDurationTime}</td>
                  <td>{row.wrapTime}</td>
                  <td>{row.holdTime}</td>
                  <td>{row.Category1}</td>
                  <td>{row.Category2}</td>
                  <td>{row.Category3}</td>
                  <td>{row.Category4}</td>
                  <td>{row.Category5}</td>
                  {/* <td>
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
                  </td> */}
                  <td>
                    <button
                      onClick={() => {
                        const url = `https://crmapi.dialdesk.in/auth/recordings/dd-html?filename=${row.leadid}&agent=${row.agent}&dater=${row.callDate}`;

                        window.open(
                          url,
                          "_blank",
                          "width=800,height=600,scrollbars=yes,resizable=yes"
                        );
                      }}
                      style={{
                        border: "none",
                        background: "none",
                        cursor: "pointer",
                        fontSize: "16px"
                      }}
                      title="View Recording"
                    >
                      📥
                    </button>
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

export default CDRReport;
