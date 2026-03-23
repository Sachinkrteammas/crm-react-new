import React, { useState, useEffect } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import api from "../api";
import * as XLSX from "xlsx-js-style";
import { saveAs } from "file-saver";

const AbandonTrend = () => {
  const userType = localStorage.getItem("user_type");
  const companyId = localStorage.getItem("company_id");

  const [clientId, setClientId] = useState("All");
  const [clients, setClients] = useState([]);
  const [categories, setCategories] = useState([]);   // list from API
    const [category, setCategory] = useState("All");    // selected value

  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [noOfCount, setNoOfCount] = useState(0);

  const [data, setData] = useState({});
  const [campaigns, setCampaigns] = useState([]);
  const [dates, setDates] = useState([]);

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


  /* ---------------- FETCH CATEGORIES ---------------- */
    useEffect(() => {
    api.get("/categories")
        .then((res) => {
        setCategories(res.data.categories || []);
        })
        .catch((err) => {
        console.error("Category fetch error:", err);
        });
    }, []);

  /* ---------------- FORMAT DATE ---------------- */
  const formatDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  };

  /* ---------------- FETCH REPORT ---------------- */
  const fetchReport = async () => {
    if (!startDate || !endDate) {
    alert("Please select start and end date");
    return;
  }

    try {
      setLoading(true);
       setShowTable(false);

      const res = await api.get("/abandon-trend", {
        params: {
          start_date: formatDate(startDate),
          end_date: formatDate(endDate),
          client_id: activeClientId,
          category: category,
          no_of_count: noOfCount,
        },
      });

      setData(res.data.data || {});
      setCampaigns(res.data.campaigns || []);
      setDates(res.data.dates || []);


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

    const formatDate = (date) => {
      const d = new Date(date);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    };

    const formatDisplayDate = (d) => {
      const date = new Date(d);
      return `${String(date.getDate()).padStart(2, "0")}-${String(date.getMonth() + 1).padStart(2, "0")}-${date.getFullYear()}`;
    };

    const res = await api.get("/abandon-trend", {
      params: {
        start_date: formatDate(startDate),
        end_date: formatDate(endDate),
        client_id: activeClientId,
        category,
        no_of_count: noOfCount,
      },
    });

    const apiData = res.data.data || {};
    const apiCampaigns = res.data.campaigns || [];
    const apiDates = res.data.dates || [];

    if (!apiDates.length || !apiCampaigns.length) {
      alert("No data to export");
      return;
    }

    let companyName = "All";
    if (activeClientId !== "All") {
      const selectedClient = clients.find(
        (c) => String(c.company_id) === String(activeClientId)
      );
      companyName = selectedClient?.company_name || "Unknown";
    }

    // ---------------- BUILD DATA ----------------
    const headerTop = [
      `Company: ${companyName}`,
      `From: ${formatDisplayDate(startDate)}`,
      `To: ${formatDisplayDate(endDate)}`
    ];

    const headerRow1 = ["Date"];
    const headerRow2 = ["Campaign"];

    apiDates.forEach((d) => {
      headerRow1.push(formatDisplayDate(d));
      headerRow2.push("Abandon %");
    });

    const rows = apiCampaigns.map((camp) => {
      const row = [camp];
      apiDates.forEach((date) => {
        row.push(apiData?.[date]?.[camp]?.abandon_percent || "0%");
      });
      return row;
    });

    const sheetData = [headerTop, [], headerRow1, headerRow2, ...rows];

    const ws = XLSX.utils.aoa_to_sheet(sheetData);

    // ---------------- FIXED COLUMN COUNT ----------------
    const totalCols = apiDates.length + 1;

    const getCell = (r, c) => XLSX.utils.encode_cell({ r, c });

    // 🔵 Blue Date Header
    for (let col = 0; col < totalCols; col++) {
      const ref = getCell(2, col);
      if (ws[ref]) {
        ws[ref].s = {
          fill: { fgColor: { rgb: "2F75B5" } },
          font: { bold: true, color: { rgb: "FFFFFF" } },
          alignment: { horizontal: "center" }
        };
      }
    }

    // 🔥 Bold Campaign Header
    for (let col = 0; col < totalCols; col++) {
      const ref = getCell(3, col);
      if (ws[ref]) {
        ws[ref].s = {
          font: { bold: true },
          alignment: { horizontal: "center" }
        };
      }
    }

    ws["!cols"] = [
      { wch: 30 },
      ...apiDates.map(() => ({ wch: 12 }))
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Abandon Trend");

    // ✅ FIXED FILE NAME (IMPORTANT)
    const fileName = `${
      activeClientId === "All"
        ? "All"
        : companyName.replace(/\s+/g, "_")
    }_Abandon_Trend_${formatDisplayDate(startDate)}_to_${formatDisplayDate(endDate)}.xlsx`;

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



  /* ---------------- GENERATE DAY HEADERS ---------------- */
  const getDayHeaders = () => {
    return dates.map((d) => d.split("-")[2]); // 01, 02, ...
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

      {/* FILTER CARD */}
      <div className="card p-3 mb-3">
        <h5>Call Abandon Trend</h5>

        <div className="d-flex flex-wrap gap-3 align-items-end">

          {/* Client */}
          {(userType === "Super-Admin" || userType === "Admin") && (
            <select
              className="form-select"
              style={{ width: "200px" }}
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

          {/* Category */}
          <select
            className="form-select"
            style={{ width: "200px" }}
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            >
            <option value="All">All</option>

            {categories.map((cat, index) => (
                <option key={index} value={cat}>
                {cat}
                </option>
            ))}
            </select>

          {/* Start Date */}
          <DatePicker
            selected={startDate}
            onChange={setStartDate}
            placeholderText="Start Date"
            className="form-control"
            dateFormat="dd-MM-yyyy"
          />

          {/* End Date */}
          <DatePicker
            selected={endDate}
            onChange={setEndDate}
            placeholderText="End Date"
            className="form-control"
            dateFormat="dd-MM-yyyy"
          />

          {/* No of Count */}
          <input
            type="number"
            className="form-control"
            style={{ width: "120px" }}
            value={noOfCount}
            min={0}
            onChange={(e) => setNoOfCount(e.target.value)}
          />

          {/* Buttons */}
          <button className="btn btn-primary" onClick={fetchReport}>
            VIEW
          </button>

          <button className="btn btn-success" onClick={handleExport}>
            EXPORT
          </button>

        </div>
      </div>

      {/* TABLE */}
      {showTable && (
        <div className="card p-3">
            <h6>Call Abandon Trend</h6>

            {/* ❗ No Data Case */}
            {campaigns.length === 0 ? (
            <div className="text-center p-4">
                <h6>No Data Found</h6>
            </div>
            ) : (
            <div style={{ overflowX: "auto" }}>
                <table className="table table-bordered text-center">

                <thead className="table-primary">
                    <tr>
                    <th>Date</th>
                    {getDayHeaders().map((d, i) => (
                        <th key={i}>{d}</th>
                    ))}
                    </tr>
                </thead>

                <tbody>
                    {campaigns.map((camp) => (
                    <tr key={camp}>
                        <td>{camp}</td>

                        {dates.map((date) => (
                        <td key={date}>
                            {data?.[date]?.[camp]?.abandon_percent || "-"}
                        </td>
                        ))}
                    </tr>
                    ))}
                </tbody>

                </table>
            </div>
            )}
        </div>
        )}
    </div>
    </>
  );
};

export default AbandonTrend;