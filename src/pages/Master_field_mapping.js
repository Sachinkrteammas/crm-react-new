import React from "react";


const MasterFieldMapping = ({ clients = null, value = "", onChange = () => {} }) => {
  // fallback static clients if none passed
  const fallbackClients = [
    { company_id: "101", company_name: "Client A" },
    { company_id: "102", company_name: "Client B" },
    { company_id: "103", company_name: "Client C" },
  ];

  const list = Array.isArray(clients) && clients.length > 0 ? clients : fallbackClients;

  return (
    <div className="row">
      <div className="col-12">
        <h4 className="mb-4">Master Field Mapping</h4>

        <div className="card">
          <div className="card-body">
            <div className="row g-3 align-items-center">
              <div className="col-auto">
                <label htmlFor="clientSelect" className="form-label mb-0">
                  
                </label>
              </div>

              <div className="col-auto">
                <select
                  id="clientSelect"
                  className="form-select"
                  style={{ width: "260px" }}
                  value={value}
                  onChange={(e) => onChange(e.target.value)}
                >
                  <option value="">-- Select Client --</option>
                  {list.map((c) => (
                    <option key={c.company_id} value={String(c.company_id)}>
                      {c.company_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MasterFieldMapping;
