import React, { useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

const CDRReport = () => {
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);

  const sampleData = [
    {
      agent: "IDC55739",
      phone: "7000227274",
      callDate: "2025-07-04",
      queueTime: "00:00:00.00",
      startTimeQueue: "2025-07-04 00:03:53.00",
      startTime: "2025-07-04 00:03:53",
      endTime: "2025-07-04 00:04:26",
      endTimeWrap: "2025-07-04 00:04:31.0000",
      callDurationSec: 32,
      callDurationTime: "00:00:32",
      wrapTime: "00:00:05.0000",
      holdTime: "-",
      scenario: "Enquiry",
      subScenario1: "Other",
      subScenario2: "",
      subScenario3: "",
      subScenario4: "",
      source: "",
      recording: "#",
    },
    {
      agent: "IDC59501",
      phone: "9324240613",
      callDate: "2025-07-04",
      queueTime: "00:00:00.00",
      startTimeQueue: "2025-07-04 00:08:21.00",
      startTime: "2025-07-04 00:08:21",
      endTime: "2025-07-04 00:09:31",
      endTimeWrap: "2025-07-04 00:09:36.0000",
      callDurationSec: 69,
      callDurationTime: "00:01:09",
      wrapTime: "00:00:05.0000",
      holdTime: "-",
      scenario: "Enquiry",
      subScenario1: "Outlet Related",
      subScenario2: "",
      subScenario3: "",
      subScenario4: "",
      source: "Other",
      recording: "#",
    },
    // Add additional rows as needed...
  ];

  return (
    <div className="row gy-4 gx-3">
      {/* CDR REPORT CARD */}
      <div className="card p-4 mb-4">
        <h5 className="mb-3">CDR REPORT</h5>
        <div className="d-flex flex-wrap align-items-center gap-2">
          <DatePicker
            selected={startDate}
            onChange={(date) => setStartDate(date)}
            placeholderText="Start Date"
            className="form-control"
          />
          <DatePicker
            selected={endDate}
            onChange={(date) => setEndDate(date)}
            placeholderText="End Date"
            className="form-control"
          />
          <button className="btn btn-primary">EXPORT</button>
          <button className="btn btn-primary">VIEW</button>
        </div>
      </div>

      {/* VIEW CDR REPORT CARD */}
      <div className="card p-4">
        <h6 className="mb-3">VIEW CDR REPORT</h6>
        <div className="table-responsive">
          <table className="table table-bordered table-sm">
            <thead className="table-light">
              <tr>
                <th>Agent</th>
                <th>Phone Number</th>
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
                <th>Source</th>
                <th>Recording</th>
              </tr>
            </thead>
            <tbody>
              {sampleData.map((row, idx) => (
                <tr key={idx}>
                  <td>{row.agent}</td>
                  <td>{row.phone}</td>
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
                  <td>{row.scenario}</td>
                  <td>{row.subScenario1}</td>
                  <td>{row.subScenario2}</td>
                  <td>{row.subScenario3}</td>
                  <td>{row.subScenario4}</td>
                  <td>{row.source}</td>
                  <td>
                    <a href={row.recording} className="text-primary">
                      Download Recording
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default CDRReport;
