
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

  const [scenarioList, setScenarioList] = useState([]); // Level 1
  const [scenario1List, setScenario1List] = useState([]); // Level 2
  const [scenario2List, setScenario2List] = useState([]); // Level 3
  const [scenario3List, setScenario3List] = useState([]); // Level 4
  const [scenario4List, setScenario4List] = useState([]); // Level 5

  const [selectedScenario, setSelectedScenario] = useState(""); // Level 1
  const [selectedScenario1, setSelectedScenario1] = useState(""); // Level 2
  const [selectedScenario2, setSelectedScenario2] = useState(""); // Level 3
  const [selectedScenario3, setSelectedScenario3] = useState(""); // Level 4
  const companyId = localStorage.getItem("company_id");

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  // Search & pagination
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;

  // scenarioMap if you use it elsewhere
  const [scenarioMap, setScenarioMap] = useState({});

  const navigate = useNavigate();

  useEffect(() => {
    // fetch scenario map
    if (!companyId) return;
    api
      .get(`/core_api/categories/all?client_id=${companyId}`)
      .then((res) => {
        const map = {};
        res.data.forEach((item) => (map[item.id] = item.ecrName));
        setScenarioMap(map);
      })
      .catch((err) => console.error("Error fetching scenarios:", err));
  }, [companyId]);

  // load level1 scenarios
  useEffect(() => {
    api
      .get("/core_api/categories/level1?client_id=301")
      .then((res) => setScenarioList(res.data))
      .catch((err) => console.error("Error fetching level1 scenarios:", err));
  }, []);

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
    setScenario1List([]);
    setScenario2List([]);
    setScenario3List([]);
    setScenario4List([]);
    setSelectedScenario1("");
    setSelectedScenario2("");
    setSelectedScenario3("");

    if (selectedId) {
      api
        .get(`/core_api/categories/level2/${selectedId}?client_id=${companyId}`)
        .then((res) => setScenario1List(res.data))
        .catch((err) => console.error("Error loading level2:", err));
    }
  };

  const handleScenario1Change = (e) => {
    const selectedId = e.target.value;
    setSelectedScenario1(selectedId);
    setScenario2List([]);
    setScenario3List([]);
    setScenario4List([]);
    setSelectedScenario2("");
    setSelectedScenario3("");

    if (selectedId) {
      api
        .get(`/core_api/categories/level3/${selectedId}?client_id=${companyId}`)
        .then((res) => setScenario2List(res.data))
        .catch((err) => console.error("Error loading level3:", err));
    }
  };

  const handleScenario2Change = (e) => {
    const selectedId = e.target.value;
    setSelectedScenario2(selectedId);
    setScenario3List([]);
    setScenario4List([]);
    setSelectedScenario3("");

    if (selectedId) {
      api
        .get(`/core_api/categories/level4/${selectedId}?client_id=${companyId}`)
        .then((res) => setScenario3List(res.data))
        .catch((err) => console.error("Error loading level4:", err));
    }
  };

  const handleScenario3Change = (e) => {
    const selectedId = e.target.value;
    setSelectedScenario3(selectedId);
    setScenario4List([]);

    if (selectedId) {
      api
        .get(`/core_api/categories/level5/${selectedId}?client_id=${companyId}`)
        .then((res) => setScenario4List(res.data))
        .catch((err) => console.error("Error loading level5:", err));
    }
  };

  // View click: request data from server using selected dates
const handleViewClick = async () => {
  if (!startDate || !endDate) {
    alert("Please select both start and end dates.");
    return;
  }

  setLoading(true);

  const formattedStart = format(startDate, "yyyy-MM-dd");
  const formattedEnd = format(endDate, "yyyy-MM-dd");

  try {
    const response = await api.get(`/call/call-master/${companyId}`, {
      params: {
        client_id: companyId,
        from_date: formattedStart,
        to_date: formattedEnd,
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
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Report");
    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    });
    const file = new Blob([excelBuffer], { type: "application/octet-stream" });
    saveAs(file, "report.xlsx");
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
            <h5 className="card-header">In Call Details</h5>
            <div className="card-body">
              <div className="row g-3">
                <div style={customColStyle} className="col-md-6 col-sm-12">
                  <label className="form-label" htmlFor="start-date">
                    Start Date
                  </label>
                  <DatePicker
                    selected={startDate}
                    onChange={(date) => setStartDate(date)}
                    dateFormat="dd-MM-yyyy"
                    placeholderText="DD-MM-YYYY"
                    className="form-control"
                    id="start-date"
                    maxDate={endDate}
                  />
                </div>

                <div style={customColStyle} className="col-md-6 col-sm-12">
                  <label className="form-label" htmlFor="end-date">
                    End Date
                  </label>
                  <DatePicker
                    selected={endDate}
                    onChange={(date) => setEndDate(date)}
                    dateFormat="dd-MM-yyyy"
                    placeholderText="DD-MM-YYYY"
                    className="form-control"
                    id="end-date"
                    minDate={startDate}
                  />
                </div>

                <div style={customColStyle} className="col-md-6 col-sm-12">
                  <label className="form-label" htmlFor="in-call-action">
                    In Call Action
                  </label>
                  <select id="in-call-action" className="form-select">
                    <option value="In Call Action">In Call Action</option>
                    <option value="Pending">Pending</option>
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

                    <button type="submit" className="btn btn-primary px-4 py-2">
                      Closeloop
                    </button>
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
                            <th>Recording</th>
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
                                    onClick={() =>
                                      navigate("/view_close_looping", { state: { row } })
                                    }
                                  >
                                    <Eye size={16} />
                                  </button>
                                </td>

                                {/* Recording Button */}
                                <td className="text-center">
                                  <button
                                    className="btn btn-sm btn-outline-success"
                                    title="Recording"
                                  >
                                    <Mic size={16} />
                                  </button>
                                </td>

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
                          className="btn btn-outline-secondary btn-sm me-2"
                          disabled={currentPage === 1}
                          onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                        >
                          Prev
                        </button>
                        <span className="fw-semibold">
                          Page {currentPage} of {totalPages}
                        </span>
                        <button
                          className="btn btn-outline-secondary btn-sm ms-2"
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
