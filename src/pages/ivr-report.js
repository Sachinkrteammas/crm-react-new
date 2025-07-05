import React, { useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

// Sample Data
const sampleIVRData = [
  {
    date: "05-Jul-25",
    callType: "inbound",
    from: "8347832639",
    startTime: "05-Jul-25 00:02:23",
    endTime: "05-Jul-25 00:03:07",
    duration: 44,
    outcome: "Transferred to Agent",
    optionsChosen: "1,Hindi,1,Customer,1,Bulk_Order"
  },
  {
    date: "05-Jul-25",
    callType: "inbound",
    from: "7935438264",
    startTime: "05-Jul-25 00:03:07",
    endTime: "05-Jul-25 00:03:29",
    duration: 22,
    outcome: "Call Disconnect by Customer",
    optionsChosen: ""
  },
  // Add additional mock rows as needed for testing
];

const IVRReport = () => {
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [ivrData, setIvrData] = useState(sampleIVRData);

  const handleView = () => {
    console.log("Fetching data for", startDate, endDate);
    // Add API fetch/filter logic here.
    setIvrData(sampleIVRData);
  };

  const handleExport = () => {
    console.log("Exporting data for", startDate, endDate);
    // Add CSV/Excel export logic here.
  };

  return (
    <div className="container mt-4">
      {/* IVR REPORT CARD */}
      <div className="card p-4 mb-4">
        <h5 className="mb-3">IVR REPORT</h5>
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
          <button className="btn btn-primary" onClick={handleView}>
            VIEW
          </button>
          <button className="btn btn-primary" onClick={handleExport}>
            EXPORT
          </button>
        </div>
      </div>

      {/* VIEW IVR LOG REPORT */}
      <div className="card p-4">
        <h6 className="mb-3">VIEW IVR LOG REPORT</h6>
        <div className="table-responsive">
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
              {ivrData.map((row, idx) => (
                <tr key={idx}>
                  <td>{row.date}</td>
                  <td>{row.callType}</td>
                  <td>{row.from}</td>
                  <td>{row.startTime}</td>
                  <td>{row.endTime}</td>
                  <td>{row.duration}</td>
                  <td>{row.outcome}</td>
                  <td>{row.optionsChosen}</td>
                </tr>
              ))}
              {ivrData.length === 0 && (
                <tr>
                  <td colSpan="8" className="text-center">
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

export default IVRReport;
