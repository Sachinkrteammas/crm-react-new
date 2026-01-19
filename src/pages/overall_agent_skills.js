import React, { useState } from "react";
import api from "../api";
import { saveAs } from "file-saver";

export default function OverallAgentSkills() {
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    setLoading(true);
    try {
      const response = await api.get("/skill_wise_excel/export", {
        responseType: "blob", // important for binary files
      });

      const blob = new Blob([response.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      // Extract filename from content-disposition header if present
      let filename = "skill_wise_agents.xlsx";
      const disposition = response.headers["content-disposition"];
      if (disposition && disposition.includes("filename=")) {
        filename = disposition
          .split("filename=")[1]
          .replace(/"/g, "")
          .trim();
      }

      saveAs(blob, filename);
    } catch (err) {
      console.error("Error exporting Excel:", err);
      alert("Failed to export Excel");
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
    <div className="card mb-4 p-3">
          <h5 className="card-title mb-3">Overall Agents Skill</h5>
          <div>
            <button
                onClick={handleExport}
                className="btn btn-success"
                disabled={loading}
            >
                {loading ? "Exporting..." : "Export Excel"}
            </button>
          </div>
    </div>
    </div>
    </>
  );
}
