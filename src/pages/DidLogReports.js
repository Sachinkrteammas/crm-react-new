import React from "react";
import api from "../api";

export default function DidLogReports() {
  
  const handleExport = async () => {
    try {
      const response = await api.get("/did-logs/export-excel", {
        responseType: "blob", // Important
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "did_logs_report.xlsx");
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error("Export error:", error);
      alert("Error generating report!");
    }
  };

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">DID Logs Report</h2>

      <button
        onClick={handleExport}
        className="btn btn-success"
      >
        Export Excel
      </button>
    </div>
  );
}
