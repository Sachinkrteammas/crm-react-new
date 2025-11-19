import React, { useState, useEffect, useRef } from "react";
import api from "../api";

export default function ManageAlertsEscalations() {
  // -------------------- Client Selection --------------------
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState("");
  const companyId = localStorage.getItem("company_id");
  const userType = localStorage.getItem("user_type");

  // -------------------- Templates for Caller Accordion --------------------
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [callerTemplateText, setCallerTemplateText] = useState("");
  const [Whatsappkey, setWhatsappkey] = useState("");
  const [SessionId, setSessionId] = useState("");

  const [callerAlertOn, setCallerAlertOn] = useState("");
  const [alerts, setAlerts] = useState([]);
  const [editingAlertId, setEditingAlertId] = useState(null);

  // For Internal and Escalation Scenarios
  const [level1Categories, setLevel1Categories] = useState([]);
  const [level2Categories, setLevel2Categories] = useState([]);
  const [level3Categories, setLevel3Categories] = useState([]);
  const [level4Categories, setLevel4Categories] = useState([]);
  const [level5Categories, setLevel5Categories] = useState([]);

  const [selectedLevel1, setSelectedLevel1] = useState("");
  const [selectedLevel2, setSelectedLevel2] = useState("");
  const [selectedLevel3, setSelectedLevel3] = useState("");
  const [selectedLevel4, setSelectedLevel4] = useState("");
  const [selectedLevel5, setSelectedLevel5] = useState("");

  const [internalAlerts, setInternalAlerts] = useState([]);
  const [internalAlertOn, setInternalAlertOn] = useState("");
  const [personName, setPersonName] = useState("");
  const [personPhone, setPersonPhone] = useState("");
  const [personEmail, setPersonEmail] = useState("");
  const [InternalWhatsappkey, InternalsetWhatsappkey] = useState("");
  const [InternalSessionId, InternalsetSessionId] = useState("");

  const [isEditing, setIsEditing] = useState(false);

  // Escalation-specific state
  const [escalationAlertOn, setEscalationAlertOn] = useState("");
  const [escalationTAT, setEscalationTAT] = useState("");
  const [escalationPersonName, setEscalationPersonName] = useState("");
  const [escalationPersonPhone, setEscalationPersonPhone] = useState("");
  const [escalationPersonEmail, setEscalationPersonEmail] = useState("");
  const [escalationWhatsappkey, escalationsetWhatsappkey] = useState("");
  const [escalationSessionId, escalationsetSessionId] = useState("");
  const [editingInternalAlertId, setEditingInternalAlertId] = useState(null);

  const [escalationAlerts, setEscalationAlerts] = useState([]);
  const [editingEscalationAlertId, setEditingEscalationAlertId] =
    useState(null);
  const [loadingEscalations, setLoadingEscalations] = useState(false);

  const [activeSubTab, setActiveSubTab] = useState("caller");

  const [activeTab, setActiveTab] = useState("alertMechanism");
  const [activeAlertSection, setActiveAlertSection] = useState("caller");
  const [alertMenuOpen, setAlertMenuOpen] = useState(true);

  // Fetch clients for Admin/Super-Admin
  useEffect(() => {
    const fetchClients = async () => {
      try {
        const res = await api.get("/agents/clients-rights");
        const sortedClients = res.data.sort((a, b) =>
          a.company_name.localeCompare(b.company_name, "en", {
            sensitivity: "base",
          })
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
    else if (
      (userType === "Super-Admin" || userType === "Admin") &&
      clients.length === 1
    )
      setSelectedClient(clients[0].company_id);
  }, [userType, companyId, clients]);

  // Fetch templates when selectedClient changes
  useEffect(() => {
    const fetchTemplates = async () => {
      if (!selectedClient) return;
      try {
        const res = await api.get(`/templates?client_id=${selectedClient}`);
        setTemplates(res.data.templates || []);
      } catch (err) {
        console.error("Error fetching templates:", err);
      }
    };
    fetchTemplates();
  }, [selectedClient]);

  useEffect(() => {
    const fetchLevel1 = async () => {
      if (!selectedClient) return;
      try {
        const res = await api.get(
          `/core_api/categories/level1?client_id=${selectedClient}`
        );
        setLevel1Categories(res.data || []);
        if (!isEditing) {
          setSelectedLevel1("");
          setLevel2Categories([]);
          setLevel3Categories([]);
          setLevel4Categories([]);
          setLevel5Categories([]);
        }
      } catch (err) {
        console.error("Error fetching level1 categories:", err);
      }
    };
    fetchLevel1();
  }, [selectedClient]);

  useEffect(() => {
    if (!selectedLevel1) return setLevel2Categories([]);
    const fetchLevel2 = async () => {
      try {
        const res = await api.get(
          `/core_api/categories/level2/${selectedLevel1}?client_id=${selectedClient}`
        );
        setLevel2Categories(res.data || []);
        if (!isEditing) {
          setSelectedLevel2("");
          setLevel3Categories([]);
          setLevel4Categories([]);
          setLevel5Categories([]);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchLevel2();
  }, [selectedLevel1]);

  useEffect(() => {
    if (!selectedLevel2) return setLevel3Categories([]);
    const fetchLevel3 = async () => {
      try {
        const res = await api.get(
          `/core_api/categories/level3/${selectedLevel2}?client_id=${selectedClient}`
        );
        setLevel3Categories(res.data || []);
        if (!isEditing) {
          setSelectedLevel3("");
          setLevel4Categories([]);
          setLevel5Categories([]);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchLevel3();
  }, [selectedLevel2]);

  useEffect(() => {
    if (!selectedLevel3) return setLevel4Categories([]);
    const fetchLevel4 = async () => {
      try {
        const res = await api.get(
          `/core_api/categories/level4/${selectedLevel3}?client_id=${selectedClient}`
        );
        setLevel4Categories(res.data || []);
        if (!isEditing) {
          setSelectedLevel4("");
          setLevel5Categories([]);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchLevel4();
  }, [selectedLevel3]);

  useEffect(() => {
    if (!selectedLevel4) return setLevel5Categories([]);
    const fetchLevel5 = async () => {
      try {
        const res = await api.get(
          `/core_api/categories/level5/${selectedLevel4}?client_id=${selectedClient}`
        );
        setLevel5Categories(res.data || []);
        if (!isEditing) {
          setSelectedLevel5("");
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchLevel5();
  }, [selectedLevel4]);

  useEffect(() => {
    if (selectedClient) fetchCallerAlerts();
  }, [selectedClient]);

  const fetchCallerAlerts = async () => {
    try {
      const res = await api.get("/caller/alert-mechanism", {
        params: { client_id: selectedClient },
      });
      setAlerts(res.data);
    } catch (err) {
      console.error(err);
      alert("Error fetching caller alerts.");
    }
  };

  const resetCallerForm = () => {
    setEditingAlertId(null);
    setCallerAlertOn("");
    setSelectedTemplate("");
    setCallerTemplateText("");
    setWhatsappkey("");          
    setSessionId("");  
    fetchCallerAlerts();
  };

  const handleCallerAdd = async () => {
    if (!selectedClient) return alert("Please select a client first.");
    if (!callerAlertOn) return alert("Please select Alert On.");
    if (!selectedTemplate) return alert("Please select a template.");

    try {
      const payload = {
        client_id: selectedClient,
        alert_category: "caller",
        alert_on: callerAlertOn,
        template_name: selectedTemplate,
        template_text: callerTemplateText,
        whatsapp_api_key: Whatsappkey,
        whatsapp_session_id: SessionId,
      };

      if (editingAlertId) {
        // Update
        await api.put(`/caller/alert-mechanism/${editingAlertId}`, payload);
        alert("Caller alert updated successfully!");
      } else {
        // Add
        await api.post("/caller/alert-mechanism", payload);
        alert("Caller alert added successfully!");
      }

      resetCallerForm();
    } catch (err) {
      console.error(err);
      alert("Error saving caller alert.");
    }
  };

  const handleEdit = (alert) => {
    setEditingAlertId(alert.id);
    setCallerAlertOn(alert.alert_on);
    setSelectedTemplate(alert.template_name);
    setCallerTemplateText(alert.template_text);
    setWhatsappkey(alert.whatsapp_api_key || "");
    setSessionId(alert.whatsapp_session_id || "");

  };

  const handleDelete = async (alertId) => {
    if (!window.confirm("Are you sure you want to delete this alert?")) return;

    try {
      await api.delete(`/caller/alert-mechanism/${alertId}`);
      alert("Caller alert deleted successfully!");
      fetchCallerAlerts();
    } catch (err) {
      console.error(err);
      alert("Error deleting caller alert.");
    }
  };

  const fetchInternalAlerts = async () => {
    if (!selectedClient) return;
    try {
      const res = await api.get("/internal/alert-mechanism", {
        params: { client_id: selectedClient },
      });
      setInternalAlerts(res.data);
    } catch (err) {
      console.error(err);
      alert("Error fetching internal alerts.");
    }
  };

  useEffect(() => {
    if (selectedClient) fetchInternalAlerts();
  }, [selectedClient]);

  const resetInternalForm = () => {
    setEditingInternalAlertId(null);
    setIsEditing(false);
    setInternalAlertOn("");
    setSelectedLevel1("");
    setSelectedLevel2("");
    setSelectedLevel3("");
    setSelectedLevel4("");
    setSelectedLevel5("");
    setSelectedTemplate("");
    setCallerTemplateText("");
    setPersonName("");
    setPersonPhone("");
    setPersonEmail("");
    InternalsetWhatsappkey("");
    InternalsetSessionId("");
  };

  const handleInternalAdd = async () => {
    if (!selectedClient) return alert("Please select a client first.");
    if (!internalAlertOn) return alert("Please select Alert On.");
    if (!selectedTemplate) return alert("Please select a template.");

    const payload = {
      client_id: selectedClient,
      alert_category: "internal",
      alert_on: internalAlertOn,
      template_name: selectedTemplate,
      template_text: callerTemplateText,
      scenario1: selectedLevel1 || null,
      scenario2: selectedLevel2 || null,
      scenario3: selectedLevel3 || null,
      scenario4: selectedLevel4 || null,
      scenario5: selectedLevel5 || null,
      person_name: personName,
      phone: personPhone,
      email: personEmail || null,
      whatsapp_api_key: InternalWhatsappkey,
      whatsapp_session_id: SessionId,
    };

    try {
      if (editingInternalAlertId) {
        // Update existing alert
        await api.put(
          `/internal/alert-mechanism/${editingInternalAlertId}`,
          payload
        );
        alert("Internal alert updated successfully!");
      } else {
        // Add new alert
        await api.post("/internal/alert-mechanism", payload);
        alert("Internal alert saved successfully!");
      }

      // Reset form
      resetInternalForm();

      fetchInternalAlerts(); // Refresh table
    } catch (err) {
      console.error(err);
      alert(
        editingInternalAlertId
          ? "Error updating internal alert."
          : "Error saving internal alert."
      );
    }
  };

  const handleInternalDelete = async (alertId) => {
    if (!window.confirm("Are you sure you want to delete this alert?")) return;
    try {
      await api.delete(`/internal/alert-mechanism/${alertId}`);
      fetchInternalAlerts();
    } catch (err) {
      console.error(err);
      alert("Error deleting alert.");
    }
  };

  const handleInternalEdit = async (alert) => {
    setIsEditing(true);
    setEditingInternalAlertId(alert.id);
    setInternalAlertOn(alert.alert_on);
    InternalsetWhatsappkey(alert.whatsapp_api_key || "");
    InternalsetSessionId(alert.whatsapp_session_id || "");


    const s1 = alert.scenario1 ? String(alert.scenario1) : "";
    const s2 = alert.scenario2 ? String(alert.scenario2) : "";
    const s3 = alert.scenario3 ? String(alert.scenario3) : "";
    const s4 = alert.scenario4 ? String(alert.scenario4) : "";
    const s5 = alert.scenario5 ? String(alert.scenario5) : "";

    try {
      // Step 1: Level 1
      setSelectedLevel1(s1);

      // Step 2: Wait for next level categories
      if (s1) {
        const res2 = await api.get(
          `/core_api/categories/level2/${s1}?client_id=${selectedClient}`
        );
        setLevel2Categories(res2.data || []);
        setSelectedLevel2(s2);
      }

      // Step 3: Level 3
      if (s2) {
        const res3 = await api.get(
          `/core_api/categories/level3/${s2}?client_id=${selectedClient}`
        );
        setLevel3Categories(res3.data || []);
        setSelectedLevel3(s3);
      }

      // Step 4: Level 4
      if (s3) {
        const res4 = await api.get(
          `/core_api/categories/level4/${s3}?client_id=${selectedClient}`
        );
        setLevel4Categories(res4.data || []);
        setSelectedLevel4(s4);
      }

      // Step 5: Level 5
      if (s4) {
        const res5 = await api.get(
          `/core_api/categories/level5/${s4}?client_id=${selectedClient}`
        );
        setLevel5Categories(res5.data || []);
        setSelectedLevel5(s5);
      }

      // Step 6: Template and Person info
      setSelectedTemplate(alert.template_name);
      setCallerTemplateText(alert.template_text);
      setPersonName(alert.person_name);
      setPersonPhone(alert.phone);
      setPersonEmail(alert.email);
    } catch (err) {
      console.error("Error pre-filling internal alert:", err);
    } finally {
      // Allow useEffect resets again after short delay
      setTimeout(() => setIsEditing(false), 800);
    }
  };

  const fetchEscalationAlerts = async () => {
    if (!selectedClient) return;
    setLoadingEscalations(true);
    try {
      const res = await api.get(
        `/escalation/alert-mechanism?client_id=${selectedClient}`
      );
      setEscalationAlerts(res.data);
    } catch (err) {
      console.error("Error fetching escalation alerts:", err);
    } finally {
      setLoadingEscalations(false);
    }
  };

  useEffect(() => {
    if (selectedClient) fetchEscalationAlerts();
  }, [selectedClient]);

  const resetEscalationForm = () => {
    setEditingEscalationAlertId(null);
    setIsEditing(false);
    setEscalationAlertOn("");
    setSelectedLevel1("");
    setSelectedLevel2("");
    setSelectedLevel3("");
    setSelectedLevel4("");
    setSelectedLevel5("");
    setSelectedTemplate("");
    setCallerTemplateText("");
    setEscalationTAT("");
    setEscalationPersonName("");
    setEscalationPersonPhone("");
    setEscalationPersonEmail("");
    escalationsetWhatsappkey("");
    escalationsetSessionId("");
  };

  const handleEscalationAdd = async () => {
    if (!selectedClient) return alert("Please select a client first.");
    if (!escalationAlertOn) return alert("Please select Alert On.");
    if (!selectedTemplate) return alert("Please select a template.");

    const payload = {
      client_id: selectedClient,
      alert_category: "escalation",
      alert_on: escalationAlertOn,
      template_name: selectedTemplate,
      template_text: callerTemplateText,
      scenario1: selectedLevel1 || null,
      scenario2: selectedLevel2 || null,
      scenario3: selectedLevel3 || null,
      scenario4: selectedLevel4 || null,
      scenario5: selectedLevel5 || null,
      person_name: escalationPersonName,
      phone: escalationPersonPhone,
      email: escalationPersonEmail || null,
      tat: escalationTAT,
      whatsapp_api_key: escalationWhatsappkey,
      whatsapp_session_id: SessionId,
    };

    try {
      if (editingEscalationAlertId) {
        await api.put(
          `/escalation/alert-mechanism/${editingEscalationAlertId}`,
          payload
        );
        alert("Escalation alert updated successfully!");
      } else {
        await api.post("/escalation/alert-mechanism", payload);
        alert("Escalation alert saved successfully!");
      }

      // Reset form
      resetEscalationForm();
      // Refresh list
      fetchEscalationAlerts();
    } catch (err) {
      console.error(err);
      alert(
        editingEscalationAlertId
          ? "Error updating escalation alert."
          : "Error saving escalation alert."
      );
    }
  };

  const handleEscalationEdit = async (alert) => {
    setIsEditing(true);
    setEditingEscalationAlertId(alert.id);
    setEscalationAlertOn(alert.alert_on);
    escalationsetWhatsappkey(alert.whatsapp_api_key || "");
    escalationsetSessionId(alert.whatsapp_session_id || "");


    const s1 = alert.scenario1 ? String(alert.scenario1) : "";
    const s2 = alert.scenario2 ? String(alert.scenario2) : "";
    const s3 = alert.scenario3 ? String(alert.scenario3) : "";
    const s4 = alert.scenario4 ? String(alert.scenario4) : "";
    const s5 = alert.scenario5 ? String(alert.scenario5) : "";

    try {
      // Level 1
      setSelectedLevel1(s1);

      // Level 2
      if (s1) {
        const res2 = await api.get(
          `/core_api/categories/level2/${s1}?client_id=${selectedClient}`
        );
        setLevel2Categories(res2.data || []);
        setSelectedLevel2(s2);
      }

      // Level 3
      if (s2) {
        const res3 = await api.get(
          `/core_api/categories/level3/${s2}?client_id=${selectedClient}`
        );
        setLevel3Categories(res3.data || []);
        setSelectedLevel3(s3);
      }

      // Level 4
      if (s3) {
        const res4 = await api.get(
          `/core_api/categories/level4/${s3}?client_id=${selectedClient}`
        );
        setLevel4Categories(res4.data || []);
        setSelectedLevel4(s4);
      }

      // Level 5
      if (s4) {
        const res5 = await api.get(
          `/core_api/categories/level5/${s4}?client_id=${selectedClient}`
        );
        setLevel5Categories(res5.data || []);
        setSelectedLevel5(s5);
      }

      // Template + Person fields
      setSelectedTemplate(alert.template_name);
      setCallerTemplateText(alert.template_text);
      setEscalationTAT(alert.tat);
      setEscalationPersonName(alert.person_name);
      setEscalationPersonPhone(alert.phone);
      setEscalationPersonEmail(alert.email);
    } catch (err) {
      console.error("Error pre-filling escalation alert:", err);
    } finally {
      // Prevent premature useEffect resets
      setTimeout(() => setIsEditing(false), 800);
    }
  };

  const handleEscalationDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this alert?")) return;
    try {
      await api.delete(`/escalation/alert-mechanism/${id}`);
      alert("Escalation alert deleted successfully!");
      fetchEscalationAlerts();
    } catch (err) {
      console.error(err);
      alert("Error deleting escalation alert.");
    }
  };

  // -------------------- Tabs --------------------

  const sidebarItemClass = (tab) =>
    `list-group-item list-group-item-action ${
      activeTab === tab
        ? "active bg-primary text-white fw-bold"
        : "text-primary"
    }`;

  const cardClass = "card shadow-sm border-0 rounded-3";

  return (
    <div className="row">
      <div className="col-12">
        <h3>Manage Alerts & Escalations</h3>
      </div>

      {/* Select Client (same as ManageCloseField) */}
      {(userType === "Super-Admin" || userType === "Admin") && (
        <div className="card col-12 mb-4">
          <div className="card-body col-md-4">
            <label className="form-label fw-semibold">Select Client</label>
            <select
              className="form-select"
              value={selectedClient}
              onChange={(e) => setSelectedClient(e.target.value)}
            >
              <option value="">-- Select Client --</option>
              {clients.map((client) => (
                <option
                  key={client.company_id}
                  value={String(client.company_id)}
                >
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
                <button
                  className={`list-group-item list-group-item-action fw-semibold ${
                    activeAlertSection === "caller" ? "active" : ""
                  }`}
                  onClick={() => setActiveAlertSection("caller")}
                >
                  CALLER
                </button>

                <button
                  className={`list-group-item list-group-item-action fw-semibold ${
                    activeAlertSection === "internal" ? "active" : ""
                  }`}
                  onClick={() => setActiveAlertSection("internal")}
                >
                  INTERNAL
                </button>

                <button
                  className={`list-group-item list-group-item-action fw-semibold ${
                    activeAlertSection === "escalation" ? "active" : ""
                  }`}
                  onClick={() => setActiveAlertSection("escalation")}
                >
                  ESCALATION
                </button>
              </div>
            </div>

            {/* Main Panel */}
            <div className="flex-fill">
              {/* Alert Mechanism */}
              {activeTab === "alertMechanism" && (
                <div className={cardClass}>
                  <div className="card-body">
                    <h5 className="card-title mb-4 text-secondary">
                      Alert Mechanism —{" "}
                      <span className="text-primary text-capitalize">
                        {activeAlertSection}
                      </span>
                    </h5>

                    {/* Conditionally render based on section */}
                    {activeAlertSection === "caller" && (
                      <div>
                        {/* === Caller form (keep as-is) === */}
                        <form className="row g-4">
                          {/* existing caller form fields */}
                          <div className="col-md-3">
                            <label className="form-label fw-semibold">
                              Alert On
                            </label>
                            <select
                              className="form-select shadow-sm rounded-2"
                              value={callerAlertOn}
                              onChange={(e) => setCallerAlertOn(e.target.value)}
                            >
                              <option value="">Select</option>
                              <option value="SMS">SMS</option>
                              <option value="Email">Email</option>
                              <option value="WhatsApp">WhatsApp</option>
                              <option value="All">All</option>
                            </select>
                          </div>

                          {/* Template Name Dropdown */}
                          <div className="col-md-4">
                            <label className="form-label fw-semibold">
                              Template Name
                            </label>
                            <select
                              className="form-select shadow-sm rounded-2"
                              value={selectedTemplate}
                              onChange={(e) => {
                                const name = e.target.value;
                                setSelectedTemplate(name);
                                const found = templates.find(
                                  (t) => t.template_name === name
                                );
                                setCallerTemplateText(
                                  found?.template_text || ""
                                );
                              }}
                            >
                              <option value="">Select Template</option>
                              {templates.map((t, i) => (
                                <option key={i} value={t.template_name}>
                                  {t.template_name}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Template Text (Readonly) */}
                          <div className="col-md-8">
                            <label className="form-label fw-semibold">
                              Template Text
                            </label>
                            <textarea
                              className="form-control shadow-sm rounded-2"
                              rows="4"
                              value={callerTemplateText}
                              readOnly
                            ></textarea>
                          </div>

                          {/* WhatsApp API Key and Session ID - same row, below template text */}
                          <div className="col-12 mt-2">
                            <div className="row g-4">
                              <div className="col-md-3">
                                <label className="form-label fw-semibold">
                                  WhatsApp API Key
                                </label>
                                <input
                                  type="text"
                                  className="form-control shadow-sm rounded-2"
                                  value={Whatsappkey}
                                  onChange={(e) =>
                                    setWhatsappkey(e.target.value)
                                  }
                                  placeholder="Enter WhatsApp API Key"
                                />
                              </div>

                              <div className="col-md-3">
                                <label className="form-label fw-semibold">
                                  WhatsApp Session ID
                                </label>
                                <input
                                  type="text"
                                  className="form-control shadow-sm rounded-2"
                                  value={SessionId}
                                  onChange={(e) => setSessionId(e.target.value)}
                                  placeholder="Enter WhatsApp Session ID"
                                />
                              </div>
                            </div>
                          </div>

                          <div className="col-12 d-flex justify-content-center gap-3 mt-4">
                            <button
                              type="button"
                              className="btn btn-primary shadow-sm px-5 py-2 rounded-3"
                              onClick={handleCallerAdd}
                            >
                              {editingAlertId ? "UPDATE" : "ADD"}
                            </button>
                            {editingAlertId && (
                              <button
                                type="button"
                                className="btn btn-secondary shadow-sm px-5 py-2 rounded-3"
                                onClick={resetCallerForm}
                              >
                                Cancel Edit
                              </button>
                            )}
                          </div>
                        </form>
                        {/* === Caller Alerts Table === */}
                        <div
                          className="table-responsive"
                          style={{ maxHeight: 500, overflowY: "auto" }}
                        >
                          <h5>Existing Caller Alerts</h5>
                          <table className="table table-hover table-bordered table-striped align-middle shadow-sm">
                            <thead className="table-primary sticky-top">
                              <tr>
                                <th>ID</th>
                                <th>Alert On</th>
                                <th>Template Name</th>
                                <th>Template Text</th>
                                <th>Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {alerts.length === 0 && (
                                <tr>
                                  <td
                                    colSpan={5}
                                    className="text-center text-muted"
                                  >
                                    No alerts found.
                                  </td>
                                </tr>
                              )}
                              {alerts.map((alert) => (
                                <tr key={alert.id}>
                                  <td>{alert.id}</td>
                                  <td>{alert.alert_on}</td>
                                  <td>{alert.template_name}</td>
                                  <td>{alert.template_text}</td>
                                  <td>
                                    <button
                                      className="btn btn-sm btn-warning me-2"
                                      onClick={() => handleEdit(alert)}
                                    >
                                      Edit
                                    </button>
                                    <button
                                      className="btn btn-sm btn-danger"
                                      onClick={() => handleDelete(alert.id)}
                                    >
                                      Delete
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {activeAlertSection === "internal" && (
                      <div>
                        {/* === Internal form (keep as-is) === */}
                        <form className="row g-4">
                          {/* existing internal form fields */}
                          <div className="col-md-3">
                            <label className="form-label fw-semibold">
                              Alert On
                            </label>
                            <select
                              className="form-select shadow-sm rounded-2"
                              value={internalAlertOn}
                              onChange={(e) =>
                                setInternalAlertOn(e.target.value)
                              }
                            >
                              <option value="">Select</option>
                              <option value="SMS">SMS</option>
                              <option value="Email">Email</option>
                              <option value="WhatsApp">WhatsApp</option>
                              <option value="All">All</option>
                            </select>
                          </div>
                          <div className="col-md-3">
                            <label className="form-label fw-semibold">
                              Scenario
                            </label>
                            <select
                              className="form-select shadow-sm rounded-2"
                              value={selectedLevel1}
                              onChange={(e) =>
                                setSelectedLevel1(e.target.value)
                              }
                            >
                              <option value="">Select Level 1</option>
                              {level1Categories.map((cat) => (
                                <option key={cat.id} value={cat.id}>
                                  {cat.ecrName}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Level 2 */}
                          {level2Categories.length > 0 && (
                            <div className="col-md-3">
                              <label className="form-label fw-semibold">
                                Sub Scenario
                              </label>
                              <select
                                className="form-select shadow-sm rounded-2"
                                value={selectedLevel2}
                                onChange={(e) =>
                                  setSelectedLevel2(e.target.value)
                                }
                              >
                                <option value="">Select Level 2</option>
                                {level2Categories.map((cat) => (
                                  <option key={cat.id} value={cat.id}>
                                    {cat.ecrName}
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}

                          {/* Level 3 */}
                          {level3Categories.length > 0 && (
                            <div className="col-md-3">
                              <label className="form-label fw-semibold">
                                Sub Scenario 3
                              </label>
                              <select
                                className="form-select shadow-sm rounded-2"
                                value={selectedLevel3}
                                onChange={(e) =>
                                  setSelectedLevel3(e.target.value)
                                }
                              >
                                <option value="">Select Level 3</option>
                                {level3Categories.map((cat) => (
                                  <option key={cat.id} value={cat.id}>
                                    {cat.ecrName}
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}

                          {/* Level 4 */}
                          {level4Categories.length > 0 && (
                            <div className="col-md-3">
                              <label className="form-label fw-semibold">
                                Sub Scenario 4
                              </label>
                              <select
                                className="form-select shadow-sm rounded-2"
                                value={selectedLevel4}
                                onChange={(e) =>
                                  setSelectedLevel4(e.target.value)
                                }
                              >
                                <option value="">Select Level 4</option>
                                {level4Categories.map((cat) => (
                                  <option key={cat.id} value={cat.id}>
                                    {cat.ecrName}
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}

                          {/* Level 5 */}
                          {level5Categories.length > 0 && (
                            <div className="col-md-3">
                              <label className="form-label fw-semibold">
                                Sub Scenario 5
                              </label>
                              <select
                                className="form-select shadow-sm rounded-2"
                                value={selectedLevel5}
                                onChange={(e) =>
                                  setSelectedLevel5(e.target.value)
                                }
                              >
                                <option value="">Select Level 5</option>
                                {level5Categories.map((cat) => (
                                  <option key={cat.id} value={cat.id}>
                                    {cat.ecrName}
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}

                          {/* Template Name Dropdown */}
                          <div className="col-md-4">
                            <label className="form-label fw-semibold">
                              Template Name
                            </label>
                            <select
                              className="form-select shadow-sm rounded-2"
                              value={selectedTemplate}
                              onChange={(e) => {
                                const name = e.target.value;
                                setSelectedTemplate(name);
                                const found = templates.find(
                                  (t) => t.template_name === name
                                );
                                setCallerTemplateText(
                                  found?.template_text || ""
                                );
                              }}
                            >
                              <option value="">Select Template</option>
                              {templates.map((t, i) => (
                                <option key={i} value={t.template_name}>
                                  {t.template_name}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Template Text (Readonly) */}
                          <div className="col-md-6">
                            <label className="form-label fw-semibold">
                              Template Text
                            </label>
                            <textarea
                              className="form-control shadow-sm rounded-2"
                              rows="4"
                              value={callerTemplateText}
                              readOnly
                            ></textarea>
                          </div>
                          <div className="col-md-3">
                            <label className="form-label fw-semibold">
                              Name
                            </label>
                            <input
                              type="text"
                              className="form-control shadow-sm rounded-2"
                              value={personName}
                              onChange={(e) => setPersonName(e.target.value)}
                              placeholder="Person Name"
                            />
                          </div>

                          <div className="col-md-3">
                            <label className="form-label fw-semibold">
                              Mobile No.
                            </label>
                            <input
                              type="text"
                              className="form-control shadow-sm rounded-2"
                              value={personPhone}
                              onChange={(e) => setPersonPhone(e.target.value)}
                              placeholder="Mobile No."
                            />
                          </div>

                          {/* WhatsApp API Key and Session ID - same row, below template text */}
                          <div className="col-12 mt-2">
                            <div className="row g-4">
                              <div className="col-md-3">
                                <label className="form-label fw-semibold">
                                  Email
                                </label>
                                <input
                                  type="email"
                                  className="form-control shadow-sm rounded-2"
                                  value={personEmail}
                                  onChange={(e) =>
                                    setPersonEmail(e.target.value)
                                  }
                                  placeholder="Email"
                                />
                              </div>

                          <div className="col-md-3">
                            <label className="form-label fw-semibold">WhatsApp API Key</label>
                            <input
                              type="text"
                              className="form-control shadow-sm rounded-2"
                              value={InternalWhatsappkey}
                              onChange={(e) => InternalsetWhatsappkey(e.target.value)}
                              placeholder="Enter WhatsApp API Key"
                            />
                          </div>

                          <div className="col-md-3">
                            <label className="form-label fw-semibold">WhatsApp Session ID</label>
                            <input
                              type="text"
                              className="form-control shadow-sm rounded-2"
                              value={InternalSessionId}
                              onChange={(e) => InternalsetSessionId(e.target.value)}
                              placeholder="Enter WhatsApp Session ID"
                            />
                          </div>

                            </div>
                          </div>
                          <div className="col-12 d-flex justify-content-center gap-3 mt-4">
                            <button
                              type="button"
                              className="btn btn-primary shadow-sm px-5 py-2 rounded-3"
                              onClick={handleInternalAdd}
                            >
                              {editingInternalAlertId ? "UPDATE" : "ADD"}
                            </button>
                            {editingInternalAlertId && (
                              <button
                                type="button"
                                className="btn btn-secondary shadow-sm px-5 py-2 rounded-3"
                                onClick={resetInternalForm}
                              >
                                Cancel Edit
                              </button>
                            )}
                          </div>
                        </form>

                        {/* Table showing existing internal alerts */}
                        {internalAlerts.length > 0 && (
                          <div
                            className="table-responsive"
                            style={{ maxHeight: 500, overflowY: "auto" }}
                          >
                            <h5>Existing Internal Alerts</h5>
                            <table className="table table-hover table-bordered table-striped align-middle shadow-sm">
                              <thead className="table-primary sticky-top">
                                <tr>
                                  <th>ID</th>
                                  <th>Alert On</th>
                                  <th>Template</th>
                                  <th>Person</th>
                                  <th>Phone</th>
                                  <th>Email</th>
                                  <th>Actions</th>
                                </tr>
                              </thead>
                              <tbody>
                                {internalAlerts.map((alert) => (
                                  <tr key={alert.id}>
                                    <td>{alert.id}</td>
                                    <td>{alert.alert_on}</td>
                                    <td>{alert.template_name}</td>
                                    <td>{alert.person_name}</td>
                                    <td>{alert.phone}</td>
                                    <td>{alert.email}</td>
                                    <td className="d-flex gap-2">
                                      <button
                                        className="btn btn-sm btn-warning"
                                        onClick={() =>
                                          handleInternalEdit(alert)
                                        }
                                      >
                                        Edit
                                      </button>
                                      <button
                                        className="btn btn-sm btn-danger"
                                        onClick={() =>
                                          handleInternalDelete(alert.id)
                                        }
                                      >
                                        Delete
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}

                    {activeAlertSection === "escalation" && (
                      <div>
                        {/* === Escalation form (keep as-is) === */}
                        <form className="row g-4">
                          {/* existing escalation form fields */}
                          <div className="col-md-3">
                            <label className="form-label fw-semibold">
                              Alert On
                            </label>
                            <select
                              className="form-select shadow-sm rounded-2"
                              value={escalationAlertOn}
                              onChange={(e) =>
                                setEscalationAlertOn(e.target.value)
                              }
                            >
                              <option value="">Select</option>
                              <option value="SMS">SMS</option>
                              <option value="Email">Email</option>
                              <option value="WhatsApp">WhatsApp</option>
                              <option value="All">All</option>
                            </select>
                          </div>
                          <div className="col-md-3">
                            <label className="form-label fw-semibold">
                              Scenario
                            </label>
                            <select
                              className="form-select shadow-sm rounded-2"
                              value={selectedLevel1}
                              onChange={(e) =>
                                setSelectedLevel1(e.target.value)
                              }
                            >
                              <option value="">Select Level 1</option>
                              {level1Categories.map((cat) => (
                                <option key={cat.id} value={cat.id}>
                                  {cat.ecrName}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Level 2 */}
                          {level2Categories.length > 0 && (
                            <div className="col-md-3">
                              <label className="form-label fw-semibold">
                                Sub Scenario
                              </label>
                              <select
                                className="form-select shadow-sm rounded-2"
                                value={selectedLevel2}
                                onChange={(e) =>
                                  setSelectedLevel2(e.target.value)
                                }
                              >
                                <option value="">Select Level 2</option>
                                {level2Categories.map((cat) => (
                                  <option key={cat.id} value={cat.id}>
                                    {cat.ecrName}
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}

                          {/* Level 3 */}
                          {level3Categories.length > 0 && (
                            <div className="col-md-3">
                              <label className="form-label fw-semibold">
                                Sub Scenario 3
                              </label>
                              <select
                                className="form-select shadow-sm rounded-2"
                                value={selectedLevel3}
                                onChange={(e) =>
                                  setSelectedLevel3(e.target.value)
                                }
                              >
                                <option value="">Select Level 3</option>
                                {level3Categories.map((cat) => (
                                  <option key={cat.id} value={cat.id}>
                                    {cat.ecrName}
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}

                          {/* Level 4 */}
                          {level4Categories.length > 0 && (
                            <div className="col-md-3">
                              <label className="form-label fw-semibold">
                                Sub Scenario 4
                              </label>
                              <select
                                className="form-select shadow-sm rounded-2"
                                value={selectedLevel4}
                                onChange={(e) =>
                                  setSelectedLevel4(e.target.value)
                                }
                              >
                                <option value="">Select Level 4</option>
                                {level4Categories.map((cat) => (
                                  <option key={cat.id} value={cat.id}>
                                    {cat.ecrName}
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}

                          {/* Level 5 */}
                          {level5Categories.length > 0 && (
                            <div className="col-md-3">
                              <label className="form-label fw-semibold">
                                Sub Scenario 5
                              </label>
                              <select
                                className="form-select shadow-sm rounded-2"
                                value={selectedLevel5}
                                onChange={(e) =>
                                  setSelectedLevel5(e.target.value)
                                }
                              >
                                <option value="">Select Level 5</option>
                                {level5Categories.map((cat) => (
                                  <option key={cat.id} value={cat.id}>
                                    {cat.ecrName}
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}

                          {/* Template Name Dropdown */}
                          <div className="col-md-4">
                            <label className="form-label fw-semibold">
                              Template Name
                            </label>
                            <select
                              className="form-select shadow-sm rounded-2"
                              value={selectedTemplate}
                              onChange={(e) => {
                                const name = e.target.value;
                                setSelectedTemplate(name);
                                const found = templates.find(
                                  (t) => t.template_name === name
                                );
                                setCallerTemplateText(
                                  found?.template_text || ""
                                );
                              }}
                            >
                              <option value="">Select Template</option>
                              {templates.map((t, i) => (
                                <option key={i} value={t.template_name}>
                                  {t.template_name}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Template Text (Readonly) */}
                          <div className="col-md-6">
                            <label className="form-label fw-semibold">
                              Template Text
                            </label>
                            <textarea
                              className="form-control shadow-sm rounded-2"
                              rows="4"
                              value={callerTemplateText}
                              readOnly
                            ></textarea>
                          </div>
                          <div className="col-md-3">
                            <label className="form-label fw-semibold">
                              TAT
                            </label>
                            <input
                              type="text"
                              className="form-control shadow-sm rounded-2"
                              value={escalationTAT}
                              onChange={(e) => setEscalationTAT(e.target.value)}
                              placeholder="TAT in Hr"
                            />
                          </div>
                          <div className="col-md-3">
                            <label className="form-label fw-semibold">
                              Name
                            </label>
                            <input
                              type="text"
                              className="form-control shadow-sm rounded-2"
                              value={escalationPersonName}
                              onChange={(e) =>
                                setEscalationPersonName(e.target.value)
                              }
                              placeholder="Person Name"
                            />
                          </div>
                          <div className="col-md-3">
                            <label className="form-label fw-semibold">
                              Mobile No.
                            </label>
                            <input
                              type="text"
                              className="form-control shadow-sm rounded-2"
                              value={escalationPersonPhone}
                              onChange={(e) =>
                                setEscalationPersonPhone(e.target.value)
                              }
                              placeholder="Mobile No."
                            />
                          </div>
                          <div className="col-md-3">
                            <label className="form-label fw-semibold">
                              Email
                            </label>
                            <input
                              type="email"
                              className="form-control shadow-sm rounded-2"
                              value={escalationPersonEmail}
                              onChange={(e) =>
                                setEscalationPersonEmail(e.target.value)
                              }
                              placeholder="Email"
                            />
                          </div>

                          {/* WhatsApp API Key and Session ID - same row, below template text */}

                          <div className="col-md-3">
                            <label className="form-label fw-semibold">WhatsApp API Key</label>
                            <input
                              type="text"
                              className="form-control shadow-sm rounded-2"
                              value={escalationWhatsappkey}
                              onChange={(e) => escalationsetWhatsappkey(e.target.value)}
                              placeholder="Enter WhatsApp API Key"
                            />
                          </div>

                          <div className="col-md-3">
                            <label className="form-label fw-semibold">WhatsApp Session ID</label>
                            <input
                              type="text"
                              className="form-control shadow-sm rounded-2"
                              value={escalationSessionId}
                              onChange={(e) => escalationsetSessionId(e.target.value)}
                              placeholder="Enter WhatsApp Session ID"
                            />
                          </div>

                          <div className="col-12 d-flex justify-content-center gap-3 mt-4">
                            <button
                              type="button"
                              className="btn btn-primary shadow-sm px-5 py-2 rounded-3"
                              onClick={handleEscalationAdd}
                            >
                              {editingEscalationAlertId ? "UPDATE" : "ADD"}
                            </button>
                            {editingEscalationAlertId && (
                              <button
                                type="button"
                                className="btn btn-secondary shadow-sm px-5 py-2 rounded-3"
                                onClick={resetEscalationForm}
                              >
                                Cancel Edit
                              </button>
                            )}
                          </div>
                        </form>
                        <div className="mt-5">
                          <h5 className="fw-bold mb-3">
                            Existing Escalation Alerts
                          </h5>
                          {loadingEscalations ? (
                            <p>Loading...</p>
                          ) : escalationAlerts.length === 0 ? (
                            <p>No escalation alerts found.</p>
                          ) : (
                            <table className="table table-bordered table-striped align-middle shadow-sm">
                              <thead className="table-primary sticky-top">
                                <tr>
                                  <th>ID</th>
                                  <th>Alert On</th>
                                  <th>Template Name</th>
                                  <th>Person Name</th>
                                  <th>Phone</th>
                                  <th>Email</th>
                                  <th>TAT</th>
                                  <th>Actions</th>
                                </tr>
                              </thead>
                              <tbody>
                                {escalationAlerts.map((alert) => (
                                  <tr key={alert.id}>
                                    <td>{alert.id}</td>
                                    <td>{alert.alert_on}</td>
                                    <td>{alert.template_name}</td>
                                    <td>{alert.person_name}</td>
                                    <td>{alert.phone}</td>
                                    <td>{alert.email}</td>
                                    <td>{alert.tat}</td>
                                    <td>
                                      <button
                                        className="btn btn-sm btn-warning me-2"
                                        onClick={() =>
                                          handleEscalationEdit(alert)
                                        }
                                      >
                                        Edit
                                      </button>
                                      <button
                                        className="btn btn-sm btn-danger"
                                        onClick={() =>
                                          handleEscalationDelete(alert.id)
                                        }
                                      >
                                        Delete
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        (userType === "Super-Admin" || userType === "Admin") && (
          <p className="card-title text-muted">
            Please select a client to manage alerts & escalations.
          </p>
        )
      )}
    </div>
  );
}
