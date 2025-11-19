import React, { useState } from "react";

export default function OutMasterFieldMapping() {
  const [formData, setFormData] = useState({
    client:"",
    campaign: "",
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
        <div className="card-header fw-semibold">Master Ob Field Mapping</div>
        <div className="card-body">
          <form onSubmit={handleSubmit}>
            <div className="row g-3">
              {/* Client */}
              <div className="col-md-4 col-sm-6">
                <label className="form-label fw-semibold">Client</label>
                <select
                  name="client"
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

            {/* Campaigns */}
             <div className="col-md-4 col-sm-6">
                <label className="form-label fw-semibold">Campaign</label>
                <select
                  name="campaign"
                  value={formData.campaign}
                  onChange={handleChange}
                  className="form-select"
                  required
                >
                  <option value="">Select Campaign</option>
                  <option value="Campaign A">Campaign A</option>
                  <option value="Campaign B">Campaign B</option>
                  <option value="Campaign C">Campaign C</option>
                </select>
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
