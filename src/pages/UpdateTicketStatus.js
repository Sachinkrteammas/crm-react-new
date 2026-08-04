import React, { useState } from "react";
import api from "../api";

const UpdateTicketStatus = () => {
  const [form, setForm] = useState({
    file: null,
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const clientId = localStorage.getItem("company_id");

  const handleSubmit = async () => {
    if (!form.file) {
      alert("Please select a CSV file.");
      return;
    }

    if (!clientId || clientId === "null") {
      alert("Client not found. Please login again.");
      return;
    }

    setLoading(true);
    setMessage(null);

    const formData = new FormData();
    formData.append("file", form.file);

    try {
      const res = await api.post(
        `/call/call-master/${clientId}/upload-csv`,
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
      setForm({ file: null });
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
