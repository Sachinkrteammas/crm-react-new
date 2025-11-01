import React, { useState } from "react";

const DialerMapping = () => {
  const [selectedClient, setSelectedClient] = useState("");
  const [extension1, setExtension1] = useState("");
  const [extension2, setExtension2] = useState("");
  const [mappings, setMappings] = useState([
    {
      id: 1,
      extension1: "1001",
      extension2: "2001",
      createdAt: "2018-01-12 16:38:36",
      updatedAt: "2018-01-12 18:38:36",
    },
    {
      id: 2,
      extension1: "1002",
      extension2: "2002",
      createdAt: "2025-10-08 16:38:36",
      updatedAt: "2025-10-10 18:38:36",
    },
  ]);  

  const handleClientChange = (e) => {
    setSelectedClient(e.target.value);

  };

  const handleUpdate = () => {
    // You can handle submission here
    alert(
      `Updating dialer mapping for client: ${selectedClient}\nExtension 1: ${extension1}\nExtension 2: ${extension2}`
    );

  const newMapping = {
      id: Date.now(),
      extension1,
      extension2,
      createdAt: new Date().toISOString().replace("T", " ").split(".")[0],
      updatedAt: new Date().toISOString().replace("T", " ").split(".")[0],
    };

    setMappings([...mappings, newMapping]);
    setExtension1("");
    setExtension2("");
 };


  const handleDelete = (id) => {
    if (window.confirm("Are you sure you want to delete this mapping?")) {
      setMappings(mappings.filter((mapping) => mapping.id !== id));
    }
  };

  return (
    <div className="row">
      <div className="col-12">
        <h4 className="mb-4">Dialer Mapping To Client</h4>

        {/* Select Client Dropdown */}
        <div style={{ marginBottom: "40px" }}>
          <div className="card-body">
            <div className="mb-3">
              {/* <label htmlFor="clientSelect" className="form-label">
                Select Client
              </label> */}
              <select
                id="clientSelect"
                className="form-select"
                value={selectedClient}
                onChange={handleClientChange}
                style={{ width: "200px" }}
              >
                <option value="">-- Select Client --</option>
                <option value="Client A">Client A</option>
                <option value="Client B">Client B</option>
                <option value="Client C">Client C</option>
              </select>
            </div>
          </div>
        </div>

        {/* Dialer Extensions Inputs */}
        <div className="card" style={{ marginBottom: "20px"}}>
          <div className="card-body">
            <h5 className="mb-6">Dialer Mapping</h5>
            <div className="mb-3">
              {/* <label htmlFor="extension1" className="form-label">
                Dialer Extension 1
              </label> */}
              <input
                type="text"
                id="extension1"
                className="form-control"
                value={extension1}
                onChange={(e) => setExtension1(e.target.value)}
                placeholder="Dialer Extension"
                style={{ width: "200px", marginLeft: "50px"}}
              />
            </div>
            <div className="mb-3">
              {/* <label htmlFor="extension2" className="form-label">
                Dialer Extension 2
              </label> */}
              <input
                type="text"
                id="extension2"
                className="form-control"
                value={extension2}
                onChange={(e) => setExtension2(e.target.value)}
                placeholder="Dialer Extension"
                style={{ width: "200px", marginLeft: "50px" }}
              />
            </div>

            <button className="btn btn-primary" onClick={handleUpdate} style={{marginLeft: "50px" }}>
              Update
            </button>
          </div>
        </div>
        </div>

        {/* Mapping Table */}
        <div className="card" style={{ marginBottom: "20px"}}>
          <div className="card-body">
            <h5 className="mb-3">View Client Ext Mapping</h5>
            <div className="table-responsive">
              <table className="table table-striped table-bordered">
                <thead className="table-light">
                  <tr>
                    <th>Dialer Extension</th>
                    <th>Dialer Extension</th>
                    <th>Create Date</th>
                    <th>Update Date</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {mappings.length > 0 ? (
                    mappings.map((mapping) => (
                      <tr key={mapping.id}>
                        <td>{mapping.extension1}</td>
                        <td>{mapping.extension2}</td>
                        <td>{mapping.createdAt}</td>
                        <td>{mapping.updatedAt}</td>
                        <td>
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => handleDelete(mapping.id)}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="text-center">
                        No mappings found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>   


        {/* History Table */}
        <div className="card" style={{ marginBottom: "20px"}}>
          <div className="card-body">
            <div className="d-flex justify-content-between align-items-center mb-3">
            <h5 className="mb-3">Client Dialer Extension History</h5>
            <div>
                <select className="form-select form-select-sm w-auto">
                  <option value="10">10</option>
                  <option value="25">25</option>
                  <option value="50">50</option>
                </select>
              </div>
            {/* Search Box */}
            <input
                type="text"
                className="form-control"
                placeholder="Search..."
                style={{ width: "200px" }}
                onChange={(e) => console.log(e.target.value)} // add your filter logic
            />
            </div>

            {/* <h5 className="mb-3">Client Dialer Extension History</h5> */}
            <div className="table-responsive">
              <table className="table table-striped table-bordered">
                <thead className="table-light">
                  <tr>
                    <th>Dialer Extension</th>
                    <th>Dialer Extension</th>
                    <th>Create Date</th>
                    <th>Update Date</th>
                  </tr>
                </thead>
                <tbody>
                  {mappings.length > 0 ? (
                    mappings.map((mapping) => (
                      <tr key={mapping.id}>
                        <td>{mapping.extension1}</td>
                        <td>{mapping.extension2}</td>
                        <td>{mapping.createdAt}</td>
                        <td>{mapping.updatedAt}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="text-center">
                        No mappings found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              <div className="d-flex justify-content-between align-items-center">
              <small>
                Showing {mappings.length === 0 ? 0 : 1} to{" "}
                {mappings.length} of {mappings.length} entries
              </small>
              <div>
                <button className="btn btn-sm btn-light me-2">Previous</button>
                <button className="btn btn-sm btn-light">Next</button>
              </div>
            </div>
            </div>
          </div>
        </div>       

      </div>
  );
};

export default DialerMapping;
