import React, { useState } from "react";

export default function OutCallSummaryReports() {
  const [formData, setFormData] = useState({
    client: "",
    to: "",
    cc: "",
    remarks: "",
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Form Submitted:", formData);
    alert("Form submitted successfully!");
  };

  return (
    <div className="mt-4">
      <div className="card shadow-sm">
        <div className="card-header fw-semibold">Call Summary Report Automation</div>
        <div className="card-body">
          <form onSubmit={handleSubmit}>
            <div className="row g-3">
              {/* Client */}
              <div className="col-md-4 col-sm-6">
                <label className="form-label fw-semibold">Client</label>
                <select
                  name="campaign"
                  value={formData.client}
                  onChange={handleChange}
                  className="form-select"
                  required
                >
                  <option value="">Select Client</option>
                  <option value="Campaign A">Client A</option>
                  <option value="Campaign B">Client B</option>
                  <option value="Campaign C">Client C</option>
                </select>
              </div>

              {/* To */}
              <div className="col-md-4 col-sm-6">
                <label className="form-label fw-semibold">To</label>
                <input
                  type="email"
                  name="to"
                  value={formData.to}
                  onChange={handleChange}
                  className="form-control"
                  placeholder="Enter recipient email"
                  required
                />
              </div>

              {/* CC */}
              <div className="col-md-4 col-sm-6">
                <label className="form-label fw-semibold">CC</label>
                <input
                  type="email"
                  name="cc"
                  value={formData.cc}
                  onChange={handleChange}
                  className="form-control"
                  placeholder="Enter CC email"
                />
              </div>

              {/* Remarks */}
              <div className="col-4">
                <label className="form-label fw-semibold">Remarks</label>
                <textarea
                  name="remarks"
                  value={formData.remarks}
                  onChange={handleChange}
                  className="form-control"
                  rows="4"
                  placeholder="Enter remarks..."
                ></textarea>
              </div>
            </div>

            {/* Buttons */}
            <div className="d-flex justify-content-center mt-4">
              <button
                type="submit"
                className="btn btn-primary px-4 py-2 me-2"
              >
                Submit
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
