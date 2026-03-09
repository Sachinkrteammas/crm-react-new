import React, { useState, useEffect } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { format } from "date-fns";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import api from "../api";
import { useNavigate } from "react-router-dom";

const CorrectiveReport = () => {
  const userType = localStorage.getItem("user_type");
  const companyId = localStorage.getItem("company_id");

  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState(companyId);
  const [companyName, setCompanyName] = useState("");

  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);

  const [reportData, setReportData] = useState([]);
  const [grandTotals, setGrandTotals] = useState({ total: 0, open: 0, close: 0 });

  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const activeClientId =
    userType === "Super-Admin" || userType === "Admin"
      ? selectedClient
      : companyId;

  // Fetch client list for admin/super-admin
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
        .catch((err) => console.error("Error fetching clients:", err));
    }
  }, []);

  // Auto-set client for non-admin
  useEffect(() => {
    if (!(userType === "Super-Admin" || userType === "Admin")) {
      setSelectedClient(companyId);
    }
  }, []);

  // ---------------------------
  // 🔍 FETCH CORRECTIVE REPORT
  // ---------------------------
  const handleView = async () => {
  if (!activeClientId || activeClientId === "null") {
    alert("Please select a client.");
    return;
  }

  if (!startDate || !endDate) {
    alert("Please select start and end date.");
    return;
  }

  // find selected company name
  let selectedCompanyName = "";

  if (userType === "Super-Admin" || userType === "Admin") {
    const clientObj = clients.find(
      (c) => String(c.company_id) === String(activeClientId)
    );
    selectedCompanyName = clientObj?.company_name || "";
  } else {
    selectedCompanyName = localStorage.getItem("company_name") || "";
  }

  setCompanyName(selectedCompanyName);

  setLoading(true);
  try {
    const formattedStart = format(startDate, "yyyy-MM-dd");
    const formattedEnd = format(endDate, "yyyy-MM-dd");

    const response = await api.post("/corrective_report", {
      client_id: parseInt(activeClientId),
      start_date: formattedStart,
      end_date: formattedEnd,
    });

    const apiData = response.data;

    // 🔥 Transform API → Table Structure
    const transformed = Object.entries(apiData.data || {}).map(
      ([categoryName, categoryData]) => ({
        category: categoryName,
        phases: Object.entries(categoryData.phases).map(
          ([phaseName, values]) => ({
            phase: phaseName,
            open: values.open,
            close: values.close,
            total: values.total,
          })
        ),
        category_total: categoryData.category_total,
      })
    );

    setReportData(transformed);
    setGrandTotals(apiData.grand_total);

  } catch (err) {
    console.error("Error fetching Corrective Report:", err);
    alert("Failed to fetch report.");
  } finally {
    setLoading(false);
  }
};
  // const handleView = async () => {
  //   if (!activeClientId) {
  //     alert("Please select a client.");
  //     return;
  //   }

  //   if (!startDate || !endDate) {
  //     alert("Please select start and end date.");
  //     return;
  //   }

  //   setLoading(true);
  //   try {
  //     const formattedStart = format(startDate, "yyyy-MM-dd");
  //     const formattedEnd = format(endDate, "yyyy-MM-dd");

  //     const response = await api.post("/corrective_report", {
  //       client_id: parseInt(activeClientId),
  //       start_date: formattedStart,
  //       end_date: formattedEnd,
  //     });

  //     const data = response.data;

  //     // Transform API response into table-friendly structure
  //     const transformedData = Object.entries(data.data || {}).map(
  //       ([site, categories]) => ({
  //         site: site || " ",
  //         corrections: Object.entries(categories).map(([categoryName, details]) => ({
  //           category: categoryName,
  //           total: details.open + details.close,
  //           open: details.open,
  //           close: details.close,
  //           // remarks: details.data?.Field14 || "-",
  //         })),
  //       })
  //     );

  //     const totals = transformedData.reduce(
  //       (acc, site) => {
  //         site.corrections.forEach((c) => {
  //           acc.total += c.total;
  //           acc.open += c.open;
  //           acc.close += c.close;
  //         });
  //         return acc;
  //       },
  //       { total: 0, open: 0, close: 0 }
  //     );

  //     setReportData(transformedData);
  //     setGrandTotals(totals);
  //   } catch (err) {
  //     console.error("Error fetching Corrective Report:", err);
  //     alert("Failed to fetch report.");
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  // ---------------------------
  // 📤 EXPORT REPORT
  // ---------------------------
  const handleExport = async () => {
  if (!activeClientId || activeClientId === "null") {
    alert("Please select a client.");
    return;
  }

  if (!startDate || !endDate) {
    alert("Please select start and end date.");
    return;
  }

  setLoading(true);

  try {
    const formattedStart = format(startDate, "yyyy-MM-dd");
    const formattedEnd = format(endDate, "yyyy-MM-dd");

    // 🔹 If report not loaded, fetch it
    let exportData = reportData;
    let exportTotals = grandTotals;

    if (exportData.length === 0) {
      const response = await api.post("/corrective_report", {
        client_id: parseInt(activeClientId),
        start_date: formattedStart,
        end_date: formattedEnd,
      });

      const apiData = response.data;

      exportData = Object.entries(apiData.data || {}).map(
        ([categoryName, categoryData]) => ({
          category: categoryName,
          phases: Object.entries(categoryData.phases).map(
            ([phaseName, values]) => ({
              phase: phaseName,
              open: values.open,
              close: values.close,
              total: values.total,
            })
          ),
          category_total: categoryData.category_total,
        })
      );

      exportTotals = apiData.grand_total;
    }

    const flattenedData = [];

    exportData.forEach((cat) => {

      cat.phases.forEach((phase, i) => {
        flattenedData.push({
          Category: i === 0 ? (cat.category !== "null" ? cat.category : "") : "",
          Phase: phase.phase !== "null" ? phase.phase : "",
          "Total Tickets": phase.total,
          Open: phase.open !== 0 ? phase.open : "",
          Close: phase.close,
          "Ticket Closure %": ""
        });
      });

      flattenedData.push({
        Category: "",
        Phase: "Total",
        "Total Tickets": cat.category_total.total,
        Open: cat.category_total.open,
        Close: cat.category_total.close,
         "Ticket Closure %": cat.category_total.close
          ? ((cat.category_total.close / cat.category_total.total).toFixed(2) * 100) + " %"
          : "0.0 %",
      });
    });

    flattenedData.push({
      Category: "",
      Phase: "GRAND TOTAL",
      "Total Tickets": exportTotals.total,
      Open: exportTotals.open,
      Close: exportTotals.close,
      "Ticket Closure %": exportTotals.close
        ? ((exportTotals.close / exportTotals.total).toFixed(2) * 100) + " %"
        : "0.0 %",
    });

    const worksheet = XLSX.utils.json_to_sheet(flattenedData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Corrective Report");

    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    });

    // 🔹 Company Name
    let selectedCompanyName = companyName;

    if (!selectedCompanyName) {
      if (userType === "Super-Admin" || userType === "Admin") {
        const clientObj = clients.find(
          (c) => String(c.company_id) === String(activeClientId)
        );
        selectedCompanyName = clientObj?.company_name || "report";
      } else {
        selectedCompanyName = localStorage.getItem("company_name") || "report";
      }
    }

    const fileName = `${selectedCompanyName}_corrective_report_${format(
      startDate,
      "dd-MM-yyyy"
    )}_to_${format(endDate, "dd-MM-yyyy")}.xlsx`;

    saveAs(
      new Blob([excelBuffer], { type: "application/octet-stream" }),
      fileName
    );

  } catch (err) {
    console.error("Export failed:", err);
    alert("Failed to export report.");
  } finally {
    setLoading(false);
  }
};

//   const handleExport = () => {
//   if (reportData.length === 0) {
//     alert("No data to export.");
//     return;
//   }

//   const flattenedData = [];

//   reportData.forEach((site) => {
//     site.corrections.forEach((corr, i) => {
//       flattenedData.push({
//         Site: i === 0 ? (site.site != "null" ? site.site : "") : "",
//         Category: corr.category != "null" ? corr.category : "",
//         "Total Corrections": corr.total,
//         Open: corr.open != 0 ? corr.open : "",
//         Close: corr.close,
//         // Remarks: corr.close ? (corr.total / corr.close).toFixed(2) : "0.00",
//       });
//     });

//     // Per-site total row
//     const siteTotal = {
//       Site: "",
//       Category: "Total",
//       "Total Corrections": site.corrections.reduce((sum, c) => sum + c.total, 0),
//       Open: site.corrections.reduce((sum, c) => sum + c.open, 0),
//       Close: site.corrections.reduce((sum, c) => sum + c.close, 0),
//       Remarks: (() => {
//         const totalClose = site.corrections.reduce((sum, c) => sum + c.close, 0);
//         const totalCorr = site.corrections.reduce((sum, c) => sum + c.total, 0);
//         return totalClose ? ( totalClose / totalCorr ).toFixed(2) : "0.00";
//       })(),
//     };
//     flattenedData.push(siteTotal);
//   });

//   // Grand total row
//   flattenedData.push({
//     Site: "",
//     Category: "GRAND TOTAL",
//     "Total Corrections": grandTotals.total,
//     Open: grandTotals.open,
//     Close: grandTotals.close,
//     Remarks: grandTotals.close ? ( grandTotals.close / grandTotals.total ).toFixed(2) : "0.00",
//   });

//   const worksheet = XLSX.utils.json_to_sheet(flattenedData);

//   // Highlight Grand Total row in yellow
//   const grandTotalRow = flattenedData.length; // last row
//   for (let col = 0; col < 6; col++) {
//     const cell = worksheet[XLSX.utils.encode_cell({ r: grandTotalRow - 1, c: col })];
//     if (cell) {
//       cell.s = {
//         fill: { fgColor: { rgb: "FFFF00" } }, // yellow
//         font: { bold: true },
//       };
//     }
//   }

//   const workbook = XLSX.utils.book_new();
//   XLSX.utils.book_append_sheet(workbook, worksheet, "Corrective Report");

//   // Apply simple styling (bold headers)
//   const headerRange = XLSX.utils.decode_range(worksheet['!ref']);
//   for (let C = headerRange.s.c; C <= headerRange.e.c; ++C) {
//     const cell = worksheet[XLSX.utils.encode_cell({ r: 0, c: C })];
//     if (cell) {
//       cell.s = { font: { bold: true } };
//     }
//   }

//   const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
//   saveAs(new Blob([excelBuffer], { type: "application/octet-stream" }), "corrective_report.xlsx");
// };



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
        {/* Top Filter Card */}
        <div className="card p-4 mb-4">
          <h5 className="mb-3">Corrective Report</h5>

          <div className="d-flex flex-wrap align-items-center gap-3">
            {/* Client Select */}
            {(userType === "Super-Admin" || userType === "Admin") && (
              <div style={{ maxWidth: "220px" }}>
                <select
                  className="form-select"
                  value={selectedClient}
                  onChange={(e) => setSelectedClient(e.target.value)}
                >
                  <option value="">--Select Client--</option>
                  {clients.map((c) => (
                    <option key={c.company_id} value={c.company_id}>
                      {c.company_name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Start Date */}
            <div style={{ maxWidth: "220px" }}>
              <DatePicker
                selected={startDate}
                onChange={setStartDate}
                dateFormat="dd-MM-yyyy"
                placeholderText="Start Date"
                className="form-control"
              />
            </div>

            {/* End Date */}
            <div style={{ maxWidth: "220px" }}>
              <DatePicker
                selected={endDate}
                onChange={setEndDate}
                dateFormat="dd-MM-yyyy"
                placeholderText="End Date"
                className="form-control"
              />
            </div>

            {/* Buttons */}
            <button className="btn btn-primary fw-semibold" onClick={handleExport}>
              EXPORT
            </button>
            <button className="btn btn-primary fw-semibold" onClick={handleView}>
              VIEW
            </button>
            <button
              type="button"
              className="btn btn-outline-primary px-4 py-2 rounded-3"
              onClick={() => navigate(-1)}
            >
              ← Back
            </button>
          </div>
        </div>

        {/* Report Table */}
        {reportData.length > 0 && (
          <div className="card p-4">
            <h6 className="mb-3">View Report</h6>
            <div style={{ overflowX: "auto" }}>
              <table className="table table-bordered">
                <thead className="table-dark text-white">
                  <tr>
                    <th rowSpan={2} style={{ verticalAlign: "top" }}>CATEGORY</th>
                    <th rowSpan={2} style={{ verticalAlign: "top" }}>PHASE</th>
                    <th rowSpan={2} style={{ verticalAlign: "top" }}>TOTAL TICKETS</th>
                    <th colSpan={2} className="text-center">STATUS</th>
                    <th rowSpan={2} style={{ verticalAlign: "top" }}>TICKETS CLOSURE %</th>
                  </tr>
                  <tr className="bg-secondary text-white">
                    <th>OPEN</th>
                    <th>CLOSE</th>
                  </tr>
                </thead>
                <tbody>
                {reportData.map((cat, idx) => (
                  <React.Fragment key={idx}>
                    {cat.phases.map((phase, i) => (
                      <tr key={i}>
                        {i === 0 && (
                          <td rowSpan={cat.phases.length + 1}>
                            {cat.category !== "null" ? cat.category : ""}
                          </td>
                        )}
                        <td>{phase.phase}</td>
                        <td>{phase.total}</td>
                        <td>{phase.open !== 0 ? phase.open : ""}</td>
                        <td>{phase.close}</td>
                        <td></td>
                      </tr>
                    ))}

                    {/* Category Total Row */}
                    <tr className="fw-bold bg-light">
                      <td>Total</td>
                      <td>{cat.category_total.total}</td>
                      <td>{cat.category_total.open}</td>
                      <td>{cat.category_total.close}</td>
                      <td>
                        {cat.category_total.close
                          ? ((cat.category_total.close / cat.category_total.total).toFixed(2) * 100) + " %"
                          : "0.0 %"}
                      </td>
                    </tr>
                  </React.Fragment>
                ))}

                {/* GRAND TOTAL */}
                <tr className="fw-bold bg-warning">
                  <td colSpan={2}>GRAND TOTAL</td>
                  <td>{grandTotals.total}</td>
                  <td>{grandTotals.open}</td>
                  <td>{grandTotals.close}</td>
                  <td>
                    {grandTotals.close
                      ? ((grandTotals.close / grandTotals.total).toFixed(2) * 100)  + " %"
                      : "0.0 %"}
                  </td>
                </tr>
              </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
    </div>
    </>
  );
};

export default CorrectiveReport;
