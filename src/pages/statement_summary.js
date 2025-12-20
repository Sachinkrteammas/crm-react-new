import React, { useState, useEffect  } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { format } from "date-fns";
import api from "../api";
import "../styles/loader.css";

const StatementSummary = () => {
  const userType = localStorage.getItem("user_type");
  const companyId = localStorage.getItem("company_id");
  const [clientName, setClientName] = useState("");

  const [selectedClient, setSelectedClient] = useState("");
  const [clients, setClients] = useState([]); // 🔹 to hold clients list for Super/Admin
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [loading, setLoading] = useState(false);

  const formattedStart = startDate ? format(startDate, "yyyy-MM-dd") : "";
  const formattedEnd = endDate ? format(endDate, "yyyy-MM-dd") : "";



// ✅ Fetch clients (Super-Admin/Admin only)
  useEffect(() => {
    const fetchClients = async () => {
      try {
        const res = await api.get("/agents/clients-rights");

        // Sort alphabetically (case-insensitive)
        const sortedClients = res.data.sort((a, b) =>
          a.company_name.localeCompare(b.company_name, "en", {
            sensitivity: "base",
          })
        );

        setClients(sortedClients);
      } catch (err) {
        console.error("Error fetching clients:", err);
      }
    };

    if (userType === "Super-Admin" || userType === "Admin") {
      fetchClients();
    }
  }, [userType]);



  // ✅ Auto-select logic (same as in Dashboard)
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





const handleSubmit = async () => {
  const finalClientId =
      userType === "Super-Admin" || userType === "Admin"
        ? selectedClient
        : companyId;

    if (!finalClientId) {
      alert("Please select a client first.");
      return;
    }


  setLoading(true);

  try {
    const response = await api.get("/statement-summary", {
      params: {
        client_id: finalClientId,
          from_date: formattedStart,
          to_date: formattedEnd,
      },
      headers: {
        Accept: "application/vnd.ms-excel"
      },
      responseType: "blob",  // 🔥 important for downloading files
    });

    const blob = new Blob([response.data], { type: "application/vnd.ms-excel" });
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = `report_${finalClientId}_${formattedStart}_to_${formattedEnd}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
  } catch (error) {
    let message = "Download failed. Please check your request.";
    if (error.response && error.response.data) {
      try {
        const reader = new FileReader();
        reader.onload = () => {
          message = reader.result;
          alert(`Download failed: ${message}`);
        };
        reader.readAsText(error.response.data);
        return;  // exit early — error shown after file reader completes
      } catch (e) {
        // fallback
        message = `Server error: ${error.response.status}`;
      }
    }
    console.error("Download failed:", error);
    alert(message);
  }
  finally {
      setLoading(false);
    }
};





  return (
  <>
      {/* Full-screen loader */}
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

    <div className="card p-4 mb-4">
      <h5 className="mb-8">STATEMENT SUMMARY</h5>
      <div className="d-flex flex-wrap align-items-center gap-2">
        <div style={{ maxWidth: "250px" }}>
              {userType === "Client" ? (
                <input
                  type="text"
                  className="form-control"
                  value={clientName || `Client ID: ${companyId}`}
                  readOnly
                />
              ) : (
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

        <DatePicker
          selected={startDate}
          onChange={setStartDate}
          placeholderText="From Date"
          className="form-control"
          dateFormat="dd-MM-yyyy"
        />
        <DatePicker
          selected={endDate}
          onChange={setEndDate}
          placeholderText="To Date"
          className="form-control"
          dateFormat="dd-MM-yyyy"
        />
        <button className="btn btn-primary" onClick={handleSubmit}>
          SUBMIT
        </button>
      </div>
    </div>
    </div>
     </>
  );
};

export default StatementSummary;
