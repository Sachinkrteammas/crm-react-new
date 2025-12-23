import React, { useEffect, useState } from "react";
import api from "../api";
import axios from "axios";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

const UsageSummary = () => {
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
      const res = await api.get("/client-invoice-usage", {
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

      const res = await api.get(`/client-invoice-usage`, {
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




const handleDownloadExcel = () => {
  if (!telecomData || telecomData.length === 0) return;

  const finalClientId =
      userType === "Super-Admin" || userType === "Admin"
        ? selectedClient
        : companyId;


    if (!finalClientId) {
      alert("Please select a client first.");
      return;
  }
  
  // 🔹 Determine company name for filename
  let companyName = clientName || "Client";
  if (userType === "Super-Admin" || userType === "Admin") {
    const selected = clients.find(c => String(c.company_id) === finalClientId);
    companyName = selected ? selected.company_name : finalClientId;
  }

  // 🔹 Limit to first 6 characters
  companyName = companyName.substring(0, 6);  

  // 🔹 Prepare rows exactly like table
  const rows = telecomData.map((row, index) => {
    const quarter = (() => {
      if (!row.invoiceDate) return "-";
      const month = new Date(row.invoiceDate).getMonth() + 1;
      if (month >= 4 && month <= 6) return "Q1";
      if (month >= 7 && month <= 9) return "Q2";
      if (month >= 10 && month <= 12) return "Q3";
      return "Q4";
    })();

    const formattedInvoiceDate = row.invoiceDate
      ? new Date(row.invoiceDate).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "numeric",
          year: "2-digit",
        })
      : "-";

    return {
      "S.No.": index + 1,
      "Date": formattedInvoiceDate,
      "Category": row.category || "NA",
      "Credit Released": row.credit_release || 0,
      "Opening Balance": row.opening_balance || 0,
      "Quarter": quarter,
      "Credit Consumption": row.credit_consumption || 0,
      "Closing Balance": row.closing_balance || 0,
      "Invoice No.": row.invoice_no || "-",
      "Amount": row.Amount || 0,
      "Value": row.value || 0,
    };
  });

  // 🔹 Add totals row (same as UI)
  if (totals) {
    rows.push({
      "S.No.": "",
      "Date": "",
      "Category": "TOTAL",
      "Credit Released": totals.credit_release || 0,
      "Opening Balance": totals.opening_balance || 0,
      "Quarter": "",
      "Credit Consumption": totals.credit_consumption || 0,
      "Closing Balance": totals.closing_balance || 0,
      "Invoice No.": "",
      "Amount": totals.Amount || 0,
      "Value": totals.value || 0,
    });
  }

  // 🔹 Create worksheet & workbook
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Usage Summary");

  // 🔹 Auto column width
  worksheet["!cols"] = Object.keys(rows[0]).map(() => ({ wch: 18 }));

  // 🔹 Generate file
  const excelBuffer = XLSX.write(workbook, {
    bookType: "xlsx",
    type: "array",
  });

  const fileData = new Blob(
    [excelBuffer],
    { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }
  );

  const fileName = `${companyName}_Usage_Summary_${startDate}_to_${endDate}.xlsx`;
  saveAs(fileData, fileName);
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
      <h3>Usage Summary</h3>

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
          <th className="text-center">Credit Released</th>
          <th className="text-center">Opening Balance</th>
          <th className="text-center">Quarter</th>
          <th className="text-center">Credit Consumption</th>
          <th className="text-center">Closing Balance</th>
          <th className="text-center">Invoice No.</th>
          <th className="text-center">Amount</th>
          <th className="text-center">Value</th>
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

              <td className="text-center text-success">
                ₹{row.credit_release?.toLocaleString() || "0"}
              </td>

              <td
                className={`text-center ${
                  row.opening_balance < 0 ? "text-danger" : "text-success"
                }`}
              >
                ₹{row.opening_balance?.toLocaleString() || "0"}
              </td>

              <td className="text-center">{quarter}</td>

              <td className="text-center">{row.credit_consumption?.toLocaleString() || "0"}</td>

              <td
                className={`text-center ${
                  row.closing_balance < 0 ? "text-danger" : "text-success"
                }`}
              >
                ₹{row.closing_balance?.toLocaleString() || "0"}
              </td>

              <td className="text-center">{row.invoice_no || "-"}</td>
              <td
                className={`text-center fw-bold ${
                  row.Amount < 0 ? "text-danger" : "text-success"
                }`}
              >
                ₹{row.Amount?.toLocaleString() || "0"}
              </td>

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
                    ₹{totals.credit_release?.toLocaleString() || "0"}
                  </td>
                  <td className="text-center">
                    ₹{totals.opening_balance?.toLocaleString() || "0"}
                  </td>
                  <td colSpan="1"></td>
                
                  
                  <td className="text-center">₹{totals.credit_consumption || "-"}</td>
                  <td className="text-center">₹{totals.closing_balance || "-"}</td>
                  <td colSpan="1"></td>
                  <td className="text-center text-success">
                    ₹{totals.Amount?.toLocaleString() || "0"}
                    </td>
                  <td className="text-center text-success">
                    ₹{totals.value?.toLocaleString() || "0"}
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

export default UsageSummary;



