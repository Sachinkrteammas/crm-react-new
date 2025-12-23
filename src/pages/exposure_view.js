import React, { useState, useEffect } from "react";
import "../styles/ExposureView.css";
import api from "../api";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import "../styles/loader.css";

const ExposureView = () => {


  const companyId = localStorage.getItem("company_id");
  const userType = localStorage.getItem("user_type");
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState("");
  const [selectedClientId, setSelectedClientId] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("status");
  const [data, setData] = useState([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [minDate, setMinDate] = useState("2025-09-01");


 useEffect(() => {
  const today = new Date();
  const formattedToday = today.toISOString().split("T")[0];

  setStartDate(formattedToday);
  setEndDate(formattedToday);
}, []);



    useEffect(() => {
        const fetchClients = async () => {
          try {
            setLoading(true);
            const res = await api.get("/agents/clients-rights_is_dial");

            // Sort alphabetically (case-insensitive)
            const sortedClients = res.data.sort((a, b) =>
              a.company_name.localeCompare(b.company_name, "en", {
                sensitivity: "base",
              })
            );
            // Map API results into dummy structure
            const formattedData = sortedClients.map((client, index) => ({
              sno: index + 1,
              client: client.company_name,
              opening: 0,
              billed: client.Release_billing ?? 0, // 🔹 Use Release_billing here
              collected: client.Exposure_billing_vr ?? 0, // 🔹 Use Exposure_billing_vr here
              closing: 0,
              cpOpening: client.opening,
              cpFresh: client.fresh_release,
              cpConsumed: client.consume,
              cpBalance: client.balance,
              status: "Testing",
              exposure: 0,
              toBeBilled: 0,
              action: "0.00",
              payment: "Send SMS",
              color: index % 2 === 0 ? "green" : "red",
            }));

            setData(formattedData);
            setClients(sortedClients);
          } catch (err) {
            console.error("Error fetching clients:", err);
          }
          finally {
            setLoading(false);
          }
        };

        fetchClients();
      }, []);




const handleExport = async () => {
  setLoading(true);
  try {
    let clients = [];
    let res;

    if (selectedClientId === "999" || !selectedClientId) {
      res = await api.get("/agents/clients-rights_is_dial", {
        params: { start_date: startDate, end_date: endDate },
      });
    } else {
      res = await api.get("/agents/clients-rights_search", {
        params: {
          start_date: startDate,
          end_date: endDate,
          client_id: selectedClientId,
        },
      });
    }

    clients = Array.isArray(res.data) ? res.data : [res.data];

    if (!clients.length) {
      alert("No data available for export");
      return;
    }

    // 🔹 Totals
    const totalOpening = clients.reduce((sum, c) => sum + (c.opening || 0), 0);
    const totalFresh = clients.reduce((sum, c) => sum + (c.fresh_release || 0), 0);
    const totalConsume = clients.reduce((sum, c) => sum + (c.consume || 0), 0);
    const totalBalance = clients.reduce((sum, c) => sum + (c.balance || 0), 0);

    const totalBilled = clients.reduce((sum, c) => sum + (c.Release_billing || 0), 0);
    const totalCollected = clients.reduce((sum, c) => sum + (c.Exposure_billing_vr || 0), 0);

    // 🔹 Format export data
    const exportData = clients.map((client, index) => ({
      "S.No": index + 1,
      "CLIENT": client.company_name,
      "OPENING": (client.opening ?? 0).toFixed(2),
      "Fresh Release": (client.fresh_release ?? 0).toFixed(2),
      "Consume": (client.consume ?? 0).toFixed(2),
      "Balance": (client.balance ?? 0).toFixed(2),
      "Release Billing": (client.Release_billing ?? 0).toFixed(2),          // 🔹 Added
      "Exposure Billing VR": (client.Exposure_billing_vr ?? 0).toFixed(2),
    }));

    // 🔹 Add total row
    exportData.push({
      "S.No": "",
      "CLIENT": "TOTAL",
      "OPENING": totalOpening.toFixed(2),
      "Fresh Release": totalFresh.toFixed(2),
      "Consume": totalConsume.toFixed(2),
      "Balance": totalBalance.toFixed(2),
      "Release Billing": totalBilled.toFixed(2),
      "Exposure Billing VR": totalCollected.toFixed(2),
    });

    // 🔹 Create Excel file
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Clients Rights");

    const fileName = `clients-rights-${new Date().toISOString().split("T")[0]}.xlsx`;
    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const blob = new Blob([excelBuffer], { type: "application/octet-stream" });
    saveAs(blob, fileName);
  } catch (error) {
    console.error("Error exporting Excel:", error);
    alert("Export failed. Please try again.");
  }
   finally {
      setLoading(false);
    }
};

const handleEffectiveMonth = async (clientId) => {
  setStartDate("");

  // All Clients or no selection
  if (clientId === "999" || clientId === "") {
    setMinDate("2025-09-01");
    return;
  }

  try {
    const res = await api.get("/agents/clients-effective-month", {
      params: {
        client_id: clientId,
      },
    });

    setMinDate(res.data.effective_month);
  } catch (err) {
    console.error("EffectiveMonth error:", err);
    setMinDate("2025-09-01"); // fallback
  }
};




const handleClientChange = (e) => {
  const clientId = e.target.value;
  setSelectedClientId(clientId);

  const clientObj = clients.find((c) => c.company_id === Number(clientId));
  setSelectedClient(clientObj ? clientObj.company_name : "");

  handleEffectiveMonth(clientId);
};

 {/* Main Table */}

const handleSearch = async () => {
  if (!selectedClientId || !startDate || !endDate) {
    alert("Please select client and date range");
    return;
  }

  setLoading(true); // ✅ Start loader

  try {
    if (selectedClientId === "999") {
      // All Clients selected
      const res = await api.get("/agents/clients-rights_is_dial", {
        params: {
          start_date: startDate,
          end_date: endDate,
        },
      });

      const sortedClients = res.data.sort((a, b) =>
        a.company_name.localeCompare(b.company_name, "en", { sensitivity: "base" })
      );

      const formattedData = sortedClients.map((client, index) => ({
        sno: index + 1,
        client: client.company_name,
        opening: 0,
        billed: client.Release_billing ?? 0, // 🔹 Use Release_billing here
        collected: client.Exposure_billing_vr ?? 0, // 🔹 Use Exposure_billing_vr here
        closing: 0,
        cpOpening: client.opening ?? 0,
        cpFresh: client.fresh_release ?? 0,
        cpConsumed: client.consume ?? 0,
        cpBalance: client.balance ?? 0,
        status: "Active",
        exposure: 0,
        toBeBilled: 0,
        action: "0.00",
        payment: "Send SMS",
        color: index % 2 === 0 ? "green" : "red",
      }));

      setData(formattedData);
    } else {
      // Specific client selected
      const res = await api.get("/agents/clients-rights_search", {
        params: {
          start_date: startDate,
          end_date: endDate,
          client_id: selectedClientId,
        },
      });

      const result = Array.isArray(res.data) ? res.data : [res.data];

      const formattedData = result.map((client, index) => ({
        sno: index + 1,
        client: client.company_name || "",
        opening: 0,
        billed: client.Release_billing ?? 0, // 🔹 Use Release_billing here
        collected: client.Exposure_billing_vr ?? 0, // 🔹 Use Exposure_billing_vr here
        closing: 0,
        cpOpening: client.opening ?? 0,
        cpFresh: client.fresh_release ?? 0,
        cpConsumed: client.consume ?? 0,
        cpBalance: client.balance ?? 0,
        status: "Active",
        exposure: 0,
        toBeBilled: 0,
        action: "0.00",
        payment: "Send SMS",
        color: index % 2 === 0 ? "green" : "red",
      }));

      setData(formattedData);
    }
  } catch (err) {
    console.error("Error fetching client data:", err);
  } finally {
    setLoading(false); // ✅ Loader stops in ALL cases
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
    <div className="exposure-container">
      <h2 className="page-title">View Exposure</h2>

      {/* Header Filters */}
      <div className="filters-header">
        <div className="month-title">
          <strong>October (2025–2026)</strong>
        </div>
        <div className="status-legend">
          <span className="badge active">Active</span>
          <span className="badge hold">Hold</span>
          <span className="badge deactive">De-Active</span>
        </div>
      </div>

      <p className="sequence-note">
        Sequence of Records ordered as Active First and Ascending order of Exposure.
      </p>

      <div className="filters-bar">
      <select
      value={selectedClientId}
      onChange={handleClientChange}
      style={{ width: "30%" }}
      className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
    >
      <option value="">Select Client</option>
      <option value="999">All Clients</option>
      {clients.map((client) => (
        <option key={client.company_id} value={client.company_id}>
          {client.company_name}
        </option>
      ))}
    </select>



    <select
      value={selectedStatus}
      onChange={(e) => setSelectedStatus(e.target.value)}
      className="border border-gray-300 rounded-lg px-3 py-2 w-[30%] focus:outline-none focus:ring-2 focus:ring-blue-500"
    >
      <option value="status">Status</option>
      <option value="all">All</option>
      <option value="active">Active</option>
      <option value="hold">Hold</option>
      <option value="de-active">De-active</option>
    </select>

        <input
        type="date"
        value={startDate}
        onChange={(e) => setStartDate(e.target.value)}
        min={minDate}
        className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
      />

      <input
        type="date"
        value={endDate}
        onChange={(e) => setEndDate(e.target.value)}
        className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
      />
        <button className="btn search" onClick={handleSearch} >SEARCH</button>
        <button className="btn export" onClick={handleExport}>EXPORT</button>
      </div>

      {/* Main Table */}
      <div className="table-container">
        <table className="exposure-table">
          <thead>
            <tr>
              <th rowSpan="2">S.NO.</th>
              <th rowSpan="2">CLIENT</th>
              {/* <th colSpan="4" className="ledger-header">LEDGER</th> */}
              <th colSpan="6" className="credit-header">CREDIT POINT CONSUMPTION</th>
              <th colSpan="4" className="action-header">PROPOSED ACTION</th>
            </tr>
            <tr>
             {/* <th>OPENING</th>
              <th>BILLED</th>
              <th>COLLECTED</th>
              <th>CLOSING</th> */}

              <th>OPENING</th>


              <th>FRESH RELEASED</th>
              <th>CONSUMED</th>
              <th>BALANCE</th>
              <th>RELEASE FROM BILLING</th>
              <th>EXPOSURE BILLING REQUIRED</th>

              <th>STATUS</th>

              <th>EXPOSURE</th>
              <th>TO BE BILLED</th>
              <th>ACTION</th>
              <th>PAYMENT</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr key={row.sno}>
                <td>{row.sno}</td>
                <td className={`client-name ${row.color}`}>{row.client}</td>
                 {/* <td>{row.opening.toFixed(2)}</td>
                <td>{row.billed.toFixed(2)}</td>
                <td>{row.collected.toFixed(2)}</td>
                <td>{row.closing.toFixed(2)}</td> */}
                <td className={row.cpOpening < 0 ? "negative" : ""}>
                  {row.cpOpening.toFixed(2)}
                </td>




                <td>{row.cpFresh.toFixed(2)}</td>
                <td>{row.cpConsumed.toFixed(2)}</td>
                <td className={row.cpBalance < 0 ? "negative" : ""}>
                  {row.cpBalance.toFixed(2)}
                </td>
                <td>{row.billed.toFixed(2)}</td>
                <td>{row.collected.toFixed(2)}</td>

                <td>{row.status}</td>
                <td>{row.exposure.toFixed(2)}</td>
                <td>{row.toBeBilled.toFixed(2)}</td>
                <td>{row.action}</td>
                <td>
                  <button className="btn-sms">{row.payment}</button>
                </td>
              </tr>
            ))}

            {/* Total Row */}
  {data.length > 0 && (
    <tr className="total-row">
      <td></td>
      <td>Total</td>
      {/*<td>{data.reduce((acc, r) => acc + r.opening, 0).toFixed(2)}</td>
      <td>{data.reduce((acc, r) => acc + r.billed, 0).toFixed(2)}</td>
      <td>{data.reduce((acc, r) => acc + r.collected, 0).toFixed(2)}</td>
      <td>{data.reduce((acc, r) => acc + r.closing, 0).toFixed(2)}</td>*/}
      <td>{data.reduce((acc, r) => acc + r.cpOpening, 0).toFixed(2)}</td>



      <td>{data.reduce((acc, r) => acc + r.cpFresh, 0).toFixed(2)}</td>
      <td>{data.reduce((acc, r) => acc + r.cpConsumed, 0).toFixed(2)}</td>
      <td>{data.reduce((acc, r) => acc + r.cpBalance, 0).toFixed(2)}</td>

      <td>{data.reduce((acc, r) => acc + r.billed, 0).toFixed(2)}</td>
      <td>{data.reduce((acc, r) => acc + r.collected, 0).toFixed(2)}</td>
      <td></td>
      <td>{data.reduce((acc, r) => acc + r.exposure, 0).toFixed(2)}</td>
      <td>{data.reduce((acc, r) => acc + r.toBeBilled, 0).toFixed(2)}</td>
      <td></td>
      <td></td>
    </tr>
  )}

          </tbody>
        </table>
      </div>
    </div>
    </div>
    </>
  );
};

export default ExposureView;
