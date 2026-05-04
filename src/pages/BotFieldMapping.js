import React, { useEffect, useState } from "react";
import api from "../api";

const BotFieldMapping = () => {
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState("");

  const [fields, setFields] = useState([]);
  const [selectedFields, setSelectedFields] = useState([]);
  const [mapped, setMapped] = useState({});

  const [webhook, setWebhook] = useState(null);

  // ✅ FETCH CLIENTS (SORTED)
  useEffect(() => {
    api.get("/agents/clients-rights").then((res) => {
      const sorted = res.data.sort((a, b) =>
        a.company_name.localeCompare(b.company_name)
      );
      setClients(sorted);
    });
  }, []);

  // ✅ FETCH FIELDS
  const fetchFields = async (clientId) => {
    const res = await api.get(`/bot/fields?client_id=${clientId}`);
    setFields(res.data.fields);

    // mapped keys → Field1, Field2...
    const mappedKeys = Object.keys(res.data.mapped || {});
    setSelectedFields(mappedKeys);
    setMapped(res.data.mapped || {});
  };

  const handleClientChange = (e) => {
    const id = e.target.value;
    setSelectedClient(id);
    if (!id) return;
    fetchFields(id);
  };

  // ✅ TOGGLE
  const toggleField = (key) => {
    if (selectedFields.includes(key)) {
      setSelectedFields(selectedFields.filter((f) => f !== key));
    } else {
      setSelectedFields([...selectedFields, key]);
    }
  };

  // ✅ GET FIELD NAME FROM KEY
  const getFieldName = (fieldKey) => {
    const found = fields.find(
      (f) => `Field${f.field_number}` === fieldKey
    );
    return found ? found.field_name : fieldKey;
  };

  // ✅ SAVE
  const handleSubmit = async () => {
    await api.post("/bot/save", {
      client_id: selectedClient,
      selected_fields: selectedFields,
      user_id: 1,
    });
    alert("Saved Successfully");
  };

  // ✅ SHOW WEBHOOK
  const showWebhook = async () => {
    const res = await api.get(`/bot/webhook?client_id=${selectedClient}`);
    setWebhook(res.data);
  };

  const copyToken = () => {
    navigator.clipboard.writeText(webhook.token);
    alert("Token copied!");
  };

  return (
    <div style={{ padding: "20px", fontFamily: "Arial" }}>
      <h2 style={{ marginBottom: "20px" }}>
        Bot Integration Field Mapping
      </h2>

      {/* CLIENT */}
      <select
        style={selectStyle}
        value={selectedClient}
        onChange={handleClientChange}
      >
        <option value="">Select Client</option>
        {clients.map((c) => (
          <option key={c.company_id} value={c.company_id}>
            {c.company_name}
          </option>
        ))}
      </select>

      {/* GRID */}
      <div style={{ display: "flex", gap: "20px" }}>

        {/* LEFT */}
        <div style={cardStyle}>
          <h4>Field Selection</h4>

          {fields.map((f) => {
            const key = `Field${f.field_number}`;
            return (
              <label key={key} style={checkboxStyle}>
                <input
                  type="checkbox"
                  checked={selectedFields.includes(key)}
                  onChange={() => toggleField(key)}
                />
                <span>{f.field_name}</span>
              </label>
            );
          })}
        </div>

        {/* RIGHT */}
        <div style={cardStyle}>
          <h4>Selected Fields</h4>

          {selectedFields.length === 0 && (
            <p style={{ color: "#888" }}>No fields selected</p>
          )}

          {selectedFields.map((f) => (
            <div key={f} style={selectedItem}>
              {getFieldName(f)}
            </div>
          ))}
        </div>
      </div>

      {/* ACTIONS */}
      <div style={{ marginTop: "20px" }}>
        <button style={primaryBtn} onClick={handleSubmit}>
          Save Mapping
        </button>

        <button style={secondaryBtn} onClick={showWebhook}>
          Show Webhook
        </button>
      </div>

      {/* WEBHOOK MODAL */}
      {webhook && (
        <div style={modalOverlay}>
          <div style={modalBox}>
            <h3>Webhook Details</h3>

            {/* TOKEN */}
            <div style={sectionBox}>
              <strong>Auth Token:</strong>

              {!webhook.token ? (
                <div style={warningBox}>
                  ⚠ Token not generated yet
                </div>
              ) : (
                <>
                  <p style={{ wordBreak: "break-all" }}>
                    {webhook.token}
                  </p>
                  <button style={copyBtn} onClick={copyToken}>
                    Copy Token
                  </button>
                </>
              )}
            </div>

            {/* ENDPOINT */}
            <div style={sectionBox}>
              <strong>Endpoint URL:</strong>
              <p style={urlBox}>
                https://crmapi.dialdesk.in/bot/webhook-api
              </p>
            </div>

            {/* HEADERS */}
            <div style={sectionBox}>
              <strong>Request Headers:</strong>
              <pre style={jsonBox}>
{JSON.stringify({
  "Content-Type": "application/json",
  "Auth-Token": webhook.token || "N/A"
}, null, 2)}
              </pre>
            </div>

            {/* REQUEST */}
            <div style={sectionBox}>
              <strong>Request Data:</strong>
              <pre style={jsonBox}>
                {JSON.stringify(webhook.request_sample || {}, null, 2)}
              </pre>
            </div>

            {/* RESPONSE */}
            <div style={sectionBox}>
              <strong>Response:</strong>

              {!webhook.token ? (
                <pre style={jsonBoxError}>
            {JSON.stringify({
              status: "error",
              message: "Auth token missing"
            }, null, 2)}
                </pre>
              ) : Object.keys(webhook.request_sample || {}).length === 0 ? (
                <pre style={jsonBoxError}>
            {JSON.stringify({
              status: "error",
              message: "No mapped fields found"
            }, null, 2)}
                </pre>
              ) : (
                <pre style={jsonBoxSuccess}>
            {JSON.stringify({
              status: "success",
              message: "Data inserted successfully"
            }, null, 2)}
                </pre>
              )}
            </div>

            <button style={closeBtn} onClick={() => setWebhook(null)}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BotFieldMapping;





/* STYLES */

const selectStyle = {
  padding: "10px",
  width: "260px",
  marginBottom: "20px",
  borderRadius: "6px",
  border: "1px solid #ccc"
};

const cardStyle = {
  flex: 1,
  background: "#fff",
  padding: "20px",
  borderRadius: "10px",
  boxShadow: "0 2px 10px rgba(0,0,0,0.1)"
};

const checkboxStyle = {
  display: "flex",
  gap: "10px",
  marginBottom: "8px",
  cursor: "pointer"
};

const selectedItem = {
  background: "#eef3ff",
  padding: "8px",
  marginBottom: "6px",
  borderRadius: "6px"
};

const primaryBtn = {
  padding: "10px 15px",
  background: "#007bff",
  color: "#fff",
  border: "none",
  borderRadius: "6px",
  marginRight: "10px",
  cursor: "pointer"
};

const secondaryBtn = {
  padding: "10px 15px",
  background: "#28a745",
  color: "#fff",
  border: "none",
  borderRadius: "6px",
  cursor: "pointer"
};

const modalOverlay = {
  position: "fixed",
  top: 0,
  left: 0,
  width: "100%",
  height: "100%",
  background: "rgba(0,0,0,0.6)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center"
};

const modalBox = {
  background: "#fff",
  padding: "20px",
  width: "90%",
  maxWidth: "600px",
  maxHeight: "90vh",
  overflowY: "auto",
  borderRadius: "10px"
};

const jsonBox = {
  background: "#111",
  color: "#0f0",
  padding: "10px",
  borderRadius: "6px"
};

const copyBtn = {
  marginTop: "10px",
  padding: "5px 10px",
  background: "#007bff",
  color: "#fff",
  border: "none",
  cursor: "pointer"
};

const closeBtn = {
  marginTop: "15px",
  padding: "10px",
  background: "red",
  color: "#fff",
  border: "none",
  cursor: "pointer"
};

const sectionBox = {
  marginTop: "15px"
};

const urlBox = {
  background: "#f1f1f1",
  padding: "8px",
  borderRadius: "5px"
};

const warningBox = {
  background: "#fff3cd",
  color: "#856404",
  padding: "10px",
  borderRadius: "6px"
};

const jsonBoxSuccess = {
  background: "#0f172a",
  color: "#22c55e",
  padding: "10px",
  borderRadius: "6px",
  maxHeight: "200px",
  overflow: "auto"
};

const jsonBoxError = {
  background: "#2b0a0a",
  color: "#ff4d4f",
  padding: "10px",
  borderRadius: "6px",
  maxHeight: "200px",
  overflow: "auto"
};