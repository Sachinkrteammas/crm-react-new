// src/pages/ProcessUpdate.jsx
import React, { useState, useEffect } from "react";
import { Trash2 } from "lucide-react"; // icon for delete
import api from "../api";

const ManageProcessUpdate = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;


  const [processData, setProcessData] = useState([]);
  const [loading, setLoading] = useState(false);


  // Fetch API data
  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await api.get("/view_process_update");
      setProcessData(response.data);
    } catch (error) {
      console.error("Error fetching process updates:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);


  // Delete a process update
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this process update?")) return;

    try {
      await api.delete(`/delete_process_update?process_id=${id}`);
      // Remove deleted item from state
      setProcessData((prev) => prev.filter((row) => row.id !== id));
      alert(`Process update with ID ${id} deleted successfully!`);
    } catch (error) {
      console.error("Error deleting process update:", error);
      alert("Failed to delete process update.");
    }
  };

  const filteredData = processData.filter(
    (row) =>
      row.process_update.toLowerCase().includes(searchTerm.toLowerCase()) ||
      row.company_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const paginatedData = filteredData.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  const totalPages = Math.ceil(filteredData.length / rowsPerPage);

  return (
    <div className="row">
      <h4 className="mb-4">Process Update</h4>

      <div className="card">
        <div className="card-header d-flex justify-content-between align-items-center">
          <h6 className="mb-0">VIEW</h6>
          <div className="d-flex align-items-center">
            <select className="form-select form-select-sm me-2" style={{ width: "80px" }}>
              <option>10</option>
              <option>25</option>
              <option>50</option>
            </select>
            <input
              type="text"
              className="form-control form-control-sm"
              placeholder="Search..."
              style={{ width: "180px" }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-striped table-bordered mb-0">
              <thead className="table-light">
                <tr>
                  <th>ID</th>
                  <th>DATE/TIME</th>
                  <th>PROCESS UPDATE</th>
                  <th>CLIENT NAME</th>
                  <th>TYPE</th>
                  <th>VALID FROM</th>
                  <th>VALID TILL</th>
                  <th>UPDATE READ COUNT</th>
                  <th>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {paginatedData.length > 0 ? (
                  paginatedData.map((row) => (
                    <tr key={row.id}>
                      <td>{row.id}</td>
                      <td>
                        {new Date(row.date_time).toLocaleString("en-US", {
                          day: "2-digit",
                          month: "short",   // Jan, Feb, Mar
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: false
                        })}
                      </td>
                      <td>{row.process_update}</td>
                      <td>{row.company_name}</td>
                      <td>{row.type}</td>
                      <td>{row.valid_from}</td>
                      <td>{row.valid_till}</td>
                      <td>{row.Total}</td>
                      <td className="text-center">
                        <button 
                          className="btn btn-danger btn-sm d-flex align-items-center justify-content-center"
                          onClick={() => handleDelete(row.id)}
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="9" className="text-center text-muted py-4">
                      No entries found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="d-flex justify-content-between align-items-center p-3">
            <p className="mb-0">
              Showing {paginatedData.length} of {filteredData.length} entries
            </p>
            <nav>
              <ul className="pagination pagination-sm mb-0">
                <li className={`page-item ${currentPage === 1 ? "disabled" : ""}`}>
                  <button
                    className="page-link"
                    onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  >
                    Previous
                  </button>
                </li>
                <li className="page-item active">
                  <span className="page-link">{currentPage}</span>
                </li>
                <li className={`page-item ${currentPage === totalPages ? "disabled" : ""}`}>
                  <button
                    className="page-link"
                    onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                  >
                    Next
                  </button>
                </li>
              </ul>
            </nav>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManageProcessUpdate;
