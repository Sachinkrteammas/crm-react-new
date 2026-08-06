import { useState, useEffect } from "react";
import api from "../api";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const PdCallAllocation = () => {
  const [form, setForm] = useState({
    selectClient: "",
    selectCampaign: "",
    selectAllocation: "",
    count: "",
    allocated: "",
    assignAllocation: [],
  });

  const [clients, setClients] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(false);

  const userType = localStorage.getItem("user_type");
  const companyId = localStorage.getItem("company_id");
  const isAdmin = userType === "Super-Admin" || userType === "Admin";

  useEffect(() => {
    if (isAdmin) {
      fetchClients();
      fetchAgents("");
    } else {
      setForm((prev) => ({ ...prev, selectClient: companyId || "" }));
      fetchAgents(companyId);
      fetchCampaigns(companyId);
    }
  }, []);

  const fetchClients = async () => {
    if (!isAdmin) return;
    try {
      const res = await api.get("/pd-call-allocation/companies");
      setClients(res.data || []);
    } catch (err) {
      console.error("Error fetching clients:", err);
      toast.error("Failed to load clients.");
    }
  };

  const fetchCampaigns = async (clientId) => {
    if (!clientId) {
      setCampaigns([]);
      setAllocations([]);
      return;
    }
    try {
      const res = await api.get(`/pd-call-allocation/campaigns?client_id=${clientId}`);
      setCampaigns(res.data || []);
      setAllocations([]);
      setForm((prev) => ({
        ...prev,
        selectCampaign: "",
        selectAllocation: "",
        count: "",
      }));
    } catch (err) {
      console.error("Error fetching campaigns:", err);
      toast.error("Failed to load campaigns.");
    }
  };

  const fetchAllocations = async (clientId, campaignId) => {
    if (!campaignId) {
      setAllocations([]);
      return;
    }
    try {
      const res = await api.get(
        `/pd-call-allocation/allocations?client_id=${clientId}&campaign_id=${campaignId}`
      );
      setAllocations(res.data || []);
      setForm((prev) => ({ ...prev, selectAllocation: "", count: "" }));
    } catch (err) {
      console.error("Error fetching allocations:", err);
      toast.error("Failed to load allocations.");
    }
  };

  const fetchCount = async (allocationId) => {
    if (!allocationId) return;
    try {
      const res = await api.get(`/pd-call-allocation/count?AllocationId=${allocationId}`);
      setForm((prev) => ({ ...prev, count: res.data.count || 0 }));
    } catch (err) {
      console.error("Error fetching count:", err);
      toast.error("Failed to load count.");
    }
  };

  const fetchAgents = async (clientId) => {
    try {
      const url = isAdmin
        ? "/pd-call-allocation/agents"
        : `/pd-call-allocation/agents?company_id=${clientId}`;
      const res = await api.get(url);
      setAgents(res.data || []);
      setForm((prev) => ({ ...prev, assignAllocation: [] }));
    } catch (err) {
      console.error("Error fetching agents:", err);
      toast.error("Failed to load agents.");
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });

    if (name === "selectClient") {
      fetchCampaigns(value);
      fetchAgents(value);
    } else if (name === "selectCampaign") {
      fetchAllocations(form.selectClient, value);
    } else if (name === "selectAllocation") {
      fetchCount(value);
    }
  };

  const handleCheckboxChange = (e) => {
    const { value, checked } = e.target;
    let updatedAllocations = form.assignAllocation || [];

    if (checked) {
      updatedAllocations = [...updatedAllocations, value];
    } else {
      updatedAllocations = updatedAllocations.filter((item) => item !== value);
    }

    setForm((prevForm) => ({
      ...prevForm,
      assignAllocation: updatedAllocations,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.selectAllocation) {
      toast.error("Please select an allocation.");
      return;
    }
    if (!form.allocated || form.allocated <= 0) {
      toast.error("Please enter a valid allocated count.");
      return;
    }
    if (form.assignAllocation.length === 0) {
      toast.error("Please select at least one agent.");
      return;
    }

    const payload = {
      allocation_id: Number(form.selectAllocation),
      allocated: Number(form.allocated),
      agent_ids: form.assignAllocation.map((id) => Number(id)),
    };

    setLoading(true);
    try {
      const res = await api.post("/pd-call-allocation/allocate", payload);
      toast.success(res.data.message || "Allocated Successfully.");
      fetchCount(form.selectAllocation);
      fetchAgents(form.selectClient);
    } catch (err) {
      console.error("Error allocating:", err.response || err);
      toast.error(err.response?.data?.detail || "Failed to allocate. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const agentName = (agent) =>
    agent.username || agent.displayname ||  agent.id || "";

  return (
    <div className="row">
      <ToastContainer
        position="top-center"
        autoClose={2500}
        hideProgressBar
        style={{ marginTop: "90px" }}
      />
      <div className="col-12">
        <div className="mb-3">
          <h4>PD Call Allocation</h4>
        </div>

        {/* Form Card */}
        <div className="card mb-4">
          <h6 className="card-header">PD CALL ALLOCATION</h6>
          <div className="card-body">
            <form className="row g-3" onSubmit={handleSubmit}>
              {isAdmin && (
                <div className="col-md-4">
                  <label className="form-label">Select Client</label>
                  <select
                    name="selectClient"
                    className="form-select"
                    value={form.selectClient}
                    onChange={handleChange}
                  >
                    <option value="">Select Client</option>
                    {clients.map((client) => (
                      <option key={client.company_id} value={client.company_id}>
                        {client.company_name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="col-md-4">
                <label className="form-label">Select Campaign</label>
                <select
                  name="selectCampaign"
                  className="form-select"
                  value={form.selectCampaign}
                  onChange={handleChange}
                >
                  <option value="">Select Campaign</option>
                  {campaigns.map((campaign) => (
                    <option key={campaign.id} value={campaign.id}>
                      {campaign.CampaignName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-md-4">
                <label className="form-label">Select Allocation</label>
                <select
                  name="selectAllocation"
                  className="form-select"
                  value={form.selectAllocation}
                  onChange={handleChange}
                >
                  <option value="">Select Allocation</option>
                  {allocations.map((allocation) => (
                    <option key={allocation.id} value={allocation.id}>
                      {allocation.AllocationName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-md-4">
                <label className="form-label">Count</label>
                <input
                  name="count"
                  className="form-control"
                  placeholder="Count"
                  value={form.count}
                  readOnly
                />
              </div>

              <div className="col-md-4">
                <label className="form-label">Allocated</label>
                <input
                  type="number"
                  name="allocated"
                  className="form-control"
                  placeholder="Allow Only Number"
                  value={form.allocated}
                  onChange={handleChange}
                />
              </div>

              <div className="col-12">
                <label className="form-label">Assign Allocation</label>
                <div
                  style={{
                    border: "1px solid #ccc",
                    borderRadius: "4px",
                    padding: "10px",
                    height: "450px",
                    overflowY: "scroll",
                  }}
                >
                  {agents.length > 0 ? (
                    agents.map((agent) => (
                      <div key={agent.id} className="form-check">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          name="assignAllocation"
                          value={agent.id}
                          checked={form.assignAllocation?.includes(
                            agent.id.toString()
                          )}
                          onChange={handleCheckboxChange}
                        />
                        <label className="form-check-label">
                          {agentName(agent)}
                        </label>
                      </div>
                    ))
                  ) : (
                    <div className="text-muted">No agents found</div>
                  )}
                </div>
              </div>

              <div className="col-12">
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? "Allocating..." : "SUBMIT"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PdCallAllocation;
