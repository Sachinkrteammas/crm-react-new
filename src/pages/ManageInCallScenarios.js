import React, { useState, useEffect } from "react";
import api from "../api";

const ManageInCallScenarios = () => {
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

  // --- Client Selection ---
  const [clients, setClients] = useState([]);
  const [clientId, setClientId] = useState("");
  const companyId = localStorage.getItem("company_id");
  const userType = localStorage.getItem("user_type");

  // --- Fetch clients ---
  useEffect(() => {
    const fetchClients = async () => {
      if (userType === "Client") {
        setClientId(companyId);
        return;
      }
      try {
        const res = await api.get("/agents/clients-rights");
        const sortedClients = res.data.sort((a, b) =>
          a.company_name.localeCompare(b.company_name, "en", { sensitivity: "base" })
        );
        setClients(sortedClients);
      } catch (err) {
        console.error("Failed to fetch clients", err);
      }
    };
    fetchClients();
  }, [userType, companyId]);

  // --- Auto-select if single client ---
  useEffect(() => {
    if ((userType === "Super-Admin" || userType === "Admin") && clients.length === 1) {
      setClientId(clients[0].company_id);
    }
  }, [userType, clients]);

  // --- Fetch tree & categories when client changes ---
  useEffect(() => {
    if (!clientId) return;
    fetchTree();
    fetchCategories(1);
  }, [clientId]);

  const fetchTree = async () => {
    try {
      const res = await api.get(`/ecr/tree?client_id=${clientId}`);
      setTree(res.data.scenarios || []);
    } catch (err) {
      console.error("Failed to load tree", err);
    }
  };

  const fetchCategories = async (level, parentId = null) => {
    try {
      let url = `/core_api/categories/level${level}?client_id=${clientId}`;
      if (parentId) url = `/core_api/categories/level${level}/${parentId}?client_id=${clientId}`;
      const res = await api.get(url);
      setCategories((prev) => ({ ...prev, [`level${level}`]: res.data || [] }));
    } catch (err) {
      console.error(`Failed to fetch level${level} categories`, err);
    }
  };

  const handleAddScenario = async () => {
    if (!newScenario.trim()) return;
    try {
      await api.post(`/ecr/create?client_id=${clientId}`, { ecrName: newScenario, parent_id: null, Label: 1 });
      setNewScenario("");
      fetchTree();
      fetchCategories(1);
    } catch (err) {
      console.error(err);
      alert("Failed to create scenario");
    }
  };

  const handleAddSubScenario = async (level) => {
    const parentIdStr = selectedParent[level];
    const name = (subScenario[level] || "").trim();
    if (!parentIdStr) return alert("Please select a parent first.");
    if (!name) return alert("Please enter a name for the sub-scenario.");
    const parentId = parseInt(parentIdStr, 10);
    try {
      await api.post(`/ecr/create?client_id=${clientId}`, { ecrName: name, parent_id: parentId, Label: level });
      setSubScenario((prev) => ({ ...prev, [level]: "" }));
      fetchTree();
      fetchCategories(level, parentId);
      if (level < 5) fetchCategories(level + 1, parentId);
    } catch (err) {
      console.error(err);
      alert("Failed to add sub-scenario");
    }
  };

  const handleUpdateScenario = async (id, newName) => {
    if (!newName?.trim()) return;
    try {
      await api.put(`/ecr/update/${id}?client_id=${clientId}`, { ecrName: newName.trim() });
      fetchTree();
      fetchCategories(1);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteScenario = async (id) => {
    if (!window.confirm("Delete this scenario and all sub-scenarios?")) return;
    try {
      await api.delete(`/ecr/delete/${id}?client_id=${clientId}`);
      fetchTree();
      fetchCategories(1);
    } catch (err) {
      console.error(err);
    }
  };

  const handleExport = async () => {
    try {
      const res = await api.get(`/ecr/export?client_id=${clientId}`, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `scenario_tree_client_${clientId}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert("Export failed");
    }
  };



  const renderScenarioNode = (node, level = 0) => {
      return (
        <div key={node.id} style={{ paddingLeft: `${level * 20}px`, marginBottom: '8px', borderLeft: level ? '1px solid #ccc' : 'none' }}>
          <div className="d-flex align-items-center justify-content-between">
            <span>
              {node.Scenario} {node.Label ? `(L${node.Label})` : ''}
            </span>
            <div>
              <button
                className="btn btn-sm btn-outline-secondary me-1"
                onClick={() => handleUpdateScenario(node.id, prompt("Edit scenario name", node.Scenario))}
              >
                ✎
              </button>
              <button
                className="btn btn-sm btn-outline-danger"
                onClick={() => handleDeleteScenario(node.id)}
              >
                🗑
              </button>
            </div>
          </div>

          {node.children?.length > 0 && node.children.map((child) => renderScenarioNode(child, level + 1))}
        </div>
      );
  };




  return (
    <div className="row">
      <div className="col-12 mb-4">
        {/* Client Dropdown for Super-Admin/Admin */}
        {(userType === "Super-Admin" || userType === "Admin") && clients.length > 0 && (
          <div className="col-md-4 mb-3">
            <label className="form-label fw-semibold">Select Client</label>
            <select className="form-select" value={clientId} onChange={(e) => setClientId(e.target.value)}>
              <option value="">-- Select Client --</option>
              {clients.map((client) => (
                <option key={client.company_id} value={client.company_id}>
                  {client.company_name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Left Section */}
      <div className="col-md-6">
        <h4 className="mb-4 fw-bold">Manage In Call Scenarios</h4>

        <div className="accordion shadow-sm" id="scenarioAccordion">
          {/* Level 1 */}
          <div className="accordion-item">
            <h2 className="accordion-header">
              <button className="accordion-button" type="button" data-bs-toggle="collapse" data-bs-target="#collapseScenario">
                Create Scenario (Level 1)
              </button>
            </h2>
            <div id="collapseScenario" className="accordion-collapse collapse show" data-bs-parent="#scenarioAccordion">
              <div className="accordion-body">
                <div className="input-group mb-3">
                  <input type="text" className="form-control" placeholder="Enter Scenario" value={newScenario} onChange={(e) => setNewScenario(e.target.value)} />
                  <button className="btn btn-primary" onClick={handleAddScenario}>ADD</button>
                </div>

                <label className="form-label small">Existing Level 1</label>
                <select className="form-select" onChange={(e) => { if(e.target.value) fetchCategories(2, e.target.value); }}>
                  <option value="">-- choose to load children --</option>
                  {categories.level1.map((c) => <option key={c.id} value={c.id}>{c.ecrName}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Levels 2–5 */}
          {[2, 3, 4, 5].map((level) => (
            <div className="accordion-item" key={level}>
              <h2 className="accordion-header">
                <button className="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target={`#collapseSub${level}`}>
                  Create Sub Scenario (Level {level})
                </button>
              </h2>
              <div id={`collapseSub${level}`} className="accordion-collapse collapse" data-bs-parent="#scenarioAccordion">
                <div className="accordion-body">
                  <label className="form-label">Select Parent (from Level {level-1})</label>
                  <select className="form-select" value={selectedParent[level] || ""} onChange={(e) => {
                    const val = e.target.value;
                    setSelectedParent((prev) => ({ ...prev, [level]: val }));
                    for(let l = level+1; l <= 5; l++) { setSelectedParent(p => ({...p,[l]:""})); setCategories(c => ({...c,[`level${l}`]:[]})); }
                    if(val) fetchCategories(level,val);
                  }}>
                    <option value="">Select parent</option>
                    {(categories[`level${level-1}`] || []).map((cat) => <option key={cat.id} value={cat.id}>{cat.ecrName}</option>)}
                  </select>

                  <input type="text" className="form-control mt-2 mb-2" placeholder={`Enter Sub Scenario (Level ${level})`} value={subScenario[level] || ""} onChange={(e)=>setSubScenario(prev=>({...prev,[level]:e.target.value}))} />
                  <button className="btn btn-primary" onClick={() => handleAddSubScenario(level)}>ADD</button>
                </div>
              </div>
            </div>
          ))}

          {/* Export */}
          <div className="accordion-item">
            <h2 className="accordion-header">
              <button className="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapseExport">
                Export Scenarios
              </button>
            </h2>
            <div id="collapseExport" className="accordion-collapse collapse" data-bs-parent="#scenarioAccordion">
              <div className="accordion-body text-center">
                <button className="btn btn-success" onClick={handleExport}>EXPORT</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Section - Tree */}
      <div className="col-md-6">
          <h4 className="mb-4 fw-bold">Call Scenario Tree</h4>

          <div className="accordion shadow-sm p-3 rounded" id="treeAccordion" style={{ backgroundColor: "#ffffff" }}>
            {tree.map((scenario) => renderScenarioNode(scenario))}
          </div>
      </div>
    </div>
  );
};

export default ManageInCallScenarios;
