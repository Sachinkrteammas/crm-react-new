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

  const [type, setType] = useState("");

  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [month, setMonth] = useState(new Date().getMonth() + 1);

  const [data, setData] = useState([]);
  const [showTable, setShowTable] = useState(false);
  const [loading, setLoading] = useState(false);

  // ===============================
  // FETCH CLIENTS
  // ===============================
  useEffect(() => {
    const fetchClients = async () => {
      try {
        let is_shared_param = null;

        if (type === "0") is_shared_param = 0;
        else if (type === "1") is_shared_param = 1;

        const res = await api.get("/companies", {
          params:
            is_shared_param !== null
              ? { is_shared: is_shared_param }
              : {},
        });

        const sorted = res.data.sort((a, b) =>
          (a.company_name || "").localeCompare(
            b.company_name || "",
            "en",
            { sensitivity: "base" }
          )
        );

        setClients([
          { company_id: "ALL", company_name: "ALL" },
          ...sorted,
        ]);
      } catch (err) {
        console.error("Client fetch error:", err);
      }
    };

    if (userType === "Super-Admin" || userType === "Admin") {
      fetchClients();
    } else {
      setSelectedClient(companyId);
    }
  }, [type]);

  // ===============================
  // API CALL
  // ===============================
  const fetchReport = async () => {
    const payload = { year, month, type };

    if (selectedClient && selectedClient !== "ALL") {
      payload.company_id = selectedClient;
    }

    const res = await api.post(
      "/report/company_consumption_month",
      payload
    );

    return res.data;
  };

  // ===============================
  // VIEW
  // ===============================
  const handleView = async () => {
    setLoading(true);
    try {
      const res = await fetchReport();

      if (!res?.data?.length) {
        alert("No data found");
        setShowTable(false);
        return;
      }

      const rows = res.data.map((row) => ({
        companyName: row.Company_Name || "-",
        companyType: row.Company_Type || "-",
        talkMinutes: Number(row.Total_Talk_Minutes || 0).toFixed(2),
        callRate: Number(row.Call_Rate || 0).toFixed(2),
        totalValue: Number(row.Total_Consume || 0).toFixed(2),
      }));

      setData(rows);
      setShowTable(true);
    } catch (err) {
      console.error(err);
      alert("Error fetching data");
    } finally {
      setLoading(false);
    }
  };

  // ===============================
  // EXPORT
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
        ClientName: row.Company_Name || "-",
        Type: row.Company_Type || "-",
        TalkMinutes: Number(row.Total_Talk_Minutes || 0).toFixed(2),
        CallRate: Number(row.Call_Rate || 0).toFixed(2),
        TotalValue: Number(row.Total_Consume || 0).toFixed(2),
      }));

      const monthName = [
        "Jan","Feb","Mar","Apr","May","Jun",
        "Jul","Aug","Sep","Oct","Nov","Dec"
      ][month - 1];

      const worksheet = XLSX.utils.json_to_sheet(exportRows);
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
          <div className="bar"></div>
          <div className="bar"></div>
        </div>
      )}

      <div className={`priority-wrapper ${loading ? "blurred" : ""}`}>
        <div className="card p-4 mb-4">
          <h5>Month Consumption</h5>

          <div className="d-flex gap-3 flex-wrap align-items-center">

            {/* TYPE */}
            <select
              className="form-control w-auto"
              value={type}
              onChange={(e) => {
                setType(e.target.value);
                setSelectedClient("");
              }}
            >
              <option value="">All</option>
              <option value="0">Dedicated</option>
              <option value="1">Shared</option>
            </select>

            {/* CLIENT */}
            {(userType === "Admin" ||
              userType === "Super-Admin") && (
              <select
                className="form-control w-20"
                value={selectedClient}
                onChange={(e) =>
                  setSelectedClient(e.target.value)
                }
              >
                {clients.map((c) => (
                  <option key={c.company_id} value={c.company_id}>
                    {c.company_name}
                  </option>
                ))}
              </select>
            )}

            {/* YEAR */}
            <select
              className="form-control w-auto"
              value={year}
              onChange={(e) => setYear(e.target.value)}
            >
              {Array.from(
                { length: 10 },
                (_, i) => currentYear - 5 + i
              ).map((y) => (
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
              Export
            </button>
          </div>
        </div>

        {/* TABLE */}
        {showTable && (
          <div className="card p-4">
            <div
              className="table-responsive"
              style={{ maxHeight: "600px", overflowY: "auto" }}
            >
              <table className="table table-bordered">
                <thead
                  style={{
                    position: "sticky",
                    top: 0,
                    background: "#fff",
                    zIndex: 1,
                  }}
                >
                  <tr>
                    <th>Client</th>
                    <th>Type</th>
                    <th>Talk</th>
                    <th>Rate</th>
                    <th>Total</th>
                  </tr>
                </thead>

                <tbody>
                  {data.map((r, i) => (
                    <tr key={i}>
                      <td>{r.companyName}</td>
                      <td>{r.companyType}</td>
                      <td>{r.talkMinutes}</td>
                      <td>{r.callRate}</td>
                      <td>{r.totalValue}</td>
                    </tr>
                  ))}
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