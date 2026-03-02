import React, { useState, useEffect } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import api from "../api";
import "../styles/loader.css";

const MonthConsumption = () => {
  const userType = localStorage.getItem("user_type");
  const companyId = localStorage.getItem("company_id");

  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState("");

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [data, setData] = useState([]);
  const [showTable, setShowTable] = useState(false);
  const [loading, setLoading] = useState(false);

  // ===============================
  // FETCH CLIENT LIST (ADMIN ONLY)
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
  // FORMAT DATE → yyyy-mm-dd
  // ===============================
  const formatDate = (date) => {
    if (!date) return "";
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  const handleStartDateChange = (date) => setStartDate(formatDate(date));
  const handleEndDateChange = (date) => setEndDate(formatDate(date));

  // ===============================
  // API CALL
  // ===============================
  const fetchReport = async () => {
    const payload = {
      from_date: startDate,
      to_date: endDate,
    };

    if (selectedClient) payload.company_id = selectedClient;

    const res = await api.post(
      "/report/company_consumption_range",
      payload
    );

    return res.data;
  };

  // ===============================
  // VIEW DATA
  // ===============================
  const handleView = async () => {
    if (!startDate || !endDate) {
      alert("Select date range");
      return;
    }

    setLoading(true);

    try {
      const res = await fetchReport();

      if (!res?.data?.length) {
        alert("No data found");
        return;
      }

      // map API response → UI structure
      const rows = res.data.map((row) => ({
        companyName: row.Company_Name,
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
  const formatDisplayDate = (dateStr) => {
  if (!dateStr) return "";

  const [year, month, day] = dateStr.split("-");
  return `${day}-${month}-${year}`;
};


  const handleExport = async () => {
    if (!startDate || !endDate) {
      alert("Select date range");
      return;
    }

    setLoading(true);

    try {
      const res = await fetchReport();

      if (!res?.data?.length) {
        alert("No data available");
        return;
      }

      const exportRows = res.data.map((row) => ({
        ClientName: row.Company_Name,
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

      const headerRows = [
        [
          "Month Consumption Report",
          `Client: ${clientLabel}`,
           `Date Range: ${formatDisplayDate(startDate)} to ${formatDisplayDate(endDate)}`
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
        `MonthConsumption_${formatDisplayDate(startDate)}_to_${formatDisplayDate(endDate)}.xlsx`
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

            {/* CLIENT DROPDOWN */}
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

            {/* START DATE */}
            <DatePicker
              selected={startDate ? new Date(startDate) : null}
              onChange={handleStartDateChange}
              placeholderText="Start Date"
              className="form-control"
              dateFormat="dd-MM-yyyy"
            />

            {/* END DATE */}
            <DatePicker
              selected={endDate ? new Date(endDate) : null}
              onChange={handleEndDateChange}
              placeholderText="End Date"
              className="form-control"
              dateFormat="dd-MM-yyyy"
            />

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
                        <td>{row.month}</td>
                        <td>{row.talkMinutes}</td>
                        <td>{row.callRate}</td>
                        <td>{row.totalValue}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="text-center">
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