// components/OutCallDetails.js
import React, { useState, useEffect } from "react";
import {
  getOutCallDetails,
  getCampaignTypes,
  getCampaigns,
  getAllocations,
  getScenarios,
} from "../services/authService";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import "../styles/loader.css";

export default function OutCallDetails() {
  const company_id = localStorage.getItem("company_id");
  const today = new Date().toISOString().split("T")[0];

  const [form, setForm] = useState({
    campaignType: "",
    campaign: "",
    allocation: "",
    scenario: "",
    subScenario1: "",
    subScenario2: "",
    subScenario3: "",
    msisdn: "",
    startDate: today,  // ✅ default to today
    endDate: today,
  });

  const [types, setTypes] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [allocs, setAllocs] = useState([]);
  const [scenarioOptions, setScenarioOptions] = useState([]);
  const [sub1Options, setSub1Options] = useState([]);
  const [sub2Options, setSub2Options] = useState([]);
  const [sub3Options, setSub3Options] = useState([]);
  const [tableData, setTableData] = useState([]);
  const [counts, setCounts] = useState({});
  const [breadcrumb, setBreadcrumb] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dateError, setDateError] = useState("");
  const [selectedRow, setSelectedRow] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [searchTriggered, setSearchTriggered] = useState(false);

  const SCENARIO_KEYS = [
    "scenario",
    "subScenario1",
    "subScenario2",
    "subScenario3",
  ];

  useEffect(() => {
    if (!company_id) return;
    (async () => {
      const t = await getCampaignTypes(company_id);
      setTypes(t || []);
    })();
  }, [company_id]);

  const updateForm = (name, value) =>
    setForm((prev) => ({ ...prev, [name]: value }));

  const handleChange = async (e) => {
    const { name, value } = e.target;
    updateForm(name, value);

    try {
      if (name === "campaignType") {
        setCampaigns([]);
        updateForm("campaign", "");
        if (value) {
          const c = await getCampaigns(company_id, value);
          setCampaigns(c || []);
        }
      }

      if (name === "campaign") {
        setAllocs([]);
        updateForm("allocation", "");
        if (value) {
          const allocRes = await getAllocations(company_id, value);
          setAllocs(allocRes || []);

          const scenarioRes = await getScenarios(company_id, null, 1);
          const sub1Res = await getScenarios(company_id, null, 2);
          const sub2Res = await getScenarios(company_id, null, 3);
          const sub3Res = await getScenarios(company_id, null, 4);

          setScenarioOptions(scenarioRes || []);
          setSub1Options(sub1Res || []);
          setSub2Options(sub2Res || []);
          setSub3Options(sub3Res || []);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  // --- Function to calculate counts ---
  const calculateCounts = (data) => {
    const result = { total: data.length };
    SCENARIO_KEYS.forEach((key) => {
      const group = {};
      data.forEach((row) => {
        const val = row[key] || "N/A";
        group[val] = (group[val] || 0) + 1;
      });
      result[key] = Object.entries(group).map(([name, total]) => ({
        name,
        total,
      }));
    });
    return result;
  };

  // const handleView = async (e) => {
  //   e?.preventDefault();
  //   if (!company_id) return;

  //   if (!form.startDate || !form.endDate) {
  //     setDateError("Please select both Start Date and End Date.");
  //     setTableData([]);
  //     setCounts({});
  //     setBreadcrumb([]);
  //     return;
  //   }
  //   if (new Date(form.startDate) > new Date(form.endDate)) {
  //     setDateError("Start Date cannot be after End Date.");
  //     setTableData([]);
  //     setCounts({});
  //     setBreadcrumb([]);
  //     return;
  //   }
  //   setDateError("");

  //   const filters = Object.fromEntries(
  //     Object.entries(form).filter(
  //       ([_, value]) => value !== "" && value !== null && value !== undefined
  //     )
  //   );

  //   setLoading(true);
  //   try {
  //     const res = await getOutCallDetails(company_id, filters);
  //     setTableData(res.data || []);
  //     setCounts(calculateCounts(res.data || []));
  //     setBreadcrumb(res.breadcrumb || []);
  //     setCurrentPage(1);
  //   } catch (err) {
  //     console.error(err);
  //     setTableData([]);
  //     setCounts({});
  //     setBreadcrumb([]);
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  const handleView = async (e) => {
  e?.preventDefault();
  if (!company_id) return;

  if (!form.startDate || !form.endDate) {
    setDateError("Please select both Start Date and End Date.");
    setTableData([]);
    setCounts({});
    setBreadcrumb([]);
    return;
  }
  if (new Date(form.startDate) > new Date(form.endDate)) {
    setDateError("Start Date cannot be after End Date.");
    setTableData([]);
    setCounts({});
    setBreadcrumb([]);
    return;
  }
  setDateError("");

  const filters = Object.fromEntries(
    Object.entries(form).filter(
      ([_, value]) => value !== "" && value !== null && value !== undefined
    )
  );

  setLoading(true);
  try {
    const res = await getOutCallDetails(company_id, filters);
    setTableData(res.data || []);
    setCounts(calculateCounts(res.data || []));
    setBreadcrumb(res.breadcrumb || []);
    setCurrentPage(1);

    // ✅ mark that a search has been triggered
    setSearchTriggered(true);
  } catch (err) {
    console.error(err);
    setTableData([]);
    setCounts({});
    setBreadcrumb([]);
  } finally {
    setLoading(false);
  }
};


  // --- Excel Export ---
  // const handleExport = async () => {
  //   if (!form.startDate || !form.endDate) return alert("Please select Start Date and End Date.");

  //   setLoading(true);
  //   try {
  //     const filters = Object.fromEntries(
  //       Object.entries(form).filter(([_, value]) => value !== "" && value !== null && value !== undefined)
  //     );
  //     const res = await getOutCallDetails(company_id, filters);
  //     const data = res.data || [];
  //     if (!data.length) return alert("No data available for the selected filters.");

  //     const countsExport = calculateCounts(data);

  //     const workbook = XLSX.utils.book_new();

  //     // --- Sheet1: Raw Data ---
  //     const sheet1 = XLSX.utils.json_to_sheet(data);
  //     XLSX.utils.book_append_sheet(workbook, sheet1, "Raw Data");

  //     // --- Sheet2: Counts ---
  //     let countsData = [];
  //     let merges = [];
  //     let rowIndex = 0;

  //     countsData.push([`Report: Out Call Details`]);
  //     merges.push({ s: { r: rowIndex, c: 0 }, e: { r: rowIndex, c: 1 } });
  //     rowIndex++;

  //     countsData.push([`Start Date: ${form.startDate}`, `End Date: ${form.endDate}`]);
  //     merges.push({ s: { r: rowIndex, c: 0 }, e: { r: rowIndex, c: 1 } });
  //     rowIndex++;
  //     countsData.push([]);
  //     rowIndex++;

  //     SCENARIO_KEYS.forEach((key) => {
  //       if (countsExport[key]?.length) {
  //         countsData.push([`${key.toUpperCase()} COUNTS`]);
  //         merges.push({ s: { r: rowIndex, c: 0 }, e: { r: rowIndex, c: 1 } });
  //         rowIndex++;
  //         countsData.push(["Name", "Total"]);
  //         rowIndex++;
  //         countsExport[key].forEach((c) => countsData.push([c.name, c.total]));
  //         rowIndex += countsExport[key].length;
  //         countsData.push([]);
  //         rowIndex++;
  //       }
  //     });

  //     if (countsExport.total) countsData.push(["Grand Total", countsExport.total]);

  //     const sheet2 = XLSX.utils.aoa_to_sheet(countsData);
  //     sheet2["!merges"] = merges;
  //     XLSX.utils.book_append_sheet(workbook, sheet2, "Counts");

  //     // --- Sheet3: Filters / Breadcrumb ---
  //     if (res.breadcrumb?.length) {
  //       let filtersData = [["Level", "Value"]];
  //       res.breadcrumb.forEach((b) => filtersData.push([b.level, b.value]));
  //       const sheet3 = XLSX.utils.aoa_to_sheet(filtersData);
  //       XLSX.utils.book_append_sheet(workbook, sheet3, "Filters");
  //     }

  //     const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  //     saveAs(new Blob([excelBuffer], { type: "application/octet-stream" }), "out_call_details.xlsx");
  //   } catch (err) {
  //     console.error(err);
  //     alert("Error exporting Excel.");
  //   } finally {
  //     setLoading(false);
  //   }
  // };


const handleExport = async () => {
  const Username = localStorage.getItem("username"); // ✅ get username
  const ClientId = company_id || "Unknown Client";   // ✅ get client ID
  if (!form.startDate || !form.endDate) {
    return alert("Please select Start Date and End Date.");
  }

  setLoading(true);

  try {
    // -----------------------------
    // 1️⃣ Prepare filters
    // -----------------------------
    const filters = Object.fromEntries(
      Object.entries(form).filter(
        ([_, value]) => value !== "" && value !== null && value !== undefined
      )
    );

    // -----------------------------
    // 2️⃣ Fetch main outcall details
    // -----------------------------
    const res = await getOutCallDetails(company_id, filters);
    const data = Array.isArray(res?.data) ? res.data : [];
    if (!data.length) {
      return alert("No data available for selected filters.");
    }

    // -----------------------------
    // 3️⃣ Calculate counts
    // -----------------------------
    const countsExport = calculateCounts(data) || {};
    const workbook = XLSX.utils.book_new();

    // -----------------------------
    // 4️⃣ Sheet 1: Raw Data
    // -----------------------------
    const rawSheet = XLSX.utils.json_to_sheet([]);
    XLSX.utils.sheet_add_aoa(
      rawSheet,
      [
        ["Out Call Details Report"],
        [`Client: ${Username}`],
        [`Client ID: ${ClientId}`],                // ✅ client ID here
        [`Start Date: ${form.startDate}`, `End Date: ${form.endDate}`],
        [],
      ],
      { origin: 0 }
    );
    XLSX.utils.sheet_add_json(rawSheet, data, { origin: -1, skipHeader: false });
    XLSX.utils.book_append_sheet(workbook, rawSheet, "Raw Data");

    // -----------------------------
    // 5️⃣ Sheet 2: Counts
    // -----------------------------
    const countsData = [];
    const merges = [];
    let rowIndex = 0;

    countsData.push(["Out Call Details Report"]);
    merges.push({ s: { r: rowIndex, c: 0 }, e: { r: rowIndex, c: 1 } });
    rowIndex++;

    countsData.push([`Client: ${Username}`]);
    rowIndex++;

    countsData.push([`Client ID: ${ClientId}`]);        // ✅ client ID here
    rowIndex++;

    countsData.push([`Start Date: ${form.startDate}`, `End Date: ${form.endDate}`]);
    rowIndex++;

    countsData.push([]);
    rowIndex++;

    const scenarioKeys = Array.isArray(SCENARIO_KEYS) ? SCENARIO_KEYS : Object.keys(countsExport);

    scenarioKeys.forEach((key) => {
      if (countsExport[key]?.length) {
        countsData.push([`${key.toUpperCase()} COUNTS`]);
        merges.push({ s: { r: rowIndex, c: 0 }, e: { r: rowIndex, c: 1 } });
        rowIndex++;

        countsData.push(["Name", "Total"]);
        rowIndex++;

        countsExport[key].forEach((c) => {
          countsData.push([c.name || "-", c.total || 0]);
          rowIndex++;
        });

        countsData.push([]);
        rowIndex++;
      }
    });

    if (countsExport.total != null) countsData.push(["Grand Total", countsExport.total]);

    const sheet2 = XLSX.utils.aoa_to_sheet(countsData);
    sheet2["!merges"] = merges;
    XLSX.utils.book_append_sheet(workbook, sheet2, "Counts");

    // -----------------------------
    // 6️⃣ Sheet 3: Filters
    // -----------------------------
    // const filtersData = [["Level", "Value"]];
    // if (Array.isArray(res?.breadcrumb)) {
    //   res.breadcrumb.forEach((b) =>
    //     filtersData.push([b.level || "-", b.value || "-"])
    //   );
    // }

    // filtersData.push(["User", Username]);
    // filtersData.push(["Client ID", ClientId]);          // ✅ client ID here
    // filtersData.push(["Start Date", form.startDate]);
    // filtersData.push(["End Date", form.endDate]);

    // const sheet3 = XLSX.utils.aoa_to_sheet(filtersData);
    // XLSX.utils.book_append_sheet(workbook, sheet3, "Filters");

    // -----------------------------
    // 7️⃣ Save Excel
    // -----------------------------
    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    });
    saveAs(
      new Blob([excelBuffer], { type: "application/octet-stream" }),
      "out_call_details.xlsx"
    );

  } catch (err) {
    console.error("Export error:", err);
    alert("Error exporting Excel. Please try again.");
  } finally {
    setLoading(false);
  }
};



  const filteredRows =
    isModalOpen && selectedRow
      ? tableData.filter((row) => row.id !== selectedRow.id)
      : tableData;

  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;
  const visibleRows = filteredRows.slice(indexOfFirstRow, indexOfLastRow);
  const totalPages = Math.ceil(filteredRows.length / rowsPerPage); // ✅ use filteredRows

  return (
    <div className={`priority-wrapper ${loading ? "blurred" : ""}`}>
      {loading && (
        <div className="loader-overlay">
          <div className="bar" />
          <div className="bar" />
          <div className="bar" />
        </div>
      )}

      <div className="card p-4">
        <h5 className="mb-4">Out Call Details</h5>

        <form onSubmit={handleView}>
          {/* --- Dropdowns / Inputs --- */}
          <div className="row mb-3">
            {[
              {
                name: "campaignType",
                label: "Campaign Type",
                options: types,
                disabled: false,
              },
              {
                name: "campaign",
                label: "Campaign",
                options: campaigns,
                disabled: !form.campaignType,
              },
              {
                name: "allocation",
                label: "Allocation",
                options: allocs,
                disabled: !form.campaign,
              },
              {
                name: "scenario",
                label: "Scenario",
                options: scenarioOptions,
                disabled: false,
              },
            ].map((f) => (
              <div className="col-md-3 mb-2" key={f.name}>
                <select
                  className="form-select"
                  name={f.name}
                  value={form[f.name]}
                  onChange={handleChange}
                  disabled={f.disabled}
                >
                  <option value="">Select {f.label}</option>
                  {f.options.length > 0 ? (
                    f.options.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name}
                      </option>
                    ))
                  ) : (
                    <option disabled>No {f.label} available</option>
                  )}
                </select>
              </div>
            ))}
          </div>

          <div className="row mb-3">
            {[
              {
                name: "subScenario1",
                label: "Sub Scenario 1",
                options: sub1Options,
              },
              {
                name: "subScenario2",
                label: "Sub Scenario 2",
                options: sub2Options,
              },
              {
                name: "subScenario3",
                label: "Sub Scenario 3",
                options: sub3Options,
              },
              { name: "msisdn", label: "MSISDN", options: null },
            ].map((f) => (
              <div className="col-md-3 mb-2" key={f.name}>
                {f.options ? (
                  <select
                    className="form-select"
                    name={f.name}
                    value={form[f.name]}
                    onChange={handleChange}
                  >
                    <option value="">Select {f.label}</option>
                    {f.options.length > 0 ? (
                      f.options.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.name}
                        </option>
                      ))
                    ) : (
                      <option disabled>No {f.label} available</option>
                    )}
                  </select>
                ) : (
                  <input
                    type="text"
                    className="form-control"
                    placeholder={f.label}
                    name={f.name}
                    value={form[f.name]}
                    onChange={handleChange}
                  />
                )}
              </div>
            ))}
          </div>

          <div className="row mb-3">
            <div className="col-md-3 mb-2">
              <input
                type="date"
                className="form-control"
                name="startDate"
                value={form.startDate}
                onChange={handleChange}
              />
            </div>
            <div className="col-md-3 mb-2">
              <input
                type="date"
                className="form-control"
                name="endDate"
                value={form.endDate}
                onChange={handleChange}
              />
            </div>
            <div className="col-md-6 mb-2 d-flex gap-2">
              <button className="btn btn-primary" type="submit">
                View
              </button>
              <button
                className="btn btn-success"
                type="button"
                onClick={handleExport}
              >
                Export
              </button>
            </div>
          </div>
          {dateError && <p className="text-danger small">{dateError}</p>}
        </form>

        {/* --- UI Counts --- */}
        {tableData.length > 0 && counts && (
          <div className="card mt-3 p-3">
            <h6 className="mb-3">Counts</h6>
            <table className="table table-bordered table-sm">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {SCENARIO_KEYS.map((key) =>
                  counts[key] ? (
                    <React.Fragment key={key}>
                      <tr className="table-secondary">
                        <td colSpan={2} className="fw-bold text-capitalize">
                          {key}
                        </td>
                      </tr>
                      {counts[key].map((c, i) => (
                        <tr key={i}>
                          <td>{c.name}</td>
                          <td>{c.total}</td>
                        </tr>
                      ))}
                    </React.Fragment>
                  ) : null
                )}
                {counts.total && (
                  <tr className="table-dark">
                    <td className="fw-bold">Grand Total</td>
                    <td className="fw-bold">{counts.total}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
{/* --- Table + Pagination / Modal --- */}
{!loading && (
  <>
    {/* --- Table --- */}
    {!isModalOpen && (
      <>
        {tableData.length > 0 ? (
          <>
            {/* --- Table Controls (rows per page, pagination) --- */}
            <div className="d-flex justify-content-between align-items-center mt-3 mb-3 flex-wrap">
              <div>
                Show{" "}
                <select
                  value={rowsPerPage}
                  onChange={(e) => {
                    setRowsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="form-select d-inline-block"
                  style={{ width: "auto" }}
                >
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>{" "}
                entries
              </div>
              <div>
                Page {currentPage} of {totalPages}
              </div>
            </div>

            {/* --- Table Data --- */}
            <div
              className="table-responsive"
              style={{ maxHeight: "500px", overflow: "auto" }}
            >
              <table className="table table-bordered table-striped table-hover table-sm">
                <thead className="table-light">
                  <tr>
                    <th>View</th>
                    <th>Recording</th>
                    <th>Out Call ID</th>
                    <th>Campaign Type</th>
                    <th>Campaign Name</th>
                    <th>Allocation Name</th>
                    <th>Scenarios</th>
                    <th>Sub Scenarios 1</th>
                    <th>Call Date</th>
                    <th>Contact Number</th>
                    <th>Call Created</th>
                  </tr>
                </thead>
                <tbody>
                  {tableData
                    .slice(indexOfFirstRow, indexOfLastRow)
                    .map((row, idx) => (
                      <tr key={idx}>
                        <td>
                          <button
                            className="btn btn-sm btn-primary"
                            onClick={() => {
                              setSelectedRow(row);
                              setIsModalOpen(true);
                            }}
                          >
                            View
                          </button>
                        </td>
                        <td>
                          <button className="btn btn-sm btn-outline-secondary">
                            ⏬
                          </button>
                        </td>
                        <td>{row.id}</td>
                        <td>{row.campaignType}</td>
                        <td>{row.campaignName}</td>
                        <td>{row.allocationName}</td>
                        <td>{row.scenario}</td>
                        <td>{row.subScenario1}</td>
                        <td>{new Date(row.CallDate).toLocaleString()}</td>
                        <td>{row.contactNumber}</td>
                        <td>{row.callcreated}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            {/* --- Pagination --- */}
            <div className="d-flex justify-content-between align-items-center mt-2 flex-wrap">
              <button
                className="btn btn-sm btn-outline-secondary mb-2"
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
              >
                ◀ Prev
              </button>
              <span className="mb-2">
                {indexOfFirstRow + 1} -{" "}
                {Math.min(indexOfLastRow, tableData.length)} of {tableData.length}
              </span>
              <button
                className="btn btn-sm btn-outline-secondary mb-2"
                onClick={() =>
                  setCurrentPage((p) => Math.min(p + 1, totalPages))
                }
                disabled={currentPage === totalPages}
              >
                Next ▶
              </button>
            </div>
          </>
        ) : (
          // ✅ Show only when search/filter yields no results
          searchTriggered && (
            <div className="text-center py-10 text-gray-500 font-semibold">
              No data available for the selected date.
            </div>
          )
        )}
      </>
    )}

    {/* --- Modal --- */}
    {isModalOpen && selectedRow && (
      <div
        className="relative bg-white rounded-2xl shadow-2xl mx-auto p-6 md:p-8 animate-fadeIn"
        style={{ width: "700px", maxHeight: "500px", overflow: "auto" }}
      >
        {/* Background overlay */}
        <div
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={() => {
            setSelectedRow(null);
            setIsModalOpen(false);
          }}
        ></div>

        {/* Modal container */}
        <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl mx-auto p-6 md:p-8 animate-fadeIn">
          {/* Header + Close */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl md:text-xl font-bold text-indigo-700 flex items-center gap-2">
              Out Call Details
            </h2>
          </div>

          {/* Row data */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {Object.entries(selectedRow).map(([key, val]) => (
              <div
                key={key}
                className="p-4 border rounded-xl bg-gradient-to-r from-gray-50 to-gray-100 shadow-sm hover:shadow-md transition flex flex-col"
              >
                <span className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
                  {key}
                </span>
                <span className="text-lg font-medium mt-1 text-gray-800 break-words">
                  {val || "-"}
                </span>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="mt-6 flex justify-center">
            <button
              onClick={() => {
                setSelectedRow(null);
                setIsModalOpen(false);
              }}
              className="px-5 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 transition"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    )}
  </>
)}

      </div>
    </div>
  );
}
