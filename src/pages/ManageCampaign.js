import React, { useState, useEffect } from "react";
import api from "../api";
import { Trash2, Download } from "lucide-react";
import { useNavigate } from "react-router-dom";

const ManageCampaign = () => {
  // User info
  const userType = localStorage.getItem("user_type");
  const companyId = localStorage.getItem("company_id");
  const navigate = useNavigate();

  // State
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState("");
  const [campaignTypes, setCampaignTypes] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [fields, setFields] = useState(["Contact No"]);
  const [form, setForm] = useState({
    campaignName: "",
    description: "",
    campaignTypeId: "",
    CampaignParentName: "",
  });

  // Search & Pagination
  const [search, setSearch] = useState("");
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // Active Client ID
  const activeClientId =
    userType === "Super-Admin" || userType === "Admin"
      ? selectedClient
      : companyId;

  // Filtered campaigns based on search
  const filteredCampaigns = campaigns.filter((c) =>
    Object.values(c).join(" ").toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.ceil(filteredCampaigns.length / rowsPerPage);
  const displayData = filteredCampaigns.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  // -------------------- FETCH CLIENTS --------------------
  useEffect(() => {
    if (!(userType === "Super-Admin" || userType === "Admin")) return;
    const fetchClients = async () => {
      try {
        const res = await api.get("/agents/clients-rights");
        const sorted = res.data.sort((a, b) =>
          a.company_name.localeCompare(b.company_name)
        );
        setClients(sorted);
        if (sorted.length > 0 && !selectedClient) {
          setSelectedClient(sorted[0].company_id);
        }
      } catch (err) {
        console.error("Error fetching clients:", err);
      }
    };
    fetchClients();
  }, [userType, selectedClient]);

  // -------------------- FETCH CAMPAIGN TYPES & LIST --------------------
  useEffect(() => {
    if (!activeClientId) return;

    const fetchCampaignTypes = async () => {
      try {
        const res = await api.get("/campaign/types", {
          params: { ClientId: activeClientId },
        });
        setCampaignTypes(res.data || []);
      } catch (err) {
        console.error("Failed to load campaign types:", err);
      }
    };

    const fetchCampaigns = async () => {
      try {
        const res = await api.get("/campaign/list", {
          params: { ClientId: activeClientId },
        });
        setCampaigns(res.data || []);
      } catch (err) {
        console.error("Failed to load campaigns:", err);
      }
    };

    fetchCampaignTypes();
    fetchCampaigns();
  }, [activeClientId]);

  // -------------------- HANDLE FIELDS --------------------
  const handleFieldChange = (index, value) => {
    // if (index === 0) return;
    const updated = [...fields];
    updated[index] = value;
    setFields(updated);
  };

  const addField = () => {
    if (fields.length >= 20) return alert("Maximum 20 fields allowed");
    setFields([...fields, ""]);
  };

  const removeField = (index) => {
    if (index === 0) return; // Cannot remove first field
    setFields(fields.filter((_, i) => i !== index));
  };

  // -------------------- HANDLE SUBMIT --------------------
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.campaignTypeId) return alert("Please select a campaign type");

    const payload = new FormData();
    payload.append("ClientId", activeClientId);
    payload.append("CampaignName", form.campaignName);
    payload.append("campaign_description", form.description);
    payload.append("CampaignTypeId", form.campaignTypeId);
    payload.append("CampaignParentName", form.CampaignParentName);
    fields.forEach((f) => f.trim() && payload.append("fields", f));

    try {
      await api.post("/campaign/create", payload);
      alert("✅ Campaign created successfully!");
      setForm({ campaignName: "", description: "", campaignTypeId: "", CampaignParentName: "" });
      setFields([""]);

      // Refresh campaigns
      const res = await api.get("/campaign/list", {
        params: { ClientId: activeClientId },
      });
      setCampaigns(res.data || []);
    } catch (err) {
      console.error(err);
      alert("❌ Failed to create campaign");
    }
  };

  // -------------------- HANDLE DELETE --------------------
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this campaign?"))
      return;

    try {
      const storedUserData = JSON.parse(localStorage.getItem("userData"));
      const updateUser = storedUserData?.auth_person;

      if (!updateUser) {
        alert("❌ User not found in localStorage (auth_person)");
        return;
      }

      await api.put("/campaign/update-status", {
        id: id,
        update_user: updateUser,
      });

      // Remove from UI after soft delete
      setCampaigns((prev) => prev.filter((c) => c.id !== id));

      alert("✅ Campaign deleted successfully");

    } catch (err) {
      console.error(err);
      alert("❌ Failed to delete campaign");
    }
  };

  // -------------------- DOWNLOAD CSV --------------------
  const handleDownload = (id) => {
    const campaign = campaigns.find((c) => c.id === id);
    if (!campaign) return;


    // Export all fields in one single row (horizontal)
    const csvContent =
      "data:text/csv;charset=utf-8," +
      campaign.Fields
        .map((field) => `"${field ?? ""}"`)
        .join(",");

    const link = document.createElement("a");
    link.href = encodeURI(csvContent);
    link.download = `Import_Format.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="mt-2">
      {/* Header & Client Selector */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h4 className="mb-0">Manage Campaigns</h4>
        {(userType === "Super-Admin" || userType === "Admin") &&
          clients.length > 0 && (
            <div className="d-flex align-items-center">
              <label className="form-label fw-semibold me-2 mb-0">
                Select Client:
              </label>
              <select
                className="form-select form-select-sm"
                style={{ width: "220px" }}
                value={selectedClient}
                onChange={(e) => setSelectedClient(e.target.value)}
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

      {/* Create Campaign */}
      <div className="card p-4 mb-4 shadow-sm">
        <h6 className="mb-3">Create Campaigns</h6>
        <form onSubmit={handleSubmit}>
          <div className="row">
            <div className="col-md-4 mb-3">
              <label className="form-label">Campaign Name</label>
              <input
                className="form-control"
                placeholder="Campaign Name"
                value={form.campaignName}
                onChange={(e) =>
                  setForm({ ...form, campaignName: e.target.value })
                }
                required
              />
            </div>

            <div className="col-md-4 mb-3">
              <label className="form-label">Campaign ID</label>
              <input
                className="form-control"
                placeholder="Campaign ID"
                value={form.campaignTypeId}
                onChange={(e) =>
                  setForm({ ...form, campaignTypeId: e.target.value })
                }
                required
              />
            </div>

            <div className="col-md-4 mb-3">
              <label className="form-label">Description</label>
              <input
                className="form-control"
                placeholder="Description"
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
              />
            </div>
            <div className="col-md-4 mb-3">
              <label className="form-label">Campaign Type</label>
              <select
                className="form-select"
                value={form.CampaignParentName}
                onChange={(e) =>
                  setForm({ ...form, CampaignParentName: e.target.value })
                }
                required
              >
                <option value="">Campaign Type</option>
                {campaignTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Dynamic Fields */}
            <div className="col-12 mt-3">
              <label className="form-label">Field Names</label>

              {fields.map((f, i) => (
                <div className="row mb-2 align-items-center" key={i}>
                  <div className="col-md-4">
                    <input
                      className="form-control"
                      placeholder={
                        i === 0 ? "Contact No" : `Field Name ${i + 1}`
                      }
                      value={f}
                      onChange={(e) => handleFieldChange(i, e.target.value)}
                      
                    />
                  </div>

                  <div className="col-auto">
                    {i === fields.length - 1 && (
                      <button
                        type="button"
                        className="btn btn-success me-2"
                        onClick={addField}
                      >
                        +
                      </button>
                    )}

                    <button
                      type="button"
                      className="btn btn-danger"
                      onClick={() => removeField(i)}
                      disabled={i === 0} // Disable remove for first field
                    >
                      -
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="col-12 mt-3">
              <button
                type="button"
                className="btn btn-outline-primary me-2"
                onClick={() => navigate(-1)}
              >
                ← Back
              </button>
              <button type="submit" className="btn btn-primary">
                Submit
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Campaigns Table */}
      <div className="card shadow-sm mt-10">
        {/* Header with Download */}
        {/* <div
          className="d-flex justify-content-between align-items-center px-3"
          style={{
            backgroundColor: "#e9ecef",
            paddingTop: "8px",
            paddingBottom: "8px",
            borderBottom: "1px solid #dee2e6",
            borderTopLeftRadius: "0.25rem",
            borderTopRightRadius: "0.25rem",
          }}
        >
          <h6 className="mb-0">View Campaigns</h6>
          <button className="btn btn-sm btn-success" onClick={handleDownload}>
            Download CSV
          </button>
        </div> */}

        {/* Search & Rows per page */}
        <div className="d-flex justify-content-between align-items-center p-2">
          <div>
            {" "}
            <select
              className="form-select form-select-sm d-inline-block"
              style={{ width: "70px" }}
              value={rowsPerPage}
              onChange={(e) => setRowsPerPage(Number(e.target.value))}
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>{" "}
            
          </div>
          <div>
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

        {/* Table */}
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-striped table-hover mb-0 text-center align-middle">
              <thead className="table-secondary">
                <tr>
                  <th>S.NO</th>
                  <th>Campaign Type</th>
                  <th>Campaign ID</th>
                  <th>Campaign Name</th>                  
                  <th>Campaign Desc</th>                  
                  <th>Fields</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {displayData.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="py-3">
                      No campaigns found
                    </td>
                  </tr>
                ) : (
                  displayData.map((c, i) => (
                    <tr key={c.id}>
                      <td>{(currentPage - 1) * rowsPerPage + i + 1}</td>
                      <td>{c.Type}</td>
                      <td>{c.campaign_id}</td>
                      <td>{c.CampaignName}</td>                      
                      <td>{c.Description}</td>                      
                      <td>{c.Fields?.join(", ")}</td>
                      <td>
                        <div style={{ display: "flex", gap: "5px", justifyContent: "center" }}>
                          <button
                            className="btn btn-sm btn-success d-flex align-items-center justify-content-center"
                            style={{ padding: "0.25rem 0.5rem" }}
                            onClick={() => handleDownload(c.id)}
                          >
                            <Download size={16} />
                          </button>
                          <button
                            className="btn btn-danger btn-sm d-flex align-items-center justify-content-center"
                            style={{ padding: "0.25rem 0.5rem" }}
                            onClick={() => handleDelete(c.id)}
                          >
                            <Trash2 size={16} />
                          </button>                                                  
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        <div className="d-flex justify-content-end align-items-center p-2">
          <nav>
            <ul className="pagination pagination-sm mb-0">
              <li className={`page-item ${currentPage === 1 && "disabled"}`}>
                <button
                  className="page-link"
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                >
                  Previous
                </button>
              </li>
              {Array.from({ length: totalPages }, (_, i) => (
                <li
                  className={`page-item ${currentPage === i + 1 && "active"}`}
                  key={i}
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
                  currentPage === totalPages && "disabled"
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
          </nav>
        </div>
      </div>
    </div>
  );
};

export default ManageCampaign;
