import React, { useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";


function CsatView() {
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
    const customColStyle = {
        flex: "0 0 auto",
        width: "19.666667%"
      };

  return (
    <div className="col-12">
  <div className="card">
    <h5 className="card-header">Csat View</h5>
    <div className="card-body">
      <div className="row g-2 align-items-end">
  <div style={customColStyle} className="col-md-3 col-sm-6">
    <label className="form-label" htmlFor="start-date">Start Date</label>
    <DatePicker
      selected={startDate}
      onChange={(date) => setStartDate(date)}
      dateFormat="yyyy-MM-dd"
      placeholderText="YYYY-MM-DD"
      className="form-control"
      id="start-date"
    />
  </div>

  <div style={customColStyle} className="col-md-3 col-sm-6">
    <label className="form-label" htmlFor="end-date">End Date</label>
    <DatePicker
      selected={endDate}
      onChange={(date) => setEndDate(date)}
      dateFormat="yyyy-MM-dd"
      placeholderText="YYYY-MM-DD"
      className="form-control"
      id="end-date"
    />
  </div>

  <div className="col-md-3 col-sm-6">
    <button type="submit" className="btn btn-primary w-75 px-4 py-2">View</button>
  </div>

  <div className="col-md-3 col-sm-6">
    <button type="submit" className="btn btn-primary w-75 px-4 py-2">Export</button>
  </div>
</div>

    </div>
  </div>
</div>


  );
}

export default CsatView;
