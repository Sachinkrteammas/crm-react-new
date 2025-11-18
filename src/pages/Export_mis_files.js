import React, { useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

const ExportMisFiles = () => {
  const [client, setClient] = useState("");
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);

  const handleDownload = () => {
    alert("VIEW clicked — show EXPORT MIS FILES report table here.");
  };

  const handleExport = () => {
    alert("EXPORT clicked — export EXPORT MIS FILES report here.");
  };

  return (
    <div className="row">
      <div className="col-12">
        {/* Top Filter Card */}
        <div className="card p-4 mb-4">
          <h5 className="mb-3">DOWNLOAD MIS FILE</h5>

          <div className="d-flex flex-wrap align-items-center gap-3">

            {/* Select Client */}
            {/* <div style={{ maxWidth: "220px" }}>
              <select
                className="form-select"
                value={client}
                onChange={(e) => setClient(e.target.value)}
              >
                <option value="">Select Client</option>
                <option value="client1">Client 1</option>
                <option value="client2">Client 2</option>
              </select>
            </div> */}

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
              onClick={handleDownload}
            >
              DOWNLOAD
            </button>

          </div>
        </div>
      </div>
    </div>
  );
};

export default ExportMisFiles;
