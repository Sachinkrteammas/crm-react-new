
// ManageAllocations.js With Full Functionality..
import React, { useState, useEffect, useMemo } from "react";
import api from "../api";
import { useNavigate } from "react-router-dom";

const ManageAllocations = () => {
  // -------------------- User Info --------------------
  const userType = localStorage.getItem("user_type");
  const companyId = localStorage.getItem("company_id");
  const navigate = useNavigate();

  // -------------------- State --------------------
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState("");
  const [form, setForm] = useState({
    campaignId: "",
    type: "",
    allocationName: "",
    file: null,
  });

  const [campaigns, setCampaigns] = useState([]);
  const [types, setTypes] = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [search, setSearch] = useState("");
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  const activeClientId =
    userType === "Super-Admin" || userType === "Admin"
      ? selectedClient
      : companyId;

  // -------------------- Fetch Clients --------------------
  useEffect(() => {
    if (!(userType === "Super-Admin" || userType === "Admin")) return;

    const fetchClients = async () => {
      try {
        const res = await api.get("/agents/clients-rights");
        const sorted = res.data.sort((a, b) =>
          a.company_name.localeCompare(b.company_name)
        );
        setClients(sorted);
      } catch (err) {
        console.error("Failed to load clients:", err);
      }
    };

    fetchClients();
  }, [userType]);

  // -------------------- Fetch Campaigns, Types, Allocations --------------------
  useEffect(() => {
    if (!activeClientId) return;

    const fetchCampaigns = async () => {
      try {
        const res = await api.get("/campaign/list", {
          params: { ClientId: activeClientId },
        });
        setCampaigns(res.data || []);
      } catch (err) {
        console.error("Failed to fetch campaigns:", err);
      }
    };

    const fetchTypes = async () => {
      try {
        const res = await api.get("/allocations/types");
        setTypes(res.data.map((t) => t.name));
      } catch (err) {
        console.error("Failed to fetch allocation types:", err);
      }
    };

    const fetchAllocations = async () => {
      try {
        const res = await api.get("/allocations/list", {
          params: { ClientId: activeClientId },
        });
        setAllocations(res.data || []);
      } catch (err) {
        console.error("Failed to fetch allocations:", err);
      }
    };

    fetchCampaigns();
    fetchTypes();
    fetchAllocations();
  }, [activeClientId]);

  // -------------------- Handle Submit --------------------
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.campaignId || !form.type || !form.allocationName) {
      return alert("Please fill all required fields");
    }

    const payload = new FormData();
    payload.append("ClientId", activeClientId);
    payload.append("CampaignId", form.campaignId);
    payload.append("AllocationName", form.allocationName);
    payload.append("upload_type", form.type);
    if (form.file) payload.append("file", form.file);

    try {
      await api.post("/allocations/create", payload);
      alert("✅ Allocation created successfully!");
      setForm({ campaignId: "", type: "", allocationName: "", file: null });

      const res = await api.get("/allocations/list", {
        params: { ClientId: activeClientId },
      });
      setAllocations(res.data || []);
    } catch (err) {
      console.error(err);
      alert("❌ Failed to create allocation");
    }
  };

  // -------------------- Handle Delete --------------------
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this allocation?"))
      return;
    try {
      await api.delete(`/allocations/delete/${id}`);
      setAllocations(allocations.filter((a) => a.id !== id));
    } catch (err) {
      console.error(err);
      alert("❌ Failed to delete allocation");
    }
  };

  // -------------------- Filtered Allocations --------------------
  const filteredAllocations = useMemo(() => {
    return allocations.filter((a) => {
      const campaignName =
        campaigns.find((c) => c.id === a.CampaignId)?.CampaignName || "";
      const allocationName = a.AllocationName || "";
      const uploadType = a.upload_type || "";
      const dateStr = a.CreateDate
        ? new Date(a.CreateDate).toLocaleDateString("en-IN")
        : "";

      return (
        campaignName.toLowerCase().includes(search.toLowerCase()) ||
        allocationName.toLowerCase().includes(search.toLowerCase()) ||
        uploadType.toLowerCase().includes(search.toLowerCase()) ||
        dateStr.includes(search)
      );
    });
  }, [allocations, campaigns, search]);

  // -------------------- Pagination --------------------
  const totalPages = Math.ceil(filteredAllocations.length / rowsPerPage);
  const displayData = filteredAllocations.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  // -------------------- Render --------------------
  return (
    <div className="mt-2">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h4>Manage Allocations</h4>
        {(userType === "Super-Admin" || userType === "Admin") && (
          <div className="d-flex align-items-center">
            <label className="fw-semibold me-2 mb-0">Select Client:</label>
            <select
              className="form-select form-select-sm"
              style={{ width: "220px" }}
              value={selectedClient}
              onChange={(e) => {
                setSelectedClient(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="">-- Select Client --</option>
              {clients.map((c) => (
                <option key={c.company_id} value={c.company_id}>
                  {c.company_name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* -------------------- CREATE ALLOCATION -------------------- */}
      <div className="card p-4 mb-4 shadow-sm">
        <h6 className="mb-3">Manage Allocations</h6>
        <form onSubmit={handleSubmit}>
          <div className="row">
            <div className="col-md-3">
              <label className="form-label text-muted">Select Campaign</label>
              <select
                className="form-select mb-3"
                value={form.campaignId}
                onChange={(e) =>
                  setForm({ ...form, campaignId: e.target.value })
                }
                required
              >
                <option value="">Select Campaign</option>
                {campaigns.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.CampaignName}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-md-3">
              <label className="form-label text-muted">Select Type</label>
              <select
                className="form-select mb-3"
                value={form.type}
                onChange={(e) =>
                  setForm({ ...form, type: e.target.value })
                }
                required
              >
                <option value="">Select Type</option>
                {types.map((t, i) => (
                  <option key={i} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-md-3">
              <label className="form-label text-muted">Allocation Name</label>
              <input
                className="form-control mb-3"
                placeholder="Allocation Name"
                value={form.allocationName}
                onChange={(e) =>
                  setForm({ ...form, allocationName: e.target.value })
                }
                required
              />
            </div>

            <div className="col-md-3">
              <label className="form-label text-muted">Upload Data</label>
              <input
                type="file"
                className="form-control"
                accept=".csv"
                onChange={(e) =>
                  setForm({ ...form, file: e.target.files[0] })
                }
              />
              <small className="text-muted d-block">
                Note - (Upload only CSV file)
              </small>
            </div>

            <div className="col-12">
              <button
                type="button"
                className="btn btn-outline-primary rounded-3 me-2 mt-2"
                onClick={() => navigate(-1)}
              >
                ← Back
              </button>
              <button className="btn btn-primary mt-2" type="submit">
                Submit
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* -------------------- VIEW ALLOCATIONS -------------------- */}
      <div className="card shadow-sm">
        <div className="card-header d-flex justify-content-between align-items-center">
          <h6 className="mb-0">View Allocations</h6>
          <div className="d-flex align-items-center">
            <label className="me-2">Show</label>
            <select
              className="form-select form-select-sm me-2"
              style={{ width: "70px" }}
              value={rowsPerPage}
              onChange={(e) => setRowsPerPage(Number(e.target.value))}
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <label className="me-3">entries</label>

            <input
              type="text"
              className="form-control form-control-sm"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: "200px" }}
            />
          </div>
        </div>

        <div className="table-responsive">
          <table className="table table-bordered text-center align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th>S.N</th>
                <th>Campaign Name</th>
                <th>Allocation Name</th>
                <th>Allocation Type</th>
                <th>Create Date</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {displayData.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-3">
                    No data available
                  </td>
                </tr>
              ) : (
                displayData.map((a, i) => (
                  <tr key={a.id}>
                    <td>{(currentPage - 1) * rowsPerPage + i + 1}</td>
                    <td>
                      {campaigns.find((c) => c.id === a.CampaignId)
                        ?.CampaignName || "-"}
                    </td>
                    <td>{a.AllocationName}</td>
                    <td>{a.upload_type}</td>
                    <td>
                      {new Date(a.CreateDate).toLocaleDateString("en-IN")}
                    </td>
                    <td>
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => handleDelete(a.id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* -------------------- Pagination -------------------- */}
        <div className="d-flex justify-content-end align-items-center p-2">
          <ul className="pagination pagination-sm mb-0">
            <li className={`page-item ${currentPage === 1 ? "disabled" : ""}`}>
              <button
                className="page-link"
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              >
                Previous
              </button>
            </li>

            {Array.from({ length: totalPages }, (_, i) => (
              <li
                key={i}
                className={`page-item ${currentPage === i + 1 ? "active" : ""}`}
              >
                <button
                  className="page-link"
                  onClick={() => setCurrentPage(i + 1)}
                >
                  {i + 1}
                </button>
              </li>
            ))}

            <li
              className={`page-item ${
                currentPage === totalPages ? "disabled" : ""
              }`}
            >
              <button
                className="page-link"
                onClick={() =>
                  setCurrentPage((p) => Math.min(p + 1, totalPages))
                }
              >
                Next
              </button>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ManageAllocations;
