import React, { useState, useEffect } from "react";
import api from "../api";

export default function OutCallSummaryReports() {
  const userType = localStorage.getItem("user_type");
  const companyId = Number(localStorage.getItem("company_id"));

  const isAdmin = userType === "Super-Admin" || userType === "Admin";

  const [clients, setClients] = useState([]);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    client: isAdmin ? "" : companyId, // ✅ FIX
    to: "",
    cc: "",
    remarks: "",
  });

  const activeClientId = isAdmin ? formData.client : companyId;

  /* ---------------- FETCH CLIENTS ---------------- */
  useEffect(() => {
    if (!isAdmin) return;

    const fetchClients = async () => {
      try {
        const res = await api.get("/agents/clients-rights");
        const sorted = res.data.sort((a, b) =>
          a.company_name.localeCompare(b.company_name)
        );

        setClients(sorted);

        if (sorted.length > 0) {
          setFormData((p) => ({
            ...p,
            client: sorted[0].company_id,
          }));
        }
      } catch (err) {
        console.error("Client fetch failed", err);
      }
    };

    fetchClients();
  }, [isAdmin]);

  /* ---------------- FETCH LIST ---------------- */
  const fetchRecords = async () => {
    if (!activeClientId) return;

    try {
      const res = await api.get("/allocations", {
        params: {
          report_type: "call_summary",
          client: activeClientId, // ✅ FILTER
        },
      });
      setRecords(res.data || []);
    } catch (err) {
      console.error("Failed to fetch list", err);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [activeClientId]);

  /* ---------------- HANDLE CHANGE ---------------- */
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  /* ---------------- SAVE ---------------- */
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!activeClientId) {
      alert("Client missing");
      return;
    }

    setLoading(true);

    try {
      const payload = {
        ...formData,
        client: activeClientId,
        created_by: companyId || activeClientId, // ✅ NEVER NULL
      };

      await api.post("/allocations/call-summary-out", payload);

      alert("✅ Saved successfully");

      setFormData((p) => ({
        ...p,
        to: "",
        cc: "",
        remarks: "",
      }));

      fetchRecords();
    } catch (err) {
      console.error(err);
      alert("❌ Failed to save");
    } finally {
      setLoading(false);
    }
  };

  /* ---------------- DELETE ---------------- */
  const handleDelete = async (id) => {
    if (!window.confirm("Delete this record?")) return;

    try {
      await api.delete(`/allocations/${id}`);
      setRecords((p) => p.filter((r) => r.id !== id));
    } catch (err) {
      console.error(err);
      alert("❌ Delete failed");
    }
  };

  return (
    <div className="mt-4">
      {/* FORM */}
      <div className="card shadow-sm mb-4">
        <div className="card-header fw-semibold">
          Scenario Report Automation
        </div>

        <div className="card-body">
          <form onSubmit={handleSubmit}>
            <div className="row g-3">
              {isAdmin && (
                <div className="col-md-4">
                  <label className="form-label fw-semibold">Client</label>
                  <select
                    name="client"
                    value={formData.client}
                    onChange={handleChange}
                    className="form-select"
                    required
                  >
                    {clients.map((c) => (
                      <option key={c.company_id} value={c.company_id}>
                        {c.company_name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="col-md-4">
                <label className="form-label fw-semibold">To</label>
                <input
                  type="email"
                  name="to"
                  value={formData.to}
                  onChange={handleChange}
                  className="form-control"
                  required
                />
              </div>

              <div className="col-md-4">
                <label className="form-label fw-semibold">CC</label>
                <input
                  type="text"
                  name="cc"
                  placeholder="comma separated emails"
                  value={formData.cc}
                  onChange={handleChange}
                  className="form-control"
                />
              </div>

              <div className="col-md-4">
                <label className="form-label fw-semibold">Remarks</label>
                <textarea
                  name="remarks"
                  value={formData.remarks}
                  onChange={handleChange}
                  className="form-control"
                />
              </div>
            </div>

            <div className="mt-3 text-center">
              <button className="btn btn-primary" disabled={loading}>
                {loading ? "Saving..." : "Submit"}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* LIST */}
      <div className="card shadow-sm">
        <div className="card-header fw-semibold">Saved Call Summaries</div>

        <div className="table-responsive">
          <table className="table table-bordered table-hover mb-0">
            <thead className="table-light">
              <tr className="text-center">
                <th>#</th>
                <th>Client</th>
                <th>To</th>
                <th>CC</th>
                <th>Remarks</th>
                <th>Created</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {records.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center">
                    No records found
                  </td>
                </tr>
              ) : (
                records.map((r, i) => (
                  <tr key={r.id} className="text-center">
                    <td>{i + 1}</td>
                    <td>{r.client_name}</td>
                    <td>{r.to}</td>
                    <td>{r.cc}</td>
                    <td>{r.remarks}</td>
                    <td>{new Date(r.created_at).toLocaleString("en-IN")}</td>
                    <td>
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => handleDelete(r.id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
