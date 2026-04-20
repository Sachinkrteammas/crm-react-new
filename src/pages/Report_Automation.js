import React, { useState, useEffect } from "react";
import api from "../api";
import { Trash2 } from "lucide-react";

const ReportsAutomation = () => {
  const userType = localStorage.getItem("user_type");
  const companyId = localStorage.getItem("company_id");

  const [clientId, setClientId] = useState(companyId);
  const [clients, setClients] = useState([]);
  const [reportType, setReportType] = useState("");
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);

  // ✅ Active Client Logic
  const activeClientId =
    userType === "Super-Admin" || userType === "Admin"
      ? clientId
      : companyId;

  /* ---------------------------
     FETCH CLIENT LIST (ADMIN)
  --------------------------- */
  useEffect(() => {
    if (userType === "Super-Admin" || userType === "Admin") {
      api
        .get("/agents/clients-rights")
        .then((res) => {
          const sorted = res.data.sort((a, b) =>
            a.company_name.localeCompare(b.company_name)
          );
          setClients(sorted);
        })
        .catch((err) => console.error("Error fetching clients:", err));
    }
  }, [userType]);

  /* ---------------------------
     AUTO-SET CLIENT (NON-ADMIN)
  --------------------------- */
  useEffect(() => {
    if (!(userType === "Super-Admin" || userType === "Admin")) {
      setClientId(companyId);
    }
  }, [userType, companyId]);

  /* ---------------------------
     FETCH CLIENT REPORTS (GET)
  --------------------------- */
  const fetchReports = async () => {
    if (!activeClientId) return;

    try {
      setLoading(true);

      const res = await api.get(
        `/get_client_reports?client_id=${activeClientId}`
      );

      if (res.data?.status === "success") {
        setReports(res.data.data || []);
      } else {
        setReports([]);
      }
    } catch (error) {
      console.error("Fetch reports error:", error);
      setReports([]);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Auto call when client changes
  useEffect(() => {
    fetchReports();
  }, [activeClientId]);

  /* ---------------------------
     HANDLE SUBMIT (POST API)
  --------------------------- */
  const handleSubmit = async () => {
    if (!activeClientId) {
      alert("Please select client");
      return;
    }

    if (!reportType) {
      alert("Please select report");
      return;
    }

    try {
      setLoading(true);

      const response = await api.post(
        `/add_client_report?client_id=${activeClientId}&report_name=${reportType}`
      );

      if (response.data?.status === "success") {
        alert("✅ Client report added");
        setReportType("");
        fetchReports(); // refresh table
      } else {
        alert("❌ Failed to save");
      }

    } catch (error) {
      console.error("Submit error:", error);
      // ✅ MAIN FIX: Show backend message
      const message =
        error?.response?.data?.detail ||
        error?.response?.data?.message ||
        "❌ Something went wrong";

      alert(message);
    } finally {
      setLoading(false);
    }
  };


  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this report permanently?")) return;

    try {
        setLoading(true);

        const res = await api.delete(
        "/delete_client_report_permanent",
        {
            params: { id },
        }
        );

        if (res.data?.status === "success") {
        alert("✅ Report deleted permanently");
        fetchReports(); // 🔄 refresh table
        } else {
        alert(res.data?.message || "❌ Failed to delete");
        }

    } catch (error) {
        console.error("Delete error:", error);
        alert("❌ Something went wrong");
    } finally {
        setLoading(false);
    }
    };    

  return (
    <>
      {loading && (
        <div className="loader-overlay">
          <div className="bar"></div>
          <div className="bar"></div>
          <div className="bar"></div>
          <div className="bar"></div>
          <div className="bar"></div>
        </div>
      )}

      <div className={`priority-wrapper ${loading ? "blurred" : ""}`}>
        <div className="row">
          <div className="col-12">

            {/* 🔹 FORM CARD */}
            <div className="card p-4 mb-4">
              <h5 className="mb-3">Reports Automation</h5>

              <div className="d-flex flex-wrap align-items-end gap-3">

                {/* Client */}
                {(userType === "Super-Admin" || userType === "Admin") && (
                  <div style={{ maxWidth: "220px" }}>
                    <label className="form-label">Select Client</label>
                    <select
                      className="form-select"
                      value={clientId}
                      onChange={(e) => setClientId(e.target.value)}
                    >
                      <option value="">-- Select Client --</option>
                      {clients.map((c) => (
                        <option key={c.company_id} value={c.company_id}>
                          {c.company_name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Report */}
                <div style={{ maxWidth: "220px" }}>
                  <label className="form-label">Select Report</label>
                  <select
                    className="form-select"
                    value={reportType}
                    onChange={(e) => setReportType(e.target.value)}
                  >
                    <option value="">Select Report</option>
                    <option value="CDR_REPORT">CDR Report</option>
                    <option value="BILLING_REPORT">Billing Statement</option>
                  </select>
                </div>

                <button
                  className="btn btn-primary fw-semibold"
                  onClick={handleSubmit}
                >
                  SUBMIT
                </button>

              </div>
            </div>

            {/* 🔹 TABLE CARD */}
            <div className="card p-4">
                <h5 className="mb-3">Configured Reports</h5>

                <div className="table-responsive">
                    <table className="table table-bordered table-hover">
                    <thead className="table-light">
                        <tr>
                        <th>S.No.</th>
                        <th>Report Name</th>
                        <th>Status</th>
                        <th>Created At</th>
                        <th>Action</th>
                        </tr>
                    </thead>

                    <tbody>
                        {reports.length > 0 ? (
                        reports.map((r, index) => (
                            <tr key={r.id}>
                            {/* ✅ S.No */}
                            <td>{index + 1}</td>

                            <td>{r.report_name}</td>

                            <td>
                                {r.is_active === 1 ? (
                                <span className="badge bg-success">Active</span>
                                ) : (
                                <span className="badge bg-danger">Inactive</span>
                                )}
                            </td>

                            <td>{new Date(r.created_at).toLocaleString()}</td>

                            {/*  ACTION COLUMN */}
                            <td>
                                <button
                                className="btn btn-sm btn-danger"
                                onClick={() => handleDelete(r.id)}
                                title="Delete"
                                >
                                <Trash2 size={16} />
                                </button>
                            </td>
                            </tr>
                        ))
                        ) : (
                        <tr>
                            <td colSpan="5" className="text-center">
                            No reports found
                            </td>
                        </tr>
                        )}
                    </tbody>
                    </table>
                </div>
                </div>

          </div>
        </div>
      </div>
    </>
  );
};

export default ReportsAutomation;