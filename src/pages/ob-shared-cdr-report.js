import React, { useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

const OBSharedCDRReport = () => {
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [cdrData, setCdrData] = useState([]); // Replace with actual data fetching

  const handleView = () => {
    // Fetch data here based on date range
    console.log("Fetching data for", startDate, endDate);
  };

  const handleExport = () => {
    // Export functionality here
    console.log("Exporting data");
  };

  return (
    <div className="container mt-4">
      {/* OB Shared CDR Filter Section */}
      <div className="card p-4 mb-4">
        <h5 className="mb-3">OB SHARED CDR REPORT</h5>
        <div className="d-flex flex-wrap align-items-center gap-2">
          <DatePicker
            selected={startDate}
            onChange={(date) => setStartDate(date)}
            placeholderText="Start Date"
            className="form-control"
            dateFormat="yyyy-MM-dd"
          />
          <DatePicker
            selected={endDate}
            onChange={(date) => setEndDate(date)}
            placeholderText="End Date"
            className="form-control"
            dateFormat="yyyy-MM-dd"
          />
          <button className="btn btn-primary" onClick={handleExport}>
            EXPORT
          </button>
          <button className="btn btn-primary" onClick={handleView}>
            VIEW
          </button>
        </div>
      </div>

      {/* CDR Report Table */}
      <div className="card p-4">
        <h6 className="mb-3">VIEW OB SHARED CDR REPORT</h6>
        <div className="table-responsive">
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
                <th>Source</th>
                <th>Recording</th>
              </tr>
            </thead>
            <tbody>
              {cdrData.length > 0 ? (
                cdrData.map((row, idx) => (
                  <tr key={idx}>
                    <td>{row.callDate}</td>
                    <td>{row.callStartTime}</td>
                    <td>{row.callEndTime}</td>
                    <td>{row.customerNumber}</td>
                    <td>{row.agentId}</td>
                    <td>{row.agentName}</td>
                    <td>{row.callType}</td>
                    <td>{row.systemDisposition}</td>
                    <td>{row.dialingMode}</td>
                    <td>{row.clientName}</td>
                    <td>{row.leadId}</td>
                    <td>{row.acht}</td>
                    <td>{row.talkTime}</td>
                    <td>{row.waitTime}</td>
                    <td>{row.disposeTime}</td>
                    <td>{row.disconnectedBy}</td>
                    <td>{row.scenario}</td>
                    <td>{row.subScenario1}</td>
                    <td>{row.subScenario2}</td>
                    <td>{row.subScenario3}</td>
                    <td>{row.subScenario4}</td>
                    <td>{row.source}</td>
                    <td>
                      <a href={row.recordingUrl} download>
                        <i className="bi bi-download"></i>
                      </a>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="23" className="text-center">
                    No data available for selected date range.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default OBSharedCDRReport;
