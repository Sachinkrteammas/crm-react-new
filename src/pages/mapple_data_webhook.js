import React, { useState, useEffect } from "react";
import api from "../api";
import { useNavigate } from "react-router-dom";
import { Trash2, Plus, Eye, RefreshCw } from "lucide-react";

const MappleDataWebhook = () => {
  const userType = localStorage.getItem("user_type");
  const companyId = localStorage.getItem("company_id");
  const navigate = useNavigate();
  const isAdmin = userType === "Super-Admin" || userType === "Admin";

  // -------------------- State --------------------
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState("");
  const [campaigns, setCampaigns] = useState([]);
  const [listIds, setListIds] = useState([]);
  const [webhooks, setWebhooks] = useState([]);
  const [campaignId, setCampaignId] = useState("");
  const [listId, setListId] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [webhookInfo, setWebhookInfo] = useState(null);

  const activeClientId = isAdmin ? selectedClient : companyId;

  // -------------------- Fetch Clients --------------------
  useEffect(() => {
    if (!isAdmin) return;

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
  }, [isAdmin]);

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
    if (!activeClientId || !campaignId) {
      setListIds([]);
      return;
    }

    const fetchListIds = async () => {
      try {
        const res = await api.get("/ob-sync/campaign-list-ids", {
          params: { client_id: activeClientId, campaign_id: campaignId },
        });
        setListIds(res.data || []);
      } catch (err) {
        console.error("Failed to fetch list ids:", err);
      }
    };

    fetchListIds();
  }, [activeClientId, campaignId]);

  // -------------------- Fetch Webhooks --------------------
  const fetchWebhooks = async () => {
    if (!activeClientId) {
      setWebhooks([]);
      return;
    }

    try {
      const res = await api.get("/mapple/webhooks", {
        params: { client_id: activeClientId },
      });
      setWebhooks(res.data || []);
    } catch (err) {
      console.error("Failed to fetch webhooks:", err);
    }
  };

  useEffect(() => {
    fetchWebhooks();
  }, [activeClientId]);

  // -------------------- Reset on client change --------------------
  useEffect(() => {
    setCampaignId("");
    setListId("");
  }, [activeClientId]);

  // -------------------- Create Webhook --------------------
  const handleCreate = async () => {
    if (!activeClientId) return alert("Please select a client");
    if (!campaignId) return alert("Please select a campaign");
    if (!listId) return alert("Please select a list ID");

    try {
      const res = await api.post("/mapple/webhook", null, {
        params: {
          client_id: activeClientId,
          campaign_id: campaignId,
          list_id: listId,
        },
      });

      if (res.data?.status === "success") {
        const details = await api.get(`/mapple/webhook/${res.data.id}`);
        setWebhookInfo(details.data);
        setShowModal(true);
        fetchWebhooks();
      }
    } catch (err) {
      console.error(err);
      alert(`❌ ${err.response?.data?.detail || "Failed to create webhook"}`);
    }
  };

  // -------------------- View Webhook --------------------
  const handleView = async (configId) => {
    try {
      const res = await api.get(`/mapple/webhook/${configId}`);
      setWebhookInfo(res.data);
      setShowModal(true);
    } catch (err) {
      console.error(err);
      alert("❌ Failed to fetch webhook details");
    }
  };

  // -------------------- Delete Webhook --------------------
  const handleDelete = async (configId) => {
    if (!window.confirm("Are you sure you want to delete this webhook?")) return;

    try {
      await api.delete(`/mapple/webhook/${configId}`);
      setWebhooks((prev) => prev.filter((w) => w.id !== configId));
      alert("✅ Webhook deleted successfully");
    } catch (err) {
      console.error(err);
      alert("❌ Failed to delete webhook");
    }
  };

  // -------------------- Render --------------------
  return (
    <div className="mt-2">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h4>Mapple Data Webhook</h4>
        {isAdmin && (
          <div className="d-flex align-items-center">
            <label className="fw-semibold me-2 mb-0">Select Client:</label>
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

      {/* -------------------- CREATE WEBHOOK -------------------- */}
      <div className="card p-4 mb-4 shadow-sm">
        <h6 className="mb-3">Create Webhook</h6>
        <div className="row">
          <div className="col-md-4">
            <label className="form-label text-muted">Select Campaign</label>
            <select
              className="form-select mb-3"
              value={campaignId}
              onChange={(e) => {
                setCampaignId(e.target.value);
                setListId("");
              }}
            >
              <option value="">Select Campaign</option>
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.CampaignName}
                </option>
              ))}
            </select>
          </div>

          <div className="col-md-4">
            <label className="form-label text-muted">Select List ID</label>
            <select
              className="form-select mb-3"
              value={listId}
              onChange={(e) => setListId(e.target.value)}
            >
              <option value="">Select List ID</option>
              {listIds.map((item) => (
                <option key={item.id} value={item.list_id}>
                  {item.list_id}
                </option>
              ))}
            </select>
          </div>

          <div className="col-md-4 d-flex align-items-end">
            <button
              className="btn btn-primary mb-3"
              onClick={handleCreate}
              disabled={!campaignId || !listId}
            >
              <Plus size={16} className="me-1" />
              Create Webhook
            </button>
          </div>
        </div>
      </div>

      {/* -------------------- SAVED WEBHOOKS -------------------- */}
      <div className="card shadow-sm">
        <div className="card-header d-flex justify-content-between align-items-center">
          <h6 className="mb-0">Saved Webhooks</h6>
          <button
            className="btn btn-sm btn-outline-secondary"
            onClick={fetchWebhooks}
            title="Refresh"
          >
            <RefreshCw size={14} />
          </button>
        </div>

        <div className="table-responsive">
          <table className="table table-bordered text-center align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th>S.N</th>
                <th>Campaign Name</th>
                <th>Campaign ID</th>
                <th>List ID</th>
                <th>Token</th>
                <th>Created</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {webhooks.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-3">
                    No data available
                  </td>
                </tr>
              ) : (
                webhooks.map((w, i) => (
                  <tr key={w.id}>
                    <td>{i + 1}</td>
                    <td>{w.campaign_name || "-"}</td>
                    <td>{w.campaign_id}</td>
                    <td>{w.list_id}</td>
                    <td>
                      <code
                        style={{
                          fontSize: "11px",
                          maxWidth: "220px",
                          display: "inline-block",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                        title={w.token}
                      >
                        {w.token ? w.token.substring(0, 40) + "..." : "-"}
                      </code>
                    </td>
                    <td>
                      {w.created_at
                        ? new Date(w.created_at).toLocaleDateString("en-IN")
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
                          onClick={() => handleView(w.id)}
                          title="View Webhook"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          className="btn btn-sm btn-danger d-flex align-items-center justify-content-center"
                          style={{ padding: "0.25rem 0.5rem" }}
                          onClick={() => handleDelete(w.id)}
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
      </div>

      <button
        type="button"
        className="btn btn-outline-primary rounded-3 mt-3"
        onClick={() => navigate(-1)}
      >
        ← Back
      </button>

      {/* -------------------- WEBHOOK MODAL -------------------- */}
      {showModal && webhookInfo && (
        <div
          className="modal show fade d-block"
          style={{ background: "rgba(0,0,0,0.5)" }}
        >
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Webhook Details</h5>
                <button className="btn-close" onClick={() => setShowModal(false)} />
              </div>

              <div className="modal-body">
                <div className="row mb-3">
                  <div className="col-md-6">
                    <h6>Campaign</h6>
                    <div>{webhookInfo.campaign_name || "-"}</div>
                  </div>
                  <div className="col-md-3">
                    <h6>Campaign ID</h6>
                    <div>{webhookInfo.campaign_id ?? "-"}</div>
                  </div>
                  <div className="col-md-3">
                    <h6>List ID</h6>
                    <div>{webhookInfo.list_id ?? "-"}</div>
                  </div>
                </div>

                <div className="mb-3">
                  <h6>API Endpoint</h6>
                  <code>{webhookInfo.endpoint}</code>
                </div>

                <div className="mb-3">
                  <h6>Request Headers</h6>
                  <pre className="bg-light p-2 rounded">
                    {JSON.stringify(webhookInfo.headers, null, 2)}
                  </pre>
                </div>

                <div className="mb-3">
                  <h6>Request Data</h6>
                  <pre
                    className="p-3 rounded text-white"
                    style={{ background: "#111", overflowX: "auto", maxHeight: "300px" }}
                  >
                    {JSON.stringify(webhookInfo.request_body, null, 2)}
                  </pre>
                </div>

                <div className="mb-3">
                  <h6>Sample Response</h6>
                  <pre className="bg-light p-2 rounded">
                    {JSON.stringify(webhookInfo.sample_response, null, 2)}
                  </pre>
                </div>
              </div>

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

export default MappleDataWebhook;
