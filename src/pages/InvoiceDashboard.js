import React, { useState, useEffect } from "react";
import api from "../api"; // ✅ existing axios instance with auth
import "../styles/loader.css";

const InvoiceDashboard = () => {
  // ---------- Shared state ----------
  const [activeTab, setActiveTab] = useState("send");
  const [clients, setClients] = useState([]);
  const [configured, setConfigured] = useState([]);
  const [logs, setLogs] = useState([]);
  const [clientsLoading, setClientsLoading] = useState(true);
  const [smtpConfigured, setSmtpConfigured] = useState(false);
  const [toast, setToast] = useState(null);

  // 🔹 User info from localStorage (same as IVRReport.js)
  const userType = localStorage.getItem("user_type");
  const companyId = localStorage.getItem("company_id");

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  // ---------- Load everything on mount ----------
  useEffect(() => {
    loadAll();
    // eslint-disable-next-line
  }, []);

  const loadAll = async () => {
    await Promise.all([loadClients(), loadConfigured(), loadSmtp(), loadLogs()]);
  };

  // 🔹 Fetch clients — same pattern as IVRReport
  const loadClients = async () => {
    setClientsLoading(true);
    try {
      const res = await api.get("/agents/clients-rights");
      const raw = Array.isArray(res.data) ? res.data : res.data?.data || [];

      // Sort alphabetically
      const sorted = raw
        .map((c) => ({
          client_id: c.company_id ?? c.client_id ?? c.id,
          client_name: c.company_name ?? c.client_name ?? c.name ?? `Client #${c.company_id ?? c.id}`,
          email: c.email ?? c.Email ?? c.client_email ?? "",
        }))
        .sort((a, b) =>
          String(a.client_name).localeCompare(String(b.client_name), "en", {
            sensitivity: "base",
          })
        );

      setClients(sorted);
    } catch (e) {
      console.error("fetchClients error:", e.response?.data || e.message);
      showToast("Clients load failed: " + (e.response?.data?.detail || e.message), "error");
    } finally {
      setClientsLoading(false);
    }
  };

  const loadConfigured = async () => {
    try {
      const res = await api.get("/invoice-tool/clients");
      setConfigured(res.data.data || []);
    } catch (e) {
      console.error("loadConfigured error:", e.response?.data || e.message);
    }
  };

  const loadSmtp = async () => {
    try {
      const res = await api.get("/invoice-tool/smtp-settings");
      setSmtpConfigured(res.data.configured === true);
    } catch (e) {
      console.error("loadSmtp error:", e.response?.data || e.message);
      setSmtpConfigured(false);
    }
  };

  const loadLogs = async () => {
    try {
      const res = await api.get("/invoice-tool/logs?limit=50");
      setLogs(res.data.data || []);
    } catch (e) {
      console.error("loadLogs error:", e.response?.data || e.message);
    }
  };

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div style={S.page}>
      {/* ---------- TOAST ---------- */}
      {toast && (
        <div
          style={{
            ...S.toast,
            background: toast.type === "error" ? "#e53e3e" : "#38a169",
          }}
        >
          {toast.msg}
        </div>
      )}

      {/* ---------- HEADER ---------- */}
      <div style={S.header}>
        <h1 style={S.h1}>📄 Invoice Tool</h1>
        <p style={S.headerSub}>
          Send invoices, manage clients and configure SMTP.
        </p>
      </div>

      {/* ---------- STATS ---------- */}
      <div style={S.statsGrid}>
        <StatCard
          icon="👥"
          label="CRM Clients"
          value={clientsLoading ? "..." : clients.length}
          color="#3182ce"
        />
        <StatCard icon="⚙️" label="Configured" value={configured.length} color="#38a169" />
        <StatCard
          icon="📤"
          label="Sent (recent)"
          value={logs.filter((l) => l.status === "SENT").length}
          color="#805ad5"
        />
        <StatCard
          icon="🔌"
          label="SMTP Status"
          value={smtpConfigured ? "Active" : "Inactive"}
          color={smtpConfigured ? "#38a169" : "#e53e3e"}
        />
      </div>

      {/* ---------- TABS ---------- */}
      <div style={S.tabs}>
        <TabBtn active={activeTab === "send"} onClick={() => setActiveTab("send")}>
          📤 Send Invoice
        </TabBtn>
        <TabBtn active={activeTab === "config"} onClick={() => setActiveTab("config")}>
          ⚙️ Client Config
        </TabBtn>
        <TabBtn active={activeTab === "smtp"} onClick={() => setActiveTab("smtp")}>
          🔌 SMTP Settings
        </TabBtn>
        <TabBtn active={activeTab === "logs"} onClick={() => setActiveTab("logs")}>
          📜 Send Logs
        </TabBtn>
      </div>

      {/* ---------- TAB CONTENT ---------- */}
      <div style={S.tabContent}>
        {activeTab === "send" && (
          <SendTab
            clients={clients}
            clientsLoading={clientsLoading}
            smtpConfigured={smtpConfigured}
            showToast={showToast}
            onSent={loadLogs}
            userType={userType}
            companyId={companyId}
          />
        )}
        {activeTab === "config" && (
          <ConfigTab
            crmClients={clients}
            configured={configured}
            clientsLoading={clientsLoading}
            showToast={showToast}
            reload={loadConfigured}
          />
        )}
        {activeTab === "smtp" && (
          <SmtpTab
            smtpConfigured={smtpConfigured}
            showToast={showToast}
            onSaved={loadSmtp}
          />
        )}
        {activeTab === "logs" && <LogsTab logs={logs} reload={loadLogs} />}
      </div>
    </div>
  );
};

/* ============ SMALL COMPONENTS ============ */
const StatCard = ({ icon, label, value, color }) => (
  <div style={{ ...S.statCard, borderTop: `4px solid ${color}` }}>
    <div style={{ fontSize: "28px" }}>{icon}</div>
    <div style={{ fontSize: "24px", fontWeight: "700", color: "#1a202c" }}>
      {value}
    </div>
    <div style={{ fontSize: "13px", color: "#718096" }}>{label}</div>
  </div>
);

const TabBtn = ({ active, onClick, children }) => (
  <button
    onClick={onClick}
    style={{
      ...S.tabBtn,
      background: active ? "#3182ce" : "#fff",
      color: active ? "#fff" : "#2d3748",
      borderColor: active ? "#3182ce" : "#e2e8f0",
    }}
  >
    {children}
  </button>
);

/* ============ SEND TAB ============ */
const SendTab = ({
  clients,
  clientsLoading,
  smtpConfigured,
  showToast,
  onSent,
  userType,
  companyId,
}) => {
  const [selected, setSelected] = useState("");
  const [invoiceType, setInvoiceType] = useState("Monthly");
  const [remarks, setRemarks] = useState("");
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);

  // Auto-select for Client users
  useEffect(() => {
    if (userType !== "Super-Admin" && userType !== "Admin" && companyId) {
      setSelected(companyId);
    }
  }, [userType, companyId]);

  const handleSend = async () => {
    if (!selected) return showToast("Select a client", "error");
    if (!file) return showToast("Upload an invoice file", "error");

    const fd = new FormData();
    fd.append("client_id", selected);
    fd.append("invoice_type", invoiceType);
    fd.append("remarks", remarks);
    fd.append("file", file);

    setLoading(true);
    try {
      const res = await api.post("/invoice-tool/send-invoice", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      showToast(res.data.message || "Invoice sent!");
      setFile(null);
      setRemarks("");
      document.getElementById("invFile").value = "";
      onSent();
    } catch (e) {
      console.error("send error:", e.response?.data || e.message);
      showToast(e.response?.data?.detail || "Send failed", "error");
    } finally {
      setLoading(false);
    }
  };

  const isAdmin = userType === "Super-Admin" || userType === "Admin";

  return (
    <div style={S.card}>
      <h2 style={S.cardTitle}>Send Invoice to Client</h2>

      {!smtpConfigured && (
        <div style={S.warn}>
          ⚠️ SMTP not configured. Please go to <b>SMTP Settings</b> tab first.
        </div>
      )}

      {/* 🔹 Select Client — only for Admin / Super-Admin */}
      {isAdmin && (
        <>
          <label style={S.label}>Select Client *</label>
          <select
            style={S.input}
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            disabled={clientsLoading}
          >
            <option value="">
              {clientsLoading ? "-- Loading clients... --" : "-- Choose Client --"}
            </option>
            {clients.map((c) => (
              <option key={c.client_id} value={c.client_id}>
                {c.client_name} {c.email ? `(${c.email})` : ""}
              </option>
            ))}
          </select>
        </>
      )}

      {/* For Client user — show read-only display */}
      {!isAdmin && (
        <>
          <label style={S.label}>Your Client</label>
          <input
            style={{ ...S.input, background: "#f7fafc" }}
            value={
              clients.find((c) => String(c.client_id) === String(companyId))
                ?.client_name || `Client #${companyId}`
            }
            disabled
          />
        </>
      )}

      <div style={S.row}>
        <div style={{ flex: 1 }}>
          <label style={S.label}>Invoice Type</label>
          <select
            style={S.input}
            value={invoiceType}
            onChange={(e) => setInvoiceType(e.target.value)}
          >
            <option>Monthly</option>
            <option>Usage</option>
            <option>One-Time</option>
            <option>Custom</option>
          </select>
        </div>
        <div style={{ flex: 1 }}>
          <label style={S.label}>Upload File (PDF) *</label>
          <input
            id="invFile"
            type="file"
            accept=".pdf,.doc,.docx,.xls,.xlsx"
            style={S.input}
            onChange={(e) => setFile(e.target.files[0])}
          />
        </div>
      </div>

      <label style={S.label}>Remarks (optional)</label>
      <textarea
        style={{ ...S.input, height: "80px" }}
        value={remarks}
        onChange={(e) => setRemarks(e.target.value)}
        placeholder="Any note"
      />

      <button
        style={{ ...S.primaryBtn, opacity: loading || !smtpConfigured ? 0.6 : 1 }}
        onClick={handleSend}
        disabled={loading || !smtpConfigured}
      >
        {loading ? "Sending..." : "📤 Upload & Send"}
      </button>
    </div>
  );
};

/* ============ CONFIG TAB ============ */
const ConfigTab = ({ crmClients, configured, clientsLoading, showToast, reload }) => {
  const [form, setForm] = useState(emptyForm());
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(false);

  function emptyForm() {
    return {
      client_id: "",
      client_name: "",
      to_email: "",
      cc_email: "",
      subject: "Invoice from DialDesk",
      email_template:
        "Dear {client_name},\n\nPlease find attached {invoice_type} invoice.\n\n{remarks}\n\nRegards,\nTeam DialDesk",
      invoice_type: "Monthly",
    };
  }

  const handleSelect = (id) => {
    const c = crmClients.find((x) => String(x.client_id) === String(id));
    if (!c) return setForm(emptyForm());

    const existing = configured.find((x) => String(x.client_id) === String(id));
    if (existing) {
      api.get(`/invoice-tool/client/${id}`).then((res) => {
        setForm(res.data.data);
        setEditMode(true);
      });
    } else {
      setForm({
        ...emptyForm(),
        client_id: c.client_id,
        client_name: c.client_name,
        to_email: c.email || "",
      });
      setEditMode(false);
    }
  };

  const handleSave = async () => {
    if (!form.client_id || !form.client_name || !form.to_email)
      return showToast("Fill required fields", "error");

    setLoading(true);
    try {
      await api.post("/invoice-tool/client", form);
      showToast("Client config saved");
      setForm(emptyForm());
      setEditMode(false);
      reload();
    } catch (e) {
      showToast(e.response?.data?.detail || "Save failed", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this client config?")) return;
    try {
      await api.delete(`/invoice-tool/client/${id}`);
      showToast("Deleted");
      reload();
    } catch (e) {
      showToast("Delete failed", "error");
    }
  };

  return (
    <div style={S.twoCol}>
      <div style={S.card}>
        <h2 style={S.cardTitle}>
          {editMode ? "✏️ Edit Client Config" : "➕ Add Client Config"}
        </h2>

        <label style={S.label}>Select Client from CRM *</label>
        <select
          style={S.input}
          value={form.client_id}
          onChange={(e) => handleSelect(e.target.value)}
          disabled={clientsLoading || editMode}
        >
          <option value="">
            {clientsLoading ? "-- Loading... --" : "-- Choose Client --"}
          </option>
          {crmClients.map((c) => (
            <option key={c.client_id} value={c.client_id}>
              {c.client_name}
            </option>
          ))}
        </select>

        <label style={S.label}>Client Name</label>
        <input
          style={S.input}
          value={form.client_name}
          onChange={(e) => setForm({ ...form, client_name: e.target.value })}
        />

        <label style={S.label}>To Email *</label>
        <input
          style={S.input}
          value={form.to_email}
          onChange={(e) => setForm({ ...form, to_email: e.target.value })}
        />

        <label style={S.label}>CC Emails (comma separated)</label>
        <input
          style={S.input}
          value={form.cc_email}
          onChange={(e) => setForm({ ...form, cc_email: e.target.value })}
        />

        <label style={S.label}>Subject</label>
        <input
          style={S.input}
          value={form.subject}
          onChange={(e) => setForm({ ...form, subject: e.target.value })}
        />

        <label style={S.label}>Default Invoice Type</label>
        <select
          style={S.input}
          value={form.invoice_type}
          onChange={(e) => setForm({ ...form, invoice_type: e.target.value })}
        >
          <option>Monthly</option>
          <option>Usage</option>
          <option>One-Time</option>
          <option>Custom</option>
        </select>

        <label style={S.label}>
          Template ({"{client_name}"}, {"{invoice_type}"}, {"{remarks}"})
        </label>
        <textarea
          style={{ ...S.input, height: "130px", fontFamily: "monospace" }}
          value={form.email_template}
          onChange={(e) => setForm({ ...form, email_template: e.target.value })}
        />

        <div style={S.row}>
          <button
            style={{ ...S.primaryBtn, flex: 1 }}
            onClick={handleSave}
            disabled={loading}
          >
            {loading ? "Saving..." : editMode ? "Update" : "Save"}
          </button>
          {editMode && (
            <button
              style={{ ...S.secondaryBtn, flex: 1 }}
              onClick={() => {
                setForm(emptyForm());
                setEditMode(false);
              }}
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      <div style={S.card}>
        <h2 style={S.cardTitle}>Configured Clients ({configured.length})</h2>
        {configured.length === 0 ? (
          <p style={{ color: "#718096", fontSize: "13px" }}>
            No clients configured yet.
          </p>
        ) : (
          <div style={{ maxHeight: "600px", overflowY: "auto" }}>
            {configured.map((c) => (
              <div key={c.id} style={S.clientRow}>
                <div style={{ flex: 1 }}>
                  <b>{c.client_name}</b> <small>#{c.client_id}</small>
                  <br />
                  <small style={{ color: "#718096" }}>
                    To: {c.to_email}
                    {c.cc_email ? ` | CC: ${c.cc_email}` : ""}
                  </small>
                </div>
                <div>
                  <button
                    style={S.smallBtn}
                    onClick={() => handleSelect(c.client_id)}
                  >
                    Edit
                  </button>
                  <button
                    style={{ ...S.smallBtn, background: "#e53e3e" }}
                    onClick={() => handleDelete(c.client_id)}
                  >
                    Del
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

/* ============ SMTP TAB ============ */
const SmtpTab = ({ smtpConfigured, showToast, onSaved }) => {
  const [form, setForm] = useState({
    host: "",
    port: 587,
    username: "",
    password: "",
    sender_email: "",
    use_tls: true,
  });
  const [hasExistingPassword, setHasExistingPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get("/invoice-tool/smtp-settings");
        if (res.data.configured) {
          setForm({
            host: res.data.data.host || "",
            port: res.data.data.port || 587,
            username: res.data.data.username || "",
            password: "",
            sender_email: res.data.data.sender_email || "",
            use_tls: res.data.data.use_tls === 1 || res.data.data.use_tls === true,
          });
          setHasExistingPassword(true);
        }
      } catch (e) {
        const msg = e.response?.data?.detail || e.message || "Failed to load SMTP";
        setLoadError(msg);
        console.error("SMTP load error:", e.response?.data || e.message);
      }
    })();
  }, []);

  const handleSave = async () => {
    if (!form.host) return showToast("SMTP Host required", "error");
    if (!form.port) return showToast("Port required", "error");
    if (!form.username) return showToast("Username required", "error");
    if (!form.sender_email) return showToast("Sender email required", "error");
    if (!form.password && !hasExistingPassword)
      return showToast("Password required", "error");

    const payload = {
      ...form,
      password: form.password || "__KEEP_EXISTING__",
    };

    setLoading(true);
    try {
      const res = await api.post("/invoice-tool/smtp-settings", payload);
      showToast(res.data.message || "SMTP settings saved ✅");
      setHasExistingPassword(true);
      setForm((f) => ({ ...f, password: "" }));
      onSaved();
    } catch (e) {
      console.error("SMTP save error:", {
        status: e.response?.status,
        data: e.response?.data,
      });
      const detail =
        e.response?.data?.detail ||
        (Array.isArray(e.response?.data) && e.response.data[0]?.msg) ||
        e.message ||
        "Save failed";
      showToast(`Save failed: ${detail}`, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      await api.post("/invoice-tool/smtp-settings/test", {});
      showToast("SMTP connection OK ✅");
    } catch (e) {
      const detail = e.response?.data?.detail || e.message || "Test failed";
      showToast(`Test failed: ${detail}`, "error");
    } finally {
      setTesting(false);
    }
  };

  return (
    <div style={{ ...S.card, maxWidth: "700px" }}>
      <h2 style={S.cardTitle}>SMTP Configuration</h2>
      <p style={{ color: "#718096", fontSize: "13px", marginTop: -10 }}>
        Configure the email server used to send invoices.
      </p>

      {loadError && (
        <div style={S.warn}>
          ⚠️ Could not load existing SMTP settings: <b>{loadError}</b>
        </div>
      )}

      <label style={S.label}>SMTP Host *</label>
      <input
        style={S.input}
        placeholder="smtp.gmail.com"
        value={form.host}
        onChange={(e) => setForm({ ...form, host: e.target.value })}
      />

      <div style={S.row}>
        <div style={{ flex: 1 }}>
          <label style={S.label}>Port *</label>
          <input
            style={S.input}
            type="number"
            value={form.port}
            onChange={(e) =>
              setForm({ ...form, port: parseInt(e.target.value) || 0 })
            }
          />
        </div>
        <div style={{ flex: 2 }}>
          <label style={S.label}>Sender Email (From) *</label>
          <input
            style={S.input}
            value={form.sender_email}
            onChange={(e) => setForm({ ...form, sender_email: e.target.value })}
          />
        </div>
      </div>

      <label style={S.label}>Username *</label>
      <input
        style={S.input}
        value={form.username}
        onChange={(e) => setForm({ ...form, username: e.target.value })}
      />

      <label style={S.label}>Password / App Password *</label>
      <input
        style={S.input}
        type="password"
        placeholder={
          hasExistingPassword ? "(leave blank to keep existing)" : "Enter password"
        }
        value={form.password}
        onChange={(e) => setForm({ ...form, password: e.target.value })}
      />

      <label style={{ ...S.label, marginTop: "15px" }}>
        <input
          type="checkbox"
          checked={form.use_tls}
          onChange={(e) => setForm({ ...form, use_tls: e.target.checked })}
        />{" "}
        Use TLS (recommended)
      </label>

      <div style={S.row}>
        <button
          style={{ ...S.primaryBtn, flex: 1 }}
          onClick={handleSave}
          disabled={loading}
        >
          {loading ? "Saving..." : "💾 Save"}
        </button>
        <button
          style={{
            ...S.secondaryBtn,
            flex: 1,
            background: "#805ad5",
            color: "#fff",
            border: "none",
          }}
          onClick={handleTest}
          disabled={testing || !smtpConfigured}
        >
          {testing ? "Testing..." : "🔌 Test Connection"}
        </button>
      </div>

      <div style={S.infoBox}>
        💡 <b>Gmail:</b> Use an{" "}
        <a
          href="https://myaccount.google.com/apppasswords"
          target="_blank"
          rel="noreferrer"
          style={{ color: "#3182ce" }}
        >
          App Password
        </a>{" "}
        (not your normal password). Port 587 + TLS.
      </div>
    </div>
  );
};

/* ============ LOGS TAB ============ */
const LogsTab = ({ logs, reload }) => (
  <div style={S.card}>
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <h2 style={S.cardTitle}>Send Logs (Recent 50)</h2>
      <button style={S.smallBtn} onClick={reload}>
        🔄 Refresh
      </button>
    </div>

    {logs.length === 0 ? (
      <p style={{ color: "#718096", fontSize: "13px" }}>No logs yet.</p>
    ) : (
      <table style={S.table}>
        <thead>
          <tr>
            <th style={S.th}>Client</th>
            <th style={S.th}>To</th>
            <th style={S.th}>File</th>
            <th style={S.th}>Status</th>
            <th style={S.th}>Sent At</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((l) => (
            <tr key={l.id}>
              <td style={S.td}>#{l.client_id}</td>
              <td style={S.td}>{l.to_email}</td>
              <td style={S.td}>
                <small>{l.file_name}</small>
              </td>
              <td style={S.td}>
                <span
                  style={{
                    padding: "3px 8px",
                    borderRadius: "4px",
                    fontSize: "11px",
                    background: l.status === "SENT" ? "#c6f6d5" : "#fed7d7",
                    color: l.status === "SENT" ? "#22543d" : "#742a2a",
                  }}
                >
                  {l.status}
                </span>
              </td>
              <td style={S.td}>
                <small>{new Date(l.sent_at).toLocaleString()}</small>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    )}
  </div>
);

/* ============ STYLES ============ */
const S = {
  page: {
    padding: "30px",
    background: "#f4f6f9",
    minHeight: "100vh",
    fontFamily: "system-ui, -apple-system, sans-serif",
  },
  header: { maxWidth: "1300px", margin: "0 auto 20px" },
  h1: { margin: 0, color: "#1a202c", fontSize: "26px" },
  headerSub: { margin: "4px 0 0", color: "#718096", fontSize: "14px" },
  statsGrid: {
    maxWidth: "1300px",
    margin: "0 auto 20px",
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: "15px",
  },
  statCard: {
    background: "#fff",
    padding: "18px",
    borderRadius: "10px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
    textAlign: "center",
  },
  tabs: {
    maxWidth: "1300px",
    margin: "0 auto 20px",
    display: "flex",
    gap: "8px",
    flexWrap: "wrap",
  },
  tabBtn: {
    padding: "10px 18px",
    border: "1px solid #e2e8f0",
    borderRadius: "8px",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "all 0.15s",
  },
  tabContent: { maxWidth: "1300px", margin: "0 auto" },
  card: {
    background: "#fff",
    padding: "25px",
    borderRadius: "10px",
    boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
  },
  cardTitle: { margin: "0 0 15px", color: "#1a202c", fontSize: "18px" },
  twoCol: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" },
  label: {
    display: "block",
    marginTop: "14px",
    marginBottom: "6px",
    fontWeight: "600",
    color: "#2d3748",
    fontSize: "13px",
  },
  input: {
    width: "100%",
    padding: "10px 12px",
    border: "1px solid #cbd5e0",
    borderRadius: "6px",
    fontSize: "14px",
    boxSizing: "border-box",
    outline: "none",
    background: "#fff",
  },
  row: { display: "flex", gap: "12px", marginTop: "10px" },
  primaryBtn: {
    marginTop: "20px",
    width: "100%",
    padding: "12px",
    background: "#3182ce",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    fontSize: "14px",
    fontWeight: "700",
    cursor: "pointer",
  },
  secondaryBtn: {
    marginTop: "20px",
    padding: "12px",
    background: "#fff",
    color: "#2d3748",
    border: "1px solid #cbd5e0",
    borderRadius: "6px",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
  },
  smallBtn: {
    padding: "5px 10px",
    background: "#3182ce",
    color: "#fff",
    border: "none",
    borderRadius: "4px",
    fontSize: "12px",
    marginRight: "5px",
    cursor: "pointer",
  },
  warn: {
    background: "#fffaf0",
    border: "1px solid #f6ad55",
    color: "#c05621",
    padding: "12px",
    borderRadius: "6px",
    marginBottom: "10px",
    fontSize: "13px",
  },
  infoBox: {
    marginTop: "20px",
    fontSize: "13px",
    color: "#4a5568",
    background: "#f7fafc",
    padding: "12px",
    borderRadius: "6px",
  },
  clientRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "10px 0",
    borderBottom: "1px solid #edf2f7",
    fontSize: "13px",
  },
  table: { width: "100%", borderCollapse: "collapse", fontSize: "13px" },
  th: {
    textAlign: "left",
    padding: "10px",
    borderBottom: "2px solid #e2e8f0",
    background: "#f7fafc",
    fontSize: "12px",
    textTransform: "uppercase",
    color: "#718096",
  },
  td: { padding: "10px", borderBottom: "1px solid #edf2f7" },
  toast: {
    position: "fixed",
    top: "20px",
    right: "20px",
    padding: "12px 20px",
    color: "#fff",
    borderRadius: "8px",
    zIndex: 9999,
    fontWeight: "600",
    fontSize: "14px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
  },
};

export default InvoiceDashboard;