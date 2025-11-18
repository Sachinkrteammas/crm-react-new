import React, { useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

const AuditSheet = () => {
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);

  const handleView = () => {
    alert("View button clicked — show audit data here.");
  };

  const handleExport = () => {
    alert("Export button clicked — export audit sheet as Excel here.");
  };

  return (
    <div className="row">
      <div className="col-12">
        <div className="card p-4 mb-4">
          <h5 className="mb-3">AUDIT SHEET</h5>

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
        </div>

        {/* Static Table Placeholder */}
        {/* <div className="card">
          <div className="card-header fw-semibold">AUDIT DETAILS</div>
          <div className="card-body p-0">
            <table className="table mb-0">
              <thead className="table-light">
                <tr>
                  <th>#</th>
                  <th>Agent Name</th>
                  <th>Call ID</th>
                  <th>Audit Status</th>
                  <th>Score</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>1</td>
                  <td>John Doe</td>
                  <td>CALL-001</td>
                  <td>Passed</td>
                  <td>95%</td>
                  <td>2025-11-10</td>
                </tr>
                <tr>
                  <td>2</td>
                  <td>Jane Smith</td>
                  <td>CALL-002</td>
                  <td>Failed</td>
                  <td>70%</td>
                  <td>2025-11-11</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="card-footer text-muted small">
            Showing 1 to 2 of 2 entries
          </div>
        </div> */}
      </div>
    </div>
  );
};

export default AuditSheet;
