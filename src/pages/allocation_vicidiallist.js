import React, { useState, useEffect, useMemo } from "react";
import api from "../api";
import { useNavigate } from "react-router-dom";
import { Trash2, Eye } from "lucide-react";

const AllocationVicidialList = () => {
  const userType = localStorage.getItem("user_type");
  const companyId = localStorage.getItem("company_id");
  const navigate = useNavigate();

  // -------------------- State --------------------
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState("");
  const [campaigns, setCampaigns] = useState([]);
  const [listIds, setListIds] = useState([]);
  const [configs, setConfigs] = useState([]);

  const [form, setForm] = useState({
    campaignId: "",
    campaignName: "",
    listId: "",
  });

  // vicidial_list columns with labels
  const vicidialFieldMap = {
    phone_number: "Phone Number",
    title: "Title",
    first_name: "First Name",
    middle_initial: "Middle Initial",
    last_name: "Last Name",
    email: "Email",
    address1: "Address1",
    address2: "Address2",
    address3: "Address3",
    city: "City",
    state: "State",
    province: "Province",
    postal_code: "Postal Code",
    country_code: "Country Code",
    gender: "Gender",
    date_of_birth: "Date Of Birth",
    alt_phone: "Alt Phone",
    security_phrase: "Security Phrase",
    comments: "Comments",
  };

  const vicidialColumns = Object.keys(vicidialFieldMap);

  // selected vicidial columns (phone_number always first)
  const [selectedColumns, setSelectedColumns] = useState([]);

  // cache: saved selected columns per client+campaign → { "12_5": ["phone_number", "first_name"] }
  const [columnsCache, setColumnsCache] = useState({});

  // Search & Pagination
  const [search, setSearch] = useState("");
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [webhookInfo, setWebhookInfo] = useState(null);

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

  // -------------------- Fetch Campaigns --------------------
  useEffect(() => {
    if (!activeClientId) {
      setCampaigns([]);
      return;
    }

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

    fetchCampaigns();
  }, [activeClientId]);

  // -------------------- Fetch List IDs --------------------
  useEffect(() => {
    if (!activeClientId) {
      setListIds([]);
      return;
    }

    const fetchListIds = async () => {
      try {
        const res = await api.get("/list-master", {
          params: { client_id: activeClientId },
        });
        setListIds(res.data || []);
      } catch (err) {
        console.error("Failed to fetch list ids:", err);
      }
    };

    fetchListIds();
  }, [activeClientId]);

  // -------------------- Fetch Configs --------------------
  useEffect(() => {
    if (!activeClientId) {
      setConfigs([]);
      return;
    }

    const fetchConfigs = async () => {
      try {
        const res = await api.get("/ob-sync/configs", {
          params: { client_id: activeClientId },
        });
        setConfigs(res.data || []);
      } catch (err) {
        console.error("Failed to fetch configs:", err);
      }
    };

    fetchConfigs();
  }, [activeClientId]);

  // -------------------- Reset form + columns when client changes --------------------
  useEffect(() => {
    setColumnsCache({});
    setSelectedColumns([]);
    setForm({ campaignId: "", campaignName: "", listId: "" });
    setCurrentPage(1);
  }, [activeClientId]);

  // -------------------- Handle Campaign Change --------------------
  const handleCampaignChange = (e) => {
    const campaignId = e.target.value;
    const campaign = campaigns.find((c) => c.id === parseInt(campaignId));
    const cacheKey = `${activeClientId}_${campaignId}`;

    // Save current selections for the campaign we're leaving
    setColumnsCache((prev) => ({
      ...prev,
      [`${activeClientId}_${form.campaignId}`]: selectedColumns,
    }));

    // Existing saved config for this client + campaign (used to restore)
    const existingConfig = configs.find(
      (c) =>
        c.client_id === parseInt(activeClientId) &&
        c.campaign_id === parseInt(campaignId)
    );

    // Restore columns for the newly selected campaign
    let restoredColumns = null;
    const savedColumns = columnsCache[cacheKey];
    if (savedColumns && savedColumns.length) {
      restoredColumns = savedColumns;
    } else if (existingConfig && existingConfig.column_mapping) {
      const mappedCols = Object.values(existingConfig.column_mapping).filter(
        (v) => v
      );
      restoredColumns = mappedCols.includes("phone_number")
        ? ["phone_number", ...mappedCols.filter((v) => v !== "phone_number")]
        : mappedCols;
    }
    setSelectedColumns(restoredColumns || []);

    setForm((prev) => ({
      ...prev,
      campaignId: campaignId,
      campaignName: campaign?.CampaignName || "",
      // restore list_id if a config already exists for this campaign
      listId: existingConfig ? String(existingConfig.list_id || "") : "",
    }));
  };

  // -------------------- Handle Column Selection (Checkbox) --------------------
  const handleColumnToggle = (colKey) => {
    setSelectedColumns((prev) =>
      prev.includes(colKey)
        ? prev.filter((c) => c !== colKey)
        : [...prev, colKey]
    );
  };

  // -------------------- Handle Remove from Selected --------------------
  const handleRemoveColumn = (colKey) => {
    setSelectedColumns((prev) => prev.filter((c) => c !== colKey));
  };

  // -------------------- Build mapping on save: phone_number→Field1, rest auto --------------------
  const buildMapping = () => {
    const mapping = {};
    let fieldNum = 1;

    // phone_number always gets Field1
    if (selectedColumns.includes("phone_number")) {
      mapping["Field1"] = "phone_number";
      fieldNum = 2;
    }

    // remaining columns get Field2, Field3...
    selectedColumns.forEach((col) => {
      if (col === "phone_number") return;
      mapping[`Field${fieldNum}`] = col;
      fieldNum++;
    });

    return mapping;
  };

  // -------------------- Handle Save --------------------
  const handleSave = async () => {
    if (!activeClientId) {
      return alert("Please select a client");
    }
    if (!form.campaignId) {
      return alert("Please select a campaign");
    }
    if (!form.listId) {
      return alert("Please select a list ID");
    }

    // phone_number is required
    if (!selectedColumns.includes("phone_number")) {
      return alert("Please select Phone Number (required)");
    }

    const mapping = buildMapping();

    try {
      const res = await api.post("/ob-sync/save", {
        client_id: parseInt(activeClientId),
        campaign_id: parseInt(form.campaignId),
        campaign_name: form.campaignName,
        list_id: parseInt(form.listId),
        column_mapping: mapping,
      });

      if (res.data?.status === "success") {
        alert("✅ Sync config saved successfully!");
        // Refresh configs
        const configRes = await api.get("/ob-sync/configs", {
          params: { client_id: activeClientId },
        });
        setConfigs(configRes.data || []);
      }
    } catch (err) {
      console.error(err);
      alert(`❌ ${err.response?.data?.detail || "Failed to save config"}`);
    }
  };

  // -------------------- Handle Delete --------------------
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this config?"))
      return;

    try {
      await api.put(`/ob-sync/config/${id}`);
      setConfigs((prev) => prev.filter((c) => c.id !== id));
      alert("✅ Config deleted successfully");
    } catch (err) {
      console.error(err);
      alert("❌ Failed to delete config");
    }
  };

  // -------------------- Show Webhook --------------------
  const handleShowWebhook = async (configId) => {
    try {
      const res = await api.get(`/ob-sync/webhook-info/${configId}`);
      setWebhookInfo(res.data);
      setShowModal(true);
    } catch (err) {
      console.error(err);
      alert("❌ Failed to fetch webhook info");
    }
  };

  // -------------------- Filtered Configs --------------------
  const filteredConfigs = useMemo(() => {
    return configs.filter((c) => {
      const campaignName = c.campaign_name || "";
      const listId = String(c.list_id || "");
      const dateStr = c.created_at
        ? new Date(c.created_at).toLocaleDateString("en-IN")
        : "";

      return (
        campaignName.toLowerCase().includes(search.toLowerCase()) ||
        listId.includes(search) ||
        dateStr.includes(search)
      );
    });
  }, [configs, search]);

  // -------------------- Pagination --------------------
  const totalPages = Math.ceil(filteredConfigs.length / rowsPerPage);
  const displayData = filteredConfigs.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  const getPaginationNumbers = () => {
    const pages = [];
    const delta = 1;
    const left = Math.max(2, currentPage - delta);
    const right = Math.min(totalPages - 1, currentPage + delta);

    pages.push(1);
    if (left > 2) pages.push("...");
    for (let i = left; i <= right; i++) pages.push(i);
    if (right < totalPages - 1) pages.push("...");
    if (totalPages > 1) pages.push(totalPages);

    return pages;
  };

  // -------------------- Render --------------------
  return (
    <div className="mt-2">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h4>Allocation Vicidial List Sync</h4>
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

      {/* -------------------- CREATE CONFIG -------------------- */}
      <div className="card p-4 mb-4 shadow-sm">
        <h6 className="mb-3">Create Sync Config</h6>
        <div className="row">
          {/* Campaign */}
          <div className="col-md-3">
            <label className="form-label text-muted">Select Campaign</label>
            <select
              className="form-select mb-3"
              value={form.campaignId}
              onChange={handleCampaignChange}
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

          {/* List ID */}
          <div className="col-md-3">
            <label className="form-label text-muted">Select List ID</label>
            <select
              className="form-select mb-3"
              value={form.listId}
              onChange={(e) =>
                setForm({ ...form, listId: e.target.value })
              }
              required
            >
              <option value="">Select List ID</option>
              {listIds.map((item) => (
                <option key={item.id} value={item.list_id}>
                  {item.list_id}
                </option>
              ))}
            </select>
          </div>

          {/* Allocation Name (auto-generated at webhook hit) */}
          {/* <div className="col-md-3">
            <label className="form-label text-muted">Allocation Name</label>
            <input
              className="form-control mb-3"
              value={form.campaignName ? `${form.campaignName} - auto` : ""}
              readOnly
              style={{ backgroundColor: "#f8f9fa" }}
            />
            <small className="text-muted">
              Auto-generated on webhook hit (Campaign_DayMon)
            </small>
          </div> */}
        </div>

        {/* -------------------- COLUMN MAPPING -------------------- */}
        <div className="row g-3 mb-3">
          {/* LEFT - Field Selection (Checkboxes) */}
          <div className="col-md-6">
            <div className="card p-3 h-100">
              <h6 className="mb-3">Vicidial List Columns</h6>
              <div className="d-flex flex-column gap-2">
                {vicidialColumns.map((key) => (
                  <div className="form-check" key={key}>
                    <input
                      className="form-check-input"
                      type="checkbox"
                      checked={selectedColumns.includes(key)}
                      onChange={() => handleColumnToggle(key)}
                      id={`vcol_${key}`}
                    />
                    <label className="form-check-label" htmlFor={`vcol_${key}`}>
                      {vicidialFieldMap[key]}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT - Selected Columns with Auto Field Mapping */}
          <div className="col-md-6">
            <div className="card p-3">
              <h6 className="mb-3">Selected Columns</h6>
              {selectedColumns.length === 0 ? (
                <p className="text-muted">No columns selected</p>
              ) : (
                <ul className="list-group">
                  {selectedColumns.map((colKey) => {
                    const others = selectedColumns.filter(
                      (c) => c !== "phone_number"
                    );
                    const fieldNum =
                      colKey === "phone_number"
                        ? 1
                        : others.indexOf(colKey) + 2;
                    return (
                      <li
                        key={colKey}
                        className="list-group-item d-flex justify-content-between align-items-center"
                      >
                        <span style={{ fontWeight: 500 }}>
                          Field{fieldNum} → {vicidialFieldMap[colKey]}
                        </span>
                        <button
                          className="btn btn-sm btn-danger"
                          onClick={() => handleRemoveColumn(colKey)}
                        >
                          Remove
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div>
          <button
            type="button"
            className="btn btn-outline-primary rounded-3 me-2"
            onClick={() => navigate(-1)}
          >
            ← Back
          </button>
          <button className="btn btn-primary" onClick={handleSave}>
            Save Config
          </button>
        </div>
      </div>

      {/* -------------------- VIEW CONFIGS -------------------- */}
      <div className="card shadow-sm">
        <div className="card-header d-flex justify-content-between align-items-center">
          <h6 className="mb-0">Saved Sync Configs</h6>
          <div className="d-flex align-items-center">
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
                <th>List ID</th>
                <th>Token</th>
                <th>Created Date</th>
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
                displayData.map((c, i) => (
                  <tr key={c.id}>
                    <td>{(currentPage - 1) * rowsPerPage + i + 1}</td>
                    <td>{c.campaign_name || "-"}</td>
                    <td>{c.list_id}</td>
                    <td>
                      <code
                        style={{
                          fontSize: "11px",
                          maxWidth: "150px",
                          display: "inline-block",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                        title={c.token}
                      >
                        {c.token ? c.token.substring(0, 30) + "..." : "-"}
                      </code>
                    </td>
                    <td>
                      {c.created_at
                        ? new Date(c.created_at).toLocaleDateString("en-IN")
                        : "-"}
                    </td>
                    <td>
                      <div
                        style={{
                          display: "flex",
                          gap: "5px",
                          justifyContent: "center",
                        }}
                      >
                        <button
                          className="btn btn-sm btn-success d-flex align-items-center justify-content-center"
                          style={{ padding: "0.25rem 0.5rem" }}
                          onClick={() => handleShowWebhook(c.id)}
                          title="Show Webhook"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          className="btn btn-sm btn-danger d-flex align-items-center justify-content-center"
                          style={{ padding: "0.25rem 0.5rem" }}
                          onClick={() => handleDelete(c.id)}
                          title="Delete"
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

        {/* Pagination */}
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

            {getPaginationNumbers().map((page, index) => (
              <li
                key={index}
                className={`page-item ${currentPage === page ? "active" : ""} ${
                  page === "..." ? "disabled" : ""
                }`}
              >
                <button
                  className="page-link"
                  onClick={() => page !== "..." && setCurrentPage(page)}
                >
                  {page}
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

      {/* -------------------- WEBHOOK MODAL -------------------- */}
      {showModal && webhookInfo && (
        <div
          className="modal show fade d-block"
          style={{ background: "rgba(0,0,0,0.5)" }}
        >
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              {/* Header */}
              <div className="modal-header">
                <h5 className="modal-title">Webhook Details</h5>
                <button
                  className="btn-close"
                  onClick={() => setShowModal(false)}
                />
              </div>

              {/* Body */}
              <div className="modal-body">
                {/* Token */}
                <div className="mb-3">
                  <h6>Auth Token</h6>
                  <code className="text-primary" style={{ wordBreak: "break-all" }}>
                    {webhookInfo.token || "Token not generated yet"}
                  </code>
                </div>

                {/* API Endpoint */}
                <div className="mb-3">
                  <h6>API Endpoint</h6>
                  <code>{webhookInfo.endpoint}</code>
                </div>

                {/* Request Headers */}
                <div className="mb-3">
                  <h6>Request Headers</h6>
                  <pre className="bg-light p-2 rounded">
                    {JSON.stringify(webhookInfo.headers, null, 2)}
                  </pre>
                </div>

                {/* Request Body */}
                <div className="mb-3">
                  <h6>Request Data</h6>
                  <pre
                    className="p-3 rounded text-white"
                    style={{ background: "#111", overflowX: "auto" }}
                  >
                    {JSON.stringify(webhookInfo.request_body, null, 2)}
                  </pre>
                </div>

                {/* Response */}
                <div className="mb-3">
                  <h6>Sample Response</h6>
                  <pre className="bg-light p-2 rounded">
                    {JSON.stringify(webhookInfo.sample_response, null, 2)}
                  </pre>
                </div>
              </div>

              {/* Footer */}
              <div className="modal-footer">
                <button
                  className="btn btn-primary"
                  onClick={() => setShowModal(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AllocationVicidialList;
