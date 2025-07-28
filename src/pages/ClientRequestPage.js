import { useState } from "react";

const ClientRequestPage = () => {
  const [search, setSearch] = useState("");

  const clientRequests = [
    {
      srn: 201,
      companyName: "DLF Estate Developers Limited",
      clientName: "Mr. Vikas Yadav",
      requestType: "Change Email Id",
      requestStatus: "NOT PENDING",
      requestData: "cc-dedl@dlf.in",
      requestDate: "2017-10-24 00:43:09",
      responseDate: "2020-09-26 03:52:57",
    },
    {
      srn: 241,
      companyName: "Rx Infotech P Limited",
      clientName: "Kamal Kishore",
      requestType: "Change Email Id",
      requestStatus: "NOT PENDING",
      requestData: "customercare@lapcare.com",
      requestDate: "2017-10-13 23:33:31",
      responseDate: "2017-10-13 23:36:05",
    },
    {
      srn: 283,
      companyName: "Summerking India",
      clientName: "Vikas Goel",
      requestType: "Change Email Id",
      requestStatus: "NOT PENDING",
      requestData: "ameetkr@gmail.com",
      requestDate: "2017-11-30 23:52:10",
      responseDate: "2017-11-30 23:53:21",
    },
    {
      srn: 284,
      companyName: "Summerking India",
      clientName: "Vikas Goel",
      requestType: "Change Email Id",
      requestStatus: "NOT PENDING",
      requestData: "ameetkr@gmail.com",
      requestDate: "2017-12-02 02:31:14",
      responseDate: "2017-12-22 02:34:03",
    },
    {
      srn: 285,
      companyName: "Summerking India",
      clientName: "Vikas Goel",
      requestType: "Change Email Id",
      requestStatus: "NOT PENDING",
      requestData: "service.summerking@gmail.com",
      requestDate: "2018-06-29 02:16:36",
      responseDate: "2018-06-29 02:18:07",
    },
  ];

  const filtered = clientRequests.filter((item) =>
    Object.values(item).some((val) =>
      val.toString().toLowerCase().includes(search.toLowerCase())
    )
  );

  return (
    <div className="row">
      <div className="col-12">
        <h4 className="mb-3">View Client Request</h4>

        <div className="card p-3">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h6 className="m-0">CLIENT REQUEST</h6>
            <div className="d-flex align-items-center gap-2">
              <select className="form-select form-select-sm w-auto">
                <option>10</option>
                <option>25</option>
                <option>50</option>
              </select>
              <input
                type="search"
                className="form-control form-control-sm w-auto"
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="table-responsive">
            <table className="table table-bordered table-hover">
              <thead className="table-light">
                <tr>
                  <th>SRN.</th>
                  <th>COMPANY NAME</th>
                  <th>CLIENT NAME</th>
                  <th>REQUEST TYPE</th>
                  <th>REQUEST STATUS</th>
                  <th>REQUEST DATA</th>
                  <th>REQUEST DATE</th>
                  <th>RESPONSE DATE</th>
                  <th>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length > 0 ? (
                  filtered.map((req) => (
                    <tr key={req.srn + req.requestData}>
                      <td>{req.srn}</td>
                      <td>{req.companyName}</td>
                      <td>{req.clientName}</td>
                      <td>{req.requestType}</td>
                      <td className="text-success">{req.requestStatus}</td>
                      <td>{req.requestData}</td>
                      <td>{req.requestDate}</td>
                      <td>{req.responseDate}</td>
                      <td>
                        <button className="btn btn-sm btn-light">
                          ✏️
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="9" className="text-center text-muted">
                      No matching records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="d-flex justify-content-between align-items-center mt-3">
            <div>Showing 1 to {filtered.length} of {clientRequests.length} entries</div>
            <nav>
              <ul className="pagination pagination-sm mb-0">
                <li className="page-item disabled">
                  <button className="page-link">Previous</button>
                </li>
                {[1, 2, 3, 4, 5].map((num) => (
                  <li key={num} className={`page-item ${num === 1 ? "active" : ""}`}>
                    <button className="page-link">{num}</button>
                  </li>
                ))}
                <li className="page-item">
                  <button className="page-link">Next</button>
                </li>
              </ul>
            </nav>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientRequestPage;
