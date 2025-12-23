import React, { useEffect, useState } from "react";
import api from "../api";
import axios from "axios";

const FortumDashboard = () => {
  const companyId = localStorage.getItem("company_id");
  const userType = localStorage.getItem("user_type");

  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState("");
  const [telecomData, setTelecomData] = useState([]);
  const [totals, setTotals] = useState(null);
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [hasFetched, setHasFetched] = useState(false);
  const [clientName, setClientName] = useState("");




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



  // ✅ Fetch Data based on selected date range
  const fetchTelecomData = async () => {
    if (!selectedClient) {
      alert("Please select a client.");
      return;
    }
    if (!startDate || !endDate) {
      alert("Please select both start and end dates.");
      return;
    }

    try {
      setLoading(true);
      setHasFetched(true); // ✅ mark that fetch was triggered manually
      const res = await api.get("/client-invoice-details", {
        params: { client_id: selectedClient, start_date: startDate, end_date: endDate },
      });
      const invoices = Array.isArray(res.data.invoices)
        ? res.data.invoices
        : [];
      setTelecomData(invoices);
      setTotals(res.data.totals || null);
    } catch (err) {
      console.error("Error fetching telecom data:", err);
    } finally {
      setLoading(false);
    }
  };



  // ✅ Auto-select logic (same as in Dashboard)
  useEffect(() => {
    if (userType === "Client") {
      // Client users → directly set companyId
      setSelectedClient(companyId);
      // Try to find and show their company name
      const storedUserData = JSON.parse(localStorage.getItem("userData"));
      setClientName(storedUserData?.auth_person || "Your Company");
    } else if (
      (userType === "Super-Admin" || userType === "Admin") &&
      clients.length === 1
    ) {
      // Auto-select if only one client is available
      setSelectedClient(clients[0].company_id);
    }
  }, [userType, companyId, clients]);



  // ✅ Fetch Telecom Billing / Invoice data
useEffect(() => {
  const fetchInvoiceData = async (clientId) => {
    if (!hasFetched) return; // ✅ don't fetch until user clicks button
    if (!clientId || !startDate || !endDate ) return; // wait till all selected

    try {
      setLoading(true);

      const res = await api.get(`/client-invoice-details`, {
        params: {
          client_id: clientId,
          start_date: startDate,
          end_date: endDate,
        },
      });

      // ✅ ensure invoices array always valid
      const invoices = Array.isArray(res.data.invoices)
        ? res.data.invoices
        : [];

      setTelecomData(invoices);
      setTotals(res.data.totals || null);
    } catch (err) {
      console.error("Error fetching invoice data:", err);
    } finally {
      setLoading(false);
    }
  };

  fetchInvoiceData(selectedClient);
}, [selectedClient, startDate, endDate, hasFetched]);




const handleDownloadExcel = async () => {
  try {

    const url = `/client-invoice-details/download?client_id=${selectedClient}&start_date=${startDate}&end_date=${endDate}`;

    const response = await api.get(url, {
      responseType: "blob", // 👈 IMPORTANT — tells Axios this is binary data
    });

    // ✅ Extract filename from headers
    const contentDisposition = response.headers["content-disposition"];
    let filename = "client_invoice_details.xlsx";
    if (contentDisposition) {
      const match = contentDisposition.match(/filename="?([^"]+)"?/);
      if (match) filename = match[1];
    }

    // ✅ Create blob and trigger download
    const blob = new Blob([response.data], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const blobUrl = window.URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();

    // ✅ Clean up
    window.URL.revokeObjectURL(blobUrl);
  } catch (error) {
    console.error("❌ Excel download failed:", error);
    alert("⚠️ Failed to download Excel file. Check console for details.");
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
    <div className="mt-4">
      <h3>Billing & Usage Table</h3>

      <div className="d-flex justify-content-between align-items-end flex-wrap mb-4">
        {/* ✅ Left side — Client section */}
        {userType === "Client" ? (
          <div style={{ maxWidth: "250px" }}>
            <label className="form-label fw-semibold">Client</label>
            <input
              type="text"
              className="form-control"
              value={clientName}
              disabled
            />
          </div>
        ) : (
          (userType === "Super-Admin" || userType === "Admin") && (
            <div style={{ maxWidth: "250px" }}>
              <label className="form-label fw-semibold">Select Client</label>
              <select
                className="form-select"
                value={selectedClient}
                onChange={(e) => setSelectedClient(e.target.value)}
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
            </div>
          )
        )}
        
      



      {/* ✅ Date Range Filters */}
      {/* Right side — Date Range & Button */}
    <div className="d-flex align-items-end gap-3 mt-3 mt-md-0">
        <div>
          <label className="form-label mb-1 fw-semibold">Start Date</label>
          <input
            type="date"
            className="form-control"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            min="2025-04-01"
            max={new Date().toISOString().split("T")[0]} // not exceeds today's date
          />
        </div>

        <div>
          <label className="form-label mb-1 fw-semibold">End Date</label>
          <input
            type="date"
            className="form-control"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            min="2025-04-01"
            max={new Date().toISOString().split("T")[0]} // not exceeds today's date
          />
        </div>

        <button
          className="btn btn-primary mt-3"
          disabled={!startDate || !endDate}
          onClick={fetchTelecomData}
        >
          🔍 Fetch Data
        </button>

        <button
          className="btn btn-success mt-3"
          variant="success"
          disabled={!selectedClient || !startDate || !endDate || !telecomData || telecomData.length === 0}
          onClick={handleDownloadExcel}
        >
          ⬇️ Export to Excel
        </button>

      </div>
      </div>
{/* )} */}


  {/* ✅ Loader or Data Table */}
  {loading ? (
    <p className="text-center text-muted">Loading data...</p>
  ) : telecomData.length > 0 ? (
  <div
    className="table-responsive"
    style={{ maxHeight: "700px", overflowY: "auto" }}
  >
    <table className="table table-hover table-striped table-bordered align-middle shadow-sm">
      <thead className="table-dark sticky-top">
        <tr>
          <th className="text-center">S.No.</th>
          <th className="text-center">Date</th>
          <th className="text-center">category</th>
          <th className="text-center">Amount Received</th>
          <th className="text-center">Balance</th>
          <th className="text-center">Quarter</th>
          <th className="text-center">IB Calls</th>
          <th className="text-center">IB Pulses</th>
          <th className="text-center">IB Value</th>
          <th className="text-center">OB Calls</th>
          <th className="text-center">OB Pulses</th>
          <th className="text-center">OB Value</th>
          <th className="text-center">Email Pulse</th>
          <th className="text-center">Email Value</th>
          <th className="text-center">Total Value</th>
        </tr>
      </thead>
      <tbody>
        {telecomData.map((row, index) => {
          const quarter = (() => {
            if (!row.invoiceDate) return "-";
            const month = new Date(row.invoiceDate).getMonth() + 1;
            if (month >= 4 && month <= 6) return "Q1";
            if (month >= 7 && month <= 9) return "Q2";
            if (month >= 10 && month <= 12) return "Q3";
            return "Q4";
            // if (month >= 1 && month <= 3) return "Q1";
            // if (month >= 4 && month <= 6) return "Q2";
            // if (month >= 7 && month <= 9) return "Q3";
            // return "Q4";
          })();

           // ✅ Format invoice date as "DD MMM YYYY"
          const formattedInvoiceDate = row.invoiceDate
            ? new Date(row.invoiceDate).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "numeric",
                year: "2-digit",
              })
            : "-";

          return (
            <tr key={index}>
              <td className="text-center">{index + 1}</td>
              <td className="text-center">{formattedInvoiceDate}</td>
              <td className="text-center">{row.category || "NA"}</td>

              {/* Amount Received (total) */}
              <td className="text-center text-success">
                ₹{row.Amount_Received?.toLocaleString() || "0"}
              </td>

              {/* Balance */}
              <td
                className={`text-center ${
                  row.remaining_balance < 0 ? "text-danger" : "text-success"
                }`}
              >
                ₹{row.remaining_balance?.toLocaleString() || "0"}
              </td>

              <td className="text-center">{quarter}</td>

              {/* Inbound (total_ib_pulse/value) */}
              <td className="text-center">{"0"}</td>
              <td className="text-center">{row.total_ib_pulse || "-"}</td>
              <td className="text-center">{row.total_ib_value || "-"}</td>

              {/* Outbound (total_ob_pulse/value) */}
              <td className="text-center">{"0"}</td>
              <td className="text-center">{row.total_ob_pulse || "-"}</td>
              <td className="text-center">{row.total_ob_value || "-"}</td>

              {/* SMS (total_email_pulse/value) */}
              <td className="text-center">{row.total_email_pulse || "-"}</td>
              <td className="text-center">{row.total_email_value || "-"}</td>

              {/* Total Value */}
              <td
                className={`text-center fw-bold ${
                  row.value < 0 ? "text-danger" : "text-success"
                }`}
              >
                ₹{row.value?.toLocaleString() || "0"}
              </td>
            </tr>
          );
        })}

        {/* ✅ Add totals row at bottom */}
              {totals && (
                <tr className="table-secondary fw-bold">
                  <td colSpan="3" className="text-center">
                     Total
                  </td>
                  <td className="text-center text-success">
                    ₹{totals.Amount_Received?.toLocaleString() || "0"}
                  </td>
                  <td className="text-center">
                    ₹{totals.remaining_balance_sum?.toLocaleString() || "0"}
                  </td>
                  <td colSpan="2"></td>
                  <td className="text-center">{totals.total_ib_pulse_sum || "-"}</td>
                  <td className="text-center">{totals.total_ib_value_sum || "-"}</td>
                  <td colSpan="1"></td>
                  <td className="text-center">{totals.total_ob_pulse_sum || "-"}</td>
                  <td className="text-center">{totals.total_ob_value_sum || "-"}</td>
                  <td className="text-center">{totals.total_email_pulse_sum || "-"}</td>
                  <td className="text-center">{totals.total_email_value_sum || "-"}</td>
                  <td className="text-center text-success">
                    ₹{totals.value_sum?.toLocaleString() || "0"}
                  </td>
                </tr>
              )}
      </tbody>
    </table>
  </div>
) : hasFetched ?(
  <p className="text-center text-muted mt-3">
    No data available for the selected client.
  </p>
   ) : (
        <p className="text-center text-muted mt-3">
          Please select dates and click "Fetch Data" to view results.
        </p>
)}

    </div>
    </div>
    </>
  );
};

export default FortumDashboard;













