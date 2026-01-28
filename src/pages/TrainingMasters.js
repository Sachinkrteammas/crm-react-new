import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { uploadTrainingDocs, getTrainingDocs, deleteTrainingDoc } from "../services/authService";
import api from "../api";

export default function ManageTrainingDocs() {

  const userType = localStorage.getItem("user_type");
  const companyId = localStorage.getItem("company_id");

  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState("");
  const [clientName, setClientName] = useState("");


  const [files, setFiles] = useState([{ file: null, description: "" }]);
  const [trainingDocs, setTrainingDocs] = useState([]);
  const [loading, setLoading] = useState(false);


  /* ------------------ Fetch Clients (Super/Admin) ------------------ */
  useEffect(() => {
    const fetchClients = async () => {
      try {
        const res = await api.get("/agents/clients-rights");
        const sorted = res.data.sort((a, b) =>
          a.company_name.localeCompare(b.company_name, "en", {
            sensitivity: "base",
          })
        );
        setClients(sorted);
      } catch (err) {
        console.error("Client fetch error:", err);
      }
    };

    if (userType === "Super-Admin" || userType === "Admin") {
      fetchClients();
    }
  }, [userType]);

  /* ------------------ Auto-select logic ------------------ */
  useEffect(() => {
    if (userType === "Client") {
      setSelectedClient(companyId);
      const storedUserData = JSON.parse(localStorage.getItem("userData"));
      setClientName(storedUserData?.auth_person || "Your Company");
    } else if (
      (userType === "Super-Admin" || userType === "Admin") &&
      clients.length === 1
    ) {
      setSelectedClient(String(clients[0].company_id));
    }
  }, [userType, companyId, clients]);
  

  // ------------------ Fetch Training Docs ------------------
  const fetchTrainingDocs = async (clientId) => {
    if (!clientId) return;
    try {
      const docs = await getTrainingDocs(clientId);
      const mappedDocs = docs.map((doc) => {
      const files = [];
      for (let i = 0; i < 10; i++) {
        const file = doc.files[i];
        if (file) {
          files.push({
            file_name: file.file_path, // <-- rename to match React
            description: file.description || "",
          });
        } else {
          files.push(null);
        }
      }
      return {
        ...doc,
        files,
      };
    });
    setTrainingDocs(mappedDocs);

    } catch (err) {
      console.error("Error fetching training docs:", err);
    }
  };

  useEffect(() => {
    fetchTrainingDocs(selectedClient);
  }, [selectedClient]);

  // ------------------ File Handlers ------------------
  const handleFileChange = (index, e) => {
    const newFiles = [...files];
    newFiles[index].file = e.target.files[0];
    setFiles(newFiles);
  };

  const handleDescriptionChange = (index, e) => {
    const newFiles = [...files];
    newFiles[index].description = e.target.value;
    setFiles(newFiles);
  };

  const addField = () => {
    if (files.length >= 10) return;
    setFiles([...files, { file: null, description: "" }]);
  };

  const removeField = (index) => {
    const newFiles = files.filter((_, i) => i !== index);
    setFiles(newFiles);
  };

  // ------------------ Upload Handler ------------------
  const handleSubmit = async (e) => {
    e.preventDefault();

    const finalClientId =
      userType === "Super-Admin" || userType === "Admin"
        ? selectedClient
        : companyId;

    if (!finalClientId) {
      alert("Please select a client first.");
      return;
    }

    if (!files.some((f) => f.file)) {
      alert("Please select at least one file.");
      return;
    }

    const selectedFiles = files.map((f) => f.file);
    const descriptions = files.map((f) => f.description);

    setLoading(true);
    try {
      await uploadTrainingDocs(finalClientId, selectedFiles, descriptions);
      alert("✅ Upload successful!");
      setFiles([{ file: null, description: "" }]);
      fetchTrainingDocs(finalClientId);
    } catch (err) {
      console.error("Upload error:", err);
      alert("Upload failed");
    } finally {
      setLoading(false);
    }
  };

  const getFileName = (path) => {
    if (!path) return "";
    return path.split("\\").pop().split("/").pop();
  };



  // ------------------ Delete Handler ------------------
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this training doc?")) return;
    try {
      await deleteTrainingDoc(id);
      alert("Deleted successfully!");
      fetchTrainingDocs(selectedClient); // Refresh list
    } catch (err) {
      console.error("Delete error:", err);
      alert(err || "Delete failed");
    }
  };


  const downloadFile = async (filePath, clientId) => {
  if (!filePath || !clientId) return;

  try {
    const response = await api.get("/in_call/training/download", {
      params: { file: filePath, ClientId: clientId },
      responseType: "blob", // important for binary data
    });

    const blob = new Blob([response.data]); // type is auto-detected by browser

    // Get filename from content-disposition header
    let fileName = filePath.split("\\").pop().split("/").pop();
    const contentDisposition = response.headers["content-disposition"] || response.headers.get("content-disposition");
    if (contentDisposition) {
      const match = contentDisposition.match(/filename\*?=(?:UTF-8'')?["']?([^;'"]+)/i);
      if (match && match[1]) fileName = decodeURIComponent(match[1]);
    }

    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  } catch (err) {
    console.error("File download error:", err);
    alert("Download failed");
  }
};



  return (
    <div className="p-4 border rounded-lg bg-white shadow-md">
      <h5 className="mb-5">Manage Training Docs </h5>

      {/* ✅ Super-admin handling */}
      <div className="mb-4" style={{ maxWidth: "300px" }}>
        {(
          (userType === "Super-Admin" || userType === "Admin") && (
            <select
              className="form-select"
              value={selectedClient}
              onChange={(e) => setSelectedClient(e.target.value)}
              disabled={clients.length === 0}
            >
              <option value="">-- Select Client --</option>
              {clients.map((client) => (
                <option
                  key={client.company_id}
                  value={String(client.company_id)}
                >
                  {client.company_name}
                </option>
              ))}
            </select>
          )
        )}
      </div>

      {/* Upload Form */}
      <form onSubmit={handleSubmit}>
        {files.map((f, index) => (
          <div key={index} className="mb-4">
            <div className="flex items-center gap-2">
              <input
                type="file"
                accept=".jpg,.jpeg,.png,.gif,.xlsx,.xls,.doc,.docx,.pdf"
                onChange={(e) => handleFileChange(index, e)}
                className="border p-1 rounded w-full"
              />
              {index === 0 ? (
                <button
                  type="button"
                  className="btn btn-success w-10 h-10 flex items-center justify-center text-2xl"
                  onClick={addField}
                >
                  +
                </button>
              ) : (
                <button
                  type="button"
                  className="btn btn-danger w-10 h-10 flex items-center justify-center text-2xl"
                  onClick={() => removeField(index)}
                >
                  -
                </button>
              )}
            </div>
            <input
              type="text"
              placeholder="Description"
              value={f.description}
              onChange={(e) => handleDescriptionChange(index, e)}
              className="mt-3 border p-2 rounded w-full"
            />
          </div>
        ))}
        <p className="text-sm text-gray-500 mb-3">
          Note - (Upload only image, excel, msword, pdf)
        </p>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? "Uploading..." : "Upload"}
        </button>
      </form>

      {/* Training Docs List */}
      {trainingDocs.length > 0 && (
      <div className="mt-6 table-responsive">
        <table className="table table-bordered table-sm text-nowrap">
          <thead className="table-light">
            <tr>
              <th>S.N</th>
              <th>Date</th>
              {[...Array(10)].map((_, i) => (
                <React.Fragment key={i}>
                  <th>FILE {i + 1}</th>
                  <th>DESCRIPTION</th>
                </React.Fragment>
              ))}
              <th>Action</th>
            </tr>
          </thead>

          <tbody>
            {trainingDocs.map((doc, index) => (
              <tr key={doc.id}>
                <td>{index + 1}</td>
                <td>
                  {new Date(doc.createdate).toLocaleDateString("en-GB", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </td>

                {[...Array(10)].map((_, i) => {
                const fileObj = doc.files[i];
                return (
                  <React.Fragment key={i}>
                    <td>
                      {fileObj ? (
                        <a
  className="text-blue-600 underline hover:text-blue-800"
  href="#"
  onClick={(e) => {
    e.preventDefault();
    downloadFile(fileObj.file_name, selectedClient);
  }}
>
  {getFileName(fileObj.file_name)}
</a>

                      ) : (
                        "-"
                      )}
                    </td>
                    <td>{fileObj?.description || "-"}</td>                      
                  </React.Fragment>
                );
              })}

                <td className="text-center">
                  <button
                    className="btn btn-sm btn-danger"
                    onClick={() => handleDelete(doc.id)}
                  >
                    🗑
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
    </div>
  );
}


