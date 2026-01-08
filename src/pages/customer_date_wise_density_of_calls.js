import React, { useState, useEffect } from "react";
import api from "../api";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import * as XLSX from "xlsx-js-style";
import { saveAs } from "file-saver";

export default function CustomerDateWiseDensity() {
  const [filters, setFilters] = useState({
    type: "",
    client: "",          // will hold company_id
    clientCategory: "",
    selectType: "",
    startDate: null,
    endDate: null,
  });

  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [clientCategories, setClientCategories] = useState([]);
  const [viewMode, setViewMode] = useState(""); // Client Wise | Date Wise



  const handleChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const formatDateForApi = (date) => {
    if (!date) return null;

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  };

  /* ------------------ FETCH CLIENTS ------------------ */
  useEffect(() => {
    const fetchClients = async () => {
      try {
        // Determine is_shared param based on dropdown
        let is_shared_param = null;
        if (filters.type === "0") is_shared_param = 0;
        else if (filters.type === "1") is_shared_param = 1;
        // if filters.type is "ALL" or "", leave null → fetch all

        const res = await api.get("/companies", {
          params: is_shared_param !== null ? { is_shared: is_shared_param } : {},
        });

        // Sort companies alphabetically
        const sortedClients = res.data.sort((a, b) =>
          (a.company_name || "").localeCompare(b.company_name || "", "en", { sensitivity: "base" })
        );

        // Add "ALL" option at the beginning
        const clientsWithAll = [
          { company_id: "ALL", company_name: "ALL" },
          ...sortedClients,
        ];

        setClients(clientsWithAll);
      } catch (err) {
        console.error("Error fetching clients:", err);
      }
    };

    fetchClients();
  }, [filters.type]); // 🔹 re-run whenever type changes
  



  /* ------------------ FETCH CLIENT CATEGORIES ------------------ */
  useEffect(() => {
    const fetchClientCategories = async () => {
      try {
        const res = await api.get("/client-categories");
        // API response: { data: ["HV", "LV", "MV"] }
        setClientCategories(res.data.data || []);
      } catch (err) {
        console.error("Error fetching client categories:", err);
      }
    };

    fetchClientCategories();
  }, []);



  /* ------------------ VIEW / EXPORT ------------------ */
  const handleAction = async (action) => {
    if (action === "VIEW") {
      // Check all required filters
      const missingFields = [];
      if (!filters.type) missingFields.push("Select Type");
      if (!filters.client) missingFields.push("Select Client");
      if (!filters.clientCategory) missingFields.push("Client Category");
      if (!filters.selectType) missingFields.push("Select Type");
      if (!filters.startDate) missingFields.push("From Date");
      if (!filters.endDate) missingFields.push("To Date");
      if (!viewMode) missingFields.push("Client Wise");

      if (missingFields.length > 0) {
        alert(
          `Please select the following before viewing the report:\n- ${missingFields.join(
            "\n- "
          )}`
        );
        return;
      }

      setLoading(true);
      try {
        const payload = {
          company_id: filters.client,
          from_date: formatDateForApi(filters.startDate),
          to_date: formatDateForApi(filters.endDate),
          category: filters.clientCategory || null,
          sd_type: filters.type === "" ? "ALL" : filters.type,
        };

        const url =
          viewMode === "Date Wise"
            ? "/hourly_date_wise_report"
            : "/hourly_campaign_report";

        const res = await api.post(url, payload);
        setReportData(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    if (action === "EXPORT") {
      exportAllTablesToCSV(
        `Customer_DateWise_${viewMode || "Report"}_${formatDateForApi(filters.startDate)}_to_${formatDateForApi(filters.endDate)}.csv`
      );
    }
  };

  const HOURS = Array.from({ length: 24 }, (_, i) =>
    i.toString().padStart(2, "0")
  );

  const getHourValue = (rows, campaign, hour, key) => {
    const row = rows.find(
      (r) => r.campaign === campaign && r.ghour === Number(hour)
    );
    return row ? row[key] : 0;
  };

  const getGrandTotal = (rows, hour, key) =>
    rows
      .filter((r) => r.ghour === Number(hour))
      .reduce((sum, r) => sum + r[key], 0);


  const renderSlotTable = (mode) => {
    if (!reportData) return null;

    const isAnswered = mode === "ANSWERED";
    const isOffered = mode === "OFFERED";
    const isAbandon = mode === "ABANDON";
    const rows = reportData.rows || [];

    // Sort campaigns alphabetically
    const alRows = (reportData.al_rows || []).sort((a, b) =>
      (a.campaign || "").localeCompare(b.campaign || "", "en", { sensitivity: "base" })
    );

    // Calculate GRAND TOTAL AL % dynamically
    const grandTotal = alRows.reduce(
      (totals, al) => {
        const campaignRows = rows.filter((r) => r.campaign === al.campaign);
        const total = campaignRows.reduce((s, r) => s + r.Total, 0);
        const answered = campaignRows.reduce((s, r) => s + r.Answered, 0);
        return {
          total: totals.total + total,
          answered: totals.answered + answered,
        };
      },
      { total: 0, answered: 0 }
    );
    const grandALPercent =
      grandTotal.total > 0
        ? Math.round((grandTotal.answered / grandTotal.total) * 100)
        : 0;

    const getValueForMode = (al, key) => {
      if (isAnswered) return key === "main" ? al.Answered : al.Total;
      if (isOffered) return key === "main" ? al.Total : al.Answered;
      if (isAbandon) return key === "main" ? al.Abandon : key === "alt" ? al.Total : al.Answered;
      return 0;
    };

    return (
      <div className="table-responsive mb-4">
        <table className="table table-bordered text-center align-middle">
          <thead style={{ background: "#2f7db3", color: "#fff" }}>
            <tr>
              <th style={{ color: "#fff" }}>SLOT ({mode})</th>
              <th style={{ color: "#fff" }}>AL%</th>
              {/* Column order */}
              {isAbandon ? (
                <>
                  <th style={{ color: "#fff" }}>ABANDON</th>
                  <th style={{ color: "#fff" }}>OFFERED</th>
                  <th style={{ color: "#fff" }}>ANSWERED</th>
                </>
              ) : (
                <>
                  <th style={{ color: "#fff" }}>{mode}</th>
                  <th style={{ color: "#fff" }}>{isAnswered ? "OFFERED" : "ANSWERED"}</th>
                  <th style={{ color: "#fff" }}>ABANDON</th>
                </>
              )}
              {HOURS.map((h) => (
                <th key={h} style={{ color: "#fff" }}>{h}</th>
              ))}
            </tr>
          </thead>

          <tbody>
            {alRows.map((al) => {
              const campaignRows = rows.filter((r) => r.campaign === al.campaign);
              const total = campaignRows.reduce((s, r) => s + r.Total, 0);
              const answered = campaignRows.reduce((s, r) => s + r.Answered, 0);
              const alPercent = total > 0 ? Math.round((answered / total) * 100) : 0;

              return (
                <tr key={al.campaign}>
                  <td className="fw-bold text-start">{al.campaign}</td>
                  <td>{alPercent}</td>

                  {isAbandon ? (
                  <>
                    <td>{getValueForMode(al, "main")}</td> {/* ABANDON */}
                    <td>{getValueForMode(al, "alt")}</td>  {/* OFFERED */}
                    <td>{al.Answered}</td>                 {/* ANSWERED */}
                  </>
                ) : (
                  <>
                    <td>{getValueForMode(al, "main")}</td>
                    <td>{getValueForMode(al, "alt")}</td>
                    <td>{al.Abandon}</td>
                  </>
                )}

                  {HOURS.map((h) => {
                    const value = getHourValue(
                      rows,
                      al.campaign,
                      h,
                      isAnswered ? "Answered" : isOffered ? "Total" : "Abandon"
                    );
                    return (
                      <td
                        key={h}
                        style={{
                          backgroundColor: value === 0 ? "red" : "",
                          color: value === 0 ? "white" : "",
                        }}
                      >
                        {value || ""}
                      </td>
                    );
                  })}
                </tr>
              );
            })}

            {/* GRAND TOTAL */}
            <tr className="fw-bold">
              <td className="text-start">GRAND TOTAL</td>
              <td>{grandALPercent}</td>
              {isAbandon ? (
              <>
                <td>{alRows.reduce((s, r) => s + getValueForMode(r, "main"), 0)}</td>
                <td>{alRows.reduce((s, r) => s + getValueForMode(r, "alt"), 0)}</td>
                <td>{alRows.reduce((s, r) => s + r.Answered, 0)}</td>
              </>
            ) : (
              <>
                <td>{alRows.reduce((s, r) => s + getValueForMode(r, "main"), 0)}</td>
                <td>{alRows.reduce((s, r) => s + getValueForMode(r, "alt"), 0)}</td>
                <td>{alRows.reduce((s, r) => s + r.Abandon, 0)}</td>
              </>
            )}
              {HOURS.map((h) => (
                <td key={h}>
                  {getGrandTotal(
                    rows,
                    h,
                    isAnswered ? "Answered" : isOffered ? "Total" : "Abandon"
                  ) || ""}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    );
  };


  
  const renderPercentageTable = (mode) => {
    if (!reportData) return null;

    const isAnswered = mode === "ANSWERED%";
    const isAbandon = mode === "ABANDON%";
    const rows = reportData.rows || [];
    const alRows = (reportData.al_rows || []).sort((a, b) =>
      a.campaign.localeCompare(b.campaign, "en", { sensitivity: "base" })
    );

    const getValueForMode = (al, key) => {
      if (isAnswered) {
        // ANSWERED%
        return al.Total > 0 ? ((al.Answered / al.Total) * 100).toFixed(2) : "0%";
      }
      if (isAbandon) {
        // ABANDON%
        return al.Total > 0 ? ((al.Abandon / al.Total) * 100).toFixed(2) : "0%";
      }
      return "0%";
    };

    return (
      <div className="table-responsive mb-4">
        <table className="table table-bordered text-center align-middle">
          <thead style={{ background: "#2f7db3", color: "#fff" }}>
            <tr>
              <th style={{ color: "#fff" }}>SLOT ({mode})</th>
              <th style={{ color: "#fff" }}>{isAnswered ? "ANSWERED" : "ABANDON"}</th>
              <th style={{ color: "#fff" }}>OFFERED</th>
              <th style={{ color: "#fff" }}>{mode}</th>
              {HOURS.map((h) => (
                <th key={h} style={{ color: "#fff" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {alRows.map((al) => (
              <tr key={al.campaign}>
                <td className="fw-bold text-start">{al.campaign}</td>
                <td>{isAnswered ? al.Answered : al.Abandon}</td>
                <td>{al.Total}</td>
                <td>{getValueForMode(al)}</td>
                {HOURS.map((h) => {
                  const row = rows.find(
                    (r) => r.campaign === al.campaign && r.ghour === Number(h)
                  );
                  let value = "";
                  if (row) {
                    if (isAnswered) value = row.Total > 0 ? ((row.Answered / row.Total) * 100).toFixed(2) + "%" : "0%";
                    if (isAbandon) value = row.Total > 0 ? ((row.Abandon / row.Total) * 100).toFixed(2) + "%" : "0%";
                  }
                  return (
                    <td
                      key={h}
                      style={{
                        backgroundColor: value === "" ? "red" : "",
                        color: value === "0%" ? "white" : "",
                      }}
                    >
                      {value}
                    </td>
                  );
                })}                
              </tr>
            ))}

            {/* GRAND TOTAL */}
            <tr className="fw-bold">
              <td className="text-start">GRAND TOTAL</td>
              <td>{isAnswered ? alRows.reduce((s, r) => s + r.Answered, 0) : alRows.reduce((s, r) => s + r.Abandon, 0)}</td>
              <td>{alRows.reduce((s, r) => s + r.Total, 0)}</td>
              <td>
                {isAnswered
                  ? ((alRows.reduce((s, r) => s + r.Answered, 0) / alRows.reduce((s, r) => s + r.Total, 0)) * 100).toFixed(2) + "%"
                  : ((alRows.reduce((s, r) => s + r.Abandon, 0) / alRows.reduce((s, r) => s + r.Total, 0)) * 100).toFixed(2) + "%"}
              </td>
              {HOURS.map((h) => {
                // Filter rows for this hour
                const rowsForHour = rows.filter(r => r.ghour === Number(h));

                // Sum totals and answered/abandon for the hour
                const totalForHour = rowsForHour.reduce((sum, row) => sum + row.Total, 0);
                const answeredForHour = rowsForHour.reduce((sum, row) => sum + row.Answered, 0);
                const abandonForHour = rowsForHour.reduce((sum, row) => sum + row.Abandon, 0);

                // Compute percentage based on mode
                let value = "0%";
                if (isAnswered && totalForHour > 0) value = ((answeredForHour / totalForHour) * 100).toFixed(2) + "%";
                if (isAbandon && totalForHour > 0) value = ((abandonForHour / totalForHour) * 100).toFixed(2) + "%";

                return (
                  <td
                    key={h}
                    style={{
                      backgroundColor: value === "0%" ? "red" : "",
                      color: value === "0%" ? "white" : "",
                    }}
                  >
                    {value}
                  </td>
                );
              })}            
            </tr>
          </tbody>
        </table>
      </div>
    );
  };


  const renderDateWiseSlotTable = (mode) => {
    if (!reportData) return null;

    const isAnswered = mode === "ANSWERED";
    const isOffered = mode === "OFFERED";
    const isAbandon = mode === "ABANDON";

    const rows = reportData.rows || [];

    // Group rows by date
    const rowsByDate = {};
    rows.forEach((row) => {
      if (!rowsByDate[row.gdate]) rowsByDate[row.gdate] = [];
      rowsByDate[row.gdate].push(row);
    });

    // Function to calculate AL% for a date
    const getALPercent = (dateRows) => {
      const answeredSum = dateRows.reduce((s, r) => s + r.Answered, 0);
      const totalSum = dateRows.reduce((s, r) => s + r.Total, 0);
      return totalSum > 0 ? Math.round((answeredSum / totalSum) * 100) : 0;
    };


    // Get sum of values for a specific hour across all rows of a date
    const getHourValueSum = (hour, dateRows) => {
      return dateRows
        .filter((r) => r.ghour === Number(hour))
        .reduce(
          (sum, r) => sum + (isAnswered ? r.Answered : isOffered ? r.Total : r.Abandon),
          0
        );
    };

    // Grand totals
    const grandTotals = {
      Answered: 0,
      Total: 0,
      Abandon: 0,
      hours: Array(24).fill(0),
    };

    Object.values(rowsByDate).forEach((dateRows) => {
      grandTotals.Answered += dateRows.reduce((s, r) => s + r.Answered, 0);
      grandTotals.Total += dateRows.reduce((s, r) => s + r.Total, 0);
      grandTotals.Abandon += dateRows.reduce((s, r) => s + r.Abandon, 0);

      for (let h = 0; h < 24; h++) {
        grandTotals.hours[h] += getHourValueSum(h, dateRows);
      }
    });


    // AL% for grand total
    const grandALPercent =
      grandTotals.Total > 0
        ? Math.round((grandTotals.Answered / grandTotals.Total) * 100)
        : 0;

    return (
      <div className="table-responsive mb-4">
        <table className="table table-bordered text-center align-middle">
          <thead style={{ background: "#2f7db3", color: "#fff" }}>
            <tr>
              <th style={{ color: "#fff" }}>SLOT ({mode})</th>
              <th style={{ color: "#fff" }}>AL%</th>

              {isAbandon ? (
                <>
                  <th style={{ color: "#fff" }}>ABANDON</th>
                  <th style={{ color: "#fff" }}>OFFERED</th>
                  <th style={{ color: "#fff" }}>ANSWERED</th>
                </>
              ) : (
                <>
                  <th style={{ color: "#fff" }}>{mode}</th>
                  <th style={{ color: "#fff" }}>{isAnswered ? "OFFERED" : "ANSWERED"}</th>
                  <th style={{ color: "#fff" }}>ABANDON</th>
                </>
              )}

              {HOURS.map((h) => (
                <th key={h} style={{ color: "#fff" }}>{h}</th>
              ))}
            </tr>
          </thead>

          <tbody>
            {/* DATE-WISE ROWS */}
            {Object.entries(rowsByDate).map(([date, dateRows]) => {
              const alPercent = getALPercent(dateRows);
              const mainValue =
                isAnswered
                  ? dateRows.reduce((s, r) => s + r.Answered, 0)
                  : isOffered
                  ? dateRows.reduce((s, r) => s + r.Total, 0)
                  : dateRows.reduce((s, r) => s + r.Abandon, 0);

              const altValue =
                isAnswered
                  ? dateRows.reduce((s, r) => s + r.Total, 0)
                  : isOffered
                  ? dateRows.reduce((s, r) => s + r.Answered, 0)
                  : dateRows.reduce((s, r) => s + r.Total, 0);

              const abandonValue = dateRows.reduce((s, r) => s + r.Abandon, 0);

              // Format date as DD-MMM-YY
              const formattedDate = new Date(date).toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "short",
                year: "2-digit",
              });

              
              return (
                <tr key={date}>
                  <td className="fw-bold text-start">{formattedDate}</td>
                  <td>{alPercent}</td>

                  {isAbandon ? (
                    <>
                      <td>{mainValue}</td>
                      <td>{altValue}</td>
                      <td>{dateRows.reduce((s, r) => s + r.Answered, 0)}</td>
                    </>
                  ) : (
                    <>
                      <td>{mainValue}</td>
                      <td>{altValue}</td>
                      <td>{abandonValue}</td>
                    </>
                  )}

                  {HOURS.map((h) => {
                    const value = getHourValueSum(h, dateRows);
                    return (
                      <td
                        key={h}
                        style={{
                          backgroundColor: value === 0 ? "red" : "",
                          color: value === 0 ? "white" : "",
                        }}
                      >
                        {value || ""}
                      </td>
                    );
                  })}
                </tr>
              );
            })}

            {/* GRAND TOTAL */}
            <tr className="fw-bold">
              <td className="text-start">GRAND TOTAL</td>
              <td>{grandALPercent}</td>

              {isAbandon ? (
                <>
                  <td>{grandTotals.Abandon}</td>
                  <td>{grandTotals.Total}</td>
                  <td>{grandTotals.Answered}</td>
                </>
              ) : (
                <>
                  <td>{isAnswered ? grandTotals.Answered : isOffered ? grandTotals.Total : grandTotals.Abandon}</td>
                  <td>{isAnswered ? grandTotals.Total : isOffered ? grandTotals.Answered : grandTotals.Total}</td>
                  <td>{grandTotals.Abandon}</td>
                </>
              )}

              {HOURS.map((h) => (
                <td key={h}>{grandTotals.hours[Number(h)] || ""}</td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    );
  };




  const renderDateWisePercentageTable = (mode) => {
    if (!reportData) return null;

    const isAnswered = mode === "ANSWERED%";
    const isAbandon = mode === "ABANDON%";

    const rows = reportData.rows || [];

    // Group rows by date
    const rowsByDate = {};
    rows.forEach((r) => {
      if (!rowsByDate[r.gdate]) rowsByDate[r.gdate] = [];
      rowsByDate[r.gdate].push(r);
    });

    const calcPercent = (val, total) =>
      total > 0 ? ((val / total) * 100).toFixed(2) + "%" : "0%";

    return (
      <div className="table-responsive mb-4">
        <table className="table table-bordered text-center align-middle">
          <thead style={{ background: "#2f7db3", color: "#fff" }}>
            <tr>
              <th style={{ color: "#fff" }}>SLOT ({mode})</th>
              <th style={{ color: "#fff" }}>{isAnswered ? "ANSWERED" : "ABANDON"}</th>
              <th style={{ color: "#fff" }}>OFFERED</th>
              <th style={{ color: "#fff" }}>{mode}</th>
              {HOURS.map((h) => (
                <th key={h} style={{ color: "#fff" }}>{h}</th>
              ))}
            </tr>
          </thead>

          <tbody>
            {/* ================= DATE ROWS ================= */}
            {Object.entries(rowsByDate).map(([date, dateRows]) => {
              const total = dateRows.reduce((s, r) => s + r.Total, 0);
              const answered = dateRows.reduce((s, r) => s + r.Answered, 0);
              const abandon = dateRows.reduce((s, r) => s + r.Abandon, 0);

              // Format date as DD-MMM-YY
              const formattedDate = new Date(date).toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "short",
                year: "2-digit",
              });

              return (
                <tr key={date}>
                  <td className="fw-bold text-start">{formattedDate}</td>
                  <td>{isAnswered ? answered : abandon}</td>
                  <td>{total}</td>
                  <td>{calcPercent(isAnswered ? answered : abandon, total)}</td>

                  {HOURS.map((h) => {
                    const hourRows = dateRows.filter(
                      (r) => r.ghour === Number(h)
                    );

                    const hourTotal = hourRows.reduce(
                      (s, r) => s + r.Total,
                      0
                    );
                    const hourValue = hourRows.reduce(
                      (s, r) =>
                        s + (isAnswered ? r.Answered : r.Abandon),
                      0
                    );

                    const percent = calcPercent(hourValue, hourTotal);

                    return (
                      <td
                        key={h}
                        style={{
                          backgroundColor: percent === "0%" ? "red" : "",
                          color: percent === "0%" ? "white" : "",
                        }}
                      >
                        {percent}
                      </td>
                    );
                  })}
                </tr>
              );
            })}

            {/* ================= GRAND TOTAL ================= */}
            <tr className="fw-bold">
              <td className="text-start">GRAND TOTAL</td>

              {(() => {
                const total = rows.reduce((s, r) => s + r.Total, 0);
                const answered = rows.reduce((s, r) => s + r.Answered, 0);
                const abandon = rows.reduce((s, r) => s + r.Abandon, 0);

                return (
                  <>
                    <td>{isAnswered ? answered : abandon}</td>
                    <td>{total}</td>
                    <td>
                      {calcPercent(
                        isAnswered ? answered : abandon,
                        total
                      )}
                    </td>

                    {HOURS.map((h) => {
                      const hourRows = rows.filter(
                        (r) => r.ghour === Number(h)
                      );

                      const hourTotal = hourRows.reduce(
                        (s, r) => s + r.Total,
                        0
                      );
                      const hourValue = hourRows.reduce(
                        (s, r) =>
                          s + (isAnswered ? r.Answered : r.Abandon),
                        0
                      );

                      const percent = calcPercent(hourValue, hourTotal);

                      return (
                        <td
                          key={h}
                          style={{
                            backgroundColor: percent === "0%" ? "red" : "",
                            color: percent === "0%" ? "white" : "",
                          }}
                        >
                          {percent}
                        </td>
                      );
                    })}
                  </>
                );
              })()}
            </tr>
          </tbody>
        </table>
      </div>
    );
  };




  // this code exports only one table but adds red background.
  /* ------------------ EXPORT ALL TABLES ------------------ */
  const exportAllTablesToCSV = (filename = "report.csv") => {
  const excelFilename = filename.replace(/\.csv$/i, ".xlsx");

  requestAnimationFrame(() => {
    const tables = document.querySelectorAll(".table-responsive table");

    if (!tables.length) {
      alert("No tables found to export");
      return;
    }

    const workbook = XLSX.utils.book_new();
    const finalData = [];
    const redCells = [];
    const boldCells = [];

    tables.forEach((table, tableIndex) => {
      // 🔹 Extract table title
      const titleCell =
        table.querySelector("thead th")?.innerText?.trim();

      const tableTitle = titleCell
        ? `TABLE: ${titleCell}`
        : `TABLE ${tableIndex + 1}`;

      // 🔹 Title row index
      const titleRowIndex = finalData.length;

      // 🔹 Add table title row
      finalData.push([tableTitle]);
      boldCells.push({ r: titleRowIndex, c: 0 });

      // 🔹 Empty row after title
      finalData.push([]);

      const rows = table.querySelectorAll("tr");

      rows.forEach(() => {}); // noop (keep structure readable)

      rows.forEach((row) => {
        const cells = row.querySelectorAll("th, td");
        const rowData = [];

        cells.forEach((cell, cIndex) => {
          const value = cell.innerText.trim();
          rowData.push(value);

          if (value === "") {
            redCells.push({
              r: finalData.length,
              c: cIndex
            });
          }
        });

        finalData.push(rowData);
      });

      // 🔹 Spacing between tables
      if (tableIndex < tables.length - 1) {
        finalData.push([]);
        finalData.push([]);
      }
    });

    // 🔹 Normalize column count
    const maxCols = Math.max(...finalData.map(r => r.length));
    finalData.forEach(r => {
      while (r.length < maxCols) r.push("");
    });

    const worksheet = XLSX.utils.aoa_to_sheet(finalData);

    // 🔴 Apply red background
    redCells.forEach(({ r, c }) => {
      const cellRef = XLSX.utils.encode_cell({ r, c });

      if (!worksheet[cellRef]) {
        worksheet[cellRef] = { t: "s", v: "" };
      }

      worksheet[cellRef].s = {
        fill: {
          patternType: "solid",
          fgColor: { rgb: "FFFF0000" }
        }
      };
    });

    // 🔵 Bold title rows
    boldCells.forEach(({ r, c }) => {
      const ref = XLSX.utils.encode_cell({ r, c });
      worksheet[ref] ||= { t: "s", v: "" };
      worksheet[ref].s = {
        font: { bold: true }
      };
    });

    XLSX.utils.book_append_sheet(workbook, worksheet, "Report");
    XLSX.writeFile(workbook, excelFilename);
  });
};








// this code exports all table but do not add red background

// const exportAllTablesToCSV = (filename = "report.csv") => {
//     // Grab all tables inside .table-responsive
//     const tables = document.querySelectorAll(".table-responsive table");
//     if (!tables.length) return;

//     let csv = [];

//     tables.forEach((table, index) => {
//       // Add a label for each table (optional)
//       const tableCaption = table.querySelector("thead th")?.innerText || `TABLE ${index + 1}`;
//       csv.push(`TABLE: ${tableCaption}`);
      
//       const rows = table.querySelectorAll("tr");

//       rows.forEach((row) => {
//         const cols = row.querySelectorAll("th, td");
//         const rowData = Array.from(cols).map((col) => {
//           let data = col.innerText.replace(/"/g, '""'); // Escape quotes
//           if (data.includes(",")) data = `"${data}"`;   // Wrap in quotes if contains comma
//           return data;
//         });
//         csv.push(rowData.join(","));
//       });

//       csv.push(""); // Blank row between tables
//     });

//     const csvString = csv.join("\n");
//     const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
//     const link = document.createElement("a");
//     link.href = URL.createObjectURL(blob);
//     link.setAttribute("download", filename);
//     link.click();
//   };
















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
    <div className="row">
      <div className="col-12">

        {/* Page Title */}
        <h3 className="mb-4">Customer/Date wise Density of calls</h3>

        {/* Filter Card */}
        <div className="card mb-4 shadow-sm">
          <div className="card-body">
            <div className="row g-4 align-items-end">

              <div className="col-md-2">
                <label className="form-label">Select</label>
                <select
                  className="form-control"
                  value={filters.type}
                  onChange={(e) => handleChange("type", e.target.value)}
                >
                  <option value="">Select</option>
                  <option value="ALL">All</option>
                  <option value="0">Dedicated</option>
                  <option value="1">Shared</option>
                </select>
              </div>

              {/* ✅ DYNAMIC CLIENT DROPDOWN */}
              <div className="col-md-2">
                <label className="form-label">Select Client</label>
                <select
                  className="form-control"
                  value={filters.client}
                  onChange={(e) => handleChange("client", e.target.value)}
                >
                  <option value="">Select Client</option>
                  {clients.map((c) => (
                    <option key={c.company_id} value={c.company_id}>
                      {c.company_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-md-2">
                <label className="form-label">Client Category</label>
                <select
                  className="form-control"
                  value={filters.clientCategory}
                  onChange={(e) =>
                    handleChange("clientCategory", e.target.value)
                  }
                >
                  <option value="">Client Category</option>
                  <option value="All">All</option>

                  {clientCategories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-md-2">
                <label className="form-label">Select Type</label>
                <select
                  className="form-control"
                  value={filters.selectType}
                  onChange={(e) =>
                    handleChange("selectType", e.target.value)
                  }
                >
                  <option value="">Select Type</option>
                  <option value="All">All</option>
                  <option value="Offered">Offered</option>
                  <option value="Answered">Answered</option>
                  <option value="Abandon">Abandon</option>
                  <option value="Manpower">Manpower</option>
                </select>
              </div>

              <div className="col-md-2">
                <label className="form-label">From Date</label>
                <DatePicker
                  selected={filters.startDate}
                  onChange={(date) =>
                    handleChange("startDate", date)
                  }
                  className="form-control"
                  placeholderText="dd-mm-yyyy"
                  dateFormat="dd-MM-yyyy"
                />
              </div>

              <div className="col-md-2">
                <label className="form-label">To Date</label>
                <DatePicker
                  selected={filters.endDate}
                  onChange={(date) =>
                    handleChange("endDate", date)
                  }
                  className="form-control"
                  placeholderText="dd-mm-yyyy"
                  dateFormat="dd-MM-yyyy"
                />
              </div>

              <div className="col-md-2">
                <label className="form-label">Client Wise</label>
                <select
                  className="form-control"
                  value={viewMode}
                  onChange={(e) => {
                    setViewMode(e.target.value);
                    setReportData(null);
                  }}
                >
                  <option value="">Select Type</option>
                  <option value="Client Wise">Client Wise</option>
                  <option value="Date Wise">Date Wise</option>
                </select>
              </div>

              {/* Buttons */}
              <div className="col-12">
                <div className="d-flex justify-content-center gap-3 mt-3">
                  <button
                    className="btn btn-primary px-4"
                    onClick={() => handleAction("VIEW")}
                  >
                    VIEW
                  </button>

                  <button
                    className="btn btn-secondary px-4"
                    onClick={() => handleAction("EXPORT")}
                  >
                    EXPORT
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>
          {/* ===================== REPORT TABLES ===================== */}
          {!loading && reportData && (
            <>
              {/* ===================== DATE WISE ===================== */}
              {viewMode === "Date Wise" && (
                <>
                  {filters.selectType === "All" || filters.selectType === "" ? (
                    <>
                      {renderDateWiseSlotTable("ANSWERED")}
                      {renderDateWiseSlotTable("OFFERED")}
                      {renderDateWiseSlotTable("ABANDON")}

                      {renderDateWisePercentageTable("ANSWERED%")}
                      {renderDateWisePercentageTable("ABANDON%")}
                    </>
                  ) : filters.selectType === "Answered" ? (
                    <>
                      {renderDateWiseSlotTable("ANSWERED")}
                      {renderDateWisePercentageTable("ANSWERED%")}
                    </>
                  ) : filters.selectType === "Offered" ? (
                    renderDateWiseSlotTable("OFFERED")
                  ) : filters.selectType === "Abandon" ? (
                    <>
                      {renderDateWiseSlotTable("ABANDON")}
                      {renderDateWisePercentageTable("ABANDON%")}
                    </>
                  ) : filters.selectType === "Manpower" ? (
                    <p className="text-center">Empty Manpower</p>
                  ) : null}
                </>
              )}

              {/* ===================== CLIENT WISE ===================== */}
              {viewMode !== "Date Wise" && (
                <>
              {filters.selectType === "All" || filters.selectType === "" ? (
                <>
                  {renderSlotTable("ANSWERED")}
                  {renderSlotTable("OFFERED")}
                  {renderSlotTable("ABANDON")}

                  {renderPercentageTable("ANSWERED%")}
                  {renderPercentageTable("ABANDON%")}
                </>
              ) : filters.selectType === "Answered" ? (
                <>
                {renderSlotTable("ANSWERED")}
                {renderPercentageTable("ANSWERED%")}
                </>
              ) : filters.selectType === "Offered" ? (
                renderSlotTable("OFFERED")
              ) : filters.selectType === "Abandon" ? (
                <>
                {renderSlotTable("ABANDON")} 
                {renderPercentageTable("ABANDON%")}
                </>
              ) : filters.selectType === "Manpower" ? (
                <p> Empty Manpower</p>
                // renderSlotTable("MANPOWER") // implement mode MANPOWER if needed
              ) : null}
            </>
          )}
        </>
      )}
      </div>
    </div>
    </div>
    </>
  );
}
