// src/pages/ManageOutCallRequiredFields.jsx
import React, { useEffect, useState } from "react";
import api from "../api";
import { PlusCircle } from "lucide-react";
import "../styles/loader.css";

export default function ManageOutCallRequiredFields() {
  const [clients, setClients] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [fields, setFields] = useState([]);

  const [selectedClient, setSelectedClient] = useState("");
  const [selectedCampaign, setSelectedCampaign] = useState("");

  const [showModal, setShowModal] = useState(false);

  // field form used for Add/Edit (keeps similar shape to ManageFields)
  const [form, setForm] = useState({
    FieldName: "",
    FieldType: "",
    FieldValidation: "",
    RequiredCheck: false,
    Priority: "",
    fieldNumber: "",
    DropDownValues: [],
  });

  const [editingFieldId, setEditingFieldId] = useState(null);

  // values state (inline panel)
  const [valuesMap, setValuesMap] = useState({}); 
  const [valueForm, setValueForm] = useState({ FieldValueName: "" });
  const [editingValue, setEditingValue] = useState(null);
  const [activeFieldForValues, setActiveFieldForValues] = useState(null);

  const [loading, setLoading] = useState(false);

  const userType = localStorage.getItem("user_type");
  const companyId = localStorage.getItem("company_id");

  // --- fetch clients ---
  useEffect(() => {
    if (userType === "Super-Admin" || userType === "Admin") {
      api
        .get("/agents/clients-rights")
        .then((res) => {
          const list = res.data || [];
          list.sort((a, b) =>
            a.company_name.localeCompare(b.company_name, "en", {
              sensitivity: "base",
            })
          );
          setClients(list);
        })
        .catch((err) => console.error("Error fetching clients:", err));
    } else {
      setSelectedClient(companyId);
    }
  }, [userType, companyId]);

  // --- fetch campaigns for selected client ---
  useEffect(() => {
    if (selectedClient) {
      api
        .get("/campaign/list", { params: { ClientId: selectedClient } })
        .then((res) => setCampaigns(res.data || []))
        .catch((err) => console.error("Error fetching campaigns:", err));
    } else {
      setCampaigns([]);
    }
  }, [selectedClient]);

  // --- fetch fields when client+campaign chosen ---
  useEffect(() => {
    if (selectedClient && selectedCampaign) {
      fetchFields();
    } else {
      setFields([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClient, selectedCampaign]);

  const fetchFields = () => {
    setLoading(true);
    // Keep using your manage_out_call endpoint (original implementation)
    api
      .get(
        `/manage_out_call_required_fields/fields/${selectedClient}/${selectedCampaign}`
      )
      .then((res) => {
        const normalized = (res.data || []).map((f) => ({
          id: f.id,
          FieldName: f.FieldName || "",
          FieldType: f.FieldType || "",
          FieldValidation: f.FieldValidation || "",
          RequiredCheck:
            f.RequiredCheck === true ||
            f.RequiredCheck === "1" ||
            f.RequiredCheck === 1,
          Priority: f.Priority || "",
          fieldNumber: f.fieldNumber || "",
        }));
        setFields(normalized);
      })
      .catch((err) => {
        console.error("Error fetching fields:", err);
        setFields([]);
      })
      .finally(() => setLoading(false));
  };

  // ---- open inline values panel and fetch values for that field ----
  const toggleValuesPanel = async (field) => {
    // if toggling off
    if (activeFieldForValues === field.id) {
      setActiveFieldForValues(null);
      return;
    }

    setActiveFieldForValues(field.id);
    // fetch values
    try {
      const res = await api.get(
        `/manage_out_call_required_fields/field_values/${selectedClient}/${field.id}`
      );
      setValuesMap((prev) => ({ ...prev, [field.id]: res.data || [] }));
    } catch (err) {
      console.error("Error fetching field values:", err);
      setValuesMap((prev) => ({ ...prev, [field.id]: [] }));
    }
  };

  // ---- add / update value for activeFieldForValues ----
  const addOrUpdateValue = async () => {
    if (!valueForm.FieldValueName || !valueForm.FieldValueName.trim()) {
      alert("Please enter a value name.");
      return;
    }
    if (!activeFieldForValues) {
      alert("No field selected to add value.");
      return;
    }

    const payload = {
      FieldId: activeFieldForValues,
      FieldValueName: valueForm.FieldValueName.trim(),
    };

    try {
      if (editingValue && editingValue.id) {
        await api.put(
          `/manage_out_call_required_fields/field_values/${selectedClient}/${editingValue.id}`,
          payload
        );
      } else {
        await api.post(
          `/manage_out_call_required_fields/field_values/${selectedClient}`,
          payload
        );
      }

      // refresh values
      const res = await api.get(
        `/manage_out_call_required_fields/field_values/${selectedClient}/${activeFieldForValues}`
      );
      setValuesMap((prev) => ({
        ...prev,
        [activeFieldForValues]: res.data || [],
      }));
      setValueForm({ FieldValueName: "" });
      setEditingValue(null);
    } catch (err) {
      console.error("Error saving field value:", err);
      alert("Failed to save value.");
    }
  };

  const startEditValue = (val) => {
    setEditingValue(val);
    setValueForm({ FieldValueName: val.FieldValueName });
    setActiveFieldForValues(val.FieldId || activeFieldForValues);
  };

  const deleteValue = async (valueId) => {
    if (!window.confirm("Delete this value?")) return;
    try {
      await api.delete(
        `/manage_out_call_required_fields/field_values/${selectedClient}/${activeFieldForValues}/${valueId}`
      );
      const res = await api.get(
        `/manage_out_call_required_fields/field_values/${selectedClient}/${activeFieldForValues}`
      );
      setValuesMap((prev) => ({
        ...prev,
        [activeFieldForValues]: res.data || [],
      }));
    } catch (err) {
      console.error("Error deleting field value:", err);
      alert("Failed to delete value.");
    }
  };

  // ---- Add / Edit Field (modal) ----
  const openAddModal = () => {
    setEditingFieldId(null);
    setForm({
      FieldName: "",
      FieldType: "",
      FieldValidation: "",
      RequiredCheck: false,
      Priority: "",
      fieldNumber: "",
      DropDownValues: [],
    });
    setShowModal(true);
  };

  const handleEditField = async (field) => {
    setEditingFieldId(field.id);
    // If field is dropdown, fetch existing dropdown values and place into form.DropDownValues
    let dropDownValues = [];
    if (field.FieldType === "DropDown" || field.FieldType === "Dropdown") {
      try {
        const res = await api.get(
          `/manage_out_call_required_fields/field_values/${selectedClient}/${field.id}`
        );
        dropDownValues = res.data.map((v) => v.FieldValueName);
      } catch (err) {
        console.error("Failed to fetch dropdown values", err);
      }
    }

    setForm({
      FieldName: field.FieldName || "",
      FieldType: field.FieldType || "",
      FieldValidation: field.FieldValidation || "",
      RequiredCheck: !!field.RequiredCheck,
      Priority: field.Priority || "",
      fieldNumber: field.fieldNumber || "",
      DropDownValues: dropDownValues.length ? dropDownValues : [],
    });
    setShowModal(true);
  };

  const handleSaveField = async () => {
    if (!form.FieldName || !form.FieldName.trim()) {
      alert("Field Name is required.");
      return;
    }

    // normalise type/validation
    const ft = form.FieldType === "Dropdown" ? "DropDown" : form.FieldType;
    const payload = {
      ...form,
      FieldType: ft,
      FieldValidation: form.FieldValidation || null,
      RequiredCheck: !!form.RequiredCheck,
      Priority: form.Priority ? parseInt(form.Priority, 10) : null,
      fieldNumber: form.fieldNumber ? parseInt(form.fieldNumber, 10) : null,
      CampaignId: selectedCampaign,
    };

    const urlBase = `/manage_out_call_required_fields/fields/${selectedClient}/${selectedCampaign}`;

    try {
      let fieldId = editingFieldId;

      if (editingFieldId) {
        await api.put(`${urlBase}/${editingFieldId}`, payload);

        // if changing/maintaining dropdown values, sync them:
        if (ft === "DropDown") {
          // fetch existing values
          const existRes = await api.get(
            `/manage_out_call_required_fields/field_values/${selectedClient}/${editingFieldId}`
          );
          const existing = existRes.data || [];
          const existingNames = existing.map((e) => e.FieldValueName);

          // add new ones
          for (const val of (form.DropDownValues || []).filter(
            (v) => v && v.trim() !== ""
          )) {
            if (!existingNames.includes(val)) {
              await api.post(
                `/manage_out_call_required_fields/field_values/${selectedClient}`,
                {
                  FieldId: editingFieldId,
                  FieldValueName: val,
                }
              );
            }
          }

          // delete removed ones
          for (const ev of existing) {
            if (!(form.DropDownValues || []).includes(ev.FieldValueName)) {
              await api.delete(
                `/manage_out_call_required_fields/field_values/${selectedClient}/${editingFieldId}/${ev.id}`
              );
            }
          }
        }
      } else {
        // create
        const res = await api.post(urlBase, payload);
        // backend returns created id in different keys depending on implementation; try common ones
        fieldId = res.data?.field_id || res.data?.id || null;

        if (ft === "DropDown" && fieldId) {
          for (const val of (form.DropDownValues || []).filter(
            (v) => v && v.trim() !== ""
          )) {
            await api.post(
              `/manage_out_call_required_fields/field_values/${selectedClient}`,
              {
                FieldId: fieldId,
                FieldValueName: val,
              }
            );
          }
        }
      }

      setShowModal(false);
      setEditingFieldId(null);
      setForm({
        FieldName: "",
        FieldType: "",
        FieldValidation: "",
        RequiredCheck: false,
        Priority: "",
        fieldNumber: "",
        DropDownValues: [],
      });
      fetchFields();
    } catch (err) {
      console.error("Error saving field:", err);
      alert("Failed to save field. Check console for details.");
    }
  };

  const handleDeleteField = (id) => {
    if (!window.confirm("Are you sure you want to delete this field?")) return;
    api
      .delete(
        `/manage_out_call_required_fields/fields/${selectedClient}/${selectedCampaign}/${id}`
      )
      .then(() => fetchFields())
      .catch((err) => {
        console.error("Error deleting field:", err);
        alert("Unable to delete field.");
      });
  };

  // ---- helpers for the form ----
  const onFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name === "FieldType" && value === "DropDown") {
      setForm((prev) => ({
        ...prev,
        [name]: value,
        DropDownValues: prev.DropDownValues || [""],
      }));
    } else {
      setForm((prev) => ({
        ...prev,
        [name]: type === "checkbox" ? checked : value,
      }));
    }
  };

  // add/remove DropDown values in the add/edit modal
  const addDropDownValueSlot = () =>
    setForm((prev) => ({
      ...prev,
      DropDownValues: [...(prev.DropDownValues || []), ""],
    }));
  const removeDropDownValueAt = (idx) =>
    setForm((prev) => ({
      ...prev,
      DropDownValues: prev.DropDownValues.filter((_, i) => i !== idx),
    }));
  const updateDropDownValueAt = (idx, val) =>
    setForm((prev) => {
      const arr = [...(prev.DropDownValues || [])];
      arr[idx] = val;
      return { ...prev, DropDownValues: arr };
    });

  return (
    <div className="row">
      <div className="col-12">
        {/* Client + Campaign Selector (Admin / Super Admin) */}
        {userType === "Super-Admin" || userType === "Admin" ? (
          <div className="row mb-4">
            {/* Select Client */}
            <div className="col-md-6">
              <label className="form-label fw-semibold">Select Client</label>
              <select
                className="form-select"
                value={selectedClient}
                onChange={(e) => {
                  setSelectedClient(e.target.value);
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

            {/* Select Campaign */}
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
                  <option key={c.id} value={c.id}>
                    {c.CampaignName}
                  </option>
                ))}
              </select>
            </div>
          </div>
        ) : (
          /* Non-admin users → Only show Campaign dropdown */
          <div className="row mb-4">
            <div className="col-md-6">
              <label className="form-label fw-semibold">Select Campaign</label>
              <select
                className="form-select"
                value={selectedCampaign}
                onChange={(e) => setSelectedCampaign(e.target.value)}
              >
                <option value="">-- Select Campaign --</option>
                {campaigns.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.CampaignName}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Header + Add */}
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h3 className="fw-semibold mb-0">Manage Required Fields</h3>
          {selectedClient && selectedCampaign && (
            <button className="btn btn-primary" onClick={openAddModal}>
              <PlusCircle size={18} className="me-2" /> Add Field
            </button>
          )}
        </div>

        {/* Table (design aligned with In-Call page) */}
        {selectedClient && selectedCampaign ? (
          <>
        <div className="table-responsive" style={{ maxHeight: "450px", overflowY: "auto" }}>
          <table className="table table-hover table-striped table-bordered align-middle">
            <thead className="table-dark" style={{ position: "sticky", top: 0, zIndex: 5 }}>
              <tr>
                <th className="text-center">#</th>
                <th className="text-center">Field Name</th>
                <th className="text-center">Type</th>
                <th className="text-center">Validation</th>
                <th className="text-center">Required</th>
                <th className="text-center">Priority</th>
                <th className="text-center">Field</th>
                <th className="text-center">Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" className="text-center py-4">
                    <div className="spinner-border" />
                  </td>
                </tr>
              ) : fields.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center text-muted py-3">
                    No fields found
                  </td>
                </tr>
              ) : (
                fields.map((f, i) => (
                  <tr key={f.id}>
                    <td className="text-center">{i + 1}</td>
                    <td className="text-center">{f.FieldName}</td>
                    <td className="text-center">{f.FieldType}</td>
                    <td className="text-center">{f.FieldValidation || "-"}</td>
                    <td className="text-center">{f.RequiredCheck ? "Yes" : "No"}</td>
                    <td className="text-center">{f.Priority || "-"}</td>
                    <td className="text-center">{f.fieldNumber || "-"}</td>

                    <td className="text-center">
                      <div className="d-flex justify-content-center gap-2">
                        <button
                          className="btn btn-sm btn-outline-warning"
                          onClick={() => handleEditField(f)}
                        >
                          ✏ Edit
                        </button>

                        <button
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => handleDeleteField(f.id)}
                        >
                          🗑 Delete
                        </button>

                        <button
                          className="btn btn-sm btn-outline-info"
                          disabled={!(
                            f.FieldType === "DropDown" ||
                            f.FieldType === "Dropdown"
                          )}
                          onClick={() => toggleValuesPanel(f)}
                        >
                          📂 Values
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>


            {/* Inline Field Values panel (matches In-Call page design) */}
            {activeFieldForValues && (
              <div className="mt-4 p-3 shadow-sm border rounded">
                <h5 className="mb-3">
                  Field Values for{" "}
                  {fields.find((f) => f.id === activeFieldForValues)?.FieldName}
                </h5>

                {/* Input + Buttons (Exactly like screenshot layout) */}
                <div className="mb-3 d-flex align-items-center">
                  {/* Input left side */}
                  <input
                    className="form-control"
                    placeholder="Enter value"
                    value={valueForm.FieldValueName || ""}
                    onChange={(e) =>
                      setValueForm({ FieldValueName: e.target.value })
                    }
                  />

                  {/* Buttons right side */}
                  <div className="d-flex gap-2 ms-3">
                    <button
                      className="btn btn-success"
                      onClick={addOrUpdateValue}
                    >
                      {editingValue ? "Update" : "Add"}
                    </button>

                    {editingValue && (
                      <button
                        className="btn btn-secondary"
                        onClick={() => {
                          setEditingValue(null);
                          setValueForm({});
                        }}
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>

                {/* Values list */}
                <ul className="list-group mb-3">
                  {(valuesMap[activeFieldForValues] || []).length === 0 ? (
                    <li className="list-group-item text-center text-muted">
                      No values found
                    </li>
                  ) : (
                    (valuesMap[activeFieldForValues] || []).map((val) => (
                      <li
                        key={val.id}
                        className="list-group-item d-flex justify-content-between align-items-center"
                      >
                        {val.FieldValueName}
                        <span>
                          <button
                            className="btn btn-sm btn-outline-warning me-2"
                            onClick={() =>
                              startEditValue({
                                ...val,
                                FieldId: activeFieldForValues,
                              })
                            }
                          >
                            ✏
                          </button>
                          <button
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => deleteValue(val.id)}
                          >
                            🗑
                          </button>
                        </span>
                      </li>
                    ))
                  )}
                </ul>

                {/* Close button (bottom right) */}
                <div className="text-end">
                  <button
                    className="btn btn-secondary"
                    onClick={() => {
                      setActiveFieldForValues(null);
                      setEditingValue(null);
                      setValueForm({});
                    }}
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          (userType === "Super-Admin" || userType === "Admin") && (
            <p className="text-muted">
              Please select a client & campaign to manage fields.
            </p>
          )
        )}

        {/* Add / Edit Field Modal (styled, same structure) */}
        {showModal && (
          <div
            className="modal fade show"
            style={{ display: "block" }}
            tabIndex="-1"
          >
            <div className="modal-dialog modal-lg">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">
                    {editingFieldId ? "Edit Field" : "Add Field"}
                  </h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setShowModal(false)}
                  />
                </div>

                <div className="modal-body">
                  <div
                    className="row g-3"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") e.preventDefault();
                    }}
                  >
                    <div className="col-md-6">
                      <label className="form-label">Field Name *</label>
                      <input
                        name="FieldName"
                        className="form-control"
                        value={form.FieldName}
                        onChange={onFormChange}
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label">Field Type *</label>
                      <select
                        name="FieldType"
                        className="form-select"
                        value={form.FieldType}
                        onChange={onFormChange}
                      >
                        <option value="">-- Select Field Type --</option>
                        <option value="TextBox">Text Box</option>
                        <option value="TextArea">Text Area</option>
                        <option value="DropDown">Drop Down</option>
                        <option value="Dropdown">Drop Down (alt)</option>
                        <option value="Date">Date</option>
                        <option value="Number">Number</option>
                      </select>
                    </div>

                    {form.FieldType === "DropDown" && (
                      <div className="col-12">
                        <label className="form-label">Dropdown Values</label>
                        {(form.DropDownValues || []).map((v, idx) => (
                          <div key={idx} className="d-flex gap-2 mb-2">
                            <input
                              className="form-control"
                              value={v}
                              onChange={(e) =>
                                updateDropDownValueAt(idx, e.target.value)
                              }
                              placeholder={`Value ${idx + 1}`}
                            />
                            <button
                              type="button"
                              className="btn btn-danger"
                              onClick={() => removeDropDownValueAt(idx)}
                            >
                              X
                            </button>
                          </div>
                        ))}
                        <button
                          type="button"
                          className="btn btn-primary"
                          onClick={addDropDownValueSlot}
                        >
                          + Add Value
                        </button>
                      </div>
                    )}

                    <div className="col-md-6">
                      <label className="form-label">Validation</label>
                      <select
                        name="FieldValidation"
                        className="form-select"
                        value={form.FieldValidation}
                        onChange={onFormChange}
                      >
                        <option value="">-- Select Validation --</option>
                        <option value="Char">Char</option>
                        <option value="Numeric">Numeric</option>
                        <option value="Number">Number</option>
                        <option value="Date">Date</option>
                        <option value="Email">Email</option>
                        <option value="Alphanumeric">Alphanumeric</option>
                      </select>
                    </div>

                    <div className="col-md-6 d-flex align-items-center">
                      <div className="form-check mt-4">
                        <input
                          type="checkbox"
                          className="form-check-input"
                          name="RequiredCheck"
                          checked={form.RequiredCheck}
                          onChange={onFormChange}
                        />
                        <label className="form-check-label">Required</label>
                      </div>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label">Priority</label>
                      <input
                        name="Priority"
                        className="form-control"
                        value={form.Priority}
                        onChange={onFormChange}
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label">Field Number</label>
                      <input
                        name="fieldNumber"
                        type="number"
                        className="form-control"
                        value={form.fieldNumber}
                        onChange={onFormChange}
                      />
                    </div>
                  </div>
                </div>

                <div className="modal-footer">
                  <button
                    className="btn btn-secondary"
                    onClick={() => setShowModal(false)}
                  >
                    Close
                  </button>
                  <button className="btn btn-primary" onClick={handleSaveField}>
                    {editingFieldId ? "Update" : "Save"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        {showModal && <div className="modal-backdrop fade show"></div>}
      </div>
    </div>
  );
}
