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








// import React, { useState, useEffect } from "react";
// import {
//   getOutCallDetails,
//   getCampaignTypes,
//   getCampaigns,
//   getAllocations,
//   getScenarios
// } from "../services/authService";

// import * as XLSX from "xlsx";
// import { saveAs } from "file-saver";
// import "../styles/loader.css";

// export default function OutCallDetails() {
//   const [form, setForm] = useState({
//     campaignType: "",
//     campaign: "",
//     allocation: "",
//     scenario: "",
//     subScenario1: "",
//     subScenario2: "",
//     subScenario3: "",
//     msisdn: "",
//     startDate: "",
//     endDate: ""
//   });

//   const [types, setTypes] = useState([]);
//   const [campaigns, setCampaigns] = useState([]);
//   const [allocs, setAllocs] = useState([]);
//   const [scenarioOptions, setScenarioOptions] = useState([]);
//   const [sub1Options, setSub1Options] = useState([]);
//   const [sub2Options, setSub2Options] = useState([]);
//   const [sub3Options, setSub3Options] = useState([]);
//   const [data, setData] = useState([]);
//   const [loading, setLoading] = useState(false);
//   const [showTable, setShowTable] = useState(false);

//   const company_id = localStorage.getItem('company_id');

//   // Load campaign types on mount
//   useEffect(() => {
//     if (company_id) {
//       getCampaignTypes(company_id)
//         .then(res => setTypes(res))
//         .catch(err => console.error(err));
//     }
//   }, [company_id]);

//   // Handle field changes
//   const handleChange = (e) => {
//     const { name, value } = e.target;
//     setForm(prev => ({ ...prev, [name]: value }));

//     if (name === "campaignType") {
//       setCampaigns([]);
//       setAllocs([]);
//       setForm(prev => ({ ...prev, campaign: "", allocation: "" }));
//       if (value) {
//         getCampaigns(company_id, value)
//           .then(res => setCampaigns(res))
//           .catch(err => console.error(err));
//       }
//     }

//     if (name === "campaign") {
//       setAllocs([]);
//       setForm(prev => ({ ...prev, allocation: "" }));
//       if (value) {
//         getAllocations(company_id, value)
//           .then(res => setAllocs(res))
//           .catch(err => console.error(err));
//       }
//     }

//     // Dynamic Scenario Loading
//     if (name === "allocation" && value) {
//       setScenarioOptions([]);
//       setSub1Options([]);
//       setSub2Options([]);
//       setSub3Options([]);
//       setForm(prev => ({ ...prev, scenario: "", subScenario1: "", subScenario2: "", subScenario3: "" }));

//       // Load Scenario Level 1
//       getScenarios(company_id, value, 1)
//         .then(res => setScenarioOptions(res))
//         .catch(err => console.error(err));
//     }

//     if (name === "scenario" && value) {
//       setSub1Options([]);
//       setSub2Options([]);
//       setSub3Options([]);
//       setForm(prev => ({ ...prev, subScenario1: "", subScenario2: "", subScenario3: "" }));

//       getScenarios(company_id, form.allocation, 2, value)
//         .then(res => setSub1Options(res))
//         .catch(err => console.error(err));
//     }

//     if (name === "subScenario1" && value) {
//       setSub2Options([]);
//       setSub3Options([]);
//       setForm(prev => ({ ...prev, subScenario2: "", subScenario3: "" }));

//       getScenarios(company_id, form.allocation, 3, value)
//         .then(res => setSub2Options(res))
//         .catch(err => console.error(err));
//     }

//     if (name === "subScenario2" && value) {
//       setSub3Options([]);
//       setForm(prev => ({ ...prev, subScenario3: "" }));

//       getScenarios(company_id, form.allocation, 4, value)
//         .then(res => setSub3Options(res))
//         .catch(err => console.error(err));
//     }
//   };

//   // Fetch OutCall data
//   const handleView = async (e) => {
//     e.preventDefault();
//     if (!company_id) return;

//     const sanitizedFilters = {};
//     Object.keys(form).forEach(key => {
//       if (form[key] !== "") sanitizedFilters[key] = form[key];
//     });

//     setLoading(true);
//     try {
//       const res = await getOutCallDetails(company_id, sanitizedFilters);
//       setData(res);
//       setShowTable(true);
//     } catch (err) {
//       console.error(err);
//     } finally {
//       setLoading(false);
//     }
//   };

//   // Export to Excel
//   const handleExport = (e) => {
//     e.preventDefault();
//     if (!data.length) return alert("No data to export.");

//     const worksheet = XLSX.utils.json_to_sheet(data);
//     const workbook = XLSX.utils.book_new();
//     XLSX.utils.book_append_sheet(workbook, worksheet, "Report");

//     const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
//     saveAs(new Blob([excelBuffer], { type: "application/octet-stream" }), "out_call_details.xlsx");
//   };

//   return (
//     <>
//       {loading && <div className="loader-overlay"><div className="bar"></div><div className="bar"></div><div className="bar"></div></div>}
//       <div className={`priority-wrapper ${loading ? "blurred" : ""}`}>
//         <div className="card p-4">
//           <h5 className="mb-4">Out Call Details</h5>
//           <form onSubmit={handleView}>
//             <div className="row mb-3">
//               {/* Campaign Type */}
//               <div className="col-md-3 mb-2">
//                 <select className="form-select" name="campaignType" value={form.campaignType} onChange={handleChange}>
//                   <option value="">Select Campaign Type</option>
//                   {types.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
//                 </select>
//               </div>

//               {/* Campaign */}
//               <div className="col-md-3 mb-2">
//                 <select className="form-select" name="campaign" value={form.campaign} onChange={handleChange} disabled={!campaigns.length}>
//                   <option value="">Select Campaign</option>
//                   {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
//                 </select>
//               </div>

//               {/* Allocation */}
//               <div className="col-md-3 mb-2">
//                 <select className="form-select" name="allocation" value={form.allocation} onChange={handleChange} disabled={!allocs.length}>
//                   <option value="">Select Allocation</option>
//                   {allocs.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
//                 </select>
//               </div>

//               {/* Scenario Level 1 */}
//               <div className="col-md-3 mb-2">
//                 <select className="form-select" name="scenario" value={form.scenario} onChange={handleChange} disabled={!scenarioOptions.length}>
//                   <option value="">Select Scenario</option>
//                   {scenarioOptions.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
//                 </select>
//               </div>
//             </div>

//             <div className="row mb-3">
//               {/* Sub Scenario 1 */}
//               <div className="col-md-3 mb-2">
//                 <select className="form-select" name="subScenario1" value={form.subScenario1} onChange={handleChange} disabled={!sub1Options.length}>
//                   <option value="">Select Sub Scenario 1</option>
//                   {sub1Options.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
//                 </select>
//               </div>

//               {/* Sub Scenario 2 */}
//               <div className="col-md-3 mb-2">
//                 <select className="form-select" name="subScenario2" value={form.subScenario2} onChange={handleChange} disabled={!sub2Options.length}>
//                   <option value="">Select Sub Scenario 2</option>
//                   {sub2Options.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
//                 </select>
//               </div>

//               {/* Sub Scenario 3 */}
//               <div className="col-md-3 mb-2">
//                 <select className="form-select" name="subScenario3" value={form.subScenario3} onChange={handleChange} disabled={!sub3Options.length}>
//                   <option value="">Select Sub Scenario 3</option>
//                   {sub3Options.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
//                 </select>
//               </div>

//               {/* MSISDN */}
//               <div className="col-md-3 mb-2">
//                 <input type="text" className="form-control" placeholder="MSISDN" name="msisdn" value={form.msisdn} onChange={handleChange} />
//               </div>
//             </div>

//             <div className="row mb-3">
//               <div className="col-md-3 mb-2">
//                 <input type="date" className="form-control" name="startDate" value={form.startDate} onChange={handleChange} />
//               </div>
//               <div className="col-md-3 mb-2">
//                 <input type="date" className="form-control" name="endDate" value={form.endDate} onChange={handleChange} />
//               </div>
//               <div className="col-md-6 d-flex gap-2">
//                 <button className="btn btn-primary" onClick={handleExport}>Export</button>
//                 <button type="submit" className="btn btn-primary">View</button>
//               </div>
//             </div>
//           </form>

//           {/* Table */}
//           {!loading && showTable && (
//             <div className="card p-4">
//               <div className="table-responsive" style={{ maxHeight: "500px", overflow: "auto" }}>
//                 <table className="table table-bordered table-sm">
//                   <thead className="table-light">
//                     <tr>
//                       <th>View</th>
//                       <th>Recording</th>
//                       <th>Out Call ID</th>
//                       <th>Call From</th>
//                       <th>Scenario</th>
//                       <th>Sub Scenario 1</th>
//                       <th>Sub Scenario 2</th>
//                       <th>Sub Scenario 3</th>
//                       <th>Contact Number</th>
//                     </tr>
//                   </thead>
//                   <tbody>
//                     {data.length > 0 ? data.map((row, idx) => (
//                       <tr key={idx}>
//                         <td><button className="btn btn-sm btn-outline-primary">🔍</button></td>
//                         <td><button className="btn btn-sm btn-outline-secondary">⏬</button></td>
//                         <td>{row.id}</td>
//                         <td>{row.callFrom}</td>
//                         <td>{row.scenario}</td>
//                         <td>{row.subScenario1}</td>
//                         <td>{row.subScenario2}</td>
//                         <td>{row.subScenario3}</td>
//                         <td>{row.contactNumber}</td>
//                       </tr>
//                     )) : (
//                       <tr>
//                         <td colSpan="9" className="text-center">No data available for selected filters.</td>
//                       </tr>
//                     )}
//                   </tbody>
//                 </table>
//               </div>
//             </div>
//           )}

//         </div>
//       </div>
//     </>
//   );
// }






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
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showTable, setShowTable] = useState(false);

  // Load campaign types on mount
  useEffect(() => {
    if (!company_id) return;
    getCampaignTypes(company_id).then(setTypes).catch(console.error);
  }, [company_id]);

  // Handle field changes
  const handleChange = async (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));

    try {
      if (name === "campaignType") {
        setCampaigns([]);
        setAllocs([]);
        setForm((prev) => ({ ...prev, campaign: "", allocation: "" }));
        if (value) {
          const res = await getCampaigns(company_id, value);
          setCampaigns(res);
        }
      }

      if (name === "campaign") {
        setAllocs([]);
        setForm((prev) => ({ ...prev, allocation: "" }));
        if (value) {
          const res = await getAllocations(company_id, value);
          setAllocs(res);
        }
      }

      if (name === "allocation") {
        setScenarioOptions([]);
        setSub1Options([]);
        setSub2Options([]);
        setSub3Options([]);
        setForm((prev) => ({
          ...prev,
          scenario: "",
          subScenario1: "",
          subScenario2: "",
          subScenario3: "",
        }));
        if (value) {
          const res = await getScenarios(company_id, value, 1);
          setScenarioOptions(res);
        }
      }

      if (name === "scenario") {
        setSub1Options([]);
        setSub2Options([]);
        setSub3Options([]);
        setForm((prev) => ({
          ...prev,
          subScenario1: "",
          subScenario2: "",
          subScenario3: "",
        }));
        if (value) {
          const res = await getScenarios(company_id, form.allocation, 2, value);
          setSub1Options(res);
        }
      }

      if (name === "subScenario1") {
        setSub2Options([]);
        setSub3Options([]);
        setForm((prev) => ({ ...prev, subScenario2: "", subScenario3: "" }));
        if (value) {
          const res = await getScenarios(company_id, form.allocation, 3, value);
          setSub2Options(res);
        }
      }

      if (name === "subScenario2") {
        setSub3Options([]);
        setForm((prev) => ({ ...prev, subScenario3: "" }));
        if (value) {
          const res = await getScenarios(company_id, form.allocation, 4, value);
          setSub3Options(res);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Fetch OutCall data
  const handleView = async (e) => {
    e.preventDefault();
    if (!company_id) return;

    const filters = Object.fromEntries(
      Object.entries(form).filter(([_, val]) => val)
    );

    setLoading(true);
    try {
      const res = await getOutCallDetails(company_id, filters);
      setData(res);
      setShowTable(true);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Export to Excel
  const handleExport = () => {
    if (!data.length) return alert("No data to export.");
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Report");
    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    saveAs(new Blob([excelBuffer], { type: "application/octet-stream" }), "out_call_details.xlsx");
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
        <div className="card p-4">
          <h5 className="mb-4">Out Call Details</h5>
          <form onSubmit={handleView}>
            <div className="row mb-3">
              <div className="col-md-3 mb-2">
                <select
                  className="form-select"
                  name="campaignType"
                  value={form.campaignType}
                  onChange={handleChange}
                >
                  <option value="">Select Campaign Type</option>
                  {types.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-md-3 mb-2">
                <select
                  className="form-select"
                  name="campaign"
                  value={form.campaign}
                  onChange={handleChange}
                  disabled={!campaigns.length}
                >
                  <option value="">Select Campaign</option>
                  {campaigns.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-md-3 mb-2">
                <select
                  className="form-select"
                  name="allocation"
                  value={form.allocation}
                  onChange={handleChange}
                  disabled={!allocs.length}
                >
                  <option value="">Select Allocation</option>
                  {allocs.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-md-3 mb-2">
                <select
                  className="form-select"
                  name="scenario"
                  value={form.scenario}
                  onChange={handleChange}
                  disabled={!scenarioOptions.length}
                >
                  <option value="">Select Scenario</option>
                  {scenarioOptions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="row mb-3">
              <div className="col-md-3 mb-2">
                <select
                  className="form-select"
                  name="subScenario1"
                  value={form.subScenario1}
                  onChange={handleChange}
                  disabled={!sub1Options.length}
                >
                  <option value="">Select Sub Scenario 1</option>
                  {sub1Options.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-md-3 mb-2">
                <select
                  className="form-select"
                  name="subScenario2"
                  value={form.subScenario2}
                  onChange={handleChange}
                  disabled={!sub2Options.length}
                >
                  <option value="">Select Sub Scenario 2</option>
                  {sub2Options.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-md-3 mb-2">
                <select
                  className="form-select"
                  name="subScenario3"
                  value={form.subScenario3}
                  onChange={handleChange}
                  disabled={!sub3Options.length}
                >
                  <option value="">Select Sub Scenario 3</option>
                  {sub3Options.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-md-3 mb-2">
                <input
                  type="text"
                  className="form-control"
                  placeholder="MSISDN"
                  name="msisdn"
                  value={form.msisdn}
                  onChange={handleChange}
                />
              </div>
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
                <button className="btn btn-success" type="button" onClick={handleExport}>
                  Export
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Data Table */}
        {showTable && data.length > 0 && (
          <div className="card mt-4 p-3">
            <table className="table table-bordered table-striped">
              <thead>
                <tr>
                  {Object.keys(data[0]).map((key) => (
                    <th key={key}>{key}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map((row, idx) => (
                  <tr key={idx}>
                    {Object.keys(row).map((key) => (
                      <td key={key}>{row[key]}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {showTable && data.length === 0 && <p className="mt-3">No data found.</p>}
      </div>
    </>
  );
}












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

//     // const company_id = localStorage.getItem('company_id');
//     // Get company_id from localStorage
//        const company_id_raw = localStorage.getItem("company_id");
//        const company_id = Number(company_id_raw);

//     // useEffect(() => {
//     //     if (company_id) {
//     //         getCampaignTypes(company_id)
//     //             .then(res => setTypes(res.data))
//     //             .catch(err => console.error(err));
//     //     }
//     // }, [company_id]);

//     useEffect(() => {
//     if (Number.isInteger(company_id)) {
//       getCampaignTypes(company_id)
//         .then(res => setTypes(res.data))
//         .catch(err => console.error(err));
//     }
//   }, [company_id]);


//     // const handleChange = (e) => {
//     //     const { name, value } = e.target;
//     //     setForm((prev) => ({ ...prev, [name]: value }));

//     //     if (name === "campaignType") {
//     //         setCampaigns([]);
//     //         setAllocs([]);
//     //         // if (value) {
//     //         //     getCampaigns(company_id, value)
//     //         //         .then(res => setCampaigns(res.data))
//     //         //         .catch(err => console.error(err));
//     //         // }
//     //            if (value && company_id) {
//     //               getCampaigns(company_id, value)
//     //                   .then(res => setCampaigns(res.data))
//     //                   .catch(err => console.error(err));
//     //            }
//     //     }
//     //     if (name === "campaign") {
//     //         setAllocs([]);
//     //         // if (value) {
//     //         //     getAllocations(company_id, value)
//     //         //         .then(res => setAllocs(res.data))
//     //         //         .catch(err => console.error(err));
//     //         // }
//     //          if (value && company_id) {
//     //                getAllocations(company_id, value)
//     //                   .then(res => setAllocs(res.data))
//     //                   .catch(err => console.error(err));
//     //           }
//     //     }
//     // };


//      const handleChange = (e) => {
//     const { name, value } = e.target;
//     setForm(prev => ({ ...prev, [name]: value }));

//     if (name === "campaignType" && company_id) {
//       setCampaigns([]);
//       setAllocs([]);
//       if (value) {
//         getCampaigns(company_id, value)
//           .then(res => setCampaigns(res.data))
//           .catch(err => console.error(err));
//       }
//     }

//     if (name === "campaign" && company_id) {
//       setAllocs([]);
//       if (value) {
//         getAllocations(company_id, value)
//           .then(res => setAllocs(res.data))
//           .catch(err => console.error(err));
//       }
//     }
//   };

//     // const handleView = async (e) => {
//     //     e.preventDefault();

//     //      if (!company_id) {
//     //          alert("Company ID is missing. Please login again.");
//     //          return;
//     //     }

//     //         // Create a sanitized filter object without empty strings
//     //         const sanitizedFilters = {};
//     //         for (const key in form) {
//     //             if (form[key] !== "") {
//     //                 sanitizedFilters[key] = form[key];
//     //             }
//     //         }

//     //         setLoading(true);
//     //         try {
//     //             const res = await getOutCallDetails(company_id, sanitizedFilters);
//     //             setData(res);
//     //             setShowTable(true);
//     //         } catch (err) {
//     //             console.error(err);
//     //         } finally {
//     //             setLoading(false);
//     //         }
       
//     // };

// const handleView = async (e) => {
//     e.preventDefault();

//     if (!Number.isInteger(company_id)) {
//       alert("Company ID is missing or invalid. Please login again.");
//       return;
//     }

//     // Remove empty filters
//     const sanitizedFilters = {};
//     for (const key in form) {
//       if (form[key] !== "") {
//         sanitizedFilters[key] = form[key];
//       }
//     }

//     setLoading(true);
//     try {
//       // ✅ Ensure company_id sent as integer query param
//       const res = await getOutCallDetails(company_id, sanitizedFilters);
//       setData(res);
//       setShowTable(true);
//     } catch (err) {
//       console.error("Error fetching out call details:", err);
//     } finally {
//       setLoading(false);
//     }
//   };


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
//     campaignType: "",
//     campaign: "",
//     allocation: "",
//     scenario: "",
//     subScenario1: "",
//     subScenario2: "",
//     subScenario3: "",
//     msisdn: "",
//     startDate: "",
//     endDate: ""
//   });

//   const [types, setTypes] = useState([]);
//   const [campaigns, setCampaigns] = useState([]);
//   const [allocs, setAllocs] = useState([]);
//   const [data, setData] = useState([]);
//   const [loading, setLoading] = useState(false);
//   const [showTable, setShowTable] = useState(false);

//   const company_id = localStorage.getItem('company_id');

//   useEffect(() => {
//     if (company_id) {
//       getCampaignTypes(company_id)
//         .then(res => setTypes(res.data || []))
//         .catch(err => console.error(err));
//     }
//   }, [company_id]);

//   const handleChange = (e) => {
//     const { name, value } = e.target;
//     setForm(prev => ({ ...prev, [name]: value }));

//     if (name === "campaignType") {
//       setCampaigns([]);
//       setAllocs([]);
//       if (value) {
//         getCampaigns(company_id, value)
//           .then(res => setCampaigns(res.data || []))
//           .catch(err => console.error(err));
//       }
//     }

//     if (name === "campaign") {
//       setAllocs([]);
//       if (value) {
//         getAllocations(company_id, value)
//           .then(res => setAllocs(res.data || []))
//           .catch(err => console.error(err));
//       }
//     }
//   };

// const handleView = async (e) => {
//   e.preventDefault();
//   if (!company_id) return;

//   setLoading(true);
//   try {
//     const res = await getOutCallDetails(company_id, form); // send entire form
//     setData(res || []);
//     setShowTable(true);
//   } catch (err) {
//     console.error("Failed to fetch out call details:", err);
//     setData([]);
//     setShowTable(false);
//   } finally {
//     setLoading(false);
//   }
// };


//   const handleExport = (e) => {
//     e.preventDefault();
//     if (!data || data.length === 0) {
//       alert("No data to export.");
//       return;
//     }

//     // Generate export data dynamically
//     const exportData = data.map(row => {
//       const newRow = {};
//       for (const key in row) {
//         if (row[key] && typeof row[key] === 'object' && row[key].url) {
//           newRow[key] = { f: `HYPERLINK("${row[key].url}", "${row[key].label || 'Link'}")` };
//         } else {
//           newRow[key] = row[key];
//         }
//       }
//       return newRow;
//     });

//     const worksheet = XLSX.utils.json_to_sheet(exportData, { skipHeader: false });
//     const workbook = XLSX.utils.book_new();
//     XLSX.utils.book_append_sheet(workbook, worksheet, "Report");

//     const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
//     const file = new Blob([excelBuffer], { type: "application/octet-stream" });
//     saveAs(file, "out_call_details.xlsx");
//   };

//   // Get all keys from data dynamically for table headers
//   const headers = data.length > 0 ? Object.keys(data[0]) : [];

//   return (
//     <>
//       {loading && (
//         <div className="loader-overlay">
//           <div className="bar"></div>
//           <div className="bar"></div>
//           <div className="bar"></div>
//           <div className="bar"></div>
//           <div className="bar"></div>
//         </div>
//       )}

//       <div className={`priority-wrapper ${loading ? "blurred" : ""}`}>
//         <div className="card p-4">
//           <h5 className="mb-4">Out Call Details</h5>
//           <form onSubmit={handleView}>
//             <div className="row mb-3">
//               <div className="col-md-3 mb-2">
//                 <select className="form-select" name="campaignType" value={form.campaignType} onChange={handleChange}>
//                   <option value="">Select Campaign Type</option>
//                   {types.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
//                 </select>
//               </div>
//               <div className="col-md-3 mb-2">
//                 <select className="form-select" name="campaign" value={form.campaign} onChange={handleChange} disabled={!campaigns.length}>
//                   <option value="">Select Campaign</option>
//                   {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
//                 </select>
//               </div>
//               <div className="col-md-3 mb-2">
//                 <select className="form-select" name="allocation" value={form.allocation} onChange={handleChange} disabled={!allocs.length}>
//                   <option value="">Select Allocation</option>
//                   {allocs.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
//                 </select>
//               </div>
//               <div className="col-md-3 mb-2">
//                 <input type="text" className="form-control" placeholder="Scenario" name="scenario" value={form.scenario} onChange={handleChange} />
//               </div>
//             </div>

//             <div className="row mb-3">
//               {["subScenario1", "subScenario2", "subScenario3", "msisdn"].map((field, idx) => (
//                 <div key={idx} className="col-md-3 mb-2">
//                   <input
//                     type="text"
//                     className="form-control"
//                     placeholder={field.charAt(0).toUpperCase() + field.slice(1)}
//                     name={field}
//                     value={form[field]}
//                     onChange={handleChange}
//                   />
//                 </div>
//               ))}
//             </div>

//             <div className="row mb-3">
//               <div className="col-md-3 mb-2"><input type="date" className="form-control" name="startDate" value={form.startDate} onChange={handleChange} /></div>
//               <div className="col-md-3 mb-2"><input type="date" className="form-control" name="endDate" value={form.endDate} onChange={handleChange} /></div>
//               <div className="col-md-6 d-flex gap-2">
//                 <button className="btn btn-primary" onClick={handleExport}>Export</button>
//                 <button type="submit" className="btn btn-primary">View</button>
//               </div>
//             </div>
//           </form>

//           {showTable && !loading && (
//             <div className="card p-4">
//               <div className="table-responsive" style={{ maxHeight: "500px", overflow: "auto" }}>
//                 <table className="table table-bordered table-sm">
//                   <thead className="table-light">
//                     <tr>
//                       {headers.map((h, idx) => <th key={idx}>{h}</th>)}
//                     </tr>
//                   </thead>
//                   <tbody>
//                     {data.length ? data.map((row, idx) => (
//                       <tr key={idx}>
//                         {headers.map((key, idy) => {
//                           const val = row[key];
//                           if (val && typeof val === 'object' && val.url) {
//                             return <td key={idy}><a href={val.url} target="_blank" rel="noopener noreferrer">{val.label || 'Link'}</a></td>;
//                           } else {
//                             return <td key={idy}>{val ?? ""}</td>;
//                           }
//                         })}
//                       </tr>
//                     )) : (
//                       <tr>
//                         <td colSpan={headers.length} className="text-center">No data available.</td>
//                       </tr>
//                     )}
//                   </tbody>
//                 </table>
//               </div>
//             </div>
//           )}
//         </div>
//       </div>
//     </>
//   );
// }



