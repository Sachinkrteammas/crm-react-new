import React, { useState } from "react";

const IngroupManager = () => {
  const [ingroupName, setIngroupName] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  const [ingroups, setIngroups] = useState([
    { id: 1, client: "DIALDESK", ingroupId: "", ingroupName: "Test_Inbound", createDate: "" },
    { id: 2, client: "DURIAN INDUSTRIES LTD", ingroupId: "", ingroupName: "durian", createDate: "" },
    { id: 3, client: "DURIAN INDUSTRIES LTD", ingroupId: "", ingroupName: "Durian_O", createDate: "" },
    { id: 4, client: "DURIAN INDUSTRIES LTD", ingroupId: "", ingroupName: "Durian_OB", createDate: "" },
    { id: 5, client: "Mas P2P", ingroupId: "", ingroupName: "p2p", createDate: "" },
    { id: 6, client: "TV Tele Shopping", ingroupId: "", ingroupName: "tvteleshop", createDate: "" },
    { id: 7, client: "HIMGIRI ENTERPRISES PVT LTD", ingroupId: "", ingroupName: "girish", createDate: "" },
    { id: 8, client: "Deal92", ingroupId: "", ingroupName: "deal92", createDate: "" },
    { id: 9, client: "Sharp Sight", ingroupId: "", ingroupName: "sharpsight", createDate: "" },
    { id: 10, client: "TAINO SHOPPING TRIBE PVT LTD", ingroupId: "", ingroupName: "catchin24", createDate: "" },
  ]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!ingroupName.trim()) return alert("Please enter Ingroup Name");

    const newIngroup = {
      id: Date.now(),
      client: "New Client",
      ingroupId: "",
      ingroupName,
      createDate: new Date().toISOString().replace("T", " ").split(".")[0],
    };
    setIngroups([...ingroups, newIngroup]);
    setIngroupName("");
  };

  const filteredData = ingroups.filter((row) =>
    row.ingroupName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const indexOfLast = currentPage * entriesPerPage;
  const indexOfFirst = indexOfLast - entriesPerPage;
  const currentData = filteredData.slice(indexOfFirst, indexOfLast);
  const totalPages = Math.ceil(filteredData.length / entriesPerPage);

  return (
    <div className="row">
      <div className="col-12">
        <h4 className="mb-4">Manage In Group</h4>

        {/* ADD INGROUP */}
        <div className="card mb-4">
          <div className="card-body">
            <h6 className="fw-semibold mb-3">Add Ingroup</h6>
            <form className="d-flex align-items-center" onSubmit={handleSubmit}>
              <input
                type="text"
                className="form-control me-3"
                placeholder="Ingroup Name *"
                value={ingroupName}
                onChange={(e) => setIngroupName(e.target.value)}
                style={{ width: "200px" }}
              />
              <button type="submit" className="btn btn-primary px-4">
                SUBMIT
              </button>
            </form>
          </div>
        </div>

        {/* VIEW INGROUPS */}
        <div className="card">
          <div className="card-body">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h6 className="fw-semibold mb-0">View Ingroups</h6>
              <div className="d-flex align-items-center">
                <select
                  className="form-select form-select-sm me-2"
                  style={{ width: "70px" }}
                  value={entriesPerPage}
                  onChange={(e) => {
                    setEntriesPerPage(parseInt(e.target.value));
                    setCurrentPage(1);
                  }}
                >
                  <option value="10">10</option>
                  <option value="25">25</option>
                  <option value="50">50</option>
                </select>
                <input
                  type="text"
                  className="form-control form-control-sm"
                  style={{ width: "200px" }}
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div className="table-responsive">
              <table className="table table-striped table-bordered">
                <thead className="table-light">
                  <tr>
                    <th style={{ width: "50px" }}>#</th>
                    <th>Client</th>
                    <th>Ingroup ID</th>
                    <th>Ingroup Name</th>
                    <th>Create Date</th>
                  </tr>
                </thead>
                <tbody>
                  {currentData.length > 0 ? (
                    currentData.map((row, idx) => (
                      <tr key={row.id}>
                        <td>{indexOfFirst + idx + 1}</td>
                        <td>{row.client}</td>
                        <td>{row.ingroupId}</td>
                        <td>{row.ingroupName}</td>
                        <td>{row.createDate}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="text-center">
                        No ingroups found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="d-flex justify-content-between align-items-center">
              <small>
                Showing {filteredData.length === 0 ? 0 : indexOfFirst + 1} to{" "}
                {Math.min(indexOfLast, filteredData.length)} of{" "}
                {filteredData.length} entries
              </small>
              <div>
                <button
                  className="btn btn-sm btn-light me-2"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                >
                  Previous
                </button>
                <button
                  className="btn btn-sm btn-light"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IngroupManager;
