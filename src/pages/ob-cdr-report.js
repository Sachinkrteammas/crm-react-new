import React, { useState } from "react";
import DatePicker from "react-datepicker";
import Select from "react-select";
import "react-datepicker/dist/react-datepicker.css";

// Sample clients for dropdown
const clientOptions = [
  { value: "client1", label: "Tipping Mr. Pink Pvt. Ltd. (Burger)" },
  { value: "client2", label: "ABC Pvt. Ltd." },
];

// Sample OB data
const sampleOBData = [
  {
    agent: "VDAD",
    phone: "7041795988",
    callDate: "2025-07-05",
    startTime: "2025-07-05 10:17:00",
    endTime: "2025-07-05 10:17:30",
    callDuration: 30,
    wrapTime: 2,
    recording: "#",
    scenario: "Connected",
    subScenario1: "Need Call Back",
    subScenario2: "",
    subScenario3: "",
    subScenario4: "",
  },
  // Add more rows as needed
];

const OBCDRReport = () => {
  const [selectedClient, setSelectedClient] = useState(null);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);

  const handleExport = () => {
    // Handle export logic here
    console.log("Export clicked", selectedClient, startDate, endDate);
  };

  const handleView = () => {
    // Fetch & display filtered data here
    console.log("View clicked", selectedClient, startDate, endDate);
  };

  return (
    <div className="row gy-4 gx-3">
      {/* OB CDR REPORT CARD */}
      <div className="card p-4 mb-4">
        <h5 className="mb-3">OB CDR REPORT</h5>
        <div className="d-flex flex-wrap align-items-center gap-2">
          <div style={{ minWidth: "200px" }}>
            <Select
              options={clientOptions}
              placeholder="Select Client"
              value={selectedClient}
              onChange={setSelectedClient}
              isClearable
            />
          </div>
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
        </div>
      </div>

      {/* VIEW OB CDR REPORT TABLE */}
      <div className="card p-4">
        <h6 className="mb-3">VIEW OB CDR REPORT</h6>
        <div className="table-responsive">
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
              {sampleOBData.map((row, idx) => (
                <tr key={idx}>
                  <td>{row.agent}</td>
                  <td>{row.phone}</td>
                  <td>{row.callDate}</td>
                  <td>{row.startTime}</td>
                  <td>{row.endTime}</td>
                  <td>{row.callDuration}</td>
                  <td>{row.wrapTime}</td>
                  <td>
                    <a href={row.recording} className="text-primary">
                      <i className="ti ti-download"></i>
                    </a>
                  </td>
                  <td>{row.scenario}</td>
                  <td>{row.subScenario1}</td>
                  <td>{row.subScenario2}</td>
                  <td>{row.subScenario3}</td>
                  <td>{row.subScenario4}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default OBCDRReport;
