
// src/pages/CallDetails.jsx
import React, { useEffect, useState, useMemo } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import api from "../api";
import { format } from "date-fns";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import "../styles/loader.css";
import { Eye, Mic } from "lucide-react";
import { useNavigate } from "react-router-dom";

function CallDetails() {
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [inCallAction, setInCallAction] = useState(""); // default empty or "In Call Action"
  const [call_id, setCallId] = useState(null); // default empty 
  const [inCallActionList, setInCallActionList] = useState([]);

  const [scenarioList, setScenarioList] = useState([]); // Level 1
  const [scenario1List, setScenario1List] = useState([]); // Level 2
  const [scenario2List, setScenario2List] = useState([]); // Level 3
  const [scenario3List, setScenario3List] = useState([]); // Level 4
  const [scenario4List, setScenario4List] = useState([]); // Level 5

  const [selectedScenario, setSelectedScenario] = useState(""); // Level 1
  const [selectedScenario1, setSelectedScenario1] = useState(""); // Level 2
  const [selectedScenario2, setSelectedScenario2] = useState(""); // Level 3
  const [selectedScenario3, setSelectedScenario3] = useState(""); // Level 4

  const [scenarioName, setScenarioName] = useState("");
  const [scenario1Name, setScenario1Name] = useState("");
  const [scenario2Name, setScenario2Name] = useState("");
  const [scenario3Name, setScenario3Name] = useState("");
  const [scenario4Name, setScenario4Name] = useState("");

  // 🔹 User info
  const userType = localStorage.getItem("user_type");
  const companyId = localStorage.getItem("company_id");

  // 🔹 Client selection (for Super-Admin/Admin)
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState(companyId);
  const [clientName, setClientName] = useState("");

  const activeCompanyId =
    userType === "Super-Admin" || userType === "Admin"
      ? selectedClient
      : companyId;

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  // Search & pagination
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;

  // scenarioMap if you use it elsewhere
  const [scenarioMap, setScenarioMap] = useState({});

  // ✅ Fetch clients (only for Super-Admin/Admin)
  useEffect(() => {
    const fetchClients = async () => {
      try {
        const res = await api.get("/agents/clients-rights");
        const sorted = res.data.sort((a, b) =>
          a.company_name.localeCompare(b.company_name, "en", {
            sensitivity: "base",
          })
        );
        setClients(sorted);
      } catch (err) {
        console.error("Error fetching clients:", err);
      }
    };
    if (userType === "Super-Admin" || userType === "Admin") {
      fetchClients();
    }
  }, [userType]);


  // ✅ Auto-select client for logged-in users
  useEffect(() => {
    if (userType === "Client") {
      setSelectedClient(companyId);
      const storedUserData = JSON.parse(localStorage.getItem("userData"));
      setClientName(storedUserData?.auth_person || "Your Company");
    } else if (
      (userType === "Super-Admin" || userType === "Admin") &&
      clients.length === 1
    ) {
      setSelectedClient(clients[0].company_id);
    }
  }, [userType, companyId, clients]);

  const navigate = useNavigate();


  useEffect(() => {
    if (!activeCompanyId || activeCompanyId === "null") return;

    const fetchInCallActions = async () => {
      try {
        const res = await api.get(`/close-looping/actions`, {
          params: { client_id: activeCompanyId },
        });

        setInCallActionList(res.data || []);
        setInCallAction("");
      } catch (err) {
        console.error("Error fetching In Call Actions:", err);
      }
    };

    fetchInCallActions();
  }, [activeCompanyId]);

  // useEffect(() => {
  //   // fetch scenario map
  //   if (!activeCompanyId) return;
  //   api
  //     .get(`/core_api/categories/all?client_id=${activeCompanyId}`)
  //     .then((res) => {
  //       const map = {};
  //       res.data.forEach((item) => (map[item.id] = item.ecrName));
  //       setScenarioMap(map);
  //     })
  //     .catch((err) => console.error("Error fetching scenarios:", err));
  // }, [activeCompanyId]);

  // load level1 scenarios
  useEffect(() => {
    if (!activeCompanyId || selectedClient === "null") return;

    // 🔥 RESET ALL SCENARIOS WHEN CLIENT CHANGES
    setSelectedScenario("");
    setSelectedScenario1("");
    setSelectedScenario2("");
    setSelectedScenario3("");

    setScenarioName("");
    setScenario1Name("");
    setScenario2Name("");
    setScenario3Name("");
    setScenario4Name("");

    setScenario1List([]);
    setScenario2List([]);
    setScenario3List([]);
    setScenario4List([]);

    api
      .get(`/core_api/categories/level1?client_id=${activeCompanyId}`)
      .then((res) => setScenarioList(res.data))
      .catch((err) => console.error("Error fetching level1 scenarios:", err));
  }, [activeCompanyId]);

  // filtered data for search
  const filteredData = useMemo(() => {
    if (!search) return data;
    return data.filter((row) =>
      Object.values(row).join(" ").toLowerCase().includes(search.toLowerCase())
    );
  }, [search, data]);

  // pagination
  const totalPages = Math.max(1, Math.ceil(filteredData.length / rowsPerPage));
  const currentData = filteredData.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  const customColStyle = { flex: "0 0 auto", width: "19.666667%" };

  // scenario change handlers (same as your original)
  const handleScenarioChange = (e) => {
    const selectedId = e.target.value;
    setSelectedScenario(selectedId);

    const obj = scenarioList.find(o => o.id == selectedId);
    setScenarioName(obj?.ecrName || "");

    setScenario1List([]);
    setScenario2List([]);
    setScenario3List([]);
    setScenario4List([]);
    setSelectedScenario1("");
    setSelectedScenario2("");
    setSelectedScenario3("");
    setScenario1Name("");
    setScenario2Name("");
    setScenario3Name("");

    if (selectedId) {
      api
        .get(`/core_api/categories/level2/${selectedId}?client_id=${activeCompanyId}`)
        .then((res) => setScenario1List(res.data))
        .catch((err) => console.error("Error loading level2:", err));
    }
  };

  const handleScenario1Change = (e) => {
    const selectedId = e.target.value;
    setSelectedScenario1(selectedId);

    const obj = scenario1List.find(o => o.id == selectedId);
    setScenario1Name(obj?.ecrName || "");

    setScenario2List([]);
    setScenario3List([]);
    setScenario4List([]);
    setSelectedScenario2("");
    setSelectedScenario3("");
    setScenario2Name("");
    setScenario3Name("");

    if (selectedId) {
      api
        .get(`/core_api/categories/level3/${selectedId}?client_id=${activeCompanyId}`)
        .then((res) => setScenario2List(res.data))
        .catch((err) => console.error("Error loading level3:", err));
    }
  };

  const handleScenario2Change = (e) => {
    const selectedId = e.target.value;
    setSelectedScenario2(selectedId);

    const obj = scenario2List.find(o => o.id == selectedId);
    setScenario2Name(obj?.ecrName || "");

    setScenario3List([]);
    setScenario4List([]);
    setSelectedScenario3("");
    setScenario3Name("");

    if (selectedId) {
      api
        .get(`/core_api/categories/level4/${selectedId}?client_id=${activeCompanyId}`)
        .then((res) => setScenario3List(res.data))
        .catch((err) => console.error("Error loading level4:", err));
    }
  };

  const handleScenario3Change = (e) => {
    const selectedId = e.target.value;

    const obj = scenario3List.find(o => o.id == selectedId);
    setScenario3Name(obj?.ecrName || "");

    setSelectedScenario3(selectedId);
    setScenario4List([]);
    setScenario4Name("");

    if (selectedId) {
      api
        .get(`/core_api/categories/level5/${selectedId}?client_id=${activeCompanyId}`)
        .then((res) => setScenario4List(res.data))
        .catch((err) => console.error("Error loading level5:", err));
    }
  };

  // View click: request data from server using selected dates
const handleViewClick = async () => {
  if (!activeCompanyId || activeCompanyId === "null") {
    alert("Please select Client.");
    return;
  }
  if (!startDate || !endDate) {
    alert("Please select both start and end dates.");
    return;
  }

  setLoading(true);

  const formattedStart = format(startDate, "yyyy-MM-dd");
  const formattedEnd = format(endDate, "yyyy-MM-dd");

  try {
    const response = await api.get(`/call/call-master/${activeCompanyId}`, {
      params: {
        client_id: activeCompanyId,
        from_date: formattedStart,
        to_date: formattedEnd,
        call_id : call_id || null,
        in_call_action: inCallAction,
        Category1: scenarioName?.trim(),
        Category2: scenario1Name?.trim(),
        Category3: scenario2Name?.trim(),
        Category4: scenario3Name?.trim(),
        Category5: "",
      },
    });

    // Clean keys (trim extra spaces)
    const cleanedData = response.data.map((row) => {
      const cleaned = {};
      for (let key in row) {
        cleaned[key.trim()] = row[key];
      }
      return cleaned;
    });

    setData(cleanedData);
    setCurrentPage(1);

    console.log("Cleaned API Response:", cleanedData);
  } catch (error) {
    console.error("API call failed:", error);
    alert("Failed to load data. See console for details.");
  } finally {
    setLoading(false);
  }
};

  const handleExportToExcel = () => {
    if (data.length === 0) {
      alert("No data to export.");
      return;
    }

    const formattedStart = startDate ? format(startDate, "yyyy-MM-dd") : "";
    const formattedEnd = endDate ? format(endDate, "yyyy-MM-dd") : "";

    // 🔹 Determine company name
    let exportCompanyName = "";

    if (userType === "Client") {
      const storedUserData = JSON.parse(localStorage.getItem("userData"));
      exportCompanyName = storedUserData?.auth_person || "Your Company";
    } else {
      const selected = clients.find(
        (c) => c.company_id == selectedClient
      );
      exportCompanyName = selected?.company_name || "Company";
    }

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Report");
    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    });
    const file = new Blob([excelBuffer], { type: "application/octet-stream" });

    // 🔹 Dynamic file name
    const fileName = `${exportCompanyName}_In_Call_Details${formattedStart}_to_${formattedEnd}.xlsx`;
    saveAs(file, fileName);
  };

  const tableColumns = [
    "View",
    "Recording",
    "In Call Id",
    "Call From",
    "Scenario",
    "Sub-scenario1",
    "Sub-scenario2",
    "Mobile Number",
    "First Name",
    "Last Name",
    "Address",
    "State",
    "District/Area",
    "Pin Code",
    "Customer type",
    "Date of Purchase",
    "Dealer contact number",
    "Dealer shop Name",
    "Remark",
    "Product Model Name",
    "CRM Issue",
    "Not Serviceable Area PIN Code",
    "19 digit Sr. NO.",
    "Invoice Date",
    "Invoice No.",
    "Email ID",
    "CallDate",
  ];

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
              <h5 className="mb-0">In Call Details</h5>

              {/* ✅ Client selector for Super-Admin/Admin */}
              {(userType === "Super-Admin" || userType === "Admin") && (
                <div className="d-flex align-items-center">
                  <label className="form-label fw-semibold me-2 mb-0">
                    Select Client:
                  </label>
                  <select
                    className="form-select form-select-sm"
                    style={{ width: "200px" }}
                    value={selectedClient}
                    onChange={(e) => setSelectedClient(e.target.value)}
                  >
                    <option value="">-- Select Client --</option>
                    {clients.map((client) => (
                      <option
                        key={client.company_id}
                        value={client.company_id}
                      >
                        {client.company_name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            {/* <h5 className="card-header">In Call Details</h5> */}
            <div className="card-body">
              <div className="row g-3">
                <div style={customColStyle} className="col-md-6 col-sm-12">
                  <label className="form-label" htmlFor="start-date">
                    Start Date
                  </label>
                  <input
                    type="date"
                    id="start-date"
                    className="form-control"
                    value={startDate ? startDate.toISOString().split("T")[0] : ""}
                    max={endDate ? endDate.toISOString().split("T")[0] : ""}
                    onChange={(e) => setStartDate(new Date(e.target.value))}
                  />
                </div>

                <div style={customColStyle} className="col-md-6 col-sm-12">
                  <label className="form-label" htmlFor="end-date">
                    End Date
                  </label>
                  <input
                    type="date"
                    id="end-date"
                    className="form-control"
                    value={endDate ? endDate.toISOString().split("T")[0] : ""}
                    min={startDate ? startDate.toISOString().split("T")[0] : ""}
                    onChange={(e) => setEndDate(new Date(e.target.value))}
                  />  
                </div>

                <div style={customColStyle} className="col-md-6 col-sm-12">
                  <label className="form-label" htmlFor="in-call-action">
                    In Call Action
                  </label>
                  <select 
                    id="in-call-action" 
                    className="form-select"
                    value={inCallAction}
                    onChange={(e) => setInCallAction(e.target.value)}
                  >
                    <option value="">In Call Action</option>
                    {inCallActionList.map((action, index) => (
                      <option key={index} value={action}>
                        {action}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={customColStyle} className="col-md-6 col-sm-12">
                  <label className="form-label" htmlFor="first-id">
                    First In Call Id
                  </label>
                  <input
                    type="text"
                    id="first-id"
                    className="form-control prefix-mask"
                    value={call_id}
                    onChange={(e) => setCallId(e.target.value)}
                  />
                </div>

                <div style={customColStyle} className="col-md-6 col-sm-12">
                  <label className="form-label" htmlFor="last-id">
                    Last In Call Id
                  </label>
                  <input
                    type="text"
                    id="last-id"
                    className="form-control prefix-mask"
                  />
                </div>

                {/* Scenario dropdowns */}
                <div style={customColStyle} className="col-md-6 col-sm-12">
                  <label className="form-label" htmlFor="scenario-main">
                    Select Scenario
                  </label>
                  <select
                    id="scenario-main"
                    className="form-select"
                    value={selectedScenario}
                    onChange={handleScenarioChange}
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
                    value={selectedScenario1}
                    onChange={handleScenario1Change}
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
                    value={selectedScenario2}
                    onChange={handleScenario2Change}
                  >
                    <option value="">Select Scenario2</option>
                    {scenario2List.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.ecrName}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={customColStyle} className="col-md-6 col-sm-12">
                  <label className="form-label">Select Scenario3</label>
                  <select
                    className="form-select"
                    value={selectedScenario3}
                    onChange={handleScenario3Change}
                  >
                    <option value="">All</option>
                    {scenario3List.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.ecrName}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={customColStyle} className="col-md-6 col-sm-12">
                  <label className="form-label">Select Scenario4</label>
                  <select className="form-select">
                    <option value="">All</option>
                    {scenario4List.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.ecrName}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-12">
                  <div className="d-flex justify-content-center mt-3">
                    <button
                      type="button"
                      className="btn btn-outline-primary rounded-3 me-2 px-4 py-2"
                      onClick={() => navigate(-1)}
                    >
                      ← Back
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary me-2 px-4 py-2"
                      onClick={handleExportToExcel}
                    >
                      Export
                    </button>

                    <button
                      type="button"
                      className="btn btn-primary me-2 px-4 py-2"
                      onClick={handleViewClick}
                    >
                      View
                    </button>

                    {/* <button type="submit" className="btn btn-primary px-4 py-2">
                      Closeloop
                    </button> */}
                  </div>
                </div>

                {/* Payload table */}
                {!loading && data.length > 0 && (
                  <div className="mt-5">
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <h5 className="fw-semibold mb-0">Call Master Data</h5>
                      <div className="input-group w-auto">
                        <span className="input-group-text">🔍</span>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Search..."
                          value={search}
                          onChange={(e) => {
                            setSearch(e.target.value);
                            setCurrentPage(1);
                          }}
                        />
                      </div>
                    </div>

                    <div className="table-responsive">
                      <table className="table table-striped table-hover table-bordered align-middle">
                        <thead className="table-dark sticky-top">
                          <tr>
                            <th>View</th>
                            {/* <th>Recording</th> */}
                            {Object.keys(data[0]).map((col) => (
                              <th key={col}>{col}</th>
                            ))}
                          </tr>
                        </thead>

                        <tbody>
                          {currentData.length > 0 ? (
                            currentData.map((row, i) => (
                              <tr key={i}>
                                {/* View Button */}
                                <td className="text-center">
                                  <button
                                    className="btn btn-sm btn-outline-primary"
                                    title="View"
                                    onClick={() => {
                                      const companyId = activeCompanyId || localStorage.getItem("company_id");
                                      // navigate("/view_close_looping", { state: { row, client_id: companyId } });
                                      window.open(
                                        `/view_close_looping/${row.callId}?client_id=${companyId}`,
                                        "_blank"
                                      );
                                    }}
                                  >
                                    <Eye size={16} />
                                  </button>
                                </td>

                                {/* Recording Button */}
                                {/* <td className="text-center">
                                  <button
                                    className="btn btn-sm btn-outline-success"
                                    title="Recording"
                                  >
                                    <Mic size={16} />
                                  </button>
                                </td> */}

                                {/* Dynamic Columns */}
                                {Object.keys(data[0]).map((col) => (
                                  <td key={col}>
                                    {row[col] !== null && row[col] !== undefined
                                      ? row[col].toString()
                                      : "-"}
                                  </td>
                                ))}
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td
                                colSpan={Object.keys(data[0]).length + 2}
                                className="text-center text-muted py-4"
                              >
                                No data found.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination */}
                    <div className="d-flex justify-content-between align-items-center mt-3">
                      <p className="text-muted mb-0">
                        Showing {currentData.length} of {filteredData.length} entries
                      </p>
                      <div>
                        <button
                          className="btn btn-outline-primary btn-sm me-2"
                          disabled={currentPage === 1}
                          onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                        >
                          Prev
                        </button>
                        <span className="fw-semibold">
                          Page {currentPage} of {totalPages}
                        </span>
                        <button
                          className="btn btn-outline-primary btn-sm ms-2"
                          disabled={currentPage === totalPages}
                          onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  </div>
                )}


              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default CallDetails;
