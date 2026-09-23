import React, { useState, useEffect } from "react";
import api from "../api";
import "../styles/loader.css";

const FALLBACK_TEMPLATES = [
  { id: 1, template_key: "retainer", template_name: "Retainer Invoice", invoice_category: "Retainer",
    subject_template: "Invoice {{invoice_number}} – Retainer",
    email_template: "Dear {{client_name}},\n\nPlease find attached the Retainer invoice {{invoice_number}} for the period {{period}}.\n\nInvoice Amount: {{amount}}\nDue Date: {{due_date}}\n\n{{remarks}}\n\nRegards,\nTeam DialDesk" },
  { id: 2, template_key: "subscription", template_name: "Subscription Invoice", invoice_category: "Subscription",
    subject_template: "Invoice {{invoice_number}} – Subscription",
    email_template: "Dear {{client_name}},\n\nPlease find attached the Subscription invoice {{invoice_number}} for the period {{period}}.\n\nInvoice Amount: {{amount}}\nDue Date: {{due_date}}\n\n{{remarks}}\n\nRegards,\nTeam DialDesk" },
  { id: 3, template_key: "dedicated_seat", template_name: "Dedicated Seat Invoice", invoice_category: "Dedicated Seat",
    subject_template: "Invoice {{invoice_number}} – Dedicated Seat",
    email_template: "Dear {{client_name}},\n\nPlease find attached the Dedicated Seat invoice {{invoice_number}} for the period {{period}}.\n\nInvoice Amount: {{amount}}\nDue Date: {{due_date}}\n\n{{remarks}}\n\nRegards,\nTeam DialDesk" },
  { id: 4, template_key: "excess_usage", template_name: "Excess Usage Invoice", invoice_category: "Excess Usage",
    subject_template: "Invoice {{invoice_number}} – Excess Usage",
    email_template: "Dear {{client_name}},\n\nPlease find attached the Excess Usage invoice {{invoice_number}} for the period {{period}}.\n\nInvoice Amount: {{amount}}\nDue Date: {{due_date}}\n\n{{remarks}}\n\nRegards,\nTeam DialDesk" },
];

const FALLBACK_ALERTS = [
  { id: 1, alert_key: "payment_reminder", alert_name: "Payment Reminder",
    subject_template: "Payment Reminder – Invoice {{invoice_number}}",
    email_template: "Dear {{client_name}},\n\nThis is a gentle reminder that payment for Invoice {{invoice_number}} (Amount: {{amount}}) is still pending.\n\nDue Date: {{due_date}}\nDays Overdue: {{days_overdue}}\n\nKindly process the payment at the earliest.\n\nRegards,\nTeam DialDesk" },
  { id: 2, alert_key: "final_notice", alert_name: "Final Notice",
    subject_template: "FINAL NOTICE – Invoice {{invoice_number}}",
    email_template: "Dear {{client_name}},\n\nThis is a FINAL NOTICE for the pending payment of Invoice {{invoice_number}} (Amount: {{amount}}).\n\nDue Date: {{due_date}}\nDays Overdue: {{days_overdue}}\n\nPlease clear the dues immediately.\n\nRegards,\nTeam DialDesk" },
];

const InvoiceDashboard = () => {
  const [activeTab, setActiveTab] = useState("send");
  const [clients, setClients] = useState([]);
  const [configured, setConfigured] = useState([]);
  const [templates, setTemplates] = useState(FALLBACK_TEMPLATES);
  const [alertTemplates, setAlertTemplates] = useState(FALLBACK_ALERTS);
  const [alerts, setAlerts] = useState([]);
  const [logs, setLogs] = useState([]);
  const [clientsLoading, setClientsLoading] = useState(true);
  const [smtpConfigured, setSmtpConfigured] = useState(false);
  const [toast, setToast] = useState(null);

  const userType = localStorage.getItem("user_type");
  const companyId = localStorage.getItem("company_id");

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    await Promise.all([loadClients(), loadConfigured(), loadSmtp(),
      loadTemplates(), loadAlertTemplates(), loadAlerts(), loadLogs()]);
  };

  const loadClients = async () => {
    setClientsLoading(true);
    try {
      const res = await api.get("/agents/clients-rights");
      const raw = Array.isArray(res.data) ? res.data : res.data?.data || [];
      const sorted = raw.map((c) => ({
        client_id: c.company_id ?? c.client_id ?? c.id,
        client_name: c.company_name ?? c.client_name ?? c.name ?? `Client #${c.company_id ?? c.id}`,
        email: c.email ?? c.Email ?? c.client_email ?? "",
      })).sort((a, b) => String(a.client_name).localeCompare(String(b.client_name), "en", { sensitivity: "base" }));
      setClients(sorted);
    } catch (e) { showToast("Clients load failed", "error"); }
    finally { setClientsLoading(false); }
  };

  const loadConfigured = async () => {
    try { setConfigured((await api.get("/invoice-tool/clients")).data.data || []); } catch (e) {}
  };
  const loadSmtp = async () => {
    try { setSmtpConfigured((await api.get("/invoice-tool/smtp-settings")).data.configured === true); }
    catch { setSmtpConfigured(false); }
  };
  const loadTemplates = async () => {
    try {
      const res = await api.get("/invoice-tool/templates");
      const list = res.data?.data || [];
      setTemplates(list.length > 0 ? list : FALLBACK_TEMPLATES);
    } catch { setTemplates(FALLBACK_TEMPLATES); }
  };
  const loadAlertTemplates = async () => {
    try {
      const res = await api.get("/invoice-tool/alert-templates");
      const list = res.data?.data || [];
      setAlertTemplates(list.length > 0 ? list : FALLBACK_ALERTS);
    } catch { setAlertTemplates(FALLBACK_ALERTS); }
  };
  const loadAlerts = async () => {
    try { setAlerts((await api.get("/invoice-tool/alerts")).data.data || []); } catch (e) {}
  };
  const loadLogs = async () => {
    try { setLogs((await api.get("/invoice-tool/logs?limit=50")).data.data || []); } catch (e) {}
  };

  const pendingAlerts = alerts.filter((a) => a.status === "PENDING").length;

  return (
    <div style={S.page}>
      {toast && (
        <div style={{ ...S.toast, background: toast.type === "error" ? "#e53e3e" : "#38a169" }}>
          {toast.msg}
        </div>
      )}

      <div style={S.header}>
        <h1 style={S.h1}>📄 Invoice Tool</h1>
        <p style={S.headerSub}>Send invoices, manage templates, alerts, and configure SMTP.</p>
      </div>

      <div style={S.statsGrid}>
        <StatCard icon="👥" label="CRM Clients" value={clientsLoading ? "..." : clients.length} color="#3182ce" />
        <StatCard icon="📧" label="Templates" value={templates.length} color="#dd6b20" />
        <StatCard icon="🔔" label="Pending Alerts" value={pendingAlerts} color="#e53e3e" />
        <StatCard icon="📤" label="Sent (recent)" value={logs.filter((l) => l.status === "SENT").length} color="#805ad5" />
        <StatCard icon="🔌" label="SMTP" value={smtpConfigured ? "Active" : "Inactive"} color={smtpConfigured ? "#38a169" : "#e53e3e"} />
      </div>

      <div style={S.tabs}>
        <TabBtn active={activeTab === "send"} onClick={() => setActiveTab("send")}>📤 Send Invoice</TabBtn>
        <TabBtn active={activeTab === "templates"} onClick={() => setActiveTab("templates")}>📧 Templates</TabBtn>
        <TabBtn active={activeTab === "alertTemplates"} onClick={() => setActiveTab("alertTemplates")}>📢 Alert Templates</TabBtn>
        <TabBtn active={activeTab === "alerts"} onClick={() => setActiveTab("alerts")}>🔔 Alerts</TabBtn>
        <TabBtn active={activeTab === "config"} onClick={() => setActiveTab("config")}>⚙️ Client Config</TabBtn>
        <TabBtn active={activeTab === "smtp"} onClick={() => setActiveTab("smtp")}>🔌 SMTP Settings</TabBtn>
        <TabBtn active={activeTab === "logs"} onClick={() => setActiveTab("logs")}>📜 Send Logs</TabBtn>
      </div>

      <div style={S.tabContent}>
        {activeTab === "send" && (
          <SendTab clients={clients} clientsLoading={clientsLoading} smtpConfigured={smtpConfigured}
            templates={templates} alertTemplates={alertTemplates} configured={configured}
            showToast={showToast} onSent={loadLogs} userType={userType} companyId={companyId} />
        )}
        {activeTab === "templates" && (
          <TemplatesTab templates={templates} showToast={showToast} reload={loadTemplates} />
        )}
        {activeTab === "alertTemplates" && (
          <AlertTemplatesTab alertTemplates={alertTemplates} showToast={showToast} reload={loadAlertTemplates} />
        )}
        {activeTab === "alerts" && (
          <AlertsTab alerts={alerts} clients={clients} configured={configured}
            alertTemplates={alertTemplates} showToast={showToast} reload={loadAlerts} />
        )}
        {activeTab === "config" && (
          <ConfigTab crmClients={clients} configured={configured} templates={templates}
            clientsLoading={clientsLoading} showToast={showToast} reload={loadConfigured} />
        )}
        {activeTab === "smtp" && (
          <SmtpTab smtpConfigured={smtpConfigured} showToast={showToast} onSaved={loadSmtp} />
        )}
        {activeTab === "logs" && <LogsTab logs={logs} reload={loadLogs} />}
      </div>
    </div>
  );
};

/* SMALL COMPONENTS */
const StatCard = ({ icon, label, value, color }) => (
  <div style={{ ...S.statCard, borderTop: `4px solid ${color}` }}>
    <div style={{ fontSize: "24px" }}>{icon}</div>
    <div style={{ fontSize: "22px", fontWeight: "700", color: "#1a202c" }}>{value}</div>
    <div style={{ fontSize: "12px", color: "#718096" }}>{label}</div>
  </div>
);

const TabBtn = ({ active, onClick, children }) => (
  <button onClick={onClick} style={{
    ...S.tabBtn,
    background: active ? "#3182ce" : "#fff",
    color: active ? "#fff" : "#2d3748",
    borderColor: active ? "#3182ce" : "#e2e8f0",
  }}>{children}</button>
);

/* ============ 📤 SEND TAB ============ */
const SendTab = ({
  clients, clientsLoading, smtpConfigured, templates, alertTemplates, configured,
  showToast, onSent, userType, companyId,
}) => {
  const [selected, setSelected] = useState("");
  const [templateKey, setTemplateKey] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceCategory, setInvoiceCategory] = useState("");
  const [invoiceType, setInvoiceType] = useState("Monthly");
  const [period, setPeriod] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [remarks, setRemarks] = useState("");
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [invoices, setInvoices] = useState([]);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState("");
  const [invoicesLoading, setInvoicesLoading] = useState(false);

  const [extracting, setExtracting] = useState(false);
  const [extractedData, setExtractedData] = useState(null);

  const [alertEnabled, setAlertEnabled] = useState(false);
  const [alertTemplateKey, setAlertTemplateKey] = useState("payment_reminder");
  const [alertAfterDays, setAlertAfterDays] = useState(25);

  useEffect(() => {
    if (userType !== "Super-Admin" && userType !== "Admin" && companyId) setSelected(companyId);
  }, [userType, companyId]);

  useEffect(() => {
    if (!selected) return;
    const cfg = configured.find((c) => String(c.client_id) === String(selected));
    if (cfg?.template_key) setTemplateKey(cfg.template_key);
  }, [selected, configured]);

  useEffect(() => {
    (async () => {
      if (!selected) { setInvoices([]); return; }
      setInvoicesLoading(true);
      try { setInvoices((await api.get(`/invoice-tool/invoices?client_id=${selected}`)).data.data || []); }
      catch { setInvoices([]); }
      finally { setInvoicesLoading(false); }
    })();
  }, [selected]);

  const handleInvoiceSelect = (id) => {
    setSelectedInvoiceId(id);
    const inv = invoices.find((x) => String(x.id) === String(id));
    if (!inv) return;
    setInvoiceNumber(inv.invoice_number || "");
    setPeriod(inv.period || "");
    setAmount(inv.amount || "");
    setDueDate(inv.due_date ? String(inv.due_date).slice(0, 10) : "");
    const map = { Retainer: "retainer", "Retainer Cost": "retainer",
      Subscription: "subscription", "Dedicated Seat": "dedicated_seat",
      "Excess Usage": "excess_usage" };
    if (map[inv.invoice_category]) setTemplateKey(map[inv.invoice_category]);
  };

  useEffect(() => {
    const t = templates.find((x) => x.template_key === templateKey);
    if (t) {
      setInvoiceCategory(t.invoice_category || "");
      const m = { Retainer: "Monthly", Subscription: "Monthly",
        "Dedicated Seat": "Monthly", "Excess Usage": "Usage" };
      setInvoiceType(m[t.invoice_category] || "Monthly");
    }
  }, [templateKey, templates]);

  const handleFileChange = async (e) => {
    const f = e.target.files[0];
    setFile(f);
    setExtractedData(null);
    if (f && f.name.toLowerCase().endsWith(".pdf")) {
      await autoExtract(f);
    }
  };

  const autoExtract = async (uploadedFile) => {
    setExtracting(true);
    try {
      const fd = new FormData();
      fd.append("file", uploadedFile);
      const res = await api.post("/invoice-tool/extract-from-pdf", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const d = res.data?.data || {};
      setExtractedData(d);

      if (d.invoice_number) setInvoiceNumber(d.invoice_number);
      if (d.amount) setAmount(d.amount);
      if (d.period) setPeriod(d.period);
      if (d.due_date) setDueDate(d.due_date);

      if (d.invoice_category) {
        const map = { Retainer: "retainer", Subscription: "subscription",
          "Dedicated Seat": "dedicated_seat", "Excess Usage": "excess_usage" };
        const key = map[d.invoice_category];
        if (key) setTemplateKey(key);
        setInvoiceCategory(d.invoice_category);
      }

      const found = [d.invoice_number, d.amount, d.invoice_category, d.period, d.due_date, d.client_name]
        .filter(Boolean).length;

      if (found === 0) showToast("Could not extract. Please fill manually.", "error");
      else showToast(`✅ Auto-extracted ${found} field(s)`);
    } catch (e) {
      showToast(e.response?.data?.detail || "PDF extraction failed", "error");
    } finally {
      setExtracting(false);
    }
  };

  const selectedTemplate = templates.find((x) => x.template_key === templateKey);
  const selectedClient = clients.find((c) => String(c.client_id) === String(selected));
  const selectedConfig = configured.find((c) => String(c.client_id) === String(selected));
  const isAdmin = userType === "Super-Admin" || userType === "Admin";

  const render = (str) => (str || "")
    .replace(/\{\{client_name\}\}/g, selectedClient?.client_name || "____")
    .replace(/\{\{invoice_number\}\}/g, invoiceNumber || "____")
    .replace(/\{\{invoice_category\}\}/g, invoiceCategory || "____")
    .replace(/\{\{invoice_type\}\}/g, invoiceType || "")
    .replace(/\{\{period\}\}/g, period || "____")
    .replace(/\{\{amount\}\}/g, amount || "____")
    .replace(/\{\{due_date\}\}/g, dueDate || "____")
    .replace(/\{\{remarks\}\}/g, remarks || "");

  const previewSubject = render(selectedTemplate?.subject_template || "");
  const previewBody = render(selectedTemplate?.email_template || "");

  const validate = () => {
    if (!selected) return "Select a client";
    if (!selectedConfig) return "Client not configured. Configure first.";
    if (!templateKey) return "Select a template";
    if (!invoiceNumber) return "Enter invoice number";
    if (!file) return "Upload an invoice file";
    return null;
  };

  const handleOpenPreview = () => {
    const err = validate();
    if (err) return showToast(err, "error");
    setShowPreview(true);
  };

  const handleConfirmSend = async () => {
    const fd = new FormData();
    fd.append("client_id", selected);
    fd.append("template_key", templateKey);
    fd.append("invoice_number", invoiceNumber);
    fd.append("invoice_category", invoiceCategory);
    fd.append("invoice_type", invoiceType);
    fd.append("period", period);
    fd.append("amount", amount);
    fd.append("due_date", dueDate);
    fd.append("remarks", remarks);
    fd.append("alert_enabled", alertEnabled ? 1 : 0);
    fd.append("alert_template_key", alertTemplateKey);
    fd.append("alert_after_days", alertAfterDays);
    fd.append("file", file);

    setLoading(true);
    try {
      const res = await api.post("/invoice-tool/send-invoice", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      showToast(res.data.message || "Invoice sent!");
      setShowPreview(false); setFile(null); setRemarks(""); setInvoiceNumber("");
      setSelectedInvoiceId(""); setExtractedData(null); setAmount("");
      setAlertEnabled(false);
      const i = document.getElementById("invFile"); if (i) i.value = "";
      onSent();
    } catch (e) { showToast(e.response?.data?.detail || "Send failed", "error"); }
    finally { setLoading(false); }
  };

  return (
    <div style={S.card}>
      <h2 style={S.cardTitle}>Send Invoice to Client</h2>

      {!smtpConfigured && (
        <div style={S.warn}>⚠️ SMTP not configured. Go to <b>SMTP Settings</b> tab first.</div>
      )}

      {selected && !selectedConfig && (
        <div style={S.warn}>⚠️ Client not configured. Go to <b>Client Config</b> tab first.</div>
      )}

      {isAdmin ? (
        <>
          <label style={S.label}>1️⃣ Select Client *</label>
          <select style={S.input} value={selected}
            onChange={(e) => { setSelected(e.target.value); setSelectedInvoiceId(""); }}
            disabled={clientsLoading}>
            <option value="">{clientsLoading ? "-- Loading clients... --" : "-- Choose Client --"}</option>
            {clients.map((c) => (
              <option key={c.client_id} value={c.client_id}>
                {c.client_name} {c.email ? `(${c.email})` : ""}
              </option>
            ))}
          </select>
        </>
      ) : (
        <>
          <label style={S.label}>1️⃣ Your Client</label>
          <input style={{ ...S.input, background: "#f7fafc" }}
            value={selectedClient?.client_name || `Client #${companyId}`} disabled />
        </>
      )}

      <label style={S.label}>2️⃣ Select Invoice (optional)</label>
      <select style={S.input} value={selectedInvoiceId}
        onChange={(e) => handleInvoiceSelect(e.target.value)} disabled={!selected}>
        <option value="">
          {!selected ? "-- Select a client first --"
            : invoicesLoading ? "-- Loading invoices... --"
            : invoices.length === 0 ? "-- No invoices found — type manually --"
            : "-- Choose Invoice --"}
        </option>
        {invoices.map((inv) => (
          <option key={inv.id} value={inv.id}>
            {inv.invoice_number} — {inv.invoice_category} — {inv.amount || ""}
          </option>
        ))}
      </select>

      <label style={S.label}>3️⃣ Email Template *</label>
      <select style={S.input} value={templateKey} onChange={(e) => setTemplateKey(e.target.value)}>
        <option value="">-- Choose Template --</option>
        {templates.map((t) => (
          <option key={t.template_key} value={t.template_key}>{t.template_name}</option>
        ))}
      </select>

      <div style={S.row}>
        <div style={{ flex: 1 }}>
          <label style={S.label}>Invoice Number *</label>
          <input style={S.input} placeholder="Auto-filled or type manually"
            value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} />
        </div>
        <div style={{ flex: 1 }}>
          <label style={S.label}>Invoice Category (auto)</label>
          <input style={{ ...S.input, background: "#f7fafc" }} value={invoiceCategory} disabled />
        </div>
      </div>

      <div style={S.row}>
        <div style={{ flex: 1 }}>
          <label style={S.label}>Period</label>
          <input style={S.input} value={period} onChange={(e) => setPeriod(e.target.value)} placeholder="e.g. Jan 2025" />
        </div>
        <div style={{ flex: 1 }}>
          <label style={S.label}>Amount</label>
          <input style={S.input} value={amount} onChange={(e) => setAmount(e.target.value)}
            placeholder="Auto-fills from PDF" />
        </div>
        <div style={{ flex: 1 }}>
          <label style={S.label}>Due Date</label>
          <input style={S.input} type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </div>
      </div>

      {previewSubject && (
        <div style={S.preview}><b>📧 Subject Preview:</b> {previewSubject}</div>
      )}

      <div style={S.row}>
        <div style={{ flex: 1 }}>
          <label style={S.label}>Invoice Type</label>
          <select style={S.input} value={invoiceType} onChange={(e) => setInvoiceType(e.target.value)}>
            <option>Monthly</option><option>Usage</option>
            <option>One-Time</option><option>Custom</option>
          </select>
        </div>
        <div style={{ flex: 1 }}>
          <label style={S.label}>
            4️⃣ Upload File (PDF) * {extracting && <span style={{ color: "#3182ce" }}> 🔍 Extracting...</span>}
          </label>
          <input id="invFile" type="file" accept=".pdf,.doc,.docx,.xls,.xlsx"
            style={S.input} onChange={handleFileChange} />
        </div>
      </div>

      {extractedData && (
        <div style={{
          marginTop: "12px", padding: "14px",
          background: "#f0fff4", border: "1px solid #9ae6b4",
          borderRadius: "8px", fontSize: "13px",
        }}>
          <div style={{ fontWeight: "700", color: "#22543d", marginBottom: "8px" }}>
            ✅ Auto-Extracted from PDF
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
            <div><b>Invoice #:</b> {extractedData.invoice_number || "—"}</div>
            <div><b>Amount:</b> {extractedData.amount || "—"}</div>
            <div><b>Category:</b> {extractedData.invoice_category || "—"}</div>
            <div><b>Period:</b> {extractedData.period || "—"}</div>
            <div><b>Due Date:</b> {extractedData.due_date || "—"}</div>
            <div><b>Client:</b> {extractedData.client_name || "—"}</div>
          </div>
        </div>
      )}

      <div style={{
        marginTop: "16px", padding: "14px",
        background: "#fffaf0", border: "1px solid #f6ad55", borderRadius: "8px",
      }}>
        <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", flexWrap: "wrap" }}>
          <input type="checkbox" checked={alertEnabled}
            onChange={(e) => setAlertEnabled(e.target.checked)} />
          <span style={{ fontWeight: "700", color: "#c05621" }}>
            🔔 Send alert if payment not received in
          </span>
          <input type="number" min="1" max="180"
            style={{ width: "70px", padding: "6px", border: "1px solid #cbd5e0", borderRadius: "4px" }}
            value={alertAfterDays}
            onChange={(e) => setAlertAfterDays(parseInt(e.target.value) || 25)} />
          <span style={{ fontWeight: "700", color: "#c05621" }}>days</span>
        </label>

        {alertEnabled && (
          <div style={{ marginTop: "10px" }}>
            <label style={S.label}>Alert Template</label>
            <select style={S.input} value={alertTemplateKey}
              onChange={(e) => setAlertTemplateKey(e.target.value)}>
              {alertTemplates.map((t) => (
                <option key={t.alert_key} value={t.alert_key}>{t.alert_name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      <label style={S.label}>Remarks (optional)</label>
      <textarea style={{ ...S.input, height: "80px" }} value={remarks}
        onChange={(e) => setRemarks(e.target.value)} placeholder="Any note" />

      <button style={{ ...S.primaryBtn, background: "#805ad5", opacity: loading || !smtpConfigured ? 0.6 : 1 }}
        onClick={handleOpenPreview} disabled={loading || !smtpConfigured}>
        👁️ Preview & Send
      </button>

      {showPreview && (
        <PreviewModal onClose={() => setShowPreview(false)} onConfirm={handleConfirmSend}
          loading={loading} fromEmail={selectedConfig?.to_email || ""}
          toEmail={selectedConfig?.to_email || ""} subject={previewSubject}
          body={previewBody} attachment={file?.name || ""}
          clientName={selectedClient?.client_name || ""} />
      )}
    </div>
  );
};

/* PREVIEW MODAL */
const PreviewModal = ({ onClose, onConfirm, loading, fromEmail, toEmail, subject, body, attachment, clientName }) => {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div style={S.modalOverlay} onClick={onClose}>
      <div style={S.modal} onClick={(e) => e.stopPropagation()}>
        <div style={S.modalHeader}>
          <div>
            <h3 style={{ margin: 0, fontSize: "16px", color: "#1a202c" }}>📧 Email Preview</h3>
            <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#718096" }}>
              This is how the email will appear to the recipient
            </p>
          </div>
          <button style={S.modalClose} onClick={onClose}>✕</button>
        </div>

        <div style={S.emailHeader}>
          <div style={S.emailHeaderRow}><span style={S.emailHeaderLabel}>From:</span>
            <span style={S.emailHeaderValue}>{fromEmail || "—"}</span></div>
          <div style={S.emailHeaderRow}><span style={S.emailHeaderLabel}>To:</span>
            <span style={S.emailHeaderValue}>
              {clientName ? `${clientName} <${toEmail || "—"}>` : toEmail || "—"}
            </span></div>
          <div style={S.emailHeaderRow}><span style={S.emailHeaderLabel}>Subject:</span>
            <span style={{ ...S.emailHeaderValue, fontWeight: "700" }}>{subject || "(no subject)"}</span></div>
        </div>

        <div style={S.emailBody}><pre style={S.emailBodyPre}>{body || "(empty body)"}</pre></div>

        {attachment && (
          <div style={S.attachmentBox}>
            <div style={S.attachmentIcon}>📎</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "13px", fontWeight: "600", color: "#2d3748" }}>{attachment}</div>
              <div style={{ fontSize: "11px", color: "#718096" }}>Attachment</div>
            </div>
          </div>
        )}

        <div style={S.modalFooter}>
          <button style={{ ...S.secondaryBtn, marginTop: 0, flex: 1 }} onClick={onClose} disabled={loading}>
            ✏️ Back to Edit
          </button>
          <button style={{ ...S.primaryBtn, marginTop: 0, flex: 1, opacity: loading ? 0.6 : 1 }}
            onClick={onConfirm} disabled={loading}>
            {loading ? "Sending..." : "📤 Confirm & Send"}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ============ 📧 TEMPLATES TAB ============ */
const TemplatesTab = ({ templates, showToast, reload }) => {
  const [form, setForm] = useState({
    template_key: "", template_name: "", invoice_category: "",
    subject_template: "Invoice {{invoice_number}} – ",
    email_template: "Dear {{client_name}},\n\nPlease find attached the {{invoice_category}} invoice {{invoice_number}} for the period {{period}}.\n\nInvoice Amount: {{amount}}\nDue Date: {{due_date}}\n\n{{remarks}}\n\nRegards,\nTeam DialDesk",
  });
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleNameChange = (name) => {
    const key = name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
    setForm({ ...form, template_name: name, template_key: editMode ? form.template_key : key });
  };

  const handleCategoryChange = (cat) => {
    setForm({ ...form, invoice_category: cat, subject_template: `Invoice {{invoice_number}} – ${cat}` });
  };

  const handleEdit = (t) => {
    setForm({ template_key: t.template_key, template_name: t.template_name,
      invoice_category: t.invoice_category, subject_template: t.subject_template,
      email_template: t.email_template });
    setEditMode(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSave = async () => {
    if (!form.template_key || !form.template_name || !form.invoice_category)
      return showToast("Fill Template Name and Category", "error");
    if (!form.subject_template || !form.email_template)
      return showToast("Subject and Body required", "error");
    setSaving(true);
    try {
      await api.post("/invoice-tool/template", form);
      showToast(editMode ? "Template updated" : "Template created");
      setForm({ template_key: "", template_name: "", invoice_category: "",
        subject_template: "Invoice {{invoice_number}} – ", email_template: form.email_template });
      setEditMode(false); reload();
    } catch (e) { showToast(e.response?.data?.detail || "Save failed", "error"); }
    finally { setSaving(false); }
  };

  const handleDelete = async (key) => {
    if (!window.confirm("Delete this template?")) return;
    try { await api.delete(`/invoice-tool/template/${key}`); showToast("Deleted"); reload(); }
    catch { showToast("Delete failed", "error"); }
  };

  return (
    <div style={S.twoCol}>
      <div style={S.card}>
        <h2 style={S.cardTitle}>{editMode ? "✏️ Edit Template" : "➕ Create New Template"}</h2>

        <label style={S.label}>Template Name *</label>
        <input style={S.input} placeholder="e.g. Retainer Invoice"
          value={form.template_name} onChange={(e) => handleNameChange(e.target.value)} />
        {form.template_key && (
          <div style={{ fontSize: "11px", color: "#718096", marginTop: "4px" }}>
            Key: <code>{form.template_key}</code>
          </div>
        )}

        <label style={S.label}>Invoice Category *</label>
        <select style={S.input} value={form.invoice_category}
          onChange={(e) => handleCategoryChange(e.target.value)}>
          <option value="">-- Choose Category --</option>
          <option value="Retainer">Retainer</option>
          <option value="Subscription">Subscription</option>
          <option value="Dedicated Seat">Dedicated Seat</option>
          <option value="Excess Usage">Excess Usage</option>
          <option value="Custom">Custom</option>
        </select>

        <label style={S.label}>Subject Template *</label>
        <input style={S.input} value={form.subject_template}
          onChange={(e) => setForm({ ...form, subject_template: e.target.value })} />

        <label style={S.label}>Email Body Template *</label>
        <textarea style={{ ...S.input, height: "220px", fontFamily: "monospace", fontSize: "13px" }}
          value={form.email_template}
          onChange={(e) => setForm({ ...form, email_template: e.target.value })} />

        <div style={{ fontSize: "11px", color: "#718096", marginTop: "4px" }}>
          Placeholders: <code>{"{{client_name}}"}</code>, <code>{"{{invoice_number}}"}</code>,{" "}
          <code>{"{{invoice_category}}"}</code>, <code>{"{{period}}"}</code>, <code>{"{{amount}}"}</code>,{" "}
          <code>{"{{due_date}}"}</code>, <code>{"{{remarks}}"}</code>
        </div>

        <div style={S.row}>
          <button style={{ ...S.primaryBtn, flex: 1 }} onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : editMode ? "💾 Update" : "➕ Create"}
          </button>
          {editMode && <button style={{ ...S.secondaryBtn, flex: 1 }}
            onClick={() => { setForm({ template_key: "", template_name: "", invoice_category: "",
              subject_template: "", email_template: "" }); setEditMode(false); }}>Cancel</button>}
        </div>
      </div>

      <div style={S.card}>
        <h2 style={S.cardTitle}>Global Templates ({templates.length})</h2>
        <div style={{ maxHeight: "640px", overflowY: "auto" }}>
          {templates.map((t) => (
            <div key={t.template_key} style={S.templateRow}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "14px", fontWeight: "700" }}>{t.template_name}</div>
                <div style={{ fontSize: "11px", color: "#718096" }}>
                  Category: <b>{t.invoice_category}</b> · <code>{t.template_key}</code>
                </div>
                <div style={{ fontSize: "12px", color: "#2d3748", marginTop: "6px" }}>
                  <b>Subject:</b> {t.subject_template}
                </div>
              </div>
              <div>
                <button style={S.smallBtn} onClick={() => handleEdit(t)}>Edit</button>
                <button style={{ ...S.smallBtn, background: "#e53e3e" }}
                  onClick={() => handleDelete(t.template_key)}>Del</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/* ============ 📢 ALERT TEMPLATES TAB ============ */
const AlertTemplatesTab = ({ alertTemplates, showToast, reload }) => {
  const [form, setForm] = useState({
    alert_key: "", alert_name: "",
    subject_template: "Payment Reminder – Invoice {{invoice_number}}",
    email_template: "Dear {{client_name}},\n\nThis is a gentle reminder that payment for Invoice {{invoice_number}} (Amount: {{amount}}) is still pending.\n\nDue Date: {{due_date}}\nDays Overdue: {{days_overdue}}\n\nKindly process the payment.\n\nRegards,\nTeam DialDesk",
  });
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleNameChange = (name) => {
    const key = name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
    setForm({ ...form, alert_name: name, alert_key: editMode ? form.alert_key : key });
  };

  const handleEdit = (t) => {
    setForm({ alert_key: t.alert_key, alert_name: t.alert_name,
      subject_template: t.subject_template, email_template: t.email_template });
    setEditMode(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSave = async () => {
    if (!form.alert_key || !form.alert_name || !form.subject_template || !form.email_template)
      return showToast("Fill all fields", "error");
    setSaving(true);
    try {
      await api.post("/invoice-tool/alert-template", form);
      showToast(editMode ? "Alert template updated" : "Alert template created");
      setForm({ alert_key: "", alert_name: "",
        subject_template: "Payment Reminder – Invoice {{invoice_number}}",
        email_template: form.email_template });
      setEditMode(false); reload();
    } catch (e) { showToast(e.response?.data?.detail || "Save failed", "error"); }
    finally { setSaving(false); }
  };

  const handleDelete = async (key) => {
    if (!window.confirm("Delete this alert template?")) return;
    try { await api.delete(`/invoice-tool/alert-template/${key}`); showToast("Deleted"); reload(); }
    catch { showToast("Delete failed", "error"); }
  };

  return (
    <div style={S.twoCol}>
      <div style={S.card}>
        <h2 style={S.cardTitle}>{editMode ? "✏️ Edit Alert Template" : "➕ Create Alert Template"}</h2>

        <label style={S.label}>Alert Name *</label>
        <input style={S.input} placeholder="e.g. Payment Reminder"
          value={form.alert_name} onChange={(e) => handleNameChange(e.target.value)} />
        {form.alert_key && (
          <div style={{ fontSize: "11px", color: "#718096", marginTop: "4px" }}>
            Key: <code>{form.alert_key}</code>
          </div>
        )}

        <label style={S.label}>Subject *</label>
        <input style={S.input} value={form.subject_template}
          onChange={(e) => setForm({ ...form, subject_template: e.target.value })} />

        <label style={S.label}>Email Body *</label>
        <textarea style={{ ...S.input, height: "220px", fontFamily: "monospace", fontSize: "13px" }}
          value={form.email_template}
          onChange={(e) => setForm({ ...form, email_template: e.target.value })} />
        <div style={{ fontSize: "11px", color: "#718096", marginTop: "4px" }}>
          Placeholders: <code>{"{{client_name}}"}</code>, <code>{"{{invoice_number}}"}</code>,{" "}
          <code>{"{{invoice_category}}"}</code>, <code>{"{{amount}}"}</code>,{" "}
          <code>{"{{due_date}}"}</code>, <code>{"{{days_overdue}}"}</code>
        </div>

        <div style={S.row}>
          <button style={{ ...S.primaryBtn, flex: 1 }} onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : editMode ? "💾 Update" : "➕ Create"}
          </button>
          {editMode && (
            <button style={{ ...S.secondaryBtn, flex: 1 }}
              onClick={() => { setForm({ alert_key: "", alert_name: "",
                subject_template: "", email_template: "" }); setEditMode(false); }}>
              Cancel
            </button>
          )}
        </div>
      </div>

      <div style={S.card}>
        <h2 style={S.cardTitle}>Alert Templates ({alertTemplates.length})</h2>
        <div style={{ maxHeight: "640px", overflowY: "auto" }}>
          {alertTemplates.map((t) => (
            <div key={t.alert_key} style={S.templateRow}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "14px", fontWeight: "700" }}>{t.alert_name}</div>
                <div style={{ fontSize: "11px", color: "#718096" }}><code>{t.alert_key}</code></div>
                <div style={{ fontSize: "12px", color: "#2d3748", marginTop: "6px" }}>
                  <b>Subject:</b> {t.subject_template}
                </div>
              </div>
              <div>
                <button style={S.smallBtn} onClick={() => handleEdit(t)}>Edit</button>
                <button style={{ ...S.smallBtn, background: "#e53e3e" }}
                  onClick={() => handleDelete(t.alert_key)}>Del</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/* ============ 🔔 ALERTS TAB ============ */
const AlertsTab = ({ alerts, clients, configured, alertTemplates, showToast, reload }) => {
  const [form, setForm] = useState({
    client_id: "", invoice_number: "", invoice_category: "",
    amount: "", due_date: "", template_key: "payment_reminder",
    days_overdue: 0,
  });
  const [sending, setSending] = useState(false);
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Merge ALL CRM clients + configured status
  const mergedClients = clients.map((c) => {
    const cfg = configured.find((x) => String(x.client_id) === String(c.client_id));
    return {
      ...c,
      is_configured: !!cfg,
      template_key: cfg?.template_key,
    };
  });

  const handleClientChange = (cid) => {
    setForm((f) => ({ ...f, client_id: cid }));
    const lastAlert = alerts
      .filter((a) => String(a.client_id) === String(cid))
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
    if (lastAlert) {
      setForm((f) => ({
        ...f, client_id: cid,
        amount: lastAlert.amount || "",
        invoice_number: lastAlert.invoice_number || "",
        invoice_category: lastAlert.invoice_category || "",
        due_date: lastAlert.due_date ? String(lastAlert.due_date).slice(0, 10) : "",
      }));
    }
  };

  const handleSendNow = async () => {
    if (!form.client_id || !form.invoice_number || !form.amount)
      return showToast("Fill client, invoice #, and amount", "error");
    setSending(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      const res = await api.post("/invoice-tool/alert/send-now", fd);
      showToast(res.data.message || "Alert sent!");
      reload();
    } catch (e) { showToast(e.response?.data?.detail || "Send failed", "error"); }
    finally { setSending(false); }
  };

  const handleRunDue = async () => {
    try {
      const res = await api.post("/invoice-tool/alerts/run");
      showToast(`Fired: ${res.data.fired} · Failed: ${res.data.failed}`);
      reload();
    } catch (e) { showToast("Run failed", "error"); }
  };

  const handleMarkPaid = async (id) => {
    try { await api.post(`/invoice-tool/alert/mark-paid/${id}`); showToast("Marked as paid"); reload(); }
    catch { showToast("Failed", "error"); }
  };

  const filtered = statusFilter === "ALL"
    ? alerts
    : alerts.filter((a) => a.status === statusFilter);

  const getClientName = (cid) =>
    clients.find((c) => String(c.client_id) === String(cid))?.client_name || `Client #${cid}`;

  return (
    <div>
      <div style={S.card}>
        <h2 style={S.cardTitle}>🚀 Send Alert Now</h2>
        <div style={S.warn}>
          💡 Client's last invoice amount will auto-fill. Select a client and the amount populates automatically.
        </div>

        <div style={S.row}>
          <div style={{ flex: 2 }}>
            <label style={S.label}>Client *</label>
            <select style={S.input} value={form.client_id}
              onChange={(e) => handleClientChange(e.target.value)}>
              <option value="">
                {mergedClients.length === 0 ? "-- Loading clients... --" : "-- Choose Client --"}
              </option>
              {mergedClients.map((c) => (
                <option key={c.client_id} value={c.client_id}>
                  {c.client_name} {c.is_configured ? "✅" : "⚠️ not configured"} {c.email ? `(${c.email})` : ""}
                </option>
              ))}
            </select>
            {form.client_id && !mergedClients.find((c) => String(c.client_id) === String(form.client_id))?.is_configured && (
              <div style={{ fontSize: "11px", color: "#c05621", marginTop: "4px" }}>
                ⚠️ This client is not configured in Client Config. Configure first to send alerts.
              </div>
            )}
          </div>
          <div style={{ flex: 2 }}>
            <label style={S.label}>Alert Template *</label>
            <select style={S.input} value={form.template_key}
              onChange={(e) => setForm({ ...form, template_key: e.target.value })}>
              {alertTemplates.map((t) => (
                <option key={t.alert_key} value={t.alert_key}>{t.alert_name}</option>
              ))}
            </select>
          </div>
        </div>

        <div style={S.row}>
          <div style={{ flex: 2 }}>
            <label style={S.label}>Invoice Number *</label>
            <input style={S.input} value={form.invoice_number}
              onChange={(e) => setForm({ ...form, invoice_number: e.target.value })}
              placeholder="e.g. 09-64/26-27" />
          </div>
          <div style={{ flex: 1 }}>
            <label style={S.label}>Amount *</label>
            <input style={S.input} value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              placeholder="Auto-filled" />
          </div>
          <div style={{ flex: 1 }}>
            <label style={S.label}>Due Date</label>
            <input style={S.input} type="date" value={form.due_date}
              onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={S.label}>Days Overdue</label>
            <input style={S.input} type="number" value={form.days_overdue}
              onChange={(e) => setForm({ ...form, days_overdue: parseInt(e.target.value) || 0 })} />
          </div>
        </div>

        <button style={{ ...S.primaryBtn, background: "#dd6b20" }}
          onClick={handleSendNow} disabled={sending}>
          {sending ? "Sending..." : "📤 Send Alert Now"}
        </button>
      </div>

      <div style={{ ...S.card, marginTop: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px", flexWrap: "wrap", gap: "10px" }}>
          <h2 style={S.cardTitle}>Alert Schedule ({alerts.length})</h2>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <select style={{ ...S.input, width: "150px" }} value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="ALL">All</option>
              <option value="PENDING">Pending</option>
              <option value="SENT">Sent</option>
              <option value="PAID">Paid</option>
              <option value="FAILED">Failed</option>
            </select>
            <button style={{ ...S.smallBtn, background: "#38a169" }} onClick={handleRunDue}>
              ▶️ Run Due Alerts
            </button>
            <button style={S.smallBtn} onClick={reload}>🔄 Refresh</button>
          </div>
        </div>

        {filtered.length === 0 ? (
          <p style={{ color: "#718096", fontSize: "13px" }}>No alerts found.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={S.table}>
              <thead><tr>
                <th style={S.th}>Client</th>
                <th style={S.th}>Invoice #</th>
                <th style={S.th}>Amount</th>
                <th style={S.th}>Scheduled</th>
                <th style={S.th}>Status</th>
                <th style={S.th}>Action</th>
              </tr></thead>
              <tbody>
                {filtered.map((a) => (
                  <tr key={a.id}>
                    <td style={S.td}>{getClientName(a.client_id)}</td>
                    <td style={S.td}>{a.invoice_number}</td>
                    <td style={S.td}>{a.amount || "—"}</td>
                    <td style={S.td}><small>{new Date(a.scheduled_date).toLocaleDateString()}</small></td>
                    <td style={S.td}>
                      <span style={{
                        padding: "3px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: "700",
                        background: a.status === "SENT" ? "#c6f6d5" :
                                    a.status === "PENDING" ? "#fefcbf" :
                                    a.status === "PAID" ? "#bee3f8" : "#fed7d7",
                        color: a.status === "SENT" ? "#22543d" :
                               a.status === "PENDING" ? "#744210" :
                               a.status === "PAID" ? "#2c5282" : "#742a2a",
                      }}>{a.status}</span>
                    </td>
                    <td style={S.td}>
                      {a.status === "PENDING" && (
                        <button style={{ ...S.smallBtn, background: "#38a169" }}
                          onClick={() => handleMarkPaid(a.id)}>Mark Paid</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

/* ============ CONFIG TAB ============ */
const ConfigTab = ({ crmClients, configured, templates, clientsLoading, showToast, reload }) => {
  const [form, setForm] = useState({
    client_id: "", client_name: "", to_email: "", cc_email: "",
    template_key: templates[0]?.template_key || "subscription",
    subject: "Invoice from DialDesk", email_template: "", invoice_type: "Monthly",
  });
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSelect = (id) => {
    const c = crmClients.find((x) => String(x.client_id) === String(id));
    if (!c) return setForm({ ...form, client_id: "", client_name: "", to_email: "" });
    const existing = configured.find((x) => String(x.client_id) === String(id));
    if (existing) {
      api.get(`/invoice-tool/client/${id}`).then((res) => {
        setForm({ ...form, ...res.data.data,
          template_key: res.data.data.template_key || templates[0]?.template_key || "subscription" });
        setEditMode(true);
      });
    } else {
      setForm({ ...form, client_id: c.client_id, client_name: c.client_name, to_email: c.email || "" });
      setEditMode(false);
    }
  };

  const handleSave = async () => {
    if (!form.client_id || !form.client_name || !form.to_email)
      return showToast("Fill required fields", "error");
    if (!form.template_key) return showToast("Select a template", "error");

    setLoading(true);
    try {
      await api.post("/invoice-tool/client", form);
      showToast("Client config saved");
      setForm({ client_id: "", client_name: "", to_email: "", cc_email: "",
        template_key: templates[0]?.template_key || "subscription",
        subject: "Invoice from DialDesk", email_template: "", invoice_type: "Monthly" });
      setEditMode(false); reload();
    } catch (e) { showToast(e.response?.data?.detail || "Save failed", "error"); }
    finally { setLoading(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this client config?")) return;
    try { await api.delete(`/invoice-tool/client/${id}`); showToast("Deleted"); reload(); }
    catch { showToast("Delete failed", "error"); }
  };

  const getTemplateName = (key) => templates.find((t) => t.template_key === key)?.template_name || key || "—";

  return (
    <div style={S.twoCol}>
      <div style={S.card}>
        <h2 style={S.cardTitle}>{editMode ? "✏️ Edit Client Config" : "➕ Add Client Config"}</h2>

        <label style={S.label}>Select Client from CRM *</label>
        <select style={S.input} value={form.client_id}
          onChange={(e) => handleSelect(e.target.value)}
          disabled={clientsLoading || editMode}>
          <option value="">{clientsLoading ? "-- Loading clients... --" : "-- Choose Client --"}</option>
          {crmClients.map((c) => (
            <option key={c.client_id} value={c.client_id}>{c.client_name}</option>
          ))}
        </select>

        <label style={S.label}>Client Name</label>
        <input style={S.input} value={form.client_name}
          onChange={(e) => setForm({ ...form, client_name: e.target.value })} />

        <label style={S.label}>To Email *</label>
        <input style={S.input} value={form.to_email}
          onChange={(e) => setForm({ ...form, to_email: e.target.value })} />

        <label style={S.label}>CC Emails (comma separated)</label>
        <input style={S.input} value={form.cc_email}
          onChange={(e) => setForm({ ...form, cc_email: e.target.value })} />

        <label style={S.label}>Invoice Template *</label>
        <select style={S.input} value={form.template_key}
          onChange={(e) => setForm({ ...form, template_key: e.target.value })}>
          <option value="">-- Choose Template --</option>
          {templates.map((t) => (
            <option key={t.template_key} value={t.template_key}>{t.template_name}</option>
          ))}
        </select>

        <label style={S.label}>Default Invoice Type</label>
        <select style={S.input} value={form.invoice_type}
          onChange={(e) => setForm({ ...form, invoice_type: e.target.value })}>
          <option>Monthly</option><option>Usage</option>
          <option>One-Time</option><option>Custom</option>
        </select>

        <div style={S.row}>
          <button style={{ ...S.primaryBtn, flex: 1 }} onClick={handleSave} disabled={loading}>
            {loading ? "Saving..." : editMode ? "Update" : "Save"}
          </button>
          {editMode && (
            <button style={{ ...S.secondaryBtn, flex: 1 }}
              onClick={() => {
                setForm({ client_id: "", client_name: "", to_email: "", cc_email: "",
                  template_key: templates[0]?.template_key || "subscription",
                  subject: "", email_template: "", invoice_type: "Monthly" });
                setEditMode(false);
              }}>Cancel</button>
          )}
        </div>
      </div>

      <div style={S.card}>
        <h2 style={S.cardTitle}>Configured Clients ({configured.length})</h2>
        {configured.length === 0 ? (
          <p style={{ color: "#718096", fontSize: "13px" }}>No clients configured yet.</p>
        ) : (
          <div style={{ maxHeight: "600px", overflowY: "auto" }}>
            {configured.map((c) => (
              <div key={c.id} style={S.clientRow}>
                <div style={{ flex: 1 }}>
                  <b>{c.client_name}</b> <small>#{c.client_id}</small><br />
                  <small style={{ color: "#718096" }}>To: {c.to_email}
                    {c.cc_email ? ` | CC: ${c.cc_email}` : ""}</small><br />
                  <span style={S.templateBadge}>📧 {getTemplateName(c.template_key)}</span>
                </div>
                <div>
                  <button style={S.smallBtn} onClick={() => handleSelect(c.client_id)}>Edit</button>
                  <button style={{ ...S.smallBtn, background: "#e53e3e" }}
                    onClick={() => handleDelete(c.client_id)}>Del</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

/* SMTP TAB */
const SmtpTab = ({ smtpConfigured, showToast, onSaved }) => {
  const [form, setForm] = useState({ host: "", port: 587, username: "", password: "", sender_email: "", use_tls: true });
  const [hasExistingPassword, setHasExistingPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get("/invoice-tool/smtp-settings");
        if (res.data.configured) {
          setForm({
            host: res.data.data.host || "", port: res.data.data.port || 587,
            username: res.data.data.username || "", password: "",
            sender_email: res.data.data.sender_email || "",
            use_tls: res.data.data.use_tls === 1 || res.data.data.use_tls === true,
          });
          setHasExistingPassword(true);
        }
      } catch (e) {}
    })();
  }, []);

  const handleSave = async () => {
    if (!form.host || !form.port || !form.username || !form.sender_email)
      return showToast("Fill all required fields", "error");
    if (!form.password && !hasExistingPassword) return showToast("Password required", "error");

    const payload = { ...form, password: form.password || "__KEEP_EXISTING__" };
    setLoading(true);
    try {
      const res = await api.post("/invoice-tool/smtp-settings", payload);
      showToast(res.data.message || "SMTP saved");
      setHasExistingPassword(true); setForm((f) => ({ ...f, password: "" })); onSaved();
    } catch (e) {
      showToast(e.response?.data?.detail || "Save failed", "error");
    } finally { setLoading(false); }
  };

  const handleTest = async () => {
    setTesting(true);
    try { await api.post("/invoice-tool/smtp-settings/test", {}); showToast("SMTP connection OK ✅"); }
    catch (e) { showToast(`Failed: ${e.response?.data?.detail || e.message}`, "error"); }
    finally { setTesting(false); }
  };

  return (
    <div style={{ ...S.card, maxWidth: "700px" }}>
      <h2 style={S.cardTitle}>SMTP Configuration</h2>

      <label style={S.label}>SMTP Host *</label>
      <input style={S.input} placeholder="smtp.gmail.com" value={form.host}
        onChange={(e) => setForm({ ...form, host: e.target.value })} />

      <div style={S.row}>
        <div style={{ flex: 1 }}>
          <label style={S.label}>Port *</label>
          <input style={S.input} type="number" value={form.port}
            onChange={(e) => setForm({ ...form, port: parseInt(e.target.value) || 0 })} />
        </div>
        <div style={{ flex: 2 }}>
          <label style={S.label}>Sender Email *</label>
          <input style={S.input} value={form.sender_email}
            onChange={(e) => setForm({ ...form, sender_email: e.target.value })} />
        </div>
      </div>

      <label style={S.label}>Username *</label>
      <input style={S.input} value={form.username}
        onChange={(e) => setForm({ ...form, username: e.target.value })} />

      <label style={S.label}>Password / App Password *</label>
      <input style={S.input} type="password"
        placeholder={hasExistingPassword ? "(leave blank to keep existing)" : "Enter password"}
        value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />

      <label style={{ ...S.label, marginTop: "15px" }}>
        <input type="checkbox" checked={form.use_tls}
          onChange={(e) => setForm({ ...form, use_tls: e.target.checked })} /> Use TLS (recommended)
      </label>

      <div style={S.row}>
        <button style={{ ...S.primaryBtn, flex: 1 }} onClick={handleSave} disabled={loading}>
          {loading ? "Saving..." : "💾 Save"}
        </button>
        <button style={{ ...S.secondaryBtn, flex: 1, background: "#805ad5", color: "#fff", border: "none" }}
          onClick={handleTest} disabled={testing || !smtpConfigured}>
          {testing ? "Testing..." : "🔌 Test Connection"}
        </button>
      </div>

      <div style={S.warn}>
        💡 <b>Gmail:</b> Use an{" "}
        <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noreferrer"
          style={{ color: "#3182ce" }}>App Password</a>. Port 587 + TLS.
      </div>
    </div>
  );
};

/* LOGS TAB */
const LogsTab = ({ logs, reload }) => (
  <div style={S.card}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <h2 style={S.cardTitle}>Send Logs ({logs.length})</h2>
      <button style={S.smallBtn} onClick={reload}>🔄 Refresh</button>
    </div>
    {logs.length === 0 ? (
      <p style={{ color: "#718096", fontSize: "13px" }}>No logs yet.</p>
    ) : (
      <div style={{ overflowX: "auto" }}>
        <table style={S.table}>
          <thead><tr>
            <th style={S.th}>Client</th><th style={S.th}>Invoice #</th>
            <th style={S.th}>Category</th><th style={S.th}>Subject</th>
            <th style={S.th}>Alert</th><th style={S.th}>Status</th>
            <th style={S.th}>Sent At</th>
          </tr></thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.id}>
                <td style={S.td}>#{l.client_id}</td>
                <td style={S.td}>{l.invoice_number || "-"}</td>
                <td style={S.td}>{l.invoice_category || "-"}</td>
                <td style={S.td}><small>{l.subject_used || "-"}</small></td>
                <td style={S.td}>
                  {l.alert_enabled ? `🔔 ${l.alert_after_days}d` : "—"}
                </td>
                <td style={S.td}>
                  <span style={{
                    padding: "3px 8px", borderRadius: "4px", fontSize: "11px",
                    background: l.status === "SENT" ? "#c6f6d5" : "#fed7d7",
                    color: l.status === "SENT" ? "#22543d" : "#742a2a",
                  }}>{l.status}</span>
                </td>
                <td style={S.td}><small>{new Date(l.sent_at).toLocaleString()}</small></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </div>
);

/* STYLES */
const S = {
  page: { padding: "30px", background: "#f4f6f9", minHeight: "100vh", fontFamily: "system-ui, -apple-system, sans-serif" },
  header: { maxWidth: "1400px", margin: "0 auto 20px" },
  h1: { margin: 0, color: "#1a202c", fontSize: "26px" },
  headerSub: { margin: "4px 0 0", color: "#718096", fontSize: "14px" },
  statsGrid: { maxWidth: "1400px", margin: "0 auto 20px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "15px" },
  statCard: { background: "#fff", padding: "18px", borderRadius: "10px", boxShadow: "0 2px 8px rgba(0,0,0,0.05)", textAlign: "center" },
  tabs: { maxWidth: "1400px", margin: "0 auto 20px", display: "flex", gap: "8px", flexWrap: "wrap" },
  tabBtn: { padding: "10px 18px", border: "1px solid #e2e8f0", borderRadius: "8px", fontSize: "14px", fontWeight: "600", cursor: "pointer", transition: "all 0.15s" },
  tabContent: { maxWidth: "1400px", margin: "0 auto" },
  card: { background: "#fff", padding: "25px", borderRadius: "10px", boxShadow: "0 2px 10px rgba(0,0,0,0.06)" },
  cardTitle: { margin: "0 0 15px", color: "#1a202c", fontSize: "18px" },
  twoCol: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" },
  label: { display: "block", marginTop: "14px", marginBottom: "6px", fontWeight: "600", color: "#2d3748", fontSize: "13px" },
  input: { width: "100%", padding: "10px 12px", border: "1px solid #cbd5e0", borderRadius: "6px", fontSize: "14px", boxSizing: "border-box", outline: "none", background: "#fff" },
  row: { display: "flex", gap: "12px", marginTop: "10px" },
  primaryBtn: { marginTop: "20px", width: "100%", padding: "12px", background: "#3182ce", color: "#fff", border: "none", borderRadius: "6px", fontSize: "14px", fontWeight: "700", cursor: "pointer" },
  secondaryBtn: { marginTop: "20px", padding: "12px", background: "#fff", color: "#2d3748", border: "1px solid #cbd5e0", borderRadius: "6px", fontSize: "14px", fontWeight: "600", cursor: "pointer" },
  smallBtn: { padding: "5px 10px", background: "#3182ce", color: "#fff", border: "none", borderRadius: "4px", fontSize: "12px", marginRight: "5px", cursor: "pointer" },
  warn: { background: "#fffaf0", border: "1px solid #f6ad55", color: "#c05621", padding: "12px", borderRadius: "6px", marginBottom: "10px", fontSize: "13px", marginTop: "15px" },
  preview: { marginTop: "12px", padding: "10px 12px", background: "#ebf8ff", border: "1px solid #90cdf4", borderRadius: "6px", fontSize: "13px", color: "#2c5282" },
  clientRow: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #edf2f7", fontSize: "13px" },
  templateRow: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "14px 0", borderBottom: "1px solid #edf2f7" },
  templateBadge: { display: "inline-block", marginTop: "6px", padding: "3px 10px", background: "#e6fffa", color: "#234e52", borderRadius: "4px", fontSize: "11px", fontWeight: "600" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: "13px" },
  th: { textAlign: "left", padding: "10px", borderBottom: "2px solid #e2e8f0", background: "#f7fafc", fontSize: "12px", textTransform: "uppercase", color: "#718096" },
  td: { padding: "10px", borderBottom: "1px solid #edf2f7" },
  toast: { position: "fixed", top: "20px", right: "20px", padding: "12px 20px", color: "#fff", borderRadius: "8px", zIndex: 9999, fontWeight: "600", fontSize: "14px", boxShadow: "0 4px 12px rgba(0,0,0,0.15)" },
  modalOverlay: { position: "fixed", inset: 0, background: "rgba(0, 0, 0, 0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10000, padding: "20px" },
  modal: { background: "#fff", borderRadius: "12px", width: "100%", maxWidth: "720px", maxHeight: "90vh", display: "flex", flexDirection: "column", boxShadow: "0 20px 60px rgba(0,0,0,0.3)", overflow: "hidden" },
  modalHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "18px 22px", borderBottom: "1px solid #e2e8f0", background: "#f7fafc" },
  modalClose: { background: "transparent", border: "none", fontSize: "20px", cursor: "pointer", color: "#718096" },
  emailHeader: { padding: "14px 22px", background: "#fff", borderBottom: "1px solid #edf2f7" },
  emailHeaderRow: { display: "flex", gap: "10px", fontSize: "13px", padding: "4px 0" },
  emailHeaderLabel: { width: "70px", color: "#718096", fontWeight: "600", flexShrink: 0 },
  emailHeaderValue: { color: "#2d3748", wordBreak: "break-word" },
  emailBody: { padding: "20px 22px", overflowY: "auto", flex: 1, background: "#fff" },
  emailBodyPre: { margin: 0, fontFamily: "system-ui, sans-serif", fontSize: "14px", lineHeight: 1.6, color: "#2d3748", whiteSpace: "pre-wrap" },
  attachmentBox: { display: "flex", alignItems: "center", gap: "12px", margin: "0 22px 16px", padding: "12px 14px", background: "#f7fafc", border: "1px solid #e2e8f0", borderRadius: "8px" },
  attachmentIcon: { fontSize: "22px" },
  modalFooter: { display: "flex", gap: "12px", padding: "16px 22px", borderTop: "1px solid #e2e8f0", background: "#f7fafc" },
};

export default InvoiceDashboard;