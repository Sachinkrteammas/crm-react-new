import { useState } from "react";
import { Trash2 } from "lucide-react"; // icon for delete

const ManageCustomizedMIS = () => {
  const [form, setForm] = useState({
    sheetName: "",
    sheetIndex: 0,
    selectedHeaders: [],
    headerIndexes: {},
  });

  const [sheetDetails, setSheetDetails] = useState([
    { id: 1, name: "Escalation", order: 0, date: "2024-05-11 16:00:13" },
    { id: 2, name: "Request", order: 0, date: "2024-05-11 16:00:48" },
    { id: 3, name: "Complaint", order: 0, date: "2024-05-11 16:02:10" },
  ]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleCheckboxChange = (e) => {
    const { value, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      selectedHeaders: checked
        ? [...(prev.selectedHeaders || []), value]
        : prev.selectedHeaders.filter((item) => item !== value),
    }));
  };

  const handleHeaderIndexChange = (header, value) => {
    setForm((prev) => ({
      ...prev,
      headerIndexes: { ...prev.headerIndexes, [header]: value },
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Form Submitted:", form);
  };

  const handleDelete = (id) => {
    if (window.confirm("Are you sure you want to delete this sheet?")) {
      setSheetDetails(sheetDetails.filter((item) => item.id !== id));
    }
  };

  return (
    <div className="row">
      <div className="col-12">
        <h4 className="mb-4">Manage Customized MIS</h4>

        {/* === Manage Customized MIS Form === */}
        <div className="card mb-4">
          <div className="card-header fw-semibold">MANAGE CUSTOMIZED MIS</div>
          <div className="card-body">
            <form className="row g-3" onSubmit={handleSubmit}>
              {/* Sheet Name */}
              <div className="col-md-4">
                <label className="form-label">Select Sheet Name</label>
                <select
                  name="sheetName"
                  className="form-select"
                  value={form.sheetName}
                  onChange={handleChange}
                >
                  <option value="">Select Sheet Name</option>
                  <option value="Escalation">Escalation</option>
                  <option value="Request">Request</option>
                  <option value="Complaint">Complaint</option>
                </select>
              </div>

              {/* Sheet Index */}
              <div className="col-md-2">
                <label className="form-label">Sheet Index</label>
                <input
                  type="number"
                  name="sheetIndex"
                  className="form-control"
                  value={form.sheetIndex}
                  onChange={handleChange}
                />
              </div>

              {/* Header Selection */}
              <div className="col-12">
                <label className="form-label">Select Header</label>
                <div
                  style={{
                    border: "1px solid #ddd",
                    borderRadius: "6px",
                    padding: "10px",
                    maxHeight: "300px",
                    overflowY: "auto",
                    backgroundColor: "#fff",
                  }}
                >
                  {[
                    "SrNo",
                    "MSISDN",
                    "CallDate",
                    "Scenario1",
                    "Scenario2",
                    "Customer VOC",
                    "Deviations",
                    "Final Closure",
                    "Final Remarks",
                    "Campaign",
                    "Complaint Number",
                    "Close Action Type",
                    "CloseLoopCate1",
                    "CloseLoopCate2",
                    "CloseLoopingDate",
                    "FollowupDate",
                    "closelooping_remarks",
                    "CloseLoopStatus",
                  ].map((header, index) => (
                    <div
                      key={index}
                      className="d-flex align-items-center mb-2"
                    >
                      <input
                        type="checkbox"
                        name="selectedHeaders"
                        value={header}
                        checked={form.selectedHeaders?.includes(header)}
                        onChange={handleCheckboxChange}
                        className="form-check-input me-2"
                      />
                      <input
                        type="text"
                        value={form.headerIndexes?.[header] || "0"}
                        name={`index-${header}`}
                        onChange={(e) =>
                          handleHeaderIndexChange(header, e.target.value)
                        }
                        className="form-control me-2"
                        style={{ width: "60px" }}
                      />
                      <input
                        type="text"
                        value={header}
                        readOnly
                        className="form-control"
                        style={{ width: "220px" }}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Submit Button */}
              <div className="col-12 mt-3">
                <button type="submit" className="btn btn-primary">
                  SUBMIT
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* === View Customized Sheet Details === */}
        <div className="card">
          <div className="card-body">
            <h6 className="fw-semibold mb-3">VIEW CUSTOMIZED SHEET DETAILS</h6>

            {/* Table Header Controls */}
            <div className="d-flex justify-content-between align-items-center mb-3">
              <div>
                <select
                  className="form-select form-select-sm"
                  style={{ width: "70px" }}
                >
                  <option>10</option>
                  <option>25</option>
                  <option>50</option>
                </select>
              </div>
              <input
                type="text"
                className="form-control form-control-sm"
                placeholder="Search..."
                style={{ width: "200px" }}
              />
            </div>

            {/* Table */}
            <div className="table-responsive">
              <table className="table table-striped table-bordered">
                <thead className="table-light">
                  <tr>
                    <th>S.N</th>
                    <th>SHEET NAME</th>
                    <th>ORDER</th>
                    <th>CREATE DATE</th>
                    <th>ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {sheetDetails.length > 0 ? (
                    sheetDetails.map((sheet, idx) => (
                      <tr key={sheet.id}>
                        <td>{idx + 1}</td>
                        <td>{sheet.name}</td>
                        <td>{sheet.order}</td>
                        <td>{sheet.date}</td>
                        <td>
                          <button
                            className="btn btn-danger btn-sm d-flex align-items-center justify-content-center"
                            onClick={() => handleDelete(sheet.id)}
                          >
                            <Trash2 size={16} />
                           </button> 
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="text-center">
                        No entries found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Footer Pagination */}
            <div className="d-flex justify-content-between align-items-center">
              <small>
                Showing 1 to {sheetDetails.length} of {sheetDetails.length} entries
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

export default ManageCustomizedMIS;
