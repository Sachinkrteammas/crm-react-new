import React, { useState, useEffect } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import api from "../api";
import "../styles/loader.css";

const CustomizedInCallReport = () => {
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [loading, setLoading] = useState(false);

  const userType = localStorage.getItem("user_type");
  const companyId = localStorage.getItem("company_id");

  const isAdmin =
    userType === "Super-Admin" || userType === "Admin";

  const [clientList, setClientList] = useState([]);
  const [selectedClient, setSelectedClient] = useState(companyId);

  const activeCompanyId = isAdmin ? selectedClient : companyId;

  const loadClients = async () => {
    try {
      const res = await api.get("/agents/clients-rights");
      const sorted = (res.data || []).sort((a, b) =>
        a.company_name.localeCompare(b.company_name)
      );
      setClientList(sorted);
    } catch (error) {
      console.error("Error loading clients:", error);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      loadClients();
    }
  }, []);

  const formatDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const handleExport = async () => {
    if (!startDate || !endDate) {
      alert("Please select both dates");
      return;
    }

    if (startDate > endDate) {
      alert("Start date cannot be after end date");
      return;
    }

    if (isAdmin && !selectedClient) {
      alert("Please select a client");
      return;
    }

    const start = formatDate(startDate);
    const end = formatDate(endDate);

    try {
      setLoading(true);
      const response = await api.post(
        `/report/export-customize-mis?client_id=${activeCompanyId}&start_date=${start}&end_date=${end}`,
        null,
        {
          responseType: "blob",
        }
      );

      const blob = new Blob([response.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      let fileName = "customized_in_call_report.xlsx";
      const contentDisposition = response.headers["content-disposition"];

      if (contentDisposition) {
        const match = contentDisposition.match(/filename=(.*)/);
        if (match && match[1]) {
          fileName = match[1];
        }
      }

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();

      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download error:", error);
      alert("Failed to download file");
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
        <div className="card p-4 mb-4">
          <h5 className="mb-3">Customized In Call Report</h5>

          <div className="d-flex flex-wrap align-items-center gap-3">
            {/* Select Client (Only for admin/superadmin) */}
            {isAdmin && (
              <div style={{ maxWidth: "220px" }}>
                <select
                  className="form-select"
                  value={selectedClient}
                  onChange={(e) => setSelectedClient(e.target.value)}
                >
                  <option value="">--Select Client--</option>
                  {clientList.map((client) => (
                    <option key={client.company_id} value={client.company_id}>
                      {client.company_name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Start Date */}
            <div style={{ maxWidth: "220px" }}>
              <DatePicker
                selected={startDate}
                onChange={(date) => setStartDate(date)}
                placeholderText="Start Date"
                className="form-control"
                dateFormat="yyyy-MM-dd"
                maxDate={endDate || undefined}
              />
            </div>

            {/* End Date */}
            <div style={{ maxWidth: "220px" }}>
              <DatePicker
                selected={endDate}
                onChange={(date) => setEndDate(date)}
                placeholderText="End Date"
                className="form-control"
                dateFormat="yyyy-MM-dd"
                minDate={startDate || undefined}
              />
            </div>

            {/* Export Button */}
            <button
              className="btn btn-primary fw-semibold"
              onClick={handleExport}
              disabled={loading}
            >
              {loading ? "EXPORTING..." : "EXPORT"}
            </button>
          </div>
        </div>
      </div>
      </div>
      </div>
    </>
  );
};

export default CustomizedInCallReport;
