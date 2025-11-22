import React, { useState, useEffect } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { format } from "date-fns";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import "../styles/loader.css";
import api from "../api";


function AutoTagging() {
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [tableData, setTableData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage] = useState(10);   // Change if needed




//scenario dropdown data
const [scenarioList, setScenarioList] = useState([]);
const [scenario1List, setScenario1List] = useState([]);
const [scenario2List, setScenario2List] = useState([]);
const [scenario3List, setScenario3List] = useState([]);
const [scenario4List, setScenario4List] = useState([]);

// selected values
const [scenario, setScenario] = useState("");
const [scenario1, setScenario1] = useState("");
const [scenario2, setScenario2] = useState("");
const [scenario3, setScenario3] = useState("");
const [scenario4, setScenario4] = useState("");

const [scenarioName, setScenarioName] = useState("");
const [scenario1Name, setScenario1Name] = useState("");
const [scenario2Name, setScenario2Name] = useState("");
const [scenario3Name, setScenario3Name] = useState("");
const [scenario4Name, setScenario4Name] = useState("");


const [callId, setCallId] = useState("");
const [callAction, setCallAction] = useState("");




  // User info
  const userType = localStorage.getItem("user_type");
  const companyId = localStorage.getItem("company_id");

  // Client dropdown
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState(companyId);

  const activeCompanyId =
    userType === "Super-Admin" || userType === "Admin"
      ? selectedClient
      : companyId;

  // Fetch Client List for Admin / SuperAdmin
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

  // Auto-set client for non-admin users
  useEffect(() => {
    if (userType !== "Super-Admin" && userType !== "Admin") {
      setSelectedClient(companyId);
    }
  }, []);


  useEffect(() => {
  if (!activeCompanyId) return;

  api.get(`/core_api/categories/level1`, {
    params: { client_id: activeCompanyId }
  })
  .then(res => {
    setScenarioList(res.data);
  })
  .catch(err => console.error("Level1 Error:", err));
}, [activeCompanyId]);


  const handleScenarioChange = async (id) => {
  setScenario(id);  // <-- only ID
  const selected = scenarioList.find(x => x.id === Number(id));
  setScenarioName(selected ? selected.ecrName : "");

  // Reset next levels
  setScenario1("");
  setScenario2("");
  setScenario3("");
  setScenario4("");

  setScenario1Name("");
  setScenario2Name("");
  setScenario3Name("");
  setScenario4Name("");

  setScenario1List([]);
  setScenario2List([]);
  setScenario3List([]);
  setScenario4List([]);

  if (!id) return;

  try {
    const res = await api.get(`/core_api/categories/level2/${id}`, {
      params: { client_id: activeCompanyId }
    });
    setScenario1List(res.data);
  } catch (err) {
    console.error(err);
  }
};




  const handleScenario1Change = async (id) => {
  setScenario1(id);
  const selected = scenario1List.find(x => x.id === Number(id));
  setScenario1Name(selected ? selected.ecrName : "");

  setScenario2("");
  setScenario3("");
  setScenario4("");

  setScenario2Name("");
  setScenario3Name("");
  setScenario4Name("");

  setScenario2List([]);
  setScenario3List([]);
  setScenario4List([]);

  if (!id) return;

  try {
    const res = await api.get(`/core_api/categories/level3/${id}`, {
      params: { client_id: activeCompanyId }
    });
    setScenario2List(res.data);
  } catch (err) {
    console.error(err);
  }
};


  const handleScenario2Change = async (id) => {
    setScenario2(id);
    const selected = scenario2List.find(x => x.id === Number(id));
    setScenario2Name(selected ? selected.ecrName : "");

    setScenario3(""); setScenario4("");
    setScenario3Name(""); setScenario4Name("");
    setScenario3List([]); setScenario4List([]);

    if (!id) return;

    try {
      const res = await api.get(`/core_api/categories/level4/${id}`, {
        params: { client_id: activeCompanyId }
      });
      setScenario3List(res.data);
    } catch (err) {
      console.error(err);
    }
  };



  const handleScenario3Change = async (id) => {
    setScenario3(id);
    const selected = scenario3List.find(x => x.id === Number(id));
    setScenario3Name(selected ? selected.ecrName : "");

    setScenario4("");
    setScenario4Name("");
    setScenario4List([]);

    if (!id) return;

    try {
      const res = await api.get(`/core_api/categories/level5/${id}`, {
        params: { client_id: activeCompanyId }
      });
      setScenario4List(res.data);
    } catch (err) {
      console.error(err);
    }
  };


  const handleScenario4Change = (id) => {
    setScenario4(id);
    const selected = scenario4List.find(x => x.id === Number(id));
    setScenario4Name(selected ? selected.ecrName : "");
  };





  // ---------------------------
  // 🔍 VIEW Report
  // ---------------------------
 const handleView = async () => {
  // Check for client selection for Super-Admin/Admin
  if ((userType === "Super-Admin" || userType === "Admin") && !selectedClient || selectedClient === "null") {
    alert("Please select a client.");
    return;
  }


  if (!startDate || !endDate) {
    alert("Please select both Start Date and End Date.");
    return;
  }

  setLoading(true);
  try {
    const formattedStart = format(startDate, "yyyy-MM-dd");
    const formattedEnd = format(endDate, "yyyy-MM-dd");

    const response = await api.get("/call-details", {
        params: {
            client_id: activeCompanyId,   // selected client
            startdate: formattedStart,    // query param
            enddate: formattedEnd,      // query param
            call_id: callId || null,
            call_action: callAction || "",
            scenario: scenarioName || "",
            scenario1: scenario1Name || "",
            scenario2: scenario2Name || "",
            scenario3: scenario3Name || "",
            scenario4: scenario4Name || "",
        }
    });

    setTableData(response.data || []); // data → data array


  } catch (error) {
    console.error("Error fetching Call Details report:", error);
  } finally {
    setLoading(false);
  }
};


  // ---------------------------
  // 📤 EXPORT REPORT
  // ---------------------------
  const handleExportToExcel = () => {
    if (tableData.length === 0) {
      alert("No data to export.");
      return;
    }
    const worksheet = XLSX.utils.json_to_sheet(tableData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Report");
    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    });
    const file = new Blob([excelBuffer], {
      type: "application/octet-stream",
    });
    saveAs(file, "in_call_details.xlsx");
  };



  const indexOfLastRecord = currentPage * recordsPerPage;
  const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
  const currentRecords = tableData.slice(indexOfFirstRecord, indexOfLastRecord);

  const totalPages = Math.ceil(tableData.length / recordsPerPage);

  const goToNext = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  const goToPrev = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };




  const customColStyle = { flex: "0 0 auto", width: "19.666667%" };
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
        <div className="col-12">
          <div className="card">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h5 className="m-0">In Call Details</h5>

              {(userType === "Super-Admin" || userType === "Admin") && (
                <div style={{ maxWidth: "250px" }}>
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
            </div>
            <div className="card-body">
              <div className="row g-3">
                {/* Date filters */}
                <div style={customColStyle} className="col-md-6 col-sm-12">
                  <label className="form-label">Start Date</label>
                  <DatePicker
                    selected={startDate}
                    onChange={(date) => setStartDate(date)}
                    dateFormat="dd-MM-yyyy"
                    placeholderText="DD-MM-YYYY"
                    className="form-control"
                    maxDate={endDate}
                  />
                </div>

                <div style={customColStyle} className="col-md-6 col-sm-12">
                  <label className="form-label me-1">End Date</label>
                  <DatePicker
                    selected={endDate}
                    onChange={(date) => setEndDate(date)}
                    dateFormat="dd-MM-yyyy"
                    placeholderText="DD-MM-YYYY"
                    className="form-control"
                    minDate={startDate}
                  />
                </div>

                {/* Other filters */}
                <div style={customColStyle} className="col-md-6 col-sm-12">
                  <label className="form-label">In Call Action</label>
                  <select 
                    className="form-select"
                    value={callAction}
                    onChange={(e) => setCallAction(e.target.value)}
                    >
                    <option value="">In Call Action</option>
                    <option value="Open">Open</option>
                    <option value="Pending">Pending</option>
                    <option value="Close By System">Closed</option>
                  </select>
                </div>

                <div style={customColStyle} className="col-md-6 col-sm-12">
                  <label className="form-label">First In Call Id</label>
                  <input 
                      type="text" 
                      className="form-control" 
                      value={callId}
                      onChange={(e) => setCallId(e.target.value)}/>
                </div>

                <div style={customColStyle} className="col-md-6 col-sm-12">
                  <label className="form-label">Last In Call Id</label>
                  <input type="text" className="form-control" disabled />
                </div>

                {/* Scenarios */}
                <div style={customColStyle} className="col-md-6 col-sm-12">
                  <label className="form-label">Select Scenario</label>
                  <select
                    className="form-select"
                    value={scenario}
                    onChange={(e) => handleScenarioChange(e.target.value)}
                  >
                    <option value="">Select Scenario</option>
                    {scenarioList.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.ecrName}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={customColStyle} className="col-md-6 col-sm-12">
                  <label className="form-label">Select Scenario1</label>
                  <select
                    className="form-select"
                    value={scenario1}
                    onChange={(e) => handleScenario1Change(e.target.value)}
                  >
                    <option value="">Select Scenario1</option>
                    {scenario1List.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.ecrName}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={customColStyle} className="col-md-6 col-sm-12">
                  <label className="form-label">Select Scenario2</label>
                  <select
                    className="form-select"
                    value={scenario2}
                    onChange={(e) => handleScenario2Change(e.target.value)}
                  >
                    <option value="">Select Scenario2</option>
                    {scenario2List.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.ecrName}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Scenario3 */}
                <div style={customColStyle} className="col-md-6 col-sm-12">
                  <label className="form-label">Select Scenario3</label>
                  <select
                    className="form-select"
                    value={scenario3}
                    onChange={(e) => handleScenario3Change(e.target.value)}
                  >
                    <option value="">Select Scenario3</option>
                    {scenario3List.length === 0 ? (
                      <option value="">No Data</option>
                    ) : (
                      scenario3List.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.ecrName}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                {/* Scenario4 */}
                <div style={customColStyle} className="col-md-6 col-sm-12">
                  <label className="form-label">Select Scenario4</label>
                  <select
                    className="form-select"
                    value={scenario4}
                    onChange={(e) => handleScenario4Change(e.target.value)}
                  >
                    <option value="">Select Scenario4</option>
                    {scenario4List.length === 0 ? (
                      <option value="">No Data</option>
                    ) : (
                      scenario4List.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.ecrName}
                        </option>
                      ))
                    )}
                  </select>
                </div>  

                {/* Buttons */}
                <div className="col-12">
                  <div className="d-flex justify-content-center mt-3">
                    <button
                      type="button"
                      className="btn btn-primary me-2 px-4 py-2"
                      onClick={handleExportToExcel}
                    >
                      Export
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary px-4 py-2"
                      onClick={handleView}
                    >
                      View
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* TABLE SHOWING RESULTS */}
            {tableData.length > 0 && (
              <>
                <div className="table-responsive p-3">
                  <table className="table table-bordered table-sm">
                    <thead className="table-light">
                      <tr>
                        {Object.keys(tableData[0]).map((col) => (
                          <th key={col}>{col}</th>
                        ))}
                      </tr>
                    </thead>

                    <tbody>
                      {currentRecords.map((row, idx) => (
                        <tr key={idx}>
                          {Object.values(row).map((val, i) => (
                            <td key={i}>{val}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* FIXED PAGINATION (not moving during horizontal scroll) */}
                <div className="d-flex justify-content-between align-items-center p-3">
                  <button
                    className="btn btn-sm btn-outline-primary"
                    disabled={currentPage === 1}
                    onClick={goToPrev}
                  >
                    Previous
                  </button>

                  <span className="fw-bold">
                    Page {currentPage} of {totalPages}
                  </span>

                  <button
                    className="btn btn-sm btn-outline-primary"
                    disabled={currentPage === totalPages}
                    onClick={goToNext}
                  >
                    Next
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export default AutoTagging;
