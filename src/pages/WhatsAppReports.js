import React, { useState, useEffect, useCallback } from "react";
import api from "../api";

const WhatsAppReports = () => {
  const [mainTab, setMainTab] = useState("dashboard");
  const [reports, setReports] = useState([]);
  const [logs, setLogs] = useState([]);
  const [activeReport, setActiveReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [autoRefresh, setAutoRefresh] = useState(true);

  const [editSchedule, setEditSchedule] = useState(2);
  const [editGroup, setEditGroup] = useState("");
  const [saving, setSaving] = useState(false);

  // ============================================================
  const fetchReports = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const res = await api.get("/whatsapp-reports/list");
      const data = res.data || [];
      setReports(data);
      if (data.length > 0) {
        setActiveReport((prev) => {
          if (prev) {
            const updated = data.find((r) => r.report_key === prev.report_key);
            return updated || data[0];
          }
          return data[0];
        });
      }
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to load reports");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchLogs = useCallback(async () => {
    if (!activeReport) return;
    try {
      const res = await api.get(
        `/whatsapp-reports/logs?report_key=${activeReport.report_key}`
      );
      setLogs(res.data || []);
    } catch (err) {
      console.error("Logs fetch failed:", err);
    }
  }, [activeReport]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  useEffect(() => {
    if (activeReport) {
      fetchLogs();
      setEditSchedule(activeReport.schedule_hours || 2);
      setEditGroup(activeReport.group_id || "");
    }
  }, [activeReport, fetchLogs]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchReports();
      fetchLogs();
    }, 15000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchReports, fetchLogs]);

  useEffect(() => {
    if (successMsg) {
      const t = setTimeout(() => setSuccessMsg(""), 4000);
      return () => clearTimeout(t);
    }
  }, [successMsg]);

  // ============================================================
  const handleRun = async (reportKey) => {
    try {
      setActionLoading(true);
      setError("");
      setSuccessMsg("");
      await api.post("/whatsapp-reports/run", { report_key: reportKey });
      setSuccessMsg("Report triggered — WhatsApp delivery in progress (2-5 min)");
      setTimeout(() => {
        fetchReports();
        fetchLogs();
      }, 3000);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to run report");
    } finally {
      setActionLoading(false);
    }
  };

  const handleStop = async (reportKey) => {
    try {
      setActionLoading(true);
      setError("");
      setSuccessMsg("");
      await api.post("/whatsapp-reports/stop", { report_key: reportKey });
      setSuccessMsg("Report stopped successfully");
      fetchReports();
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to stop report");
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!activeReport) return;
    try {
      setSaving(true);
      setError("");
      setSuccessMsg("");
      await api.post("/whatsapp-reports/update", {
        report_key: activeReport.report_key,
        schedule_hours: parseInt(editSchedule, 10),
        group_id: editGroup.trim(),
      });
      setSuccessMsg("Settings saved successfully");
      fetchReports();
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dt) => {
    if (!dt) return "Never";
    try {
      return new Date(dt).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dt;
    }
  };

  const totalReports = reports.length;
  const activeCount = reports.filter((r) => r.is_active).length;
  const successCount = logs.filter((l) => l.status === "SUCCESS").length;
  const failedCount = logs.filter((l) => l.status === "FAILED").length;

  // ============================================================
  return (
    <div style={styles.page}>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.15); }
        }
        .dot-active { animation: pulse 2s infinite; }
        .btn-hover:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        .report-item-hover:hover {
          background: #f1f5f9 !important;
        }
        .tab-hover:hover {
          color: #1e293b !important;
        }
      `}</style>

      {/* TOP BAR */}
      <div style={styles.topBar}>
        <div>
          <div style={styles.breadcrumb}>
            <span style={styles.breadcrumbItem}>Automation</span>
            <span style={styles.breadcrumbSep}>/</span>
            <span style={styles.breadcrumbActive}>WhatsApp Reports</span>
          </div>
          <h1 style={styles.pageTitle}>WhatsApp Reports</h1>
          <p style={styles.pageSubtitle}>
            Manage and monitor all your automated WhatsApp reports in one place
          </p>
        </div>
        <div style={styles.topActions}>
          <label style={styles.toggleWrap}>
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              style={styles.checkbox}
            />
            <span style={styles.toggleText}>Auto-refresh (15s)</span>
          </label>
          <button
            style={styles.refreshButton}
            className="btn-hover"
            onClick={() => {
              fetchReports();
              fetchLogs();
            }}
          >
            <span style={{ marginRight: 6 }}>↻</span> Refresh
          </button>
        </div>
      </div>

      {/* MAIN TABS */}
      <div style={styles.mainTabsWrap}>
        <button
          onClick={() => setMainTab("dashboard")}
          style={{
            ...styles.mainTab,
            ...(mainTab === "dashboard" ? styles.mainTabActive : {}),
          }}
          className="tab-hover"
        >
          📊 Dashboard
        </button>
        <button
          onClick={() => setMainTab("settings")}
          style={{
            ...styles.mainTab,
            ...(mainTab === "settings" ? styles.mainTabActive : {}),
          }}
          className="tab-hover"
        >
          ⚙️ Settings
        </button>
      </div>

      {/* ALERTS */}
      {error && (
        <div style={styles.alertError}>
          <span style={styles.alertText}>⚠️ {error}</span>
          <button style={styles.alertClose} onClick={() => setError("")}>
            ✕
          </button>
        </div>
      )}
      {successMsg && (
        <div style={styles.alertSuccess}>
          <span style={styles.alertText}>✓ {successMsg}</span>
        </div>
      )}

      {/* ============ DASHBOARD TAB ============ */}
      {mainTab === "dashboard" && (
        <>
          {/* KPI CARDS */}
          <div style={styles.kpiGrid}>
            <KpiCard
              label="Total Reports"
              value={totalReports}
              icon="📋"
              color="#3b82f6"
              bg="#eff6ff"
              border="#bfdbfe"
            />
            <KpiCard
              label="Active Now"
              value={activeCount}
              icon="🟢"
              color="#16a34a"
              bg="#f0fdf4"
              border="#bbf7d0"
            />
            <KpiCard
              label="Successful Runs"
              value={successCount}
              icon="✅"
              color="#0891b2"
              bg="#ecfeff"
              border="#a5f3fc"
            />
            <KpiCard
              label="Failed Runs"
              value={failedCount}
              icon="❌"
              color="#dc2626"
              bg="#fef2f2"
              border="#fecaca"
            />
          </div>

          {loading && reports.length === 0 ? (
            <div style={styles.loader}>Loading reports...</div>
          ) : reports.length === 0 ? (
            <div style={styles.emptyState}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>📭</div>
              <div>No WhatsApp reports configured.</div>
            </div>
          ) : (
            <div style={styles.mainGrid}>
              {/* SIDEBAR */}
              <div style={styles.sidebar}>
                <div style={styles.sidebarHeader}>
                  <span style={styles.sidebarTitle}>All Reports</span>
                  <span style={styles.sidebarCount}>{reports.length}</span>
                </div>
                <div style={styles.reportList}>
                  {reports.map((r) => {
                    const isActive = activeReport?.report_key === r.report_key;
                    return (
                      <button
                        key={r.report_key}
                        onClick={() => setActiveReport(r)}
                        className="report-item-hover"
                        style={{
                          ...styles.reportItem,
                          ...(isActive ? styles.reportItemActive : {}),
                        }}
                      >
                        <div style={styles.reportItemTop}>
                          <span style={styles.reportItemName}>{r.report_name}</span>
                          <span
                            style={{
                              ...styles.dot,
                              backgroundColor: r.is_active ? "#16a34a" : "#cbd5e1",
                            }}
                            className={r.is_active ? "dot-active" : ""}
                          />
                        </div>
                        <div style={styles.reportItemMeta}>
                          {r.is_active ? "Active" : "Stopped"} · Every {r.schedule_hours}h
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* CONTENT */}
              <div style={styles.contentArea}>
                {activeReport && (
                  <>
                    <div style={styles.detailHeader}>
                      <div style={{ flex: 1, minWidth: 200 }}>
                        <h2 style={styles.detailTitle}>{activeReport.report_name}</h2>
                        <div style={styles.detailSubtitle}>
                          <code style={styles.code}>{activeReport.report_key}</code>
                          <span
                            style={{
                              ...styles.statusPill,
                              backgroundColor: activeReport.is_active
                                ? "#dcfce7"
                                : "#fee2e2",
                              color: activeReport.is_active ? "#15803d" : "#b91c1c",
                            }}
                          >
                            {activeReport.is_active ? "● ACTIVE" : "○ STOPPED"}
                          </span>
                        </div>
                      </div>
                      <div style={styles.detailActions}>
                        <button
                          style={{
                            ...styles.btnRun,
                            opacity: actionLoading ? 0.6 : 1,
                            cursor: actionLoading ? "not-allowed" : "pointer",
                          }}
                          className="btn-hover"
                          disabled={actionLoading}
                          onClick={() => handleRun(activeReport.report_key)}
                        >
                          {actionLoading ? "⏳ Running..." : "▶ Run Now"}
                        </button>
                        <button
                          style={{
                            ...styles.btnStop,
                            opacity:
                              !activeReport.is_active || actionLoading ? 0.4 : 1,
                            cursor:
                              !activeReport.is_active || actionLoading
                                ? "not-allowed"
                                : "pointer",
                          }}
                          className="btn-hover"
                          disabled={!activeReport.is_active || actionLoading}
                          onClick={() => handleStop(activeReport.report_key)}
                        >
                          ⏹ Stop
                        </button>
                      </div>
                    </div>

                    {/* INFO GRID */}
                    <div style={styles.infoGrid}>
                      <InfoBox
                        icon="📅"
                        label="Schedule"
                        value={`Every ${activeReport.schedule_hours} hour(s)`}
                      />
                      <InfoBox
                        icon="🕐"
                        label="Last Run"
                        value={formatDate(activeReport.last_run)}
                      />
                      <InfoBox
                        icon="💬"
                        label="WhatsApp Group"
                        value={activeReport.group_id || "—"}
                        mono
                      />
                    </div>

                    {/* LOGS */}
                    <div style={styles.logsBox}>
                      <div style={styles.logsHeader}>
                        <div style={styles.logsTitleWrap}>
                          <h3 style={styles.logsTitle}>Recent Activity</h3>
                          <span style={styles.logsCount}>
                            {logs.length} {logs.length === 1 ? "entry" : "entries"}
                          </span>
                        </div>
                        <button
                          style={styles.logsRefresh}
                          onClick={fetchLogs}
                        >
                          ↻
                        </button>
                      </div>

                      {logs.length === 0 ? (
                        <div style={styles.emptyLogs}>
                          <div style={{ fontSize: 36, marginBottom: 8, opacity: 0.5 }}>
                            📝
                          </div>
                          No activity yet. Click "Run Now" to trigger a report.
                        </div>
                      ) : (
                        <div style={styles.logList}>
                          {logs.map((log, i) => (
                            <div key={i} style={styles.logItem}>
                              <div
                                style={{
                                  ...styles.logIcon,
                                  backgroundColor:
                                    log.status === "SUCCESS" ? "#dcfce7" : "#fee2e2",
                                  color:
                                    log.status === "SUCCESS" ? "#16a34a" : "#dc2626",
                                }}
                              >
                                {log.status === "SUCCESS" ? "✓" : "✕"}
                              </div>
                              <div style={styles.logBody}>
                                <div style={styles.logTop}>
                                  <span
                                    style={{
                                      ...styles.logStatus,
                                      color:
                                        log.status === "SUCCESS"
                                          ? "#16a34a"
                                          : "#dc2626",
                                    }}
                                  >
                                    {log.status === "SUCCESS" ? "SUCCESS" : "FAILED"}
                                  </span>
                                  <span style={styles.logTime}>
                                    {formatDate(log.timestamp)}
                                  </span>
                                </div>
                                <div style={styles.logMsg}>{log.message || "—"}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* ============ SETTINGS TAB ============ */}
      {mainTab === "settings" && (
        <div style={styles.settingsArea}>
          {reports.length === 0 ? (
            <div style={styles.emptyState}>No reports available.</div>
          ) : (
            <>
              <div style={styles.settingsCard}>
                <label style={styles.label}>Select Report</label>
                <select
                  value={activeReport?.report_key || ""}
                  onChange={(e) => {
                    const found = reports.find((r) => r.report_key === e.target.value);
                    if (found) setActiveReport(found);
                  }}
                  style={styles.select}
                >
                  {reports.map((r) => (
                    <option key={r.report_key} value={r.report_key}>
                      {r.report_name}
                    </option>
                  ))}
                </select>
              </div>

              {activeReport && (
                <>
                  <div style={styles.settingsCard}>
                    <div style={styles.cardHeaderRow}>
                      <div>
                        <h3 style={styles.settingsTitle}>Schedule Settings</h3>
                        <p style={styles.settingsDesc}>
                          Configure when this report should be sent automatically
                        </p>
                      </div>
                      <span
                        style={{
                          ...styles.statusPill,
                          backgroundColor: activeReport.is_active
                            ? "#dcfce7"
                            : "#fee2e2",
                          color: activeReport.is_active ? "#15803d" : "#b91c1c",
                        }}
                      >
                        {activeReport.is_active ? "● ACTIVE" : "○ STOPPED"}
                      </span>
                    </div>

                    <div style={styles.formGroup}>
                      <label style={styles.label}>Send Every (hours)</label>
                      <input
                        type="number"
                        min="1"
                        max="168"
                        value={editSchedule}
                        onChange={(e) => setEditSchedule(e.target.value)}
                        style={styles.input}
                      />
                      <p style={styles.helpText}>
                        Report will be sent automatically every{" "}
                        <b>{editSchedule}</b> hour(s)
                      </p>
                    </div>

                    <div style={styles.formGroup}>
                      <label style={styles.label}>WhatsApp Group ID</label>
                      <input
                        type="text"
                        value={editGroup}
                        onChange={(e) => setEditGroup(e.target.value)}
                        style={styles.input}
                        placeholder="120363047345397502@g.us"
                      />
                    </div>

                    <div style={styles.formActions}>
                      <button
                        style={{
                          ...styles.btnSave,
                          opacity: saving ? 0.6 : 1,
                        }}
                        className="btn-hover"
                        disabled={saving}
                        onClick={handleSaveSettings}
                      >
                        {saving ? "💾 Saving..." : "💾 Save Settings"}
                      </button>
                    </div>
                  </div>

                  <div style={styles.settingsCard}>
                    <h3 style={styles.settingsTitle}>Manual Controls</h3>
                    <p style={styles.settingsDesc}>
                      Trigger immediately or pause the auto-schedule
                    </p>
                    <div style={styles.formActions}>
                      <button
                        style={{
                          ...styles.btnRun,
                          opacity: actionLoading ? 0.6 : 1,
                        }}
                        className="btn-hover"
                        disabled={actionLoading}
                        onClick={() => handleRun(activeReport.report_key)}
                      >
                        {actionLoading ? "⏳ Running..." : "▶ Run Now"}
                      </button>
                      <button
                        style={{
                          ...styles.btnStop,
                          opacity:
                            !activeReport.is_active || actionLoading ? 0.4 : 1,
                        }}
                        className="btn-hover"
                        disabled={!activeReport.is_active || actionLoading}
                        onClick={() => handleStop(activeReport.report_key)}
                      >
                        ⏹ Stop Auto-Run
                      </button>
                    </div>
                  </div>

                  <div style={styles.settingsCard}>
                    <h3 style={styles.settingsTitle}>Report Info</h3>
                    <div style={styles.infoGridSimple}>
                      <div style={styles.infoRow}>
                        <span style={styles.infoRowLabel}>Report Key</span>
                        <code style={styles.code}>{activeReport.report_key}</code>
                      </div>
                      <div style={styles.infoRow}>
                        <span style={styles.infoRowLabel}>Last Run</span>
                        <span style={styles.infoRowValue}>
                          {formatDate(activeReport.last_run)}
                        </span>
                      </div>
                      <div style={styles.infoRow}>
                        <span style={styles.infoRowLabel}>Current Schedule</span>
                        <span style={styles.infoRowValue}>
                          Every {activeReport.schedule_hours} hour(s)
                        </span>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

// ============================================================
const KpiCard = ({ label, value, icon, color, bg, border }) => (
  <div
    style={{
      ...styles.kpiCard,
      backgroundColor: bg,
      borderColor: border,
    }}
  >
    <div style={styles.kpiTop}>
      <span style={{ ...styles.kpiIcon, color }}>{icon}</span>
      <span style={{ ...styles.kpiValue, color }}>{value}</span>
    </div>
    <div style={styles.kpiLabel}>{label}</div>
  </div>
);

const InfoBox = ({ icon, label, value, mono }) => (
  <div style={styles.infoBox}>
    <div style={styles.infoBoxIcon}>{icon}</div>
    <div style={{ minWidth: 0, flex: 1 }}>
      <div style={styles.infoLabel}>{label}</div>
      <div
        style={{
          ...styles.infoValue,
          ...(mono ? { fontFamily: "monospace", fontSize: 12 } : {}),
        }}
      >
        {value}
      </div>
    </div>
  </div>
);

// ============================================================
const styles = {
  page: {
    padding: "28px 32px",
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    backgroundColor: "#f8fafc",
    minHeight: "100vh",
    fontSize: "14px",
  },
  topBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "24px",
    flexWrap: "wrap",
    gap: "16px",
  },
  breadcrumb: {
    fontSize: "12px",
    color: "#64748b",
    marginBottom: "6px",
  },
  breadcrumbItem: { color: "#64748b" },
  breadcrumbSep: { margin: "0 6px", color: "#cbd5e1" },
  breadcrumbActive: { color: "#1e293b", fontWeight: "600" },
  pageTitle: {
    fontSize: "26px",
    fontWeight: "700",
    color: "#0f172a",
    margin: 0,
    letterSpacing: "-0.5px",
  },
  pageSubtitle: {
    fontSize: "13px",
    color: "#64748b",
    margin: "4px 0 0 0",
  },
  topActions: { display: "flex", alignItems: "center", gap: "16px" },
  toggleWrap: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    cursor: "pointer",
    padding: "8px 12px",
    backgroundColor: "white",
    borderRadius: "8px",
    border: "1px solid #e2e8f0",
  },
  checkbox: { cursor: "pointer", width: "14px", height: "14px" },
  toggleText: { fontSize: "13px", color: "#475569", fontWeight: "500" },
  refreshButton: {
    padding: "10px 18px",
    backgroundColor: "#1e293b",
    color: "white",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: "600",
    transition: "all 0.15s",
  },
  mainTabsWrap: {
    display: "flex",
    gap: "4px",
    borderBottom: "2px solid #e2e8f0",
    marginBottom: "24px",
  },
  mainTab: {
    padding: "12px 24px",
    backgroundColor: "transparent",
    border: "none",
    borderBottom: "3px solid transparent",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "600",
    color: "#64748b",
    marginBottom: "-2px",
    transition: "all 0.15s",
  },
  mainTabActive: {
    color: "#1e40af",
    borderBottom: "3px solid #1e40af",
  },
  alertError: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "14px 20px",
    backgroundColor: "#fef2f2",
    color: "#b91c1c",
    border: "1px solid #fecaca",
    borderRadius: "10px",
    marginBottom: "16px",
    fontSize: "13px",
    fontWeight: "500",
  },
  alertSuccess: {
    padding: "14px 20px",
    backgroundColor: "#f0fdf4",
    color: "#15803d",
    border: "1px solid #bbf7d0",
    borderRadius: "10px",
    marginBottom: "16px",
    fontSize: "13px",
    fontWeight: "500",
  },
  alertText: { flex: 1 },
  alertClose: {
    background: "none",
    border: "none",
    cursor: "pointer",
    fontSize: "16px",
    color: "#b91c1c",
  },
  kpiGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: "16px",
    marginBottom: "24px",
  },
  kpiCard: {
    padding: "18px 20px",
    borderRadius: "12px",
    border: "1px solid",
    transition: "all 0.2s",
  },
  kpiTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "8px",
  },
  kpiIcon: { fontSize: "20px" },
  kpiValue: { fontSize: "30px", fontWeight: "800", letterSpacing: "-1px" },
  kpiLabel: {
    fontSize: "12px",
    color: "#64748b",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  loader: { padding: "80px", textAlign: "center", color: "#94a3b8" },
  emptyState: {
    padding: "60px",
    textAlign: "center",
    color: "#94a3b8",
    backgroundColor: "white",
    borderRadius: "12px",
    border: "2px dashed #cbd5e1",
  },
  mainGrid: {
    display: "grid",
    gridTemplateColumns: "300px 1fr",
    gap: "20px",
    alignItems: "flex-start",
  },
  sidebar: {
    backgroundColor: "white",
    borderRadius: "12px",
    border: "1px solid #e2e8f0",
    overflow: "hidden",
    position: "sticky",
    top: "20px",
  },
  sidebarHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "16px 18px",
    borderBottom: "1px solid #f1f5f9",
    backgroundColor: "#f8fafc",
  },
  sidebarTitle: {
    fontSize: "12px",
    fontWeight: "700",
    color: "#475569",
    textTransform: "uppercase",
    letterSpacing: "0.6px",
  },
  sidebarCount: {
    fontSize: "11px",
    color: "#475569",
    backgroundColor: "white",
    padding: "3px 10px",
    borderRadius: "10px",
    fontWeight: "700",
    border: "1px solid #e2e8f0",
  },
  reportList: { padding: "8px", maxHeight: "600px", overflowY: "auto" },
  reportItem: {
    width: "100%",
    textAlign: "left",
    padding: "12px 14px",
    marginBottom: "4px",
    borderRadius: "8px",
    border: "none",
    backgroundColor: "transparent",
    cursor: "pointer",
    transition: "all 0.15s",
    fontSize: "14px",
  },
  reportItemActive: {
    backgroundColor: "#eff6ff",
    borderLeft: "3px solid #3b82f6",
  },
  reportItemTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "4px",
    gap: "8px",
  },
  reportItemName: {
    fontSize: "13px",
    fontWeight: "600",
    color: "#1e293b",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  dot: { width: "8px", height: "8px", borderRadius: "50%", flexShrink: 0 },
  reportItemMeta: { fontSize: "11px", color: "#94a3b8" },
  contentArea: { display: "flex", flexDirection: "column", gap: "16px" },
  detailHeader: {
    backgroundColor: "white",
    borderRadius: "12px",
    padding: "20px 24px",
    border: "1px solid #e2e8f0",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "16px",
  },
  detailTitle: {
    fontSize: "20px",
    fontWeight: "700",
    color: "#0f172a",
    margin: "0 0 8px 0",
  },
  detailSubtitle: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    flexWrap: "wrap",
  },
  code: {
    fontSize: "11px",
    color: "#475569",
    backgroundColor: "#f1f5f9",
    padding: "3px 8px",
    borderRadius: "4px",
    fontFamily: "monospace",
  },
  statusPill: {
    padding: "4px 10px",
    borderRadius: "12px",
    fontSize: "10px",
    fontWeight: "700",
    letterSpacing: "0.5px",
  },
  detailActions: { display: "flex", gap: "10px" },
  btnRun: {
    padding: "10px 20px",
    backgroundColor: "#16a34a",
    color: "white",
    border: "none",
    borderRadius: "8px",
    fontSize: "13px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "all 0.15s",
  },
  btnStop: {
    padding: "10px 20px",
    backgroundColor: "#dc2626",
    color: "white",
    border: "none",
    borderRadius: "8px",
    fontSize: "13px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "all 0.15s",
  },
  infoGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "12px",
  },
  infoBox: {
    backgroundColor: "white",
    borderRadius: "10px",
    padding: "16px 18px",
    border: "1px solid #e2e8f0",
    display: "flex",
    gap: "12px",
    alignItems: "center",
  },
  infoBoxIcon: {
    fontSize: "18px",
    width: "36px",
    height: "36px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f1f5f9",
    borderRadius: "8px",
    flexShrink: 0,
  },
  infoLabel: {
    fontSize: "11px",
    color: "#94a3b8",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    marginBottom: "4px",
  },
  infoValue: {
    fontSize: "13px",
    color: "#1e293b",
    fontWeight: "600",
    wordBreak: "break-all",
  },
  logsBox: {
    backgroundColor: "white",
    borderRadius: "12px",
    border: "1px solid #e2e8f0",
    overflow: "hidden",
  },
  logsHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "16px 22px",
    borderBottom: "1px solid #f1f5f9",
    backgroundColor: "#f8fafc",
  },
  logsTitleWrap: { display: "flex", alignItems: "center", gap: "12px" },
  logsTitle: { fontSize: "15px", fontWeight: "700", color: "#0f172a", margin: 0 },
  logsCount: {
    fontSize: "11px",
    color: "#64748b",
    backgroundColor: "white",
    padding: "3px 10px",
    borderRadius: "10px",
    fontWeight: "600",
    border: "1px solid #e2e8f0",
  },
  logsRefresh: {
    padding: "6px 12px",
    backgroundColor: "white",
    border: "1px solid #e2e8f0",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "13px",
    color: "#475569",
  },
  emptyLogs: {
    padding: "50px",
    textAlign: "center",
    color: "#94a3b8",
    fontSize: "13px",
  },
  logList: { maxHeight: "480px", overflowY: "auto" },
  logItem: {
    display: "flex",
    gap: "14px",
    padding: "16px 22px",
    borderBottom: "1px solid #f8fafc",
    alignItems: "flex-start",
    transition: "background 0.15s",
  },
  logIcon: {
    width: "36px",
    height: "36px",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "16px",
    fontWeight: "700",
    flexShrink: 0,
  },
  logBody: { flex: 1, minWidth: 0 },
  logTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "4px",
    gap: "10px",
  },
  logStatus: {
    fontSize: "11px",
    fontWeight: "700",
    letterSpacing: "0.5px",
  },
  logTime: { fontSize: "11px", color: "#94a3b8", whiteSpace: "nowrap" },
  logMsg: {
    fontSize: "13px",
    color: "#475569",
    lineHeight: "1.5",
    wordBreak: "break-word",
  },
  settingsArea: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    maxWidth: "820px",
  },
  settingsCard: {
    backgroundColor: "white",
    borderRadius: "12px",
    padding: "24px",
    border: "1px solid #e2e8f0",
  },
  cardHeaderRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "20px",
    gap: "16px",
  },
  settingsTitle: {
    fontSize: "16px",
    fontWeight: "700",
    color: "#0f172a",
    margin: "0 0 4px 0",
  },
  settingsDesc: {
    fontSize: "13px",
    color: "#64748b",
    margin: "0 0 16px 0",
  },
  formGroup: { marginBottom: "20px" },
  label: {
    display: "block",
    fontSize: "12px",
    fontWeight: "600",
    color: "#475569",
    marginBottom: "8px",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  input: {
    width: "100%",
    padding: "12px 14px",
    fontSize: "14px",
    borderRadius: "8px",
    border: "1px solid #cbd5e1",
    outline: "none",
    boxSizing: "border-box",
    fontFamily: "inherit",
    color: "#1e293b",
    backgroundColor: "#f8fafc",
    transition: "border 0.15s",
  },
  select: {
    width: "100%",
    padding: "12px 14px",
    fontSize: "14px",
    borderRadius: "8px",
    border: "1px solid #cbd5e1",
    outline: "none",
    backgroundColor: "#f8fafc",
    color: "#1e293b",
    fontFamily: "inherit",
    cursor: "pointer",
  },
  helpText: {
    fontSize: "12px",
    color: "#94a3b8",
    marginTop: "8px",
    marginBottom: 0,
  },
  formActions: { display: "flex", gap: "10px", marginTop: "8px" },
  btnSave: {
    padding: "12px 26px",
    backgroundColor: "#3b82f6",
    color: "white",
    border: "none",
    borderRadius: "8px",
    fontSize: "13px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "all 0.15s",
  },
  infoGridSimple: { display: "flex", flexDirection: "column", gap: "12px" },
  infoRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: "12px",
    borderBottom: "1px solid #f1f5f9",
    gap: "16px",
  },
  infoRowLabel: { fontSize: "13px", color: "#64748b", fontWeight: "500" },
  infoRowValue: {
    fontSize: "13px",
    color: "#1e293b",
    fontWeight: "600",
    textAlign: "right",
    wordBreak: "break-all",
  },
};

export default WhatsAppReports;