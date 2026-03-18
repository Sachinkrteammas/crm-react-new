import React, { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import api from "../api";
import "../styles/loader.css";

const MonthConsumption = () => {
  const userType = localStorage.getItem("user_type");
  const companyId = localStorage.getItem("company_id");

  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState("");

  const currentYear = new Date().getFullYear();

  const [year, setYear] = useState(currentYear);
  const [month, setMonth] = useState(new Date().getMonth() + 1);

  const [data, setData] = useState([]);
  const [showTable, setShowTable] = useState(false);
  const [loading, setLoading] = useState(false);

  // ===============================
  // FETCH CLIENT LIST
  // ===============================
  useEffect(() => {
    if (userType === "Super-Admin" || userType === "Admin") {
      api
        .get("/agents/clients-rights")
        .then((res) => {
          const sorted = res.data.sort((a, b) =>
            a.company_name.localeCompare(b.company_name)
          );
          setClients(sorted);
        })
        .catch((err) => console.error(err));
    } else {
      setSelectedClient(companyId);
    }
  }, []);

  // ===============================
  // API CALL
  // ===============================
  const fetchReport = async () => {
    const payload = { year, month };
    if (selectedClient) payload.company_id = selectedClient;

    const res = await api.post(
      "/report/company_consumption_month",
      payload
    );

    return res.data;
  };

  // ===============================
  // VIEW DATA
  // ===============================
  const handleView = async () => {
    setLoading(true);

    try {
      const res = await fetchReport();

      if (!res?.data?.length) {
        alert("No data found");
        return;
      }

      const rows = res.data.map((row) => ({
        companyName: row.Company_Name,
        companyType: row.Company_Type,
        month: row.Month,
        talkMinutes: Number(row.Total_Talk_Minutes || 0).toFixed(2),
        callRate: Number(row.Call_Rate || 0).toFixed(2),
        totalValue: Number(row.Total_Consume || 0).toFixed(2),
      }));

      setData(rows);
      setShowTable(true);
    } catch (err) {
      console.error(err);
      alert("Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  // ===============================
  // EXPORT EXCEL
  // ===============================
  const handleExport = async () => {
    setLoading(true);

    try {
      const res = await fetchReport();

      if (!res?.data?.length) {
        alert("No data available");
        return;
      }

      const exportRows = res.data.map((row) => ({
        ClientName: row.Company_Name,
        Type: row.Company_Type,
        Month: row.Month,
        TalkTimeMinutes: Number(row.Total_Talk_Minutes || 0).toFixed(2),
        CallRate: Number(row.Call_Rate || 0).toFixed(2),
        TotalValue: Number(row.Total_Consume || 0).toFixed(2),
      }));

      const selectedClientObj = clients.find(
        (c) => String(c.company_id) === String(selectedClient)
      );

      const clientLabel = selectedClientObj
        ? selectedClientObj.company_name
        : "All Clients";

      const monthName = [
        "Jan","Feb","Mar","Apr","May","Jun",
        "Jul","Aug","Sep","Oct","Nov","Dec"
      ][month - 1];

      const headerRows = [
        [
          "Month Consumption Report",
          `Client: ${clientLabel}`,
          `Month: ${monthName} ${year}`
        ],
        [],
      ];

      const worksheet = XLSX.utils.json_to_sheet(exportRows, {
        origin: "A3",
      });

      XLSX.utils.sheet_add_aoa(worksheet, headerRows, { origin: "A1" });

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(
        workbook,
        worksheet,
        "Month Consumption"
      );

      const buffer = XLSX.write(workbook, {
        bookType: "xlsx",
        type: "array",
      });

      saveAs(
        new Blob([buffer]),
        `MonthConsumption_${monthName}_${year}.xlsx`
      );
    } catch (err) {
      console.error(err);
      alert("Export failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* LOADER */}
      {loading && (
        <div className="loader-overlay">
          <div className="bar"></div>
          <div className="bar"></div>
          <div className="bar"></div>
        </div>
      )}

      <div className={`priority-wrapper ${loading ? "blurred" : ""}`}>
        <div className="card p-4 mb-4">
          <h5>Month Consumption Report</h5>

          <div className="d-flex gap-3 flex-wrap align-items-center">

            {/* CLIENT */}
            {(userType === "Super-Admin" || userType === "Admin") && (
              <select
                className="form-control w-25"
                value={selectedClient}
                onChange={(e) => setSelectedClient(e.target.value)}
              >
                <option value="">All Clients</option>
                {clients.map((c) => (
                  <option key={c.company_id} value={c.company_id}>
                    {c.company_name}
                  </option>
                ))}
              </select>
            )}

            {/* YEAR (DYNAMIC) */}
            <select
              className="form-control w-auto"
              value={year}
              onChange={(e) => setYear(e.target.value)}
            >
              {Array.from({ length: 10 }, (_, i) => currentYear - 5 + i).map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>

            {/* MONTH */}
            <select
              className="form-control w-auto"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
            >
              {[
                "Jan","Feb","Mar","Apr","May","Jun",
                "Jul","Aug","Sep","Oct","Nov","Dec"
              ].map((m, i) => (
                <option key={i + 1} value={i + 1}>
                  {m}
                </option>
              ))}
            </select>

            <button className="btn btn-primary" onClick={handleView}>
              View
            </button>

            <button className="btn btn-success" onClick={handleExport}>
              Export Excel
            </button>
          </div>
        </div>

        {/* TABLE */}
        {showTable && (
          <div className="card p-4">
            <div
              className="table-responsive"
              style={{ maxHeight: "500px", overflow: "auto" }}
            >
              <table className="table table-bordered">
                <thead>
                  <tr>
                    <th>Client Name</th>
                    <th>Type</th>
                    <th>Month</th>
                    <th>Talk Time (Minutes)</th>
                    <th>Call Rate</th>
                    <th>Total Value</th>
                  </tr>
                </thead>

                <tbody>
                  {data.length > 0 ? (
                    data.map((row, i) => (
                      <tr key={i}>
                        <td>{row.companyName}</td>
                        <td>{row.companyType}</td>
                        <td>{row.month}</td>
                        <td>{row.talkMinutes}</td>
                        <td>{row.callRate}</td>
                        <td>{row.totalValue}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" className="text-center">
                        No data available
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default MonthConsumption;