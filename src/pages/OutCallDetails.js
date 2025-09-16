// import React, { useState, useEffect } from "react";
// import {
//   getCampaignTypes,
//   getCampaigns,
//   getAllocations,
//   getOutCallDetails
// } from '../services/authService';
// import * as XLSX from "xlsx";
// import { saveAs } from "file-saver";
// import "../styles/loader.css";

// export default function OutCallDetails() {
//   const [form, setForm] = useState({
//         campaignType: "",
//         campaign: "",
//         allocation: "",
//         scenario: "",
//         subScenario1: "",
//         subScenario2: "",
//         subScenario3: "",
//         msisdn: "",
//         startDate: "",
//         endDate: ""
//     });

//     const [types, setTypes] = useState([]);
//     const [campaigns, setCampaigns] = useState([]);
//     const [allocs, setAllocs] = useState([]);
//     const [data, setData] = useState([]);
//     const [loading, setLoading] = useState(false);
//     const [showTable, setShowTable] = useState(false);

//     const company_id = localStorage.getItem('company_id');

//     useEffect(() => {
//         if (company_id) {
//             getCampaignTypes(company_id)
//                 .then(res => setTypes(res.data))
//                 .catch(err => console.error(err));
//         }
//     }, [company_id]);

//     const handleChange = (e) => {
//         const { name, value } = e.target;
//         setForm((prev) => ({ ...prev, [name]: value }));

//         if (name === "campaignType") {
//             setCampaigns([]);
//             setAllocs([]);
//             if (value) {
//                 getCampaigns(company_id, value)
//                     .then(res => setCampaigns(res.data))
//                     .catch(err => console.error(err));
//             }
//         }
//         if (name === "campaign") {
//             setAllocs([]);
//             if (value) {
//                 getAllocations(company_id, value)
//                     .then(res => setAllocs(res.data))
//                     .catch(err => console.error(err));
//             }
//         }
//     };

//     const handleView = async (e) => {
//         e.preventDefault();

//         if (company_id) {
//             // Create a sanitized filter object without empty strings
//             const sanitizedFilters = {};
//             for (const key in form) {
//                 if (form[key] !== "") {
//                     sanitizedFilters[key] = form[key];
//                 }
//             }

//             setLoading(true);
//             try {
//                 const res = await getOutCallDetails(company_id, sanitizedFilters);
//                 setData(res);
//                 setShowTable(true);
//             } catch (err) {
//                 console.error(err);
//             } finally {
//                 setLoading(false);
//             }
//         }
//     };

//     const handleExport = (e) => {
//         e.preventDefault();
//         if (data.length === 0) {
//             alert("No data to export.");
//             return;
//         }

//           // Create a worksheet
//         const worksheet = XLSX.utils.json_to_sheet(data);

//           // Create a new workbook and append the worksheet
//         const workbook = XLSX.utils.book_new();
//         XLSX.utils.book_append_sheet(workbook, worksheet, "Report");

//           // Generate a buffer
//         const excelBuffer = XLSX.write(workbook, {
//             bookType: "xlsx",
//             type: "array",
//         });

//           // Save file
//         const file = new Blob([excelBuffer], {
//             type: "application/octet-stream",
//         });
//         saveAs(file, "out_call_details.xlsx");
//     };

//   return (
//   <>
//       {loading && (
//         <div className="loader-overlay">
//           <div className="bar"></div>
//           <div className="bar"></div>
//           <div className="bar"></div>
//           <div className="bar"></div>
//           <div className="bar"></div>
//         </div>
//       )}

//     <div className={`priority-wrapper ${loading ? "blurred" : ""}`}>
//     <div className="card p-4">
//       <h5 className="mb-4">Out Call Details</h5>
//       <form onSubmit={handleView}>
//       <div className="row mb-3">
//         <div className="col-md-3 mb-2">
//           <select
//               className="form-select"
//               name="campaignType"
//               value={form.campaignType}
//               onChange={handleChange}
//             >
//               <option value="">Select Campaign Type</option>
//               {Array.isArray(types) && types.map(t => (
//                 <option key={t.id} value={t.id}>{t.name}</option>
//               ))}
//             </select>
//         </div>
//         <div className="col-md-3 mb-2">
//           <select
//               className="form-select"
//               name="campaign"
//               value={form.campaign}
//               onChange={handleChange}
//               disabled={!campaigns.length}
//             >
//               <option value="">Select Campaign</option>
//               {campaigns.map(c => (
//                 <option key={c.id} value={c.id}>{c.name}</option>
//               ))}
//             </select>
//         </div>
//         <div className="col-md-3 mb-2">
//           <select
//               className="form-select"
//               name="allocation"
//               value={form.allocation}
//               onChange={handleChange}
//               disabled={!allocs.length}
//             >
//               <option value="">Select Allocation</option>
//               {allocs.map(a => (
//                 <option key={a.id} value={a.id}>{a.name}</option>
//               ))}
//             </select>
//         </div>
//         <div className="col-md-3 mb-2">
//           <input
//             type="text"
//             className="form-control"
//             placeholder="Select Scenario"
//             name="scenario"
//             value={form.scenario}
//             onChange={handleChange}
//           />
//         </div>
//       </div>

//       <div className="row mb-3">
//         <div className="col-md-3 mb-2">
//           <input
//             type="text"
//             className="form-control"
//             placeholder="Select Sub Scenario 1"
//             name="subScenario1"
//             value={form.subScenario1}
//             onChange={handleChange}
//           />
//         </div>
//         <div className="col-md-3 mb-2">
//           <input
//             type="text"
//             className="form-control"
//             placeholder="Select Sub Scenario 2"
//             name="subScenario2"
//             value={form.subScenario2}
//             onChange={handleChange}
//           />
//         </div>
//         <div className="col-md-3 mb-2">
//           <input
//             type="text"
//             className="form-control"
//             placeholder="Select Sub Scenario 3"
//             name="subScenario3"
//             value={form.subScenario3}
//             onChange={handleChange}
//           />
//         </div>
//         <div className="col-md-3 mb-2">
//           <input
//             type="text"
//             className="form-control"
//             placeholder="MSISDN"
//             name="msisdn"
//             value={form.msisdn}
//             onChange={handleChange}
//           />
//         </div>
//       </div>

//       <div className="row mb-3">
//         <div className="col-md-3 mb-2">
//           <input
//             type="date"
//             className="form-control"
//             name="startDate"
//             value={form.startDate}
//             onChange={handleChange}
//           />
//         </div>
//         <div className="col-md-3 mb-2">
//           <input
//             type="date"
//             className="form-control"
//             name="endDate"
//             value={form.endDate}
//             onChange={handleChange}
//           />
//         </div>
//         <div className="col-md-6 d-flex gap-2">
//           <button className="btn btn-primary" onClick={handleExport}>
//             Export
//           </button>
//           <button type="submit" className="btn btn-primary">
//             View
//           </button>
//         </div>
//       </div>
//       </form>

//       {!loading && showTable && (
//       <div className="card p-4">
//       <div className="table-responsive" style={{ maxHeight: "500px", overflow: "auto" }}>
//         <table className="table table-bordered table-sm">
//           <thead className="table-light">
//             <tr>
//               <th>View</th>
//               <th>Recording</th>
//               <th>Out Call ID</th>
//               <th>Call From</th>
//               <th>Scenarios</th>
//               <th>Sub Scenarios 1</th>
//               <th>Name</th>
//               <th>Contact Number</th>
//               {/* Add more columns as needed */}
//             </tr>
//           </thead>
//           <tbody>
//               {Array.isArray(data) && data.length > 0 ? (
//                 data.map((row, idx) => (
//                   <tr key={idx}>
//                     <td>
//                       <button className="btn btn-sm btn-outline-primary">
//                         🔍
//                       </button>
//                     </td>
//                     <td>
//                       <button className="btn btn-sm btn-outline-secondary">
//                         ⏬
//                       </button>
//                     </td>
//                     <td>{row.id}</td>
//                     <td>{row.callFrom}</td>
//                     <td>{row.scenario}</td>
//                     <td>{row.subScenario1}</td>
//                     <td>{row.name}</td>
//                     <td>{row.contactNumber}</td>
//                     {/* Add more cells as needed */}
//                   </tr>
//                 ))
//               ) : (
//                 <tr>
//                   <td colSpan="23" className="text-center">
//                     No data available for selected date range.
//                   </td>
//                 </tr>
//               )}
//             </tbody>

//         </table>
//       </div>
//       </div>
//       )}
//     </div>
//     </div>
//     </>
//   );
// }

// components/OutCallDetails.js (or wherever your file is)
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

  const [form, setForm] = useState({
    campaignType: "",
    campaign: "",
    allocation: "",
    scenario: "",
    subScenario1: "",
    subScenario2: "",
    subScenario3: "",
    msisdn: "",
    startDate: "",
    endDate: "",
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

  // Generic safe setter for form
  const updateForm = (name, value) => setForm((p) => ({ ...p, [name]: value }));

  const handleChange = async (e) => {
    const { name, value } = e.target;
    updateForm(name, value);

    try {
      // When user selects a campaign type (string), fetch campaigns (these are objects with id & name)
      if (name === "campaignType") {
        setCampaigns([]);
        setAllocs([]);
        updateForm("campaign", "");
        updateForm("allocation", "");
        if (value) {
          const res = await getCampaigns(company_id, value);
          setCampaigns(res || []);
        }
      }

      // When campaign selected (we expect id), fetch allocations
      if (name === "campaign") {
        setAllocs([]);
        updateForm("allocation", "");
        if (value) {
          const res = await getAllocations(company_id, value);
          setAllocs(res || []);
        }
      }

      // When allocation selected (id), fetch scenario options (these are name/id pairs)
      if (name === "allocation") {
        setScenarioOptions([]);
        setSub1Options([]);
        setSub2Options([]);
        setSub3Options([]);
        updateForm("scenario", "");
        updateForm("subScenario1", "");
        updateForm("subScenario2", "");
        updateForm("subScenario3", "");
        if (value) {
          const res = await getScenarios(company_id, value, 1);
          setScenarioOptions(res || []);
        }
      }

      // scenario selected => fetch subScenario1 (parentScenario is string name OR id depending on backend)
      if (name === "scenario") {
        setSub1Options([]);
        setSub2Options([]);
        setSub3Options([]);
        updateForm("subScenario1", "");
        updateForm("subScenario2", "");
        updateForm("subScenario3", "");
        if (value) {
          // backend's parent_scenario is string, but your getScenarios allows passing the value directly.
          const res = await getScenarios(company_id, form.allocation, 2, value);
          setSub1Options(res || []);
        }
      }

      if (name === "subScenario1") {
        setSub2Options([]);
        setSub3Options([]);
        updateForm("subScenario2", "");
        updateForm("subScenario3", "");
        if (value) {
          const res = await getScenarios(company_id, form.allocation, 3, value);
          setSub2Options(res || []);
        }
      }

      if (name === "subScenario2") {
        setSub3Options([]);
        updateForm("subScenario3", "");
        if (value) {
          const res = await getScenarios(company_id, form.allocation, 4, value);
          setSub3Options(res || []);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleView = async (e) => {
    e.preventDefault();
    if (!company_id) return;

    // Build filters: only include non-empty values
    const filters = Object.fromEntries(
      Object.entries(form).filter(
        ([_, v]) => v !== "" && v !== null && v !== undefined
      )
    );

    setLoading(true);
    try {
      const res = await getOutCallDetails(company_id, filters);
      // res should be { data: [], counts: {}, breadcrumb: [] }
      setTableData(res.data || []);
      setCounts(res.counts || {});
      setBreadcrumb(res.breadcrumb || []);
    } catch (err) {
      console.error(err);
      setTableData([]);
      setCounts({});
      setBreadcrumb([]);
    } finally {
      setLoading(false);
    }
  };

  // const handleExport = () => {
  //   if (!tableData.length) return alert("No data to export.");
  //   const worksheet = XLSX.utils.json_to_sheet(tableData);
  //   const workbook = XLSX.utils.book_new();
  //   XLSX.utils.book_append_sheet(workbook, worksheet, "Report");
  //   const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  //   saveAs(new Blob([excelBuffer], { type: "application/octet-stream" }), "out_call_details.xlsx");
  // };

  //   const handleExport = () => {
  //   if (!tableData.length && !Object.keys(counts || {}).length && !breadcrumb?.length) {
  //     return alert("No data to export.");
  //   }

  //   const workbook = XLSX.utils.book_new();

  //   // --- Sheet 1: Raw Data ---
  //   if (tableData.length) {
  //     const sheet1 = XLSX.utils.json_to_sheet(tableData);
  //     XLSX.utils.book_append_sheet(workbook, sheet1, "Raw Data");
  //   }

  //   // --- Sheet 2: Counts ---
  //   if (Object.keys(counts || {}).length) {
  //     let countsData = [];

  //     SCENARIO_KEYS.forEach((key) => {
  //       if (counts[key]) {
  //         countsData.push([`${key.toUpperCase()} Counts`]); // heading row
  //         countsData.push(["Name", "Total"]); // header
  //         counts[key].forEach((c) => {
  //           countsData.push([c.name, c.total]);
  //         });
  //         countsData.push([]); // empty row for spacing
  //       }
  //     });

  //     if (counts.total) {
  //       countsData.push(["Grand Total", counts.total]);
  //     }

  //     const sheet2 = XLSX.utils.aoa_to_sheet(countsData);
  //     XLSX.utils.book_append_sheet(workbook, sheet2, "Counts");
  //   }

  //   // --- Sheet 3: Filters ---
  //   if (breadcrumb?.length) {
  //     let filtersData = [["Level", "Value"]];
  //     breadcrumb.forEach((b) => {
  //       filtersData.push([b.level, b.value]);
  //     });

  //     const sheet3 = XLSX.utils.aoa_to_sheet(filtersData);
  //     XLSX.utils.book_append_sheet(workbook, sheet3, "Filters");
  //   }

  //   // --- Export file ---
  //   const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  //   saveAs(
  //     new Blob([excelBuffer], { type: "application/octet-stream" }),
  //     "out_call_details.xlsx"
  //   );
  // };

  const handleExport = () => {
    if (
      !tableData.length &&
      !Object.keys(counts || {}).length &&
      !breadcrumb?.length
    ) {
      return alert("No data to export.");
    }

    const workbook = XLSX.utils.book_new();

    // --- Sheet 1: Raw Data ---
    if (tableData.length) {
      const sheet1 = XLSX.utils.json_to_sheet(tableData);
      XLSX.utils.book_append_sheet(workbook, sheet1, "Raw Data");
    }

    // --- Sheet 2: Counts ---
    if (Object.keys(counts || {}).length) {
      let countsData = [];
      let merges = [];

      let rowIndex = 0;

      SCENARIO_KEYS.forEach((key) => {
        if (counts[key]) {
          // Section header (merged across 2 columns)
          countsData.push([`${key.toUpperCase()} COUNTS`]);
          merges.push({ s: { r: rowIndex, c: 0 }, e: { r: rowIndex, c: 1 } });
          rowIndex++;

          // Table header
          countsData.push(["Name", "Total"]);
          rowIndex++;

          // Data rows
          counts[key].forEach((c) => {
            countsData.push([c.name, c.total]);
            rowIndex++;
          });

          // Empty row for spacing
          countsData.push([]);
          rowIndex++;
        }
      });

      if (counts.total) {
        countsData.push(["Grand Total", counts.total]);
      }

      const sheet2 = XLSX.utils.aoa_to_sheet(countsData);
      sheet2["!merges"] = merges; // apply merged headers
      XLSX.utils.book_append_sheet(workbook, sheet2, "Counts");
    }

    // --- Sheet 3: Filters ---
    if (breadcrumb?.length) {
      let filtersData = [["Level", "Value"]];
      breadcrumb.forEach((b) => {
        filtersData.push([b.level, b.value]);
      });

      const sheet3 = XLSX.utils.aoa_to_sheet(filtersData);
      XLSX.utils.book_append_sheet(workbook, sheet3, "Filters");
    }

    // --- Export file ---
    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    });
    saveAs(
      new Blob([excelBuffer], { type: "application/octet-stream" }),
      "out_call_details.xlsx"
    );
  };

  return (
    <>
      {loading && (
        <div className="loader-overlay">
          <div className="bar" />
          <div className="bar" />
          <div className="bar" />
        </div>
      )}

      <div className={`priority-wrapper ${loading ? "blurred" : ""}`}>
        <div className="card p-4">
          <h5 className="mb-4">Out Call Details</h5>
          <form onSubmit={handleView}>
            <div className="row mb-3">
              {/* campaignType (string id), campaign (numeric id), allocation (numeric id), scenario (string id) */}
              {[
                {
                  name: "campaignType",
                  label: "Campaign Type",
                  options: types,
                },
                { name: "campaign", label: "Campaign", options: campaigns },
                { name: "allocation", label: "Allocation", options: allocs },
                {
                  name: "scenario",
                  label: "Scenario",
                  options: scenarioOptions,
                },
              ].map((f) => (
                <div className="col-md-3 mb-2" key={f.name}>
                  <select
                    className="form-select"
                    name={f.name}
                    value={form[f.name]}
                    onChange={handleChange}
                    disabled={!f.options || f.options.length === 0}
                  >
                    <option value="">Select {f.label}</option>
                    {f.options &&
                      f.options.map((o) => (
                        // ALWAYS use id as value. Backend expects numeric id for campaign/allocation
                        <option key={o.id} value={o.id}>
                          {o.name}
                        </option>
                      ))}
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
                      disabled={!f.options || f.options.length === 0}
                    >
                      <option value="">Select {f.label}</option>
                      {f.options.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.name}
                        </option>
                      ))}
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
          </form>

          {/* Counts */}
          {Object.keys(counts || {}).length > 0 && (
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
                        {/* Section Header */}
                        <tr className="table-secondary">
                          <td colSpan={2} className="fw-bold text-capitalize">
                            {key}
                          </td>
                        </tr>
                        {/* Data Rows */}
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

          {/* Breadcrumb */}
          {breadcrumb && breadcrumb.length > 0 && (
            <div className="mt-3">
              <h6>Filters Applied</h6>
              <ul>
                {breadcrumb.map((b, i) => (
                  <li key={i}>
                    {b.level}: {b.value}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Table */}
          {tableData && tableData.length > 0 ? (
            <div className="card mt-4 p-3">
              <table className="table table-bordered table-striped">
                <thead>
                  <tr>
                    {Object.keys(tableData[0]).map((k) => (
                      <th key={k}>{k}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tableData.map((row, rIdx) => (
                    <tr key={rIdx}>
                      {Object.keys(row).map((k) => (
                        <td key={k}>{row[k] ?? ""}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : !loading ? (
            <p className="mt-3">No data found.</p>
          ) : null}
        </div>
      </div>
    </>
  );
}
