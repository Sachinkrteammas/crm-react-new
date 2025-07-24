// TaggingHistorySearchTabs.jsx
import React, { useEffect, useState } from 'react';
import '../styles/TaggingHistorySearchTabs.css';
import api from "../api";

export default function TaggingHistorySearchTabs() {
  const [fields, setFields] = useState([]);
  const [formData, setFormData] = useState({});

  const companyId = localStorage.getItem("company_id");

  useEffect(() => {
    async function fetchFields() {
      if (!companyId) {
        console.error("company_id not found in localStorage");
        return;
      }

      try {
        const { data } = await api.get(`call/fields/${companyId}`);
        setFields(data);

        const initialData = {};
        data.forEach((field) => {
          initialData[field.FieldName] = "";
        });
        setFormData(initialData);
      } catch (error) {
        console.error("Error fetching fields:", error);
      }
    }
    fetchFields();
  }, [companyId]);

  const handleChange = (fieldName, value) => {
    setFormData((prev) => ({
      ...prev,
      [fieldName]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      await api.post(`call/call_tag/${companyId}`, formData);
      alert("Data saved successfully!");
      // Optionally clear the form:
       setFormData(Object.fromEntries(Object.keys(formData).map(key => [key, ""])));
    } catch (error) {
      console.error("Error saving data:", error);
      alert("Error saving data");
    }
  };

  return (
    <div className="card mb-5 shadow-sm">
      {/* ——— Tabs Header ——— */}
      <div className="card-header bg-light border-0 pb-0">
        <ul className="nav nav-tabs custom-tabs" role="tablist">
          {['Tagging','History','Search'].map((t, i) => (
            <li className="nav-item" key={t}>
              <button
                className={`nav-link ${i===0?'active':''}`}
                data-bs-toggle="tab"
                data-bs-target={`#pane-${t.toLowerCase()}`}
                type="button"
                role="tab"
                aria-selected={i===0}
              >
                {t}
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* ——— Tabs Content ——— */}
      <div className="card-body pt-4">
        <div className="tab-content">

          {/* — Tagging — */}
          <div className="tab-pane fade show active" id="pane-tagging" role="tabpanel">
            <div className="card mb-4">
              <div className="card-header">
                <h6 className="mb-0">Tagging Form</h6>
              </div>
              <div className="card-body">
                <form onSubmit={handleSubmit}>
                  <div className="row g-2">
                    {fields.map((field) => {
                      const {
                        FieldName,
                        FieldType,
                        RequiredCheck,
                        options = [],
                      } = field;

                      const required = RequiredCheck === 1;

                      if (FieldType.toLowerCase() === "textbox") {
                        return (
                          <div key={FieldName} className="col-md-3 dynamic-form-group">
                            <label htmlFor={FieldName}>{FieldName}</label>
                            <input
                              id={FieldName}
                              type="text"
                              className="form-control"
                              placeholder=" "
                              value={formData[FieldName]}
                              onChange={(e) => handleChange(FieldName, e.target.value)}
                              required={required}
                            />

                          </div>
                        );
                      }

                      if (FieldType.toLowerCase() === "textarea") {
                        return (
                          <div key={FieldName} className="col-3 dynamic-form-group">
                            <label htmlFor={FieldName}>{FieldName}</label>
                            <textarea
                              id={FieldName}
                              className="form-control"
                              placeholder=" "
                              style={{ height: "100px" }}
                              value={formData[FieldName]}
                              onChange={(e) => handleChange(FieldName, e.target.value)}
                              required={required}
                            />

                          </div>
                        );
                      }

                      if (FieldType.toLowerCase() === "dropdown") {
                        return (
                          <div key={FieldName} className="col-md-3 dynamic-form-group">
                            <label htmlFor={FieldName}>{FieldName}</label>
                            <select
                              id={FieldName}
                              className="form-select"
                              value={formData[FieldName]}
                              onChange={(e) => handleChange(FieldName, e.target.value)}
                              required={required}
                            >
                              <option value="">Select {FieldName}</option>
                              {options.map((opt) => (
                                <option key={opt} value={opt}>{opt}</option>
                              ))}
                            </select>

                          </div>
                        );
                      }

                      if (["date", "date_time"].includes(FieldType.toLowerCase())) {
                        return (
                          <div key={FieldName} className="col-md-3 dynamic-form-group">
                            <label htmlFor={FieldName}>{FieldName}</label>
                            <input
                              id={FieldName}
                              type="date"
                              className="form-control"
                              placeholder=" "
                              value={formData[FieldName]}
                              onChange={(e) => handleChange(FieldName, e.target.value)}
                              required={required}
                            />

                          </div>
                        );
                      }

                      return (
                        <div key={FieldName} className="col-md-3 dynamic-form-group">
                          <label htmlFor={FieldName}>{FieldName}</label>
                          <input
                            id={FieldName}
                            type="text"
                            className="form-control"
                            placeholder=" "
                            value={formData[FieldName]}
                            onChange={(e) => handleChange(FieldName, e.target.value)}
                            required={required}
                          />

                        </div>
                      );
                    })}
                  </div>

                  <div className="text-end mt-4">
                    <button type="submit" className="btn btn-primary px-4">
                      Submit
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>

          {/* — History — */}
          <div className="tab-pane fade" id="pane-history" role="tabpanel">
            <div className="card">
              <div className="card-header">
                <h6 className="mb-0">History Log</h6>
              </div>
              <div className="card-body p-0">
                <div className="table-responsive">
                  <table className="table table-hover mb-0">
                    <thead className="table-light">
                      <tr>
                        {[
                          'In Call ID','Call From','Scenarios',
                          'Sub 1','Sub 2','Sub 3','Issue','Contact','Mobile',
                          'City','House','Street','Block','State'
                        ].map(h=> <th key={h}>{h}</th> )}
                      </tr>
                    </thead>
                    <tbody>
                      {/* TODO: render your real data here */}
                      <tr>
                        <td>271232</td><td>9810580244</td><td>Complaint</td>
                        <td>Electrical</td><td>Phase 1</td><td>—</td>
                        <td>Electricity</td><td>Surrender</td><td>9810580244</td>
                        <td>Gurgaon</td><td>G-16/32</td><td>Phase 1</td>
                        <td>Block-G</td><td>Haryana</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          {/* — Search — */}
          <div className="tab-pane fade" id="pane-search" role="tabpanel">
            <div className="card mb-4">
              <div className="card-header">
                <h6 className="mb-0">Advanced Search</h6>
              </div>
              <div className="card-body">
                <div className="row g-4 align-items-end">
                  {[
                    ['searchId','In Call ID','text'],
                    ['searchFrom','Call From','text'],
                    ['searchDate','Call Date','date'],
                  ].map(([id,label,type])=>(
                    <div key={id} className="col-md-3 dynamic-form-group">
                      <label htmlFor={id}>{label}</label>
                      <input id={id} type={type} className="form-control" placeholder=" " />

                    </div>
                  ))}
                  <div className="col-md-4 text-end">
                    <button className="btn btn-primary px-4">Search</button>
                  </div>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <h6 className="mb-0">Search Results</h6>
              </div>
              <div className="card-body p-0">
                <div className="table-responsive">
                  <table className="table table-hover mb-0">
                    <thead className="table-light">
                      <tr>
                        {[
                          'In Call ID','Call From','Date','Scenarios','Issue','Contact',
                          'Mobile','City','House','Street','Block'
                        ].map(h=> <th key={h}>{h}</th> )}
                      </tr>
                    </thead>
                    <tbody>
                      {/* TODO: map your results */}
                      <tr>
                        <td>271232</td><td>9810580244</td><td>2025‑07‑20</td>
                        <td>Complaint</td><td>Electricity</td><td>Surrender</td>
                        <td>9810580244</td><td>Gurgaon</td><td>G‑16/32</td>
                        <td>Phase 1</td><td>Block‑G</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
