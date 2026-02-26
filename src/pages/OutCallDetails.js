// components/OutCallDetails.js
import React, { useState, useEffect } from "react";
import {
  getOutCallDetails,
  getCampaignTypes,
  getCampaigns,
  getAllocations,
  getScenarios,
  getClientCampaignTypes,
} from "../services/authService";
import { Eye } from "lucide-react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import "../styles/loader.css";
import api from "../api";
import { useNavigate } from "react-router-dom";

export default function OutCallDetails() {
  const userType = localStorage.getItem("user_type");
  const company_id = localStorage.getItem("company_id");
  const today = new Date().toISOString().split("T")[0];
  const navigate = useNavigate();

  const [form, setForm] = useState({
    campaignType: "",
    campaign: "",
    allocation: "",
    scenario: "",
    subScenario1: "",
    subScenario2: "",
    subScenario3: "",
    msisdn: "",
    startDate: today,
    endDate: today,
  });
  const [closeLoopForm, setCloseLoopForm] = useState({
    CloseLoopCate1: "",
    CloseLoopCate2: "",
    closelooping_remarks: "",
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
  const columns =
    tableData.length > 0 ? Object.keys(tableData[0]) : [];


  const SCENARIO_KEYS = [
    "scenario",
    "subScenario1",
    "subScenario2",
    "subScenario3",
  ];



  // For Super-Admin / Admin
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState(company_id);

  // Determine which company_id to use
  const activeCompanyId =
    userType === "Super-Admin" || userType === "Admin"
      ? selectedClient
      : company_id;

  // Fetch clients list for Admin/SuperAdmin
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

  // Auto set client for normal users
  useEffect(() => {
    if (userType !== "Super-Admin" && userType !== "Admin") {
      setSelectedClient(company_id);
    }
  }, []);


  // useEffect(() => {
  //   if (!activeCompanyId) return;
  //   (async () => {
  //     const t = await getCampaignTypes(activeCompanyId);
  //     setTypes(t || []);
  //   })();
  // }, [activeCompanyId]);


  useEffect(() => {
    if (!activeCompanyId) return;

    const fetchCampaignTypes = async () => {
      try {

        if (userType === "Client") {
          const outboundAccess = localStorage.getItem("outbound_access");

          if (!outboundAccess) {
            console.warn("No outbound_access found in localStorage");
            setTypes([]);
            return;
          }

          const clientTypes = await getClientCampaignTypes(
            activeCompanyId,
            outboundAccess
          );

          setTypes(clientTypes || []);

        } else {
          const adminTypes = await getCampaignTypes(activeCompanyId);
          setTypes(adminTypes || []);
        }

      } catch (err) {
        console.error("Error fetching campaign types:", err);
        setTypes([]);
      }
    };

    fetchCampaignTypes();

  }, [activeCompanyId, userType]);

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
          const c = await getCampaigns(activeCompanyId, value);
          setCampaigns(c || []);
        }
      }

      if (name === "campaign") {
        setAllocs([]);
        updateForm("allocation", "");
        if (value) {
          const allocRes = await getAllocations(activeCompanyId, value);
          setAllocs(allocRes || []);

          const scenarioRes = await getScenarios(activeCompanyId, null, 1);
          const sub1Res = await getScenarios(activeCompanyId, null, 2);
          const sub2Res = await getScenarios(activeCompanyId, null, 3);
          const sub3Res = await getScenarios(activeCompanyId, null, 4);

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


  const handleView = async (e) => {
    e?.preventDefault();
    if (!activeCompanyId) return;

    if(!form.campaignType) {
      alert("Please select Campaign Type.")
      return;
    }

    if(!form.campaign) {
      alert("Please select Campaign.")
      return;
    }

    if(!form.allocation) {
      alert("Please select Allocation.")
      return;
    }

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
      const res = await getOutCallDetails(activeCompanyId, filters);
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


  const handleCloseLoopSubmit = async () => {
    if (!selectedRow) return;

    try {
      setLoading(true);

      await api.put("/call/update-close-loop", {
        ClientId: activeCompanyId,
        SrNo: selectedRow["Out Call Id"],  // 👈 IMPORTANT
        CloseLoopCate1: closeLoopForm.CloseLoopCate1,
        CloseLoopCate2: closeLoopForm.CloseLoopCate2,
        closelooping_remarks: closeLoopForm.closelooping_remarks,
      });

      alert("Close Loop Updated Successfully ✅");

      // Refresh table
      handleView();

      // Close modal
      setIsModalOpen(false);
      setSelectedRow(null);

    } catch (error) {
      console.error(error);
      alert("Error updating close loop ❌");
    } finally {
      setLoading(false);
    }
  };



  const handleExport = async () => {
    try {
      setLoading(true);

      let dataToExport = [];

      // ✅ Case 1: If table already loaded
      if (tableData && tableData.length > 0) {
        dataToExport = filteredRows;
      } 
      // ✅ Case 2: Export before View
      else {
        if (!activeCompanyId) {
          alert("Please select a client.");
          return;
        }

        if (!form.startDate || !form.endDate) {
          alert("Please select Start Date and End Date.");
          return;
        }

        const filters = Object.fromEntries(
          Object.entries(form).filter(
            ([_, value]) =>
              value !== "" && value !== null && value !== undefined
          )
        );

        const res = await getOutCallDetails(activeCompanyId, filters);
        dataToExport = Array.isArray(res?.data) ? res.data : [];
      }

      if (!dataToExport.length) {
        alert("No data available to export.");
        return;
      }

      // ✅ Create Excel sheet
      const worksheet = XLSX.utils.json_to_sheet(dataToExport);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Out Call Details");

      const excelBuffer = XLSX.write(workbook, {
        bookType: "xlsx",
        type: "array",
      });

      // ==========================
      // ✅ Determine Company Name
      // ==========================
      let companyName = "Company";

      if (userType === "Client") {
        const storedUserData = JSON.parse(localStorage.getItem("userData"));
        companyName = storedUserData?.auth_person || companyName;
      } else {
        const selected = clients.find(
          (c) => String(c.company_id) === String(selectedClient)
        );
        companyName = selected?.company_name || companyName;
      }


      // ==========================
      // ✅ Create Filename
      // ==========================
      const start = form.startDate || "NA";
      const end = form.endDate || "NA";

      const fileName = `${companyName}_OutCallDetails_${start}_to_${end}.xlsx`;

      // ✅ Save file
      saveAs(
        new Blob([excelBuffer], { type: "application/octet-stream" }),
        fileName
      );
    } catch (err) {
      console.error("Export error:", err);
      alert("Error exporting Excel.");
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
      <div className="card p-4">
        <div className="d-flex justify-content-between align-items-center mb-4">
        <h5 className="mb-4">Out Call Details</h5>

        {(userType === "Super-Admin" || userType === "Admin") && (
        <div style={{ maxWidth: "250px" }}>
          <select
            className="form-select"
            value={selectedClient}
            onChange={(e) => setSelectedClient(e.target.value)}
          >
            <option value="">-- Select Client --</option>
            {clients.map((c) => (
              <option key={c.company_id} value={c.company_id}>
                {c.company_name}
              </option>
            ))}
          </select>
        </div>
      )}
      </div>

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
              <button
                type="button"
                className="btn btn-outline-primary rounded-3 me-2 px-4 py-2"
                onClick={() => navigate(-1)}
              >
                ← Back
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
                            {columns.map((col) => (
                              <th key={col}>{col}</th>
                            ))}
                          </tr>
                        </thead>

                        <tbody>
                          {visibleRows.map((row, idx) => (
                            <tr key={idx}>
                              <td>
                                <button
                                  className="btn btn-sm btn-primary d-flex align-items-center justify-content-center"
                                  onClick={() => {
                                    setSelectedRow(row);
                                    setCloseLoopForm({
                                      CloseLoopCate1: row["Call Action"] || "",
                                      CloseLoopCate2: row["Call Sub Action"] || "",
                                      closelooping_remarks: row["Call Action Remarks"] || "",
                                    });

                                    setIsModalOpen(true);
                                  }}
                                  title="View"
                                >
                                  <Eye size={16} />
                                </button>
                              </td>

                              {columns.map((col) => (
                                <td key={col}>
                                  {col === "Call Date" ||
                                  col === "Follow Up Date" ||
                                  col === "Closer Date"
                                    ? row[col]
                                      ? row[col].replace("T", " ")
                                      : "-"
                                    : row[col] ?? "-"}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* --- Pagination --- */}
                    <div className="d-flex justify-content-between align-items-center mt-2 flex-wrap">
                      <button
                        className="btn btn-sm btn-outline-primary mb-2"
                        onClick={() =>
                          setCurrentPage((p) => Math.max(p - 1, 1))
                        }
                        disabled={currentPage === 1}
                      >
                        ◀ Prev
                      </button>
                      <span className="mb-2">
                        {indexOfFirstRow + 1} -{" "}
                        {Math.min(indexOfLastRow, tableData.length)} of{" "}
                        {tableData.length}
                      </span>
                      <button
                        className="btn btn-sm btn-outline-primary mb-2"
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

            {isModalOpen && selectedRow && (
            <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              width: "100vw",
              height: "100vh",
              backgroundColor: "rgba(0,0,0,0.4)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 9999,
              }}
            >

            {/* Modal Box */}
            <div
              className="bg-white rounded shadow-lg w-100"
              style={{
                width: "90vw",
                maxWidth: "1400px",
                height: "85vh",
                display: "flex",
                flexDirection: "column",
              }}
            >
              {/* Body */}
              <div className="d-flex flex-grow-1 overflow-hidden">

                {/* LEFT PANEL */}
                <div
                  className="p-4 border-end"
                  style={{ width: "60%", overflowY: "auto" }}
                >
                  <h6 className="fw-bold mb-3 text-secondary">
                    OUT CALL CLOSE LOOPING
                  </h6>

                  <table className="table table-bordered table-sm">
                    <thead className="table-secondary">
                      <tr>
                        <th style={{ width: "45%" }}>FIELD</th>
                        <th>VALUE</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(selectedRow).map(([key, value]) => (
                        <tr key={key}>
                          <td className="fw-semibold">{key}</td>
                          <td>
                            {typeof value === "string"
                              ? value.replace("T", " ")
                              : value ?? " "}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* RIGHT PANEL */}
                <div
                  className="p-9"
                  style={{ width: "50%", display: "flex", flexDirection: "column" }}
                >
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <h6 className="fw-bold text-secondary mb-0">
                      CLOSE FIELDS
                    </h6>            
                  </div>

                  <hr />

                  <div style={{ maxWidth: "350px" }}>
                    {/* Call Action */}
                    <div className="mb-3">
                      <label className="form-label fw-semibold small">
                        CALL ACTION
                      </label>
                      <select
                        className="form-select"
                        value={closeLoopForm.CloseLoopCate1}
                        onChange={(e) =>
                          setCloseLoopForm({
                            ...closeLoopForm,
                            CloseLoopCate1: e.target.value,
                          })
                        }
                      >
                        <option value="">Select Call Action</option>
                      </select>
                    </div>

                    {/* Call Sub Action */}
                    <div className="mb-3">
                      <label className="form-label fw-semibold small">
                        CALL SUB ACTION
                      </label>
                      <select
                        className="form-select"
                        value={closeLoopForm.CloseLoopCate2}
                        onChange={(e) =>
                          setCloseLoopForm({
                            ...closeLoopForm,
                            CloseLoopCate2: e.target.value,
                          })
                        }
                      >
                        <option value="">Select Call Sub Action</option>
                      </select>
                    </div>

                    {/* Remarks */}
                    <div className="mb-3">
                      <label className="form-label fw-semibold small">
                        REMARKS
                      </label>
                      <textarea
                        className="form-control"
                        rows="4"
                        value={closeLoopForm.closelooping_remarks}
                        onChange={(e) =>
                          setCloseLoopForm({
                            ...closeLoopForm,
                            closelooping_remarks: e.target.value,
                          })
                        }
                      />
                    </div>

                    <button
                      className="btn btn-sm btn-primary"
                      onClick={handleCloseLoopSubmit}
                    >
                      SUBMIT
                    </button>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="border-top text-center py-3 bg-light">
                <button
                  className="btn btn-outline-primary"
                  onClick={() => {
                    setSelectedRow(null);
                    setIsModalOpen(false);
                  }}
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
    </>
  );
}
