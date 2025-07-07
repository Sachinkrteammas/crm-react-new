import React, { useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";


function CallDetails() {
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
    const customColStyle = {
        flex: "0 0 auto",
        width: "19.666667%"
      };

  return (
    <div class="col-12">
  <div class="card">
    <h5 class="card-header">In Call Details</h5>
    <div class="card-body">
      <div class="row g-3">

       <div style={customColStyle} className="col-md-6 col-sm-12">
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

      <div style={customColStyle} className="col-md-6 col-sm-12">
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


        <div  style={customColStyle} class=" col-md-6 col-sm-12">
          <label class="form-label" for="in-call-action">In Call Action</label>
          <select id="in-call-action" class="form-select">
            <option value="In Call Action">In Call Action</option>
            <option value="Pending">Pending</option>
          </select>
        </div>


        <div  style={customColStyle} class=" col-md-6 col-sm-12">
          <label class="form-label" for="first-id">First In Call Id</label>
          <input type="text" id="first-id" class="form-control prefix-mask" />
        </div>


        <div style={customColStyle} class=" col-md-6 col-sm-12">
          <label class="form-label" for="last-id">Last In Call Id</label>
          <input type="text" id="last-id" class="form-control prefix-mask" />
        </div>


        <div  style={customColStyle} class=" col-md-6 col-sm-12">
          <label class="form-label" for="scenario-main">Select Scenario</label>
          <select id="scenario-main" class="form-select">
            <option value="">Select Scenario</option>
            <option value="All">All</option>
            <option value="Bulk Order">Bulk Order</option>
            <option value="Complaint/Feedback">Complaint/Feedback</option>
            <option value="Enquiry">Enquiry</option>
            <option value="Other">Other</option>
            <option value="Request">Request</option>
          </select>
        </div>


        <div  style={customColStyle} class=" col-md-6 col-sm-12" >
          <label class="form-label">Select Scenario</label>
          <select class="form-select">
            <option value="">Select Scenario Complaint/Feedback</option>
          </select>
        </div>

        <div style={customColStyle} class=" col-md-6 col-sm-12">
          <label class="form-label">Select Scenario</label>
          <select class="form-select">
            <option value="">Select Scenario Complaint/Feedback</option>
          </select>
        </div>

        <div style={customColStyle} class=" col-md-6 col-sm-12">
          <label class="form-label">Select Scenario</label>
          <select class="form-select">
            <option value="">Select Scenario Complaint/Feedback</option>
          </select>
        </div>

        <div style={customColStyle} class=" col-md-6 col-sm-12">
          <label class="form-label">Select Scenario</label>
          <select class="form-select">
            <option value="">Select Scenario Complaint/Feedback</option>
          </select>
        </div>


        <div class="col-12">
          <div class="d-flex justify-content-center mt-3">
            <button type="submit" class="btn btn-primary me-2 px-4 py-2">Export</button>
            <button type="submit" class="btn btn-primary me-2 px-4 py-2">View</button>
            <button type="submit" class="btn btn-primary px-4 py-2">Closeloop</button>
          </div>
        </div>

      </div>
    </div>
  </div>
</div>

  );
}

export default CallDetails;
