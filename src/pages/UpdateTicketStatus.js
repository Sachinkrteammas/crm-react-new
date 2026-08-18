import React, { useState, useEffect } from "react";
import api from "../api";

const UpdateTicketStatus = () => {
  const [form, setForm] = useState({
    file: null,
    clientId: "",
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [clients, setClients] = useState([]);

  const companyId = localStorage.getItem("company_id");
  const userType = localStorage.getItem("user_type");
  const isSuperAdminOrAdmin = userType === "Super-Admin" || userType === "Admin";

  useEffect(() => {
    if (isSuperAdminOrAdmin) {
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
    } else {
      setForm((prev) => ({ ...prev, clientId: companyId }));
    }
  }, []);

  const handleSubmit = async () => {
    const activeClientId = isSuperAdminOrAdmin ? form.clientId : companyId;

    if (!form.file) {
      alert("Please select a CSV file.");
      return;
    }

    if (!activeClientId || activeClientId === "null") {
      alert("Client not found. Please login again.");
      return;
    }

    setLoading(true);
    setMessage(null);

    const formData = new FormData();
    formData.append("file", form.file);

    try {
      const res = await api.post(
        `/call/call-master/${activeClientId}/upload-csv`,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );

      setMessage({
        type: "success",
        text: `${res.data?.message || "Tickets Updated Successfully"} (${
          res.data?.updated || 0
        } rows updated)`,
      });
      setForm((prev) => ({ ...prev, file: null }));
    } catch (error) {
      console.error("Upload failed:", error);
      setMessage({
        type: "error",
        text:
          error.response?.data?.detail ||
          "Upload failed. Please check the file and try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="row">
      <div className="col-12">
        <div className="mb-4">
          <h4>Update Ticket Status</h4>
        </div>

        <div className="card p-4 mb-4">
          <h6 className="mb-3">UPDATE TICKET STATUS</h6>

          {message && (
            <div
              className={`alert ${
                message.type === "success"
                  ? "alert-success"
                  : "alert-danger"
              }`}
            >
              {message.text}
            </div>
          )}

          <div className="row">
            {isSuperAdminOrAdmin && (
              <div className="col-md-4 mb-4">
                <label className="form-label text-muted">Select Client</label>
                <select
                  className="form-control"
                  value={form.clientId}
                  onChange={(e) =>
                    setForm({ ...form, clientId: e.target.value })
                  }
                >
                  <option value="">-- Select Client --</option>
                  {clients.map((client) => (
                    <option key={client.company_id} value={client.company_id}>
                      {client.company_name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="col-md-4 mb-4">
              <label className="form-label text-muted">Upload Data</label>
              <input
                type="file"
                className="form-control"
                accept=".csv"
                onChange={(e) =>
                  setForm({ ...form, file: e.target.files[0] })
                }
              />
              <small className="text-muted d-block mb-3">
                Note - (Only CSV file allowed)
              </small>
            </div>

            <div className="col-12">
              <button
                className="btn btn-primary"
                onClick={handleSubmit}
                disabled={loading}
              >
                {loading ? "UPLOADING..." : "UPLOAD"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UpdateTicketStatus;
