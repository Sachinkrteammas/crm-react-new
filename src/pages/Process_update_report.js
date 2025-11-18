// src/pages/ProcessUpdateReport.jsx
import React, { useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { format } from "date-fns";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import "../styles/loader.css"; // optional loader animation

const ProcessUpdateReport = () => {
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);

  // Static dummy data
  const mockData = [
    {
      id: 1,
      datetime: "29 Aug 2025 07:22:00",
      processUpdate: "Complete 10 digit Contact number has to be update",
      clientName: "Anest Iwata Motherson Private Limited",
      type: "Permanent",
      validFrom: "30 Aug 2025",
      validTill: "30 Apr 2026",
      updateReadCount: 0,
    },
    {
      id: 2,
      datetime: "29 Aug 2025 07:22:00",
      processUpdate: "Check incomplete email IDs in CRM list",
      clientName: "Anest Iwata Motherson Private Limited",
      type: "Temporary",
      validFrom: "01 Sep 2025",
      validTill: "30 Nov 2025",
      updateReadCount: 5,
    },
  ];

  const handleView = () => {
    if (!startDate || !endDate) {
      alert("Please select both start and end dates.");
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setData(mockData); // simulate fetched data
      setLoading(false);
    }, 1000);
  };

  const handleExport = () => {
    if (data.length === 0) {
      alert("No data available to export.");
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Process Update");
    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const file = new Blob([excelBuffer], { type: "application/octet-stream" });
    saveAs(file, "Process_Update_Report.xlsx");
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
        <div className="card p-4">
          <h5 className="mb-4 fw-semibold">Process Update Report</h5>

          {/* Date and Buttons Row */}
            <div className="d-flex flex-wrap align-items-center gap-3">
                        {/* Start Date */}
                        <div style={{ maxWidth: "220px" }}>
                          <DatePicker
                            selected={startDate}
                            onChange={setStartDate}
                            placeholderText="Start Date"
                            className="form-control"
                            dateFormat="yyyy-MM-dd"
                          />
                        </div>
            
                        {/* End Date */}
                        <div style={{ maxWidth: "220px" }}>
                          <DatePicker
                            selected={endDate}
                            onChange={setEndDate}
                            placeholderText="End Date"
                            className="form-control"
                            dateFormat="yyyy-MM-dd"
                          />
                        </div>
            
                        {/* Buttons */}
                        <button
                          className="btn btn-primary fw-semibold"
                          onClick={handleView}
                        >
                          VIEW
                        </button>
                        <button
                          className="btn btn-primary fw-semibold"
                          onClick={handleExport}
                        >
                          EXPORT
                        </button>
                      </div>
                    


          {/* Table */}
          {data.length > 0 && (
            <div className="table-responsive">
              <table className="table table-striped table-bordered align-middle">
                <thead className="table-light">
                  <tr>
                    <th>ID</th>
                    <th>Date/Time</th>
                    <th>Process Update</th>
                    <th>Client Name</th>
                    <th>Type</th>
                    <th>Valid From</th>
                    <th>Valid Till</th>
                    <th>Update Read Count</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((row) => (
                    <tr key={row.id}>
                      <td>{row.id}</td>
                      <td>{row.datetime}</td>
                      <td>{row.processUpdate}</td>
                      <td>{row.clientName}</td>
                      <td>{row.type}</td>
                      <td>{row.validFrom}</td>
                      <td>{row.validTill}</td>
                      <td>{row.updateReadCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {data.length === 0 && !loading && (
            <p className="text-muted text-center mt-4">
              No data to display. Please select dates and click View.
            </p>
          )}
        </div>
      </div>
    </>
  );
};

export default ProcessUpdateReport;
