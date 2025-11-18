import React, { useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

const CallMIS = () => {
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);

  const handleView = () => {
    alert("VIEW clicked — fetch Call MIS data here.");
  };

  const handleExport = () => {
    alert("EXPORT clicked — export Call MIS data here.");
  };

  return (
    <div className="row">
      <div className="col-12">

        <div className="card p-4 mb-4">
          <h5 className="mb-3">CALL MIS</h5>

          <div className="d-flex flex-wrap align-items-center gap-3">

            {/* Start Date */}
            <div style={{ maxWidth: "220px" }}>
              <DatePicker
                selected={startDate}
                onChange={(date) => setStartDate(date)}
                placeholderText="Start Date"
                className="form-control"
                dateFormat="yyyy-MM-dd"
              />
            </div>

            {/* End Date */}
            <div style={{ maxWidth: "220px" }}>
              <DatePicker
                selected={endDate}
                onChange={(date) => setEndDate(date)}
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

      </div>
    </div>
  );
};

export default CallMIS;
