import React, { useState, useEffect } from "react";
import api from "../api";
import "../styles/loader.css";

function IvrPromptUpload() {
  const [file, setFile] = useState(null);
  const [prompts, setPrompts] = useState([]);
  const [loading, setLoading] = useState(false);

  // ✅ Fetch existing IVR prompt files
  useEffect(() => {
    const fetchPrompts = async () => {
      try {
        setLoading(true);
        const res = await api.get("/ivr/prompts"); // Adjust endpoint
        setPrompts(res.data || []);
      } catch (err) {
        console.error("Error fetching prompts:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchPrompts();
  }, []);

  // ✅ Handle file upload
  const handleUpload = async () => {
    if (!file) {
      alert("Please select a .gsm file first.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      setLoading(true);
      await api.post("/ivr/upload-prompt", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      alert("File uploaded successfully!");
      setFile(null);
      // refresh list
      const res = await api.get("/ivr/prompts");
      setPrompts(res.data || []);
    } catch (err) {
      console.error("Upload failed:", err);
      alert("Upload failed! Only GSM files allowed.");
    } finally {
      setLoading(false);
    }
  };

  const handleActivate = async (id) => {
    try {
      await api.post(`/ivr/prompts/${id}/activate`);
      const updated = prompts.map((p) =>
        p.id === id ? { ...p, status: "Active" } : { ...p, status: "De-Active" }
      );
      setPrompts(updated);
    } catch (err) {
      console.error("Activation error:", err);
      alert("Failed to change status.");
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
        <div className="col-12">
          <div className="card">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h5 className="mb-0">IVR Prompt File Upload</h5>
            </div>

            <div className="card-body">
              {/* Upload section */}
              <div className="mb-4">
                <label className="form-label fw-semibold">
                  Upload Prompt File <span className="text-danger">*</span>
                </label>
                <div className="d-flex align-items-center gap-3">
                  <input
                    type="file"
                    accept=".gsm"
                    className="form-control"
                    onChange={(e) => setFile(e.target.files[0])}
                    style={{ maxWidth: "400px" }}
                  />
                  <button
                    type="button"
                    className="btn btn-primary px-4"
                    onClick={handleUpload}
                  >
                    Upload
                  </button>
                </div>
                <small className="text-danger">
                  Only GSM music extension files only.
                </small>
              </div>

              {/* Table section */}
              <div className="table-responsive">
                <table className="table table-striped table-hover table-bordered align-middle">
                  <thead className="table-dark">
                    <tr>
                      <th>Sr. No.</th>
                      <th>Created At</th>
                      <th>File Name</th>
                      <th>Status</th>
                      <th>Action</th>
                      <th>Download</th>
                    </tr>
                  </thead>
                  <tbody>
                    {prompts.length > 0 ? (
                      prompts.map((item, index) => (
                        <tr key={item.id || index}>
                          <td>{index + 1}</td>
                          <td>{item.created_at || "-"}</td>
                          <td>{item.file_name}</td>
                          <td>
                            <span
                              className={`badge ${
                                item.status === "Active"
                                  ? "bg-success"
                                  : "bg-secondary"
                              }`}
                            >
                              {item.status}
                            </span>
                          </td>
                          <td>
                            <button
                              className="btn btn-link p-0 text-primary"
                              onClick={() => handleActivate(item.id)}
                            >
                              Active
                            </button>
                          </td>
                          <td>
                            <a
                              href={item.download_url}
                              className="text-primary"
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              download
                            </a>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="6" className="text-center text-muted py-4">
                          No prompt files uploaded yet.
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
}

export default IvrPromptUpload;
