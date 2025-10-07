import React, { useState, useEffect, useRef } from "react";
import api from "../api";

export default function ManageAlertsEscalations() {
  const [fields, setFields] = useState([]);
  const [selectedFields, setSelectedFields] = useState([]);
  const [templateType, setTemplateType] = useState("");
  const [templateName, setTemplateName] = useState("");
  const [selectedScenarios, setSelectedScenarios] = useState([]);
  const [templateText, setTemplateText] = useState("");
  const textareaRef = useRef(null);

  // -------------------- Client Selection --------------------
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState("");
  const companyId = localStorage.getItem("company_id");
  const userType = localStorage.getItem("user_type");

  // Fetch clients for Admin/Super-Admin
  useEffect(() => {
    const fetchClients = async () => {
      try {
        const res = await api.get("/agents/clients-rights");
        const sortedClients = res.data.sort((a, b) =>
          a.company_name.localeCompare(b.company_name, "en", { sensitivity: "base" })
        );
        setClients(sortedClients);
      } catch (err) {
        console.error("Error fetching clients:", err);
      }
    };
    fetchClients();
  }, []);

  // Auto-select client based on role
  useEffect(() => {
    if (userType === "Client") setSelectedClient(companyId);
    else if ((userType === "Super-Admin" || userType === "Admin") && clients.length === 1)
      setSelectedClient(clients[0].company_id);
  }, [userType, companyId, clients]);

  // Fetch fields whenever client changes
  useEffect(() => {
    if (selectedClient) fetchFields(selectedClient);
  }, [selectedClient]);

  const fetchFields = async (clientId) => {
    try {
      const res = await api.get(`/core_api/fields?client_id=${clientId}`);
      setFields(res.data);
    } catch (err) {
      console.error("Error fetching fields:", err);
    }
  };

  // -------------------- Template Builder Logic --------------------
  const insertAtCursor = (token) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const before = templateText.substring(0, start);
    const after = templateText.substring(end);
    const newText = before + `:${token}:` + after;

    setTemplateText(newText);
    setTimeout(() => {
      textarea.selectionStart = textarea.selectionEnd = start + token.length + 2;
      textarea.focus();
    }, 0);
  };

  const handleScenarioChange = (e) => {
    const options = Array.from(e.target.selectedOptions, (opt) => opt.text);
    setSelectedScenarios(options);
    const lastSelected = options[options.length - 1];
    if (lastSelected) insertAtCursor(lastSelected);
  };

  const handleFieldChange = (e) => {
    const options = Array.from(e.target.selectedOptions, (opt) => opt.text);
    setSelectedFields(options);
    const lastSelected = options[options.length - 1];
    if (lastSelected) insertAtCursor(lastSelected);
  };

  const handleSave = async () => {
    if (!selectedClient) return alert("Please select a client first.");
    try {
      const formData = new FormData();
      formData.append("template_name", templateName);
      formData.append("template_type", templateType);
      formData.append("tagging", selectedScenarios.join(","));
      formData.append("required_fields", selectedFields.join(","));
      formData.append("template_text", templateText);

      await api.post(`/templates/insert?client_id=${selectedClient}`, formData);
      alert("Template saved successfully!");
    } catch (err) {
      console.error(err);
      alert("Error saving template");
    }
  };

  const handleReset = () => {
    setTemplateType("");
    setTemplateName("");
    setSelectedScenarios([]);
    setSelectedFields([]);
    setTemplateText("");
  };

  // -------------------- Tabs --------------------
  const [activeTab, setActiveTab] = useState("defineAlerts");

  const sidebarItemClass = (tab) =>
    `list-group-item list-group-item-action ${
      activeTab === tab ? "active bg-primary text-white fw-bold" : "text-primary"
    }`;

  const cardClass = "card shadow-sm border-0 rounded-3";

  return (
    <div className="row">
      <div className="col-12">
        <h3>Manage Alerts & Escalations</h3>
      </div>

      {/* Select Client (same as ManageCloseField) */}
      {(userType === "Super-Admin" || userType === "Admin") && (
        <div className="col-12 mb-4">
          <div className="col-md-4">
            <label className="form-label fw-semibold">Select Client</label>
            <select
              className="form-select"
              value={selectedClient}
              onChange={(e) => setSelectedClient(e.target.value)}
            >
              <option value="">-- Select Client --</option>
              {clients.map((client) => (
                <option key={client.company_id} value={String(client.company_id)}>
                  {client.company_name}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {selectedClient ? (
        <div className="col-12">
          <div className="d-flex">
            {/* Sidebar */}
            <div className="me-4" style={{ minWidth: "250px" }}>
              <div className="list-group">
                <button className={sidebarItemClass("defineAlerts")} onClick={() => setActiveTab("defineAlerts")}>
                  DEFINE ALERTS
                </button>
                <button className={sidebarItemClass("defineSMS")} onClick={() => setActiveTab("defineSMS")}>
                  SMS TO CALLER
                </button>
                <button className={sidebarItemClass("internalComm")} onClick={() => setActiveTab("internalComm")}>
                  INTERNAL COMMUNICATIONS
                </button>
                <button className={sidebarItemClass("escalationMatrix")} onClick={() => setActiveTab("escalationMatrix")}>
                  ESCALATION MATRIX
                </button>
              </div>
            </div>

            {/* Main Panel */}
            <div className="flex-fill">
              {/* Define Alerts */}
              {activeTab === "defineAlerts" && (
                <div className={cardClass}>
                  <div className="card-body">
                    <h5 className="card-title mb-4 text-secondary">Define Alerts</h5>
                    <form className="row g-4">
                      <div className="col-md-3">
                        <label className="form-label fw-semibold">Scenario</label>
                        <select className="form-select shadow-sm rounded-2">
                          <option>Select</option>
                        </select>
                      </div>
                      <div className="col-md-3">
                        <label className="form-label fw-semibold">Name</label>
                        <input type="text" className="form-control shadow-sm rounded-2" placeholder="Person Name" />
                      </div>
                      <div className="col-md-3">
                        <label className="form-label fw-semibold">Designation</label>
                        <input type="text" className="form-control shadow-sm rounded-2" placeholder="Designation" />
                      </div>
                      <div className="col-md-3">
                        <label className="form-label fw-semibold">Mobile No.</label>
                        <input type="text" className="form-control shadow-sm rounded-2" placeholder="Mobile No." />
                      </div>
                      <div className="col-md-3">
                        <label className="form-label fw-semibold">Email</label>
                        <input type="email" className="form-control shadow-sm rounded-2" placeholder="Email" />
                      </div>
                      <div className="col-md-3">
                        <label className="form-label fw-semibold">Alert On</label>
                        <select className="form-select shadow-sm rounded-2">
                          <option>Select</option>
                        </select>
                      </div>
                      <div className="col-12 d-flex justify-content-center gap-3 mt-4">
                        <button type="button" className="btn btn-primary shadow-sm px-5 py-2 rounded-3">ADD</button>
                        <button type="reset" className="btn btn-outline-secondary shadow-sm px-5 py-2 rounded-3">RESET</button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* Define SMS */}
              {activeTab === "defineSMS" && (
                  <div className={cardClass}>
                    <div className="card-body">
                      <h5 className="card-title mb-4 text-secondary">Define SMS to Caller</h5>
                      <form className="row g-4">
                        <div className="col-md-3">
                          <label className="form-label fw-semibold">Scenario</label>
                          <select className="form-select shadow-sm rounded-2">
                            <option>Select</option>
                          </select>
                        </div>
                        <div className="col-md-3">
                          <label className="form-label fw-semibold">Sender ID</label>
                          <input type="text" className="form-control shadow-sm rounded-2" placeholder="Sender ID" />
                        </div>
                        <div className="col-md-6">
                          <label className="form-label fw-semibold">SMS Text</label>
                          <textarea className="form-control shadow-sm rounded-2" rows="2" placeholder="Validated SMS Text Otherwise message will fail"></textarea>
                        </div>
                        <div className="col-12 d-flex justify-content-center gap-3 mt-4">
                          <button type="button" className="btn btn-primary shadow-sm px-5 py-2 rounded-3">ADD</button>
                          <button type="reset" className="btn btn-outline-secondary shadow-sm px-5 py-2 rounded-3">RESET</button>
                        </div>
                      </form>
                    </div>
                  </div>
              )}

              {/* Internal Communications (Template Management) */}
              {activeTab === "internalComm" && (
                <div className={cardClass}>
                  <div className="card-body">
                    <h5 className="card-title mb-4 text-secondary">Template Management</h5>
                    <form className="row g-4">
                      <div className="col-md-4">
                        <label className="form-label fw-semibold">Template Type</label>
                        <select
                          className="form-select shadow-sm rounded-2"
                          value={templateType}
                          onChange={(e) => setTemplateType(e.target.value)}
                        >
                          <option value="">Select</option>
                          <option value="SMS">SMS</option>
                          <option value="Email">Email</option>
                          <option value="WhatsApp">WhatsApp</option>
                        </select>
                      </div>

                      <div className="col-md-4">
                        <label className="form-label fw-semibold">Template Name</label>
                        <input
                          type="text"
                          className="form-control shadow-sm rounded-2"
                          value={templateName}
                          onChange={(e) => setTemplateName(e.target.value)}
                          placeholder="Enter template name"
                        />
                      </div>

                      <div className="col-md-6">
                        <label className="form-label fw-semibold">Select Scenario</label>
                        <select
                          className="form-select shadow-sm rounded-2"
                          multiple
                          value={selectedScenarios}
                          onChange={handleScenarioChange}
                        >
                          <option value="Scenario">Scenario</option>
                          <option value="Sub Scenario 1">Sub Scenario 1</option>
                          <option value="Sub Scenario 2">Sub Scenario 2</option>
                        </select>
                      </div>

                      <div className="col-md-6">
                        <label className="form-label fw-semibold">Select Fields</label>
                        <select
                          className="form-select shadow-sm rounded-2"
                          multiple
                          value={selectedFields}
                          onChange={handleFieldChange}
                        >
                          {fields.map((f) => (
                            <option key={f.fieldNumber} value={f.fieldNumber}>
                              {f.FieldName}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="col-md-12">
                        <label className="form-label fw-semibold">Template Text</label>
                        <textarea
                          ref={textareaRef}
                          className="form-control shadow-sm rounded-2"
                          rows="3"
                          value={templateText}
                          onChange={(e) => setTemplateText(e.target.value)}
                          placeholder="Use :FieldName: or :Scenario: for dynamic fields"
                        ></textarea>
                      </div>

                      <div className="col-12 d-flex justify-content-center gap-3 mt-4">
                        <button type="button" className="btn btn-primary shadow-sm px-5 py-2 rounded-3" onClick={handleSave}>
                          ADD
                        </button>
                        <button
                          type="reset"
                          className="btn btn-outline-secondary shadow-sm px-5 py-2 rounded-3"
                          onClick={handleReset}
                        >
                          RESET
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* Escalation Matrix */}
              {activeTab === "escalationMatrix" && (
                  <div className={cardClass}>
                    <div className="card-body">
                      <h5 className="card-title mb-4 text-secondary">Escalation Matrix</h5>
                      <form className="row g-4">
                        <div className="col-md-3">
                          <label className="form-label fw-semibold">Alert Type</label>
                          <select className="form-select shadow-sm rounded-2"><option>Select</option></select>
                        </div>
                        <div className="col-md-3">
                          <label className="form-label fw-semibold">Scenario</label>
                          <select className="form-select shadow-sm rounded-2"><option>Select</option></select>
                        </div>
                        <div className="col-md-3">
                          <label className="form-label fw-semibold">TAT</label>
                          <input type="text" className="form-control shadow-sm rounded-2" placeholder="TAT" />
                        </div>
                        <div className="col-md-3">
                          <label className="form-label fw-semibold">Alert On</label>
                          <select className="form-select shadow-sm rounded-2"><option>Select</option></select>
                        </div>
                        <div className="col-md-3">
                          <label className="form-label fw-semibold">Name</label>
                          <input type="text" className="form-control shadow-sm rounded-2" placeholder="Person Name" />
                        </div>
                        <div className="col-md-3">
                          <label className="form-label fw-semibold">Mobile No.</label>
                          <input type="text" className="form-control shadow-sm rounded-2" placeholder="Mobile No." />
                        </div>
                        <div className="col-md-3">
                          <label className="form-label fw-semibold">Designation</label>
                          <input type="text" className="form-control shadow-sm rounded-2" placeholder="Designation" />
                        </div>
                        <div className="col-md-3">
                          <label className="form-label fw-semibold">Email</label>
                          <input type="email" className="form-control shadow-sm rounded-2" placeholder="Email" />
                        </div>
                        <div className="col-12 d-flex justify-content-center gap-3 mt-4">
                          <button type="button" className="btn btn-primary shadow-sm px-5 py-2 rounded-3">ADD</button>
                          <button type="reset" className="btn btn-outline-secondary shadow-sm px-5 py-2 rounded-3">RESET</button>
                        </div>
                      </form>
                    </div>
                  </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        (userType === "Super-Admin" || userType === "Admin") && (
          <p className="text-muted">Please select a client to manage alerts & escalations.</p>
        )
      )}
    </div>
  );
}
