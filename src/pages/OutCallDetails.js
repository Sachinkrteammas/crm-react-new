import React, { useState, useEffect } from "react";
import {
  getCampaignTypes,
  getCampaigns,
  getAllocations,
  getOutCallDetails
} from '../services/authService'

export default function OutCallDetails() {
  const [form, setForm] = useState({
        campaignType: "",
        campaign: "",
        allocation: "",
        scenario: "",
        subScenario1: "",
        subScenario2: "",
        subScenario3: "",
        msisdn: "",
        startDate: "",
        endDate: ""
    });

    const [types, setTypes] = useState([]);
    const [campaigns, setCampaigns] = useState([]);
    const [allocs, setAllocs] = useState([]);
    const [data, setData] = useState([]);
    const [showTable, setShowTable] = useState(false);

    const company_id = localStorage.getItem('company_id');

    useEffect(() => {
        if (company_id) {
            getCampaignTypes(company_id)
                .then(res => setTypes(res.data))
                .catch(err => console.error(err));
        }
    }, [company_id]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));

        if (name === "campaignType") {
            setCampaigns([]);
            setAllocs([]);
            if (value) {
                getCampaigns(company_id, value)
                    .then(res => setCampaigns(res.data))
                    .catch(err => console.error(err));
            }
        }
        if (name === "campaign") {
            setAllocs([]);
            if (value) {
                getAllocations(company_id, value)
                    .then(res => setAllocs(res.data))
                    .catch(err => console.error(err));
            }
        }
    };

    const handleView = (e) => {
        e.preventDefault();
        if (company_id) {
            getOutCallDetails(company_id, form)
                .then(res => setData(res.data))
                .catch(err => console.error(err));
        }
        setShowTable(true);
    };

    const handleExport = (e) => {
        e.preventDefault();
        alert('Export functionality to be implemented');
    };

  return (
    <div className="card p-4">
      <h5 className="mb-4">Out Call Details</h5>
      <form onSubmit={handleView}>
      <div className="row mb-3">
        <div className="col-md-3 mb-2">
          <select
              className="form-select"
              name="campaignType"
              value={form.campaignType}
              onChange={handleChange}
            >
              <option value="">Select Campaign Type</option>
              {Array.isArray(types) && types.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
        </div>
        <div className="col-md-3 mb-2">
          <select
              className="form-select"
              name="campaign"
              value={form.campaign}
              onChange={handleChange}
              disabled={!campaigns.length}
            >
              <option value="">Select Campaign</option>
              {campaigns.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
        </div>
        <div className="col-md-3 mb-2">
          <select
              className="form-select"
              name="allocation"
              value={form.allocation}
              onChange={handleChange}
              disabled={!allocs.length}
            >
              <option value="">Select Allocation</option>
              {allocs.map(a => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
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
          <button type="submit" className="btn btn-primary">
            View
          </button>
        </div>
      </div>
      </form>

      {showTable && (
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
            {Array.isArray(data) && data.map((row, idx) => (
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
      )}
    </div>
  );
}
