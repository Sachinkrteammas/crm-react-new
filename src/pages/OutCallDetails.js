import React, { useState } from "react";

export default function OutCallDetails() {
  const [form, setForm] = useState({
    campaignType: "",
    campaign: "",
    allocation: "",
    scenario: "",
    subScenario1: "",
    subScenario2: "",
    subScenario3: "",
    startDate: "",
    endDate: "",
    msisdn: "",
  });

  const [data, setData] = useState([]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleView = () => {
    // Example: Fetch from FastAPI
   console.log("View clicked");
  };

  const handleExport = () => {
    // Example: Export logic
    console.log("Export clicked");
  };

  return (
    <div className="card p-4">
      <h5 className="mb-4">Out Call Details</h5>

      <div className="row mb-3">
        <div className="col-md-3 mb-2">
          <input
            type="text"
            className="form-control"
            placeholder="Select Campaign Type"
            name="campaignType"
            value={form.campaignType}
            onChange={handleChange}
          />
        </div>
        <div className="col-md-3 mb-2">
          <input
            type="text"
            className="form-control"
            placeholder="Select Campaign"
            name="campaign"
            value={form.campaign}
            onChange={handleChange}
          />
        </div>
        <div className="col-md-3 mb-2">
          <select
            className="form-select"
            name="allocation"
            value={form.allocation}
            onChange={handleChange}
          >
            <option>Select Allocation</option>
            <option>Burger Sing OB</option>
            <option>12 Call Back Data</option>
          </select>
        </div>
        <div className="col-md-3 mb-2">
          <input
            type="text"
            className="form-control"
            placeholder="Select Scenario"
            name="scenario"
            value={form.scenario}
            onChange={handleChange}
          />
        </div>
      </div>

      <div className="row mb-3">
        <div className="col-md-3 mb-2">
          <input
            type="text"
            className="form-control"
            placeholder="Select Sub Scenario 1"
            name="subScenario1"
            value={form.subScenario1}
            onChange={handleChange}
          />
        </div>
        <div className="col-md-3 mb-2">
          <input
            type="text"
            className="form-control"
            placeholder="Select Sub Scenario 2"
            name="subScenario2"
            value={form.subScenario2}
            onChange={handleChange}
          />
        </div>
        <div className="col-md-3 mb-2">
          <input
            type="text"
            className="form-control"
            placeholder="Select Sub Scenario 3"
            name="subScenario3"
            value={form.subScenario3}
            onChange={handleChange}
          />
        </div>
        <div className="col-md-3 mb-2">
          <input
            type="text"
            className="form-control"
            placeholder="MSISDN"
            name="msisdn"
            value={form.msisdn}
            onChange={handleChange}
          />
        </div>
      </div>

      <div className="row mb-3">
        <div className="col-md-3 mb-2">
          <input
            type="date"
            className="form-control"
            name="startDate"
            value={form.startDate}
            onChange={handleChange}
          />
        </div>
        <div className="col-md-3 mb-2">
          <input
            type="date"
            className="form-control"
            name="endDate"
            value={form.endDate}
            onChange={handleChange}
          />
        </div>
        <div className="col-md-6 d-flex gap-2">
          <button className="btn btn-primary" onClick={handleExport}>
            Export
          </button>
          <button className="btn btn-primary" onClick={handleView}>
            View
          </button>
        </div>
      </div>

      <div className="table-responsive">
        <table className="table table-bordered">
          <thead>
            <tr>
              <th>View</th>
              <th>Recording</th>
              <th>Out Call ID</th>
              <th>Call From</th>
              <th>Scenarios</th>
              <th>Sub Scenarios 1</th>
              <th>Name</th>
              <th>Contact Number</th>
              {/* Add more columns as needed */}
            </tr>
          </thead>
          <tbody>
            {data.map((row, idx) => (
              <tr key={idx}>
                <td>
                  <button className="btn btn-sm btn-outline-primary">
                    🔍
                  </button>
                </td>
                <td>
                  <button className="btn btn-sm btn-outline-secondary">
                    ⏬
                  </button>
                </td>
                <td>{row.id}</td>
                <td>{row.callFrom}</td>
                <td>{row.scenario}</td>
                <td>{row.subScenario1}</td>
                <td>{row.name}</td>
                <td>{row.contactNumber}</td>
                {/* Add more cells as needed */}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
