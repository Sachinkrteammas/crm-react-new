
// src/pages/ManageOutCallCloseField.jsx
import { useState, useEffect } from "react";
import api from "../api";

const ManageOutCallCloseField = () => {
  const [fields, setFields] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingField, setEditingField] = useState(null);
  const [form, setForm] = useState({
    FieldName: "",
    FieldType: "",
    FieldValidation: "",
    RequiredCheck: false,
    Priority: "",
    fieldNumber: "",
    DropDownValues: [],
  });

  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState("");
  const [campaigns, setCampaigns] = useState([]);
  const [selectedCampaign, setSelectedCampaign] = useState("");

  const companyId = localStorage.getItem("company_id");
  const clientIdFromStorage = localStorage.getItem("clientId");
  const userType = localStorage.getItem("user_type");

  // ----- NEW state for Values modal -----
  const [showValuesModal, setShowValuesModal] = useState(false);
  const [valuesField, setValuesField] = useState(null);
  const [valuesList, setValuesList] = useState([]);
  const [valuesLoading, setValuesLoading] = useState(false);
  const [valueInput, setValueInput] = useState("");
  const [editingValueId, setEditingValueId] = useState(null);


  const removeBootstrapBackdrop = () => {
    try {
      document.body.classList.remove("modal-open");
      const backdrops = document.querySelectorAll(".modal-backdrop");
      backdrops.forEach((b) => b.remove());
    } catch (err) {
      // ignore in non-browser environments or if DOM not available yet
    }
  };

  // -------------------- Fetch clients --------------------
  useEffect(() => {
    const fetchClients = async () => {
      try {
        console.log(">>> Fetching clients");
        const res = await api.get("/agents/clients-rights");
        console.log("Clients API:", res.data);
        const sortedClients = (res.data || []).sort((a, b) =>
          a.company_name.localeCompare(b.company_name, "en", {
            sensitivity: "base",
          })
        );
        setClients(sortedClients);

        // if only one client, auto-select it (useful for Admin accounts with single client)
        if (sortedClients.length === 1) {
          setSelectedClient(String(sortedClients[0].company_id));
          console.log(
            "Auto-selected client (single client list):",
            String(sortedClients[0].company_id)
          );
        }
      } catch (err) {
        console.error("Error fetching clients:", err);
      }
    };

    if (userType === "Super-Admin" || userType === "Admin") {
      // Admins should fetch full client list
      fetchClients();
    } else {
      // For client users, prefer companyId, fallback to clientIdFromStorage
      const s = companyId || clientIdFromStorage || "";
      // Defensive: skip invalid string values
      if (s && s !== "null" && s !== "undefined") {
        setSelectedClient(String(s));
        console.log("Non-admin selected client set to:", s);
      } else {
        console.warn(
          "Client user detected but no company_id/clientId found in localStorage"
        );
      }
    }
  }, [userType, companyId, clientIdFromStorage]);

  // -------------------- Fetch campaigns --------------------
  useEffect(() => {
    // Defensive checks for invalid selectedClient values
    if (
      !selectedClient ||
      selectedClient === "null" ||
      selectedClient === "undefined"
    ) {
      setCampaigns([]);
      setSelectedCampaign("");
      return;
    }

    const fetchCampaigns = async () => {
      try {
        console.log(">>> Fetching campaigns for client:", selectedClient);
        const res = await api.get("/campaign/list", {
          params: { ClientId: Number(selectedClient) },
        });
        console.log("Campaigns API:", res.data);
        setCampaigns(res.data || []);

        // auto-select first campaign ONLY for non-admin (client) users
        if (
          userType !== "Super-Admin" &&
          userType !== "Admin" &&
          Array.isArray(res.data) &&
          res.data.length > 0
        ) {
          const firstId = String(res.data[0].id);
          // Only set if nothing already selected to avoid overriding admin selection
          if (!selectedCampaign || selectedCampaign === "") {
            setSelectedCampaign(firstId);
            console.log("Auto-selected campaign for client:", firstId);
          }
        }
      } catch (err) {
        console.error("Error fetching campaigns:", err);
        setCampaigns([]);
      }
    };

    fetchCampaigns();
    // only re-run when selectedClient or userType changes
  }, [selectedClient, userType]);

  // -------------------- Fetch Fields when both client & campaign selected --------------------
  useEffect(() => {
    console.log(
      "selectedClient changed:",
      selectedClient,
      "selectedCampaign changed:",
      selectedCampaign
    );
    if (selectedClient && selectedCampaign) {
      fetchFields();
    } else {
      setFields([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClient, selectedCampaign]);

  const fetchFields = async () => {
    if (!selectedClient || !selectedCampaign) {
      console.log(
        "fetchFields skipped - client/campaign missing",
        selectedClient,
        selectedCampaign
      );
      return;
    }

    try {
      console.log(
        `>>> Requesting /outcall/close_fields/${selectedClient}?campaign_id=${selectedCampaign}`
      );
      const res = await api.get(`/outcall/close_fields/${Number(selectedClient)}`, {
        params: { campaign_id: Number(selectedCampaign) },
      });
      console.log("close_fields response:", res.data);

      // Normalize data
      const normalized = (res.data || []).map((f) => ({
        ...f,
        RequiredCheck:
          f.RequiredCheck === "1" || f.RequiredCheck === 1 || f.RequiredCheck === true,
        DropDownValues: Array.isArray(f.DropDownValues)
          ? f.DropDownValues.map((d) => ({
              id: d.id,
              FieldValueName: d.FieldValueName ?? d.value ?? d.name ?? "",
            }))
          : [],
      }));

      console.log("normalized fields:", normalized);
      setFields(normalized);
    } catch (err) {
      console.error("Error fetching close fields:", err);
      setFields([]);
    }
  };

  const resetForm = () => {
    setForm({
      FieldName: "",
      FieldType: "",
      FieldValidation: "",
      RequiredCheck: false,
      Priority: "",
      fieldNumber: "",
      DropDownValues: [],
    });
    setEditingField(null);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name === "FieldType" && value === "DropDown") {
      setForm((prev) => ({
        ...prev,
        [name]: value,
        DropDownValues: prev.DropDownValues.length ? prev.DropDownValues : [""],
      }));
    } else {
      setForm((prev) => ({
        ...prev,
        [name]: type === "checkbox" ? checked : value,
      }));
    }
  };

  // -------------------- Field CRUD --------------------
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedClient || !selectedCampaign) {
      alert("Please select client and campaign.");
      return;
    }

    const payload = {
      FieldName: form.FieldName,
      FieldType: form.FieldType,
      FieldValidation: form.FieldValidation,
      Priority: form.Priority ? parseInt(form.Priority, 10) : null,
      fieldNumber: form.fieldNumber ? parseInt(form.fieldNumber, 10) : null,
      RequiredCheck: form.RequiredCheck ? 1 : 0,
      DropDownValues:
        form.FieldType === "DropDown"
          ? (form.DropDownValues || [])
              .map((v) => (typeof v === "string" ? v.trim() : String(v).trim()))
              .filter((v) => v)
          : [],
      CampaignId: Number(selectedCampaign),
    };

    console.log("Submitting payload:", payload, "to client:", selectedClient);

    try {
      let fieldId;
      if (editingField) {
        fieldId = editingField.id;
        const res = await api.put(
          `/outcall/close_fields/${Number(selectedClient)}/${fieldId}`,
          payload
        );
        console.log("Update response:", res.data);
        alert("Field updated successfully!");
      } else {
        const res = await api.post(
          `/outcall/close_fields/${Number(selectedClient)}`,
          payload
        );
        console.log("Create response:", res.data);
        fieldId = res.data?.field_id || res.data?.id || null;
        alert("Field added successfully!");
      }
      resetForm();

      setShowModal(false);
      removeBootstrapBackdrop();

      // refresh list after successful create/update
      fetchFields();
    } catch (err) {
      console.error("Save error:", err, err?.response?.data || "");
      alert("Error: " + (err.response?.data?.detail || "Failed to save close field"));
    }
  };

  const handleEdit = (field) => {
    console.log("handleEdit field:", field);

    const ddStrings = Array.isArray(field.DropDownValues)
      ? field.DropDownValues.map((v) => v.FieldValueName || "")
      : [];

    setForm({
      FieldName: field.FieldName || "",
      FieldType: field.FieldType || "",
      FieldValidation: field.FieldValidation || "",
      RequiredCheck: !!field.RequiredCheck,
      Priority: field.Priority || "",
      fieldNumber: field.fieldNumber || "",
      DropDownValues: ddStrings.length ? ddStrings : [],
    });

    setEditingField(field);
    setShowModal(true);
  };

  const handleDelete = async (fieldId) => {
    if (!window.confirm("Delete this close field?")) return;
    try {
      console.log("Deleting field:", fieldId, "for client:", selectedClient);
      const res = await api.delete(
        `/outcall/close_fields/${Number(selectedClient)}/${fieldId}`
      );
      console.log("Delete response:", res.data);
      // remove from local state for immediate UX
      setFields((prev) => prev.filter((f) => f.id !== fieldId));
    } catch (err) {
      console.error("Delete error:", err);
      alert("Failed to delete close field");
    }
  };

  // -------------------- Dropdown Values (form) --------------------
  const handleDropDownValueChange = (idx, value) => {
    const newValues = [...form.DropDownValues];
    newValues[idx] = value;
    setForm({ ...form, DropDownValues: newValues });
  };

  const addDropDownValue = () => {
    setForm({ ...form, DropDownValues: [...(form.DropDownValues || []), ""] });
  };

  const removeDropDownValue = (idx) => {
    setForm({
      ...form,
      DropDownValues: form.DropDownValues.filter((_, i) => i !== idx),
    });
  };

  // -------------------- VALUES MODAL HANDLERS (NEW) -----
  const openValuesModal = async (field) => {
    if (!field || !field.id || !selectedClient) return;
    setValuesField(field);
    setShowValuesModal(true);
    await fetchValuesForField(field.id);
    setEditingValueId(null);
    setValueInput("");
  };

  // Fetch values list for a field (GET /outcall/close_field_values/{client_id}/{field_id})
  const fetchValuesForField = async (fieldId) => {
    if (!selectedClient) return;
    setValuesLoading(true);
    try {
      const res = await api.get(`/outcall/close_field_values/${selectedClient}/${fieldId}`);
      const list = Array.isArray(res.data)
        ? res.data.map((v) => ({ id: v.id, FieldValueName: v.FieldValueName }))
        : [];
      setValuesList(list);
    } catch (err) {
      console.error("Error fetching values for field", fieldId, err);
      setValuesList([]);
    } finally {
      setValuesLoading(false);
    }
  };

  // Start editing an existing value
  const startEditValue = (val) => {
    setEditingValueId(val.id);
    setValueInput(val.FieldValueName || "");
  };

  // Cancel editing value
  const cancelEditValue = () => {
    setEditingValueId(null);
    setValueInput("");
  };

  // Save value (create or update)
  const saveValue = async () => {
    if (!valuesField || !valuesField.id || !selectedClient) {
      alert("No field selected.");
      return;
    }
    const fieldId = valuesField.id;
    const trimmed = (valueInput || "").trim();
    if (!trimmed) {
      alert("Please enter a value.");
      return;
    }

    try {
      if (editingValueId) {
        // update value
        await api.put(
          `/outcall/close_field_values/${selectedClient}/${editingValueId}`,
          {
            FieldValueName: trimmed,
          }
        );
      } else {
        // create value
        await api.post(`/outcall/close_field_values/${selectedClient}`, {
          FieldId: fieldId,
          FieldValueName: trimmed,
        });
      }

      // refresh values and fields
      await fetchValuesForField(fieldId);
      fetchFields();
      setValueInput("");
      setEditingValueId(null);
    } catch (err) {
      console.error("Error saving value", err, err?.response?.data || "");
      alert("Failed to save value.");
    }
  };

  // Delete a value
  const deleteValue = async (valueId) => {
    if (!valuesField || !valuesField.id || !selectedClient) {
      alert("No field selected.");
      return;
    }
    if (!window.confirm("Delete this value?")) return;

    try {
      await api.delete(`/outcall/close_field_values/${selectedClient}/${valuesField.id}/${valueId}`);
      // refresh list and fields
      await fetchValuesForField(valuesField.id);
      fetchFields();
    } catch (err) {
      console.error("Error deleting value", err, err?.response?.data || "");
      alert("Failed to delete value.");
    }
  };

  // Close values modal and clear state
  const closeValuesModal = () => {
    setShowValuesModal(false);
    setValuesField(null);
    setValuesList([]);
    setValueInput("");
    setEditingValueId(null);

    removeBootstrapBackdrop();
  };

  // ------------------------------------------------------------------
  // UI
  // ------------------------------------------------------------------
  return (
    <div className="row">
      <div className="col-12">
        {/* Client + Campaign Selector */}
        {(userType === "Super-Admin" || userType === "Admin") && (
          <div className="row mb-4">
            <div className="col-md-6">
              <label className="form-label fw-semibold">Select Client</label>
              <select
                className="form-select"
                value={selectedClient}
                onChange={(e) => {
                  const v = e.target.value;
                  console.log("Client selected:", v);
                  setSelectedClient(v);
                  setSelectedCampaign("");
                  setFields([]);
                }}
              >
                <option value="">-- Select Client --</option>
                {clients.map((c) => (
                  <option key={c.company_id} value={String(c.company_id)}>
                    {c.company_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-md-6">
              <label className="form-label fw-semibold">Select Campaign</label>
              <select
                className="form-select"
                value={selectedCampaign}
                onChange={(e) => {
                  const v = e.target.value;
                  console.log("Campaign selected:", v);
                  setSelectedCampaign(v);
                }}
                disabled={!selectedClient}
              >
                <option value="">-- Select Campaign --</option>
                {campaigns.map((c) => (
                  <option key={c.id} value={String(c.id)}>
                    {c.CampaignName || c.campaign_name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Non-admin users → Only show Campaign dropdown (client users) */}
        {!(userType === "Super-Admin" || userType === "Admin") && (
          <div className="row mb-4">
            <div className="col-md-6">
              <label className="form-label fw-semibold">Select Campaign</label>
              <select
                className="form-select"
                value={selectedCampaign}
                onChange={(e) => setSelectedCampaign(e.target.value)}
                disabled={!selectedClient}
              >
                <option value="">-- Select Campaign --</option>
                {campaigns.map((c) => (
                  <option key={c.id} value={String(c.id)}>
                    {c.CampaignName || c.campaign_name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Fields table */}
        {selectedClient && selectedCampaign ? (
          <>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h3>Manage Close Fields</h3>
              <button
                className="btn btn-primary"
                onClick={() => {
                  resetForm();
                  setShowModal(true);
                }}
              >
                + Add Close Field
              </button>
            </div>

            {/* TABLE */}
            <div
              className="table-responsive"
              style={{ maxHeight: 500, overflowY: "auto" }}
            >
              <table className="table table-hover table-striped table-bordered align-middle shadow-sm">
                <thead className="table-dark sticky-top">
                  <tr>
                    <th className="text-center">Name</th>
                    <th className="text-center">Type</th>
                    <th className="text-center">Validation</th>
                    <th className="text-center">Required</th>
                    <th className="text-center">Priority</th>
                    <th className="text-center">Field</th>
                    <th className="text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {fields.length > 0 ? (
                    fields.map((field) => (
                      <tr key={field.id}>
                        <td className="text-center">{field.FieldName}</td>
                        <td className="text-center">{field.FieldType}</td>
                        <td className="text-center">{field.FieldValidation}</td>
                        <td className="text-center">{field.RequiredCheck ? "Yes" : "No"}</td>
                        <td className="text-center">{field.Priority}</td>
                        <td className="text-center">{field.fieldNumber}</td>
                        <td className="text-center">
                          <div className="d-flex justify-content-center gap-2 flex-wrap">
                            <button
                              className="btn btn-sm btn-outline-warning"
                              onClick={() => handleEdit(field)}
                              title="Edit Field"
                            >
                              ✏ Edit
                            </button>
                            <button
                              className="btn btn-sm btn-outline-danger"
                              onClick={() => handleDelete(field.id)}
                              title="Delete Field"
                            >
                              🗑 Delete
                            </button>
                            <button
                              className="btn btn-sm btn-outline-info"
                              disabled={
                                !(
                                  field.FieldType === "DropDown" ||
                                  field.FieldType === "Dropdown"
                                )
                              }
                              onClick={() => openValuesModal(field)}
                              title={
                                field.FieldType === "DropDown" ||
                                field.FieldType === "Dropdown"
                                  ? "Manage Dropdown Values"
                                  : "Not a dropdown field"
                              }
                            >
                              📂 Values
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="7" className="text-center text-muted py-3">
                        No close fields found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Add/Edit Field Modal (existing behavior kept) */}
            {showModal && (
              <div className="modal fade show" style={{ display: "block" }} tabIndex="-1">
                <div className="modal-dialog modal-lg">
                  <div className="modal-content">
                    <div className="modal-header">
                      <h5 className="modal-title">
                        {editingField ? "Edit Close Field" : "Add Close Field"}
                      </h5>
                      <button
                        type="button"
                        className="btn-close"
                        onClick={() => {
                          setShowModal(false);
                          removeBootstrapBackdrop();
                        }}
                      ></button>
                    </div>
                    <div className="modal-body">
                      <form className="row g-3" onSubmit={handleSubmit}>
                        <div className="col-md-6">
                          <label className="form-label">Field Name *</label>
                          <input
                            name="FieldName"
                            className="form-control"
                            value={form.FieldName}
                            onChange={handleChange}
                            required
                          />
                        </div>
                        <div className="col-md-6">
                          <label className="form-label">Field Type *</label>
                          <select
                            name="FieldType"
                            className="form-select"
                            value={form.FieldType}
                            onChange={handleChange}
                            required
                          >
                            <option value="">-- Select Field Type --</option>
                            <option value="TextBox">Text Box</option>
                            <option value="TextArea">Text Area</option>
                            <option value="DropDown">Drop Down</option>
                          </select>
                        </div>

                        {form.FieldType === "DropDown" && (
                          <div className="col-12">
                            <label className="form-label">Dropdown Values</label>
                            {(form.DropDownValues || []).map((val, idx) => (
                              <div key={idx} className="d-flex gap-2 mb-2">
                                <input
                                  type="text"
                                  value={val}
                                  onChange={(e) => handleDropDownValueChange(idx, e.target.value)}
                                  className="form-control"
                                  placeholder={`Value ${idx + 1}`}
                                />
                                <button type="button" className="btn btn-danger" onClick={() => removeDropDownValue(idx)}>
                                  X
                                </button>
                              </div>
                            ))}
                            <button type="button" className="btn btn-primary" onClick={addDropDownValue}>
                              + Add Value
                            </button>
                          </div>
                        )}

                        <div className="col-md-6">
                          <label className="form-label">Validation</label>
                          <select name="FieldValidation" className="form-select" value={form.FieldValidation} onChange={handleChange}>
                            <option value="">-- Select Validation --</option>
                            <option value="Numeric">Numeric</option>
                            <option value="Char">Character</option>
                            <option value="Alphanumeric">Alphanumeric</option>
                            <option value="Datepicker">Datepicker</option>
                            <option value="Timepicker">Timepicker</option>
                          </select>
                        </div>
                        <div className="col-md-6 d-flex align-items-center">
                          <div className="form-check mt-4">
                            <input type="checkbox" className="form-check-input" name="RequiredCheck" checked={form.RequiredCheck} onChange={handleChange} />
                            <label className="form-check-label">Required</label>
                          </div>
                        </div>
                        <div className="col-md-6">
                          <label className="form-label">Priority</label>
                          <input name="Priority" className="form-control" value={form.Priority} onChange={handleChange} />
                        </div>
                        <div className="col-md-6">
                          <label className="form-label">Field Number</label>
                          <input name="fieldNumber" className="form-control" value={form.fieldNumber} onChange={handleChange} />
                        </div>
                        <div className="col-12">
                          <button type="submit" className="btn btn-primary">
                            {editingField ? "Update" : "Save"}
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* INLINE VALUES PANEL */}
            {showValuesModal && valuesField && (
              <div className="mt-4 p-3 rounded shadow-sm" style={{ background: "#ffffff", border: "1px solid #e5e5e5" }}>
                <h5 className="fw-semibold mb-3">Field Values for {valuesField.FieldName}</h5>

                {/* Input row */}
                <div className="d-flex mb-3" style={{ gap: "10px" }}>
                  <input type="text" className="form-control" placeholder="Enter value" value={valueInput} onChange={(e) => setValueInput(e.target.value)} />
                  <button className="btn btn-success" onClick={saveValue}>
                    {editingValueId ? "Update" : "Add"}
                  </button>
                  {editingValueId && (
                    <button className="btn btn-secondary" onClick={cancelEditValue}>
                      Cancel
                    </button>
                  )}
                </div>

                {/* Values list */}
                <div className="list-group">
                  {valuesLoading ? (
                    <div className="text-center py-3">
                      <div className="spinner-border" />
                    </div>
                  ) : valuesList.length === 0 ? (
                    <div className="text-center text-muted py-3">No values found</div>
                  ) : (
                    valuesList.map((v) => (
                      <div key={v.id} className="list-group-item d-flex justify-content-between align-items-center">
                        <div>{v.FieldValueName}</div>

                        <div className="d-flex" style={{ gap: "8px" }}>
                          <button className="btn btn-sm btn-outline-warning" onClick={() => startEditValue(v)}>
                            ✏
                          </button>
                          <button className="btn btn-sm btn-outline-danger" onClick={() => deleteValue(v.id)}>
                            🗑
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Bottom Close */}
                <div className="text-end mt-3">
                  <button className="btn btn-secondary" onClick={closeValuesModal}>
                    Close
                  </button>
                </div>
              </div>
            )}

            {/* NOTE: removed backdrop rendering to avoid overlay/blur */}
          </>
        ) : (
          <div className=""></div>
        )}
      </div>
    </div>
  );
};

export default ManageOutCallCloseField;
