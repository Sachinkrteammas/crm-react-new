// Manage Out Call Scenarios..//
import React, { useState, useEffect } from "react";
import api from "../api";

export default function OutManageCallScenarios() {
  const [clients, setClients] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [clientId, setClientId] = useState("");
  const [campaignId, setCampaignId] = useState("");

  const [tree, setTree] = useState([]);
  const [categories, setCategories] = useState({
    level1: [],
    level2: [],
    level3: [],
    level4: [],
    level5: [],
  });
  const [selectedParent, setSelectedParent] = useState({});
  const [newScenario, setNewScenario] = useState("");
  const [subScenario, setSubScenario] = useState({});

  const companyId = localStorage.getItem("company_id");
  const userType = localStorage.getItem("user_type");

  // ------------------ FETCH CLIENTS ------------------
  useEffect(() => {
    const fetchClients = async () => {
      if (userType === "Client") {
        setClientId(companyId);
        return;
      }
      try {
        const res = await api.get("/agents/clients-rights");
        setClients(
          res.data.sort((a, b) => a.company_name.localeCompare(b.company_name))
        );
      } catch (err) {
        console.error(err);
      }
    };
    fetchClients();
  }, [userType, companyId]);

  // ------------------ FETCH CAMPAIGNS ------------------
  useEffect(() => {
    if (!clientId) {
      setCampaigns([]);
      setCampaignId("");
      return;
    }
    const fetchCampaigns = async () => {
      try {
        const res = await api.get(
          `/obecr/campaigns-by-client?client_id=${clientId}`
        );
        setCampaigns(res.data || []);
        setCampaignId(""); // reset campaign
      } catch (err) {
        console.error(err);
      }
    };
    fetchCampaigns();
  }, [clientId]);

  // ------------------ RESET TREE + CATEGORIES ------------------
  useEffect(() => {
    setTree([]);
    setCategories({
      level1: [],
      level2: [],
      level3: [],
      level4: [],
      level5: [],
    });
    setSelectedParent({});
    setSubScenario({});
    setNewScenario("");

    if (clientId && campaignId) {
      fetchTree();
      fetchCategories(1);
    }
  }, [clientId, campaignId]);

  // ------------------ FETCH TREE ------------------
  const fetchTree = async () => {
    try {
      const res = await api.get(
        `/obecr/tree?client_id=${clientId}&campaign_id=${campaignId}`
      );
      setTree(res.data.scenarios || []);
    } catch (err) {
      console.error(err);
    }
  };

  // ------------------ FETCH CATEGORIES ------------------
  const fetchCategories = async (level, parentId = null) => {
    try {
      let url = `/obecr/level${level}?client_id=${clientId}&campaign_id=${campaignId}`;
      if (parentId)
        url = `/obecr/level${level}/${parentId}?client_id=${clientId}&campaign_id=${campaignId}`;
      const res = await api.get(url);
      setCategories((prev) => ({ ...prev, [`level${level}`]: res.data || [] }));
    } catch (err) {
      console.error(err);
    }
  };

  // ------------------ ADD / UPDATE / DELETE ------------------
  const handleAddScenario = async () => {
    if (!newScenario.trim()) return;
    try {
      await api.post(`/obecr/create?client_id=${clientId}`, {
        ecrName: newScenario,
        parent_id: null,
        Label: 1,
        campaign_id: campaignId,
      });
      setNewScenario("");
      fetchTree();
      fetchCategories(1);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddSubScenario = async (level) => {
    const parentId = selectedParent[level];
    const name = subScenario[level];
    if (!parentId || !name?.trim())
      return alert("Select parent and enter a name");
    try {
      await api.post(`/obecr/create?client_id=${clientId}`, {
        ecrName: name,
        parent_id: parentId,
        Label: level,
        campaign_id: campaignId,
      });
      setSubScenario((prev) => ({ ...prev, [level]: "" }));
      fetchTree();
      fetchCategories(level, parentId);
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdate = async (id, newName) => {
    if (!newName?.trim()) return;
    try {
      await api.put(`/obecr/update/${id}?client_id=${clientId}`, {
        ecrName: newName,
      });
      fetchTree();
      fetchCategories(1);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete scenario and its sub-scenarios?")) return;
    try {
      await api.delete(`/obecr/delete/${id}?client_id=${clientId}`);
      fetchTree();
      fetchCategories(1);
    } catch (err) {
      console.error(err);
    }
  };

  const handleExport = async () => {
    try {
      const res = await api.get(
        `/obecr/export?client_id=${clientId}&campaign_id=${campaignId}`,
        { responseType: "blob" }
      );
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = `out_call_scenarios_${clientId}_${campaignId}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
    }
  };

  // ------------------ RENDER TREE ------------------
  const renderNode = (node, level = 0) => (
    <div key={node.id} style={{ paddingLeft: level * 20, marginBottom: 8 }}>
      <div className="d-flex justify-content-between align-items-center">
        <span>{node.Scenario}</span>
        <div>
          <button
            className="btn btn-sm btn-outline-secondary me-1"
            onClick={() =>
              handleUpdate(node.id, prompt("Edit name", node.Scenario))
            }
          >
            ✎
          </button>
          <button
            className="btn btn-sm btn-outline-danger"
            onClick={() => handleDelete(node.id)}
          >
            🗑
          </button>
        </div>
      </div>
      {node.children?.map((child) => renderNode(child, level + 1))}
    </div>
  );

  return (
    <div className="row">
   {/* Show only if NOT client login */}
    {userType !== "Client" && (
      <div className="col-md-3">
        <label>Client</label>
        <select
          className="form-select"
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
        >
          <option value="">Select Client</option>
          {clients.map((c) => (
            <option key={c.company_id} value={c.company_id}>
              {c.company_name}
            </option>
          ))}
        </select>
      </div>
    )}

      {/* Campaign Dropdown */}
      <div className="col-md-3">
        <label>Campaign</label>
        <select
          className="form-select"
          value={campaignId}
          onChange={(e) => setCampaignId(e.target.value)}
        >
          <option value="">Select Campaign</option>
          {campaigns.map((c) => (
            <option key={c.id} value={c.id}>
              {c.CampaignName}
            </option>
          ))}
        </select>
      </div>

      {/* Main Panel */}
      <div className="col-md-12 mt-4 d-flex">
        {/* Left Section */}
        <div className="col-md-6">
          <h4 className="mb-4 fw-bold">Manage Out Call Scenarios</h4>

          <div className="accordion shadow-sm" id="scenarioAccordion">
            {/* Level 1 */}
            <div className="accordion-item">
              <h2 className="accordion-header">
                <button
                  className="accordion-button"
                  type="button"
                  data-bs-toggle="collapse"
                  data-bs-target="#collapseScenario"
                >
                  Create Scenario (Level 1)
                </button>
              </h2>
              <div
                id="collapseScenario"
                className="accordion-collapse collapse show"
                data-bs-parent="#scenarioAccordion"
              >
                <div className="accordion-body">
                  <div className="input-group mb-3">
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Enter Scenario"
                      value={newScenario}
                      onChange={(e) => setNewScenario(e.target.value)}
                    />
                    <button
                      className="btn btn-primary"
                      onClick={handleAddScenario}
                    >
                      ADD
                    </button>
                  </div>

                  <label className="form-label small">Existing Level 1</label>
                  <select
                    className="form-select"
                    onChange={(e) => {
                      if (e.target.value) fetchCategories(2, e.target.value);
                    }}
                  >
                    <option value="">-- choose to load children --</option>
                    {categories.level1.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.ecrName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Levels 2–5 */}
            {[2, 3, 4, 5].map((level) => (
              <div className="accordion-item" key={level}>
                <h2 className="accordion-header">
                  <button
                    className="accordion-button collapsed"
                    type="button"
                    data-bs-toggle="collapse"
                    data-bs-target={`#collapseSub${level}`}
                  >
                    Create Sub Scenario (Level {level})
                  </button>
                </h2>
                <div
                  id={`collapseSub${level}`}
                  className="accordion-collapse collapse"
                  data-bs-parent="#scenarioAccordion"
                >
                  <div className="accordion-body">
                    <label className="form-label">
                      Select Parent (from Level {level - 1})
                    </label>
                    <select
                      className="form-select"
                      value={selectedParent[level] || ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSelectedParent((prev) => ({
                          ...prev,
                          [level]: val,
                        }));
                        for (let l = level + 1; l <= 5; l++) {
                          setSelectedParent((p) => ({ ...p, [l]: "" }));
                          setCategories((c) => ({ ...c, [`level${l}`]: [] }));
                        }
                        if (val) fetchCategories(level, val);
                      }}
                    >
                      <option value="">Select parent</option>
                      {(categories[`level${level - 1}`] || []).map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.ecrName}
                        </option>
                      ))}
                    </select>

                    <div className="input-group mt-2 mb-2">
                      <input
                        type="text"
                        className="form-control"
                        placeholder={`Enter Sub Scenario (Level ${level})`}
                        value={subScenario[level] || ""}
                        onChange={(e) =>
                          setSubScenario((prev) => ({
                            ...prev,
                            [level]: e.target.value,
                          }))
                        }
                      />
                      <button
                        className="btn btn-primary"
                        onClick={() => handleAddSubScenario(level)}
                      >
                        ADD
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* Export */}
            <div className="accordion-item">
              <button
                className="accordion-button collapsed"
                data-bs-toggle="collapse"
                data-bs-target="#exp"
              >
                <strong>Export</strong>
              </button>
              <div id="exp" className="collapse accordion-collapse">
                <div className="accordion-body">
                  <button className="btn btn-success" onClick={handleExport}>
                    EXPORT
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right - Tree */}
        <div className="col-md-6 ps-2">
          <h4>Out Call Scenario Tree</h4>
          <div className="shadow-sm p-3 bg-white rounded">
            {tree.length ? (
              tree.map((node) => renderNode(node))
            ) : (
              <p className="text-muted">
                No scenarios found for this client/campaign
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
