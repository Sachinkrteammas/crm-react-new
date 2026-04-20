import React, { useState, useEffect } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import api from "../api";
import * as XLSX from "xlsx-js-style";
import { saveAs } from "file-saver";

const AbandonCallDataOld = () => {
  const userType = localStorage.getItem("user_type");
  const companyId = localStorage.getItem("company_id");

  const [clientId, setClientId] = useState("All");
  const [clients, setClients] = useState([]);

  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);

  const [data, setData] = useState({});
  const [dates, setDates] = useState([]);
  const [datesMap, setDatesMap] = useState({});

  const [showTable, setShowTable] = useState(false);
  const [loading, setLoading] = useState(false);

  const activeClientId =
    userType === "Super-Admin" || userType === "Admin"
      ? clientId
      : companyId;

  /* ---------------- FETCH CLIENTS ---------------- */
  useEffect(() => {
    if (userType === "Super-Admin" || userType === "Admin") {
      api.get("/agents/clients-rights")
        .then((res) => {
          const sorted = res.data.sort((a, b) =>
            a.company_name.localeCompare(b.company_name)
          );
          setClients(sorted);
        })
        .catch(console.error);
    }
  }, [userType]);

  /* ---------------- FORMAT DATE ---------------- */
  const formatDate = (date) => {
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };

  const formatDisplayDate = (d) => {
    const date = new Date(d);
    return `${String(date.getDate()).padStart(2, "0")}-${date.toLocaleString("en-US", { month: "short" }).toUpperCase()}-${date.getFullYear()}`;
  };


  const monthKey = Object.keys(data?.["Abandon Call"] || {})[0];

  /* ---------------- FETCH REPORT ---------------- */
  const fetchReport = async () => {
    if (!startDate || !endDate) {
        alert("Please select start and end date");
        return;
    }

    try {
        setLoading(true);
        setShowTable(false);

        const res = await api.get("/abandon-call_old", {
        params: {
            start_date: formatDate(startDate),
            end_date: formatDate(endDate),
            client_id: activeClientId,
        },
        });

        setData(res.data.data || {});
        setDatesMap(res.data.datetime_map || {});

        setShowTable(true);
    } catch (err) {
        console.error(err);
        alert("Failed to fetch data");
    } finally {
        setLoading(false);
    }
    };

  /* ---------------- EXPORT ---------------- */
  const handleExport = async () => {
    if (!startDate || !endDate) {
        alert("Please select start and end date");
        return;
    }

    try {
        setLoading(true);

        const res = await api.get("/abandon-call_old", {
        params: {
            start_date: formatDate(startDate),
            end_date: formatDate(endDate),
            client_id: activeClientId,
        },
        });

        const apiData = res.data.data || {};
        const datetimeMap = res.data.datetime_map || {};

        const months = Object.keys(datetimeMap);

        if (!months.length) {
        alert("No data to export");
        return;
        }

        // 🔹 Convert "March-2026" → "Mar-26"
        const formatMonth = (monthStr) => {
        const [month, year] = monthStr.split("-");
        return `${month.slice(0, 3)}-${year.slice(2)}`;
        };

        // ---------------- BUILD HEADER ----------------

        // Row 1 (empty spacing)
        const row1 = [""];

        // Row 2 (Months)
        const row2 = [""];

        // Row 3 (Dates)
        const row3 = [""];

        months.forEach((month) => {
        const dates = datetimeMap[month];

        row2.push(formatMonth(month), ...Array(dates.length - 1).fill(""));
        row3.push(...dates);
        });

        // ---------------- BODY ----------------
        const bodyRows = Object.keys(apiData).map((type) => {
        const row = [type];

        months.forEach((month) => {
            datetimeMap[month].forEach((date) => {
            row.push(apiData?.[type]?.[month]?.[date] || 0);
            });
        });

        return row;
        });

        const sheetData = [row1, row2, row3, ...bodyRows];

        const ws = XLSX.utils.aoa_to_sheet(sheetData);

        // ---------------- MERGE MONTH HEADERS ----------------
        let colIndex = 1;
        ws["!merges"] = [];

        months.forEach((month) => {
        const length = datetimeMap[month].length;

        ws["!merges"].push({
            s: { r: 1, c: colIndex },
            e: { r: 1, c: colIndex + length - 1 },
        });

        colIndex += length;
        });

        const getCell = (r, c) => XLSX.utils.encode_cell({ r, c });

        // 🔹 Month Style
        colIndex = 1;
        months.forEach((month) => {
        const ref = getCell(1, colIndex);
        if (ws[ref]) {
            ws[ref].s = {
            font: { bold: true },
            alignment: { horizontal: "center" },
            };
        }
        colIndex += datetimeMap[month].length;
        });

        // 🔹 Date Header Style
        for (let col = 1; col < row3.length; col++) {
        const ref = getCell(2, col);
        if (ws[ref]) {
            ws[ref].s = {
            font: { bold: true },
            alignment: { horizontal: "center" },
            };
        }
        }

        // 🔹 First Column Bold
        for (let row = 3; row < sheetData.length; row++) {
        const ref = getCell(row, 0);
        if (ws[ref]) {
            ws[ref].s = {
            font: { bold: true },
            };
        }
        }

        // 🔹 Column Width
        ws["!cols"] = [
        { wch: 28 },
        ...Array(row3.length - 1).fill({ wch: 12 }),
        ];

        // ---------------- FILE NAME ----------------

        let companyName = "All";

        if (activeClientId !== "All") {
        const selectedClient = clients.find(
            (c) => String(c.company_id) === String(activeClientId)
        );
        companyName = selectedClient?.company_name || "Unknown";
        }

        const cleanCompanyName = companyName.replace(/\s+/g, "_");

        const formatFileDate = (date) => {
        const d = new Date(date);
        return `${String(d.getDate()).padStart(2, "0")}-${String(
            d.getMonth() + 1
        ).padStart(2, "0")}-${d.getFullYear()}`;
        };

        const fileName = `${cleanCompanyName}_Abandon_Call_Data_${formatFileDate(
        startDate
        )}_to_${formatFileDate(endDate)}.xlsx`;

        // ---------------- EXPORT ----------------
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Abandon Call Data");

        const excelBuffer = XLSX.write(wb, {
        bookType: "xlsx",
        type: "array",
        });

        const blob = new Blob([excelBuffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        });

        saveAs(blob, fileName);

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
          <div className="bar"></div>
          <div className="bar"></div>
        </div>
      )}

      <div className={`priority-wrapper ${loading ? "blurred" : ""}`}>

        {/* FILTER */}
        <div className="card p-3 mb-3">
          <h5>Abandon Call Data Old</h5>

          <div className="d-flex flex-wrap gap-3 align-items-end">

            {(userType === "Super-Admin" || userType === "Admin") && (
              <select
                className="form-select"
                style={{ width: "220px" }}
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
              >
                <option value="All">All</option>
                {clients.map((c) => (
                  <option key={c.company_id} value={c.company_id}>
                    {c.company_name}
                  </option>
                ))}
              </select>
            )}

            <DatePicker
              selected={startDate}
              onChange={setStartDate}
              placeholderText="Start Date"
              className="form-control"
              dateFormat="dd-MM-yyyy"
            />

            <DatePicker
              selected={endDate}
              onChange={setEndDate}
              placeholderText="End Date"
              className="form-control"
              dateFormat="dd-MM-yyyy"
            />

            <button className="btn btn-success" onClick={handleExport}>
              EXPORT
            </button>

            <button className="btn btn-primary" onClick={fetchReport}>
              VIEW
            </button>

          </div>
        </div>

        {/* TABLE */}
        {showTable && (
          <div className="card p-3">
            <h6>{monthKey}</h6>

            <div style={{ overflowX: "auto" }}>
              <table className="table table-bordered text-center">

                <thead>
                <tr>
                    <th rowSpan="2"></th>

                    {Object.keys(data?.["Abandon Call"] || {}).map((month) => (
                    <th key={month} colSpan={datesMap[month]?.length || 0}>
                        {month.toUpperCase()}
                    </th>
                    ))}
                </tr>

                <tr>
                    {Object.keys(data?.["Abandon Call"] || {}).map((month) =>
                    datesMap[month]?.map((date) => (
                        <th key={date}>{date.toUpperCase()}</th>
                    ))
                    )}
                </tr>
                </thead>

                <tbody>
                    {Object.keys(data).map((type) => (
                        <tr key={type}>
                        <td>{type}</td>

                        {Object.keys(datesMap).map((month) =>
                            datesMap[month].map((date) => (
                            <td key={date}>
                                {data?.[type]?.[month]?.[date] || 0}
                            </td>
                            ))
                        )}
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

export default AbandonCallDataOld;