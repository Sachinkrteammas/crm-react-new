import React, { useEffect, useState } from "react";
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import api from "../api";

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
      const res = await api.get("/fortum_dashboard", {
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


  // ✅ Auto-fetch when both dates are selected
  // useEffect(() => {
  //   if (startDate && endDate) fetchTelecomData();
  // }, [startDate, endDate]);



  // ✅ Auto-select logic (same as in Dashboard)
  useEffect(() => {
    if (userType === "Client") {
      // Client users → directly set companyId
      setSelectedClient(companyId);
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


    const exportToExcel = () => {
      if (!telecomData || telecomData.length === 0) return;

      // 1. Create a worksheet
      const worksheet = XLSX.utils.json_to_sheet(telecomData);

      // 2. Create a workbook and append the worksheet
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Invoices');

      // 3. Generate buffer
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });

      // 4. Create Blob and save
      const data = new Blob([excelBuffer], { type: 'application/octet-stream' });
      saveAs(data, 'invoice_data.xlsx');
    };


  return (
    <div className="mt-4">
      <h3>Telecom Billing & Usage Table</h3>

      {/* ✅ Client Selection */}
      {(userType === "Super-Admin" || userType === "Admin") && (
        <div className="d-flex justify-content-between align-items-end flex-wrap mb-4">
      {/* Left side — Client Selector */}
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
          />
        </div>

        <div>
          <label className="form-label mb-1 fw-semibold">End Date</label>
          <input
            type="date"
            className="form-control"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>

        <div className="d-flex gap-2 mt-3">
          {/* Fetch Data Button */}
          <button
            className="btn btn-primary"
            disabled={!startDate || !endDate}
            onClick={fetchTelecomData}
          >
            🔍 Fetch Data
          </button>

          {/* Export to Excel Button */}
          <button
            className="btn btn-success"
            disabled={telecomData.length === 0}
            onClick={exportToExcel}
          >
            ⬇️ Export to Excel
          </button>
        </div>


      </div>
      </div>
)}
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
          <th className="text-center">S. No.</th>
          <th className="text-center">Date</th>
          <th className="text-center">Category</th>
          <th className="text-center">Amount Received</th>
          <th className="text-center">Balance</th>
          <th className="text-center">Quarter</th>
          <th className="text-center">Inbound Calls (No)</th>
          <th className="text-center">Inbound Pulses</th>
          <th className="text-center">Inbound Value</th>
          <th className="text-center">Outbound Calls (No)</th>
          <th className="text-center">Outbound Pulses</th>
          <th className="text-center">Outbound Value</th>
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
            if (month >= 1 && month <= 3) return "Q1";
            if (month >= 4 && month <= 6) return "Q2";
            if (month >= 7 && month <= 9) return "Q3";
            return "Q4";
          })();

           // ✅ Format invoice date as "DD MMM YYYY"
          const formattedInvoiceDate = row.invoiceDate
            ? new Date(row.invoiceDate).toLocaleDateString("en-GB", {
                // day: "2-digit",
                month: "short",
                year: "numeric",
              })
            : "-";

          return (
            <tr key={index}>
              <td className="text-center">{index + 1}</td>
              <td className="text-center">{formattedInvoiceDate}</td>
              <td className="text-center">{row.Category || "NA"}</td>

              {/* Amount Received (total) */}
              <td className="text-center text-success">
                ₹{row.total?.toLocaleString() || "0"}
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

              {/* Outbound (total_ibn_pulse/value) */}
              <td className="text-center">{"0"}</td>
              <td className="text-center">{row.total_ibn_pulse || "-"}</td>
              <td className="text-center">{row.total_ibn_value || "-"}</td>

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
                    ₹{totals.total_sum?.toLocaleString() || "0"}
                  </td>
                  {/* <td className="text-center text-primary">
                    ₹{totals.available_sum?.toLocaleString() || "0"}
                  </td> */}
                  <td colSpan="3"></td>
                  <td className="text-center">{totals.total_ib_pulse_sum || "-"}</td>
                  <td className="text-center">{totals.total_ib_value_sum || "-"}</td>
                  <td colSpan="1"></td>
                  <td className="text-center">{totals.total_ibn_pulse_sum || "-"}</td>
                  <td className="text-center">{totals.total_ibn_value_sum || "-"}</td>
                  <td className="text-center">{totals.total_email_pulse_sum || "-"}</td>
                  <td className="text-center">{totals.total_email_value_sum || "-"}</td>
                  {/* <td colSpan="9"></td> */}
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
  );
};

export default FortumDashboard;













