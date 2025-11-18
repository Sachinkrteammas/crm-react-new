import React, { useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

const TatMis = () => {
  const [client, setClient] = useState("");
  const [category, setCategory] = useState("");
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);

  const handleView = () => {
    alert("VIEW clicked — show TAT MIS report table here.");
  };

  const handleExport = () => {
    alert("EXPORT clicked — export TAT MIS report here.");
  };

  return (
    <div className="row">
      <div className="col-12">
        {/* Top Filter Card */}
        <div className="card p-4 mb-4">
          <h5 className="mb-3">TAT MIS</h5>

          <div className="d-flex flex-wrap align-items-center gap-3">

            {/* Select Client */}
            <div style={{ maxWidth: "220px" }}>
              <select
                className="form-select"
                value={client}
                onChange={(e) => setClient(e.target.value)}
              >
                <option value="">Select Client</option>
                <option value="client1">Client 1</option>
                <option value="client2">Client 2</option>
              </select>
            </div>

            {/* Select Category */}
            <div style={{ maxWidth: "220px" }}>
              <select
                className="form-select"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="">Select Category</option>
                <option value="cat1">Category 1</option>
                <option value="cat2">Category 2</option>
              </select>
            </div>

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
              onClick={handleExport}
            >
              EXPORT
            </button>

            <button
              className="btn btn-primary fw-semibold"
              onClick={handleView}
            >
              VIEW
            </button>

          </div>
        </div>
      </div>
    </div>
  );
};

export default TatMis;
