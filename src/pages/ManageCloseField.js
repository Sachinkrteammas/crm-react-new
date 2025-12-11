import { useState, useEffect } from "react";
import api from "../api";
import { useNavigate } from "react-router-dom";

const ManageCloseField = () => {
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
  const navigate = useNavigate();

  const [values, setValues] = useState({});
  const [valueForm, setValueForm] = useState({ FieldValueName: "" });
  const [editingValue, setEditingValue] = useState(null);
  const [activeFieldForValues, setActiveFieldForValues] = useState(null);

  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState("");
  const companyId = localStorage.getItem("company_id");
  const userType = localStorage.getItem("user_type");

  // -------------------- Fetch clients --------------------
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

  useEffect(() => {
    if (userType === "Client") setSelectedClient(companyId);
    else if ((userType === "Super-Admin" || userType === "Admin") && clients.length === 1)
      setSelectedClient(clients[0].company_id);
  }, [userType, companyId, clients]);

  useEffect(() => {
    if (selectedClient) fetchFields();
  }, [selectedClient]);

  // -------------------- Fetch Fields & Values --------------------
  const fetchFields = async () => {
    try {
      const res = await api.get(`/close_fields/${selectedClient}`);
      setFields(res.data);
    } catch (err) {
      console.error("Error fetching close fields:", err);
    }
  };

  const fetchValues = async (fieldId) => {
    try {
      const res = await api.get(`/close_field_values/${selectedClient}/${fieldId}`);
      setValues((prev) => ({ ...prev, [fieldId]: res.data }));
    } catch (err) {
      console.error("Error fetching close field values:", err);
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
      setForm((prev) => ({ ...prev, [name]: value, DropDownValues: prev.DropDownValues || [""] }));
    } else {
      setForm((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
    }
  };

  // -------------------- Field CRUD --------------------
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedClient) return alert("Please select a client first.");

    const payload = {
      ...form,
      Priority: form.Priority ? parseInt(form.Priority, 10) : null,
      fieldNumber: form.fieldNumber ? parseInt(form.fieldNumber, 10) : null,
      RequiredCheck: form.RequiredCheck ? 1 : 0,
      DropDownValues: form.FieldType === "DropDown" ? form.DropDownValues.filter(v => v.trim() !== "") : [],
    };

    try {
      let fieldId;
      if (editingField) {
        fieldId = editingField.id;
        await api.put(`/close_fields/${selectedClient}/${fieldId}`, payload);
        alert("Field updated successfully!");
      } else {
        const res = await api.post(`/close_fields/${selectedClient}`, payload);
        fieldId = res.data.field_id;
        alert("Field added successfully!");
      }
      resetForm();
      setShowModal(false);
      fetchFields();
    } catch (err) {
      console.error(err);
      alert("Error: " + (err.response?.data?.detail || "Failed to save close field"));
    }
  };

  const handleEdit = async (field) => {
      let dropdownValues = [];
      if (field.FieldType === "DropDown") {
        try {
          const res = await api.get(`/close_field_values/${selectedClient}/${field.id}`);
          dropdownValues = res.data.map(v => v.FieldValueName);
          setValues(prev => ({ ...prev, [field.id]: res.data }));
        } catch (err) {
          console.error("Error fetching dropdown values:", err);
        }
      }

      setForm({
        ...field,
        RequiredCheck: field.RequiredCheck === 1 || field.RequiredCheck === "1" || field.RequiredCheck === true,
        Priority: field.Priority || "",
        fieldNumber: field.fieldNumber || "",
        DropDownValues: dropdownValues,
      });

      setEditingField(field);
      setShowModal(true);
  };


  const handleDelete = async (fieldId) => {
    if (!window.confirm("Delete this close field?")) return;
    try {
      await api.delete(`/close_fields/${selectedClient}/${fieldId}`);
      setFields((prev) => prev.filter((f) => f.id !== fieldId));
    } catch {
      alert("Failed to delete close field");
    }
  };

  // -------------------- Dropdown Values --------------------
  const handleValueSubmit = async (fieldId) => {
    if (!valueForm.FieldValueName.trim()) return;
    const payload = { FieldValueName: valueForm.FieldValueName };

    try {
      if (editingValue) {
        await api.put(`/close_field_values/${selectedClient}/${editingValue.id}`, payload);
        alert("Value updated!");
      } else {
        await api.post(`/close_field_values/${selectedClient}`, { ...payload, FieldId: fieldId });
        alert("Value added!");
      }
      setValueForm({ FieldValueName: "" });
      setEditingValue(null);
      fetchValues(fieldId);
    } catch {
      alert("Failed to save value");
    }
  };

  const handleValueEdit = (fieldId, val) => {
    setValueForm({ FieldValueName: val.FieldValueName });
    setEditingValue({ ...val, FieldId: fieldId });
    setActiveFieldForValues(fieldId);
  };

  const handleValueDelete = async (valueId, fieldId) => {
    if (!window.confirm("Delete this value?")) return;
    try {
      await api.delete(`/close_field_values/${selectedClient}/${fieldId}/${valueId}`);
      fetchValues(fieldId);
    } catch {
      alert("Failed to delete value");
    }
  };

  // -------------------- Render --------------------
  return (
    <div className="row">
      <div className="col-12">
        {(userType === "Super-Admin" || userType === "Admin") && (
          <div className="row mb-4">
            <div className="col-md-4">
              <label className="form-label fw-semibold">Select Client</label>
              <select className="form-select" value={selectedClient} onChange={(e) => setSelectedClient(e.target.value)}>
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
          <>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <div>
                <h3>Manage Close Fields</h3>
              </div>
              <div>
              <button
                type="button"
                className="btn btn-outline-primary rounded-3 me-2"
                onClick={() => navigate(-1)}
              >
                ← Back
              </button>
              <button className="btn btn-primary" onClick={() => { resetForm(); setShowModal(true); }}>
                + Add Close Field
              </button>
            </div>
            </div>

            <div className="table-responsive" style={{ maxHeight: 500, overflowY: "auto" }}>
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
                  {fields.length > 0 ? fields.map((field) => (
                    <tr key={field.id}>
                      <td className="text-center">{field.FieldName}</td>
                      <td className="text-center">{field.FieldType}</td>
                      <td className="text-center">{field.FieldValidation}</td>
                      <td className="text-center">
                          {field.RequiredCheck === 1 || field.RequiredCheck === "1" || field.RequiredCheck === true ? "Yes" : "No"}
                      </td>
                      <td className="text-center">{field.Priority}</td>
                      <td className="text-center">{field.fieldNumber}</td>
                      <td className="text-center">
                      <div className="d-flex justify-content-center gap-2 flex-wrap">
                        <button className="btn btn-sm btn-outline-warning" onClick={() => handleEdit(field)}>✏ Edit</button>
                        <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(field.id)}>🗑 Delete</button>
                        <button
                          className="btn btn-sm btn-outline-info"
                          disabled={field.FieldType !== "DropDown"}
                          onClick={() => {
                            if (field.FieldType === "DropDown") {
                              fetchValues(field.id);
                              setActiveFieldForValues(activeFieldForValues === field.id ? null : field.id);
                            }
                          }}
                        >📂 Values</button>
                      </div>
                      </td>
                    </tr>
                  )) : (
                    <tr><td colSpan="7" className="text-center text-muted py-3">No close fields found</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {activeFieldForValues && (
              <div className="mt-4">
                <h5>Dropdown Values for {fields.find(f => f.id === activeFieldForValues)?.FieldName}</h5>
                <div className="input-group mb-3">
                  <input
                    className="form-control"
                    placeholder="Enter value"
                    value={valueForm.FieldValueName}
                    onChange={(e) => setValueForm({ FieldValueName: e.target.value })}
                  />
                  <button className="btn btn-success" onClick={() => handleValueSubmit(activeFieldForValues)}>
                    {editingValue ? "Update" : "Add"}
                  </button>
                </div>
                <ul className="list-group">
                  {(values[activeFieldForValues] || []).map(val => (
                    <li key={val.id} className="list-group-item d-flex justify-content-between align-items-center">
                      {val.FieldValueName}
                      <span>
                        <button className="btn btn-sm btn-outline-warning me-2" onClick={() => handleValueEdit(activeFieldForValues, val)}>✏</button>
                        <button className="btn btn-sm btn-outline-danger" onClick={() => handleValueDelete(val.id, activeFieldForValues)}>🗑</button>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Modal */}
            {showModal && (
              <div className="modal fade show" style={{ display: "block" }} tabIndex="-1">
                <div className="modal-dialog modal-lg">
                  <div className="modal-content">
                    <div className="modal-header">
                      <h5 className="modal-title">{editingField ? "Edit Close Field" : "Add Close Field"}</h5>
                      <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
                    </div>
                    <div className="modal-body">
                      <form className="row g-3" onSubmit={handleSubmit}>
                        <div className="col-md-6">
                          <label className="form-label">Field Name *</label>
                          <input name="FieldName" className="form-control" value={form.FieldName} onChange={handleChange} required />
                        </div>
                        <div className="col-md-6">
                          <label className="form-label">Field Type *</label>
                          <select name="FieldType" className="form-select" value={form.FieldType} onChange={handleChange} required>
                            <option value="">-- Select Field Type --</option>
                            <option value="TextBox">Text Box</option>
                            <option value="TextArea">Text Area</option>
                            <option value="DropDown">Drop Down</option>
                          </select>
                        </div>

                        {form.FieldType === "DropDown" && (
                          <div>
                            {form.DropDownValues.map((val, idx) => (
                              <div key={idx} className="d-flex gap-2 mb-2">
                                <input
                                  type="text"
                                  value={val}
                                  onChange={(e) => {
                                    const newValues = [...form.DropDownValues];
                                    newValues[idx] = e.target.value;
                                    setForm({ ...form, DropDownValues: newValues });
                                  }}
                                  className="form-control"
                                  placeholder={`Value ${idx + 1}`}
                                />
                                <button type="button" className="btn btn-danger" onClick={() => setForm({ ...form, DropDownValues: form.DropDownValues.filter((_, i) => i !== idx) })}>X</button>
                              </div>
                            ))}
                            <button type="button" className="btn btn-primary" onClick={() => setForm({ ...form, DropDownValues: [...form.DropDownValues, ""] })}>+ Add Value</button>
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
                          <button type="submit" className="btn btn-primary">{editingField ? "Update" : "Save"}</button>
                        </div>
                      </form>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {showModal && <div className="modal-backdrop fade show"></div>}
          </>
        ) : (
          (userType === "Super-Admin" || userType === "Admin") && <p className="text-muted">Please select a client to manage close fields.</p>
        )}
      </div>
    </div>
  );
};

export default ManageCloseField;
