import React, { useState, useEffect } from 'react';
import '../styles/TaggingHistorySearchTabs.css';
import DatePicker from "react-datepicker";
import api from "../api";
import { useNavigate } from 'react-router-dom';

export default function CreateManualCall() {
  // const [form, setForm] = useState({
  //   inCallId: "",
  //   callFrom: "",
  //   scenario: "",
  //   scenario1: "",
  //   Name: "",
  //   Contact: "",
  //   City: "",
  //   State: "",
  //   pincode: "",
  //   productname: "",
  //   sourceofpurchase: "",
  //   DOP: "",
  //   Remarks: "",
  //   dateofpurchase: "",
  //   });

  const [fields, setFields] = useState([]);
  const [form, setForm] = useState({});
  const navigate = useNavigate();

  const [historyData, setHistoryData] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [clientList, setClientList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [loadingSearch, setLoadingSearch] = useState(false);



  const [scenarioList, setScenarioList] = useState([]);
  const [scenario1List, setScenario1List] = useState([]);
  const [scenario2List, setScenario2List] = useState([]);
  const [scenario3List, setScenario3List] = useState([]);
  const [scenario4List, setScenario4List] = useState([]);

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

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10; // you can change this to 20/50 etc.

  // Search pagination
  const [searchPage, setSearchPage] = useState(1);

  const [apiData, setApiData] = useState([]);


  const isFormEmpty = () => {
  return Object.values(form).every(value => !value || value === "");
};




  const loadClients = async () => {
  try {
    const res = await api.get("/agents/clients-rights");

    const sorted = (res.data || []).sort((a, b) =>
      a.company_name.localeCompare(b.company_name)
    );

    setClientList(sorted);

    // ✅ Auto-select first client ONLY if user is Admin/Superadmin
    if ((userType === "Super-Admin" || userType === "Admin")) {
      if (!selectedClient && sorted.length > 0) {
        setSelectedClient(sorted[0].company_id);  // 👈 FIX
      }
    }

  } catch (error) {
    console.error("Error loading clients:", error);
  }
};



  // User info
  const userType = localStorage.getItem("user_type");
  const companyId = localStorage.getItem("company_id");

  // Client dropdown
  const [selectedClient, setSelectedClient] = useState(companyId);

  const activeCompanyId =
    userType === "Super-Admin" || userType === "Admin"
      ? selectedClient
      : companyId;


  // Auto-set client for non-admin users
  useEffect(() => {
    if (userType !== "Super-Admin" && userType !== "Admin") {
      setSelectedClient(companyId);
    }
  }, []);


  // Fetch fields dynamically
  useEffect(() => {
    const loadFields = async () => {
      try {
        const res = await api.get("/fields", {
          params: { client_id: activeCompanyId },
        });

        setFields(res.data);

        // Initialize form state
        const initial = {};
        res.data.forEach(f => {
          initial[f.FieldName] = "";
        });
        setForm(initial);

      } catch (err) {
        console.error("Error fetching fields", err);
      }
    };

    loadFields();
  }, [activeCompanyId]);




  const fetchHistoryData = async () => {
  setLoading(true);

  try {
    setLoadingHistory(true);

    const today = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 10);

    const startDate = start.toISOString().split("T")[0];
    const endDate = today.toISOString().split("T")[0];

    const response = await api.get("/create_manual_call", {
      params: {
        client_id: activeCompanyId,
        startdate: startDate,
        enddate: endDate
      }
    });

    // ✅ DIRECT ARRAY RESPONSE
    setHistoryData(response.data || []);
    
  } catch (err) {
    console.error("Error fetching history:", err);
  } finally {
    setLoadingHistory(false);
    setLoading(false);
  }
};


  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;
  const currentRows = historyData.slice(indexOfFirstRow, indexOfLastRow);

  const totalPages = Math.ceil(historyData.length / rowsPerPage);

  const goToPage = (page) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  };



// Load clients on mount
useEffect(() => {
  loadClients();
}, []);


// Re-fetch history whenever activeCompanyId changes
useEffect(() => {
  if (activeCompanyId) {
    fetchHistoryData();
  }
}, [activeCompanyId]);



  useEffect(() => {
    if (activeCompanyId) {
      fetchScenarioLevel1();
    }
  }, [activeCompanyId]);

  const fetchScenarioLevel1 = async () => {
    try {
      const res = await api.get(`/core_api/categories/level1`, {
        params: { client_id: activeCompanyId }
      });
      setScenarioList(res.data || []);
    } catch (err) {
      console.log("Level1 Error:", err);
    }
  };



  useEffect(() => {
  if (scenario) {
    fetchScenarioLevel2(scenario);
  }

  setScenario1("");
  setScenario2("");
  setScenario3("");
  setScenario4("");

  setScenario1List([]);
  setScenario2List([]);
  setScenario3List([]);
  setScenario4List([]);
}, [scenario]);




  const fetchScenarioLevel2 = async (id) => {
    try {
      const res = await api.get(`/core_api/categories/level2/${id}`, {
        params: { client_id: activeCompanyId }
      });
      setScenario1List(res.data || []);
    } catch (err) {
      console.log("Level2 Error:", err);
    }
  };


  useEffect(() => {
    if (scenario1) {
      fetchScenarioLevel3(scenario1);
    }

    setScenario2("");
    setScenario3("");
    setScenario4("");
    setScenario2List([]);
    setScenario3List([]);
    setScenario4List([]);
  }, [scenario1]);



  const fetchScenarioLevel3 = async (id) => {
    try {
      const res = await api.get(`/core_api/categories/level3/${id}`, {
        params: { client_id: activeCompanyId }
      });
      setScenario2List(res.data || []);
    } catch (err) {
      console.log("Level3 Error:", err);
    }
  };


  useEffect(() => {
    if (scenario2) {
      fetchScenarioLevel4(scenario2);
    }

    setScenario3("");
    setScenario4("");
    setScenario3List([]);
    setScenario4List([]);
  }, [scenario2]);



  const fetchScenarioLevel4 = async (id) => {
    try {
      const res = await api.get(`/core_api/categories/level4/${id}`, {
        params: { client_id: activeCompanyId }
      });
      setScenario3List(res.data || []);
    } catch (err) {
      console.log("Level4 Error:", err);
    }
  };


  useEffect(() => {
    if (scenario3) {
      fetchScenarioLevel5(scenario3);
    }

    setScenario4("");
    setScenario4List([]);

  }, [scenario3]);


  const fetchScenarioLevel5 = async (id) => {
    try {
      const res = await api.get(`/core_api/categories/level5/${id}`, {
        params: { client_id: activeCompanyId }
      });
      setScenario4List(res.data || []);
    } catch (err) {
      console.log("Level5 Error:", err);
    }
  };







  const handleSearch = async () => {
  setLoadingSearch(true);
  setLoading(true);

  try {
    const response = await api.get("/search_manual_call", {
      params: {
        client_id: activeCompanyId,
        in_call_id: form.inCallId || "",
        call_from: form.callFrom || "",
        scenario: scenarioName || "",
        sub_scenario1: scenario1Name || "",
        name: form.Name || "",
        contact: form.Contact || "",
        city: form.City || "",
        state: form.State || "",
        pincode: form.pincode || "",
        product_name: form.productname || "",
        source_of_purchase: form.sourceofpurchase || "",
        remarks: form.Remarks || "",
        date_of_purchase: form.dateofpurchase || "",
        call_date: form.startDate
          ? form.startDate.toISOString()
          : undefined
      }
    });

    setSearchResults(response.data.data || []);
  } catch (err) {
    console.error("Search error:", err);
  } finally {
    setLoadingSearch(false);
    setLoading(false);
  }
};

  const paginatedSearchResults = searchResults.slice(
  (searchPage - 1) * rowsPerPage,
  searchPage * rowsPerPage
);





  // Handle value change
  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };



  const handleSubmit = async (e) => {
    e.preventDefault();

    const payload = {
      msisdn: form.callFrom, // or whichever field is MSISDN
      category1: scenarioName,
      category2: scenario1Name,
      category3: scenario2Name,
      category4: scenario3Name,
      category5: scenario4Name,
      call_type: "Inbound",

      fields: {}
    };

    // Convert FieldName → FieldNumber mapping
    fields.forEach((field) => {
      payload.fields[field.fieldNumber] = form[field.FieldName] || null;
    });

    console.log("FINAL PAYLOAD:", payload);

    try {
      await api.post("/call-create", payload, {
        params: { client_id: activeCompanyId }
      });
      alert("Saved successfully");
      await fetchHistoryData();
    } catch (err) {
      console.error(err);
      alert("Error saving");
    }
  };



  const fetchCallFlow = async () => {
    try {
      if (!activeCompanyId) return;

      const res = await api.get("/call-flow", {
        params: {
          client_id: activeCompanyId,
          category: scenarioName || "",
          type: scenario1Name || "",
          subtype: scenario2Name || "",
          subtype1: scenario3Name || "",
          subtype2: scenario4Name || "",
        },
      });

      setApiData(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error("Call Flow API Error:", error);
      setApiData([]);
    }
  };



  useEffect(() => {
  // Only call API when at least scenarioName is selected
  if (scenarioName) {
    fetchCallFlow();
  }
}, [scenarioName, scenario1Name, scenario2Name, scenario3Name, scenario4Name, activeCompanyId]);




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

    <div className="card mb-5 shadow-sm">
      {/* ——— Tabs Header ——— */}
      <div className="card-header bg-light border-0 pb-0">
        <ul className="nav nav-tabs custom-tabs" role="tablist">
          {['Tagging','History','Search'].map((t, i) => (
            <li className="nav-item" key={t}>
              <button
                className={`nav-link ${i===0?'active':''}`}
                data-bs-toggle="tab"
                data-bs-target={`#pane-${t.toLowerCase()}`}
                type="button"
                role="tab"
                aria-selected={i===0}
              >
                {t}
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* ——— Tabs Content ——— */}
      <div className="card-body pt-4">
        {/* ——— Select Client (Only for admin/superadmin) ——— */}
        {(userType === "Super-Admin" || userType === "Admin") && (
        <div className="ms-6">
          <select
            className="form-select"
            value={selectedClient}
            onChange={(e) => setSelectedClient(e.target.value)}
            style={{ maxWidth: "220px" }}
          >
            <option value="">--Select Client--</option>
            {clientList.map((client) => (
              <option key={client.company_id} value={client.company_id}>
                {client.company_name}
              </option>
            ))}
          </select>
        </div>
      )}
        <div className="tab-content">

          {/* — Tagging — */}
          <div className="tab-pane fade show active" id="pane-tagging" role="tabpanel">
             {/* 🆕 2-column layout */}
          <div className="row">

            {/* LEFT SIDE — Tagging Form */}
            <div className="col-md-8">
            <div className="card mb-4">
              <div className="card-header">
                <h6 className="mb-0">Tagging Form</h6>
              </div>
              <div className="card-body">
                <form className="row g-4" onSubmit={handleSubmit}>

                  <div className="col-md-3">
                    <label className="form-label">Call From</label>
                    <input
                      type="text"
                      className="form-control"
                      value={form.callFrom || ""}
                      onChange={(e) =>
                        setForm({ ...form, callFrom: e.target.value })
                      }
                    />
                  </div>

                  {/* 🔹 SCENARIO LEVEL 1 */}
                  <div className="col-md-3">
                    <label className="form-label">Scenario Level 1</label>
                    <select
                      className="form-select"
                      value={scenario || ""}
                      onChange={(e) => {
                        const selectedId = e.target.value;
                        setScenario(selectedId);

                        const obj = scenarioList.find(o => o.id == selectedId);
                        setScenarioName(obj?.ecrName || "");
                      }}
                    >
                      <option value="">Select</option>
                      {scenarioList.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.ecrName}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* 🔹 SCENARIO LEVEL 2 */}
                  {scenario1List.length > 0 && (
                    <div className="col-md-3">
                      <label className="form-label">Scenario Level 2</label>
                      <select
                        className="form-select"
                        value={scenario1 || ""}
                        onChange={(e) => {
                          const selectedId = e.target.value;
                          setScenario1(selectedId);

                          const obj = scenario1List.find(o => o.id == selectedId);
                          setScenario1Name(obj?.ecrName || "");
                        }}
                      >
                        <option value="">Select</option>
                        {scenario1List.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.ecrName}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* 🔹 SCENARIO LEVEL 3 */}
                  {scenario2List.length > 0 && (
                    <div className="col-md-3">
                      <label className="form-label">Scenario Level 3</label>
                      <select
                        className="form-select"
                        value={scenario2 || ""}
                        onChange={(e) => {
                          const selectedId = e.target.value;
                          setScenario2(selectedId);

                          const obj = scenario2List.find(o => o.id == selectedId);
                          setScenario2Name(obj?.ecrName || "");
                        }}
                      >
                        <option value="">Select</option>
                        {scenario2List.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.ecrName}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* 🔹 SCENARIO LEVEL 4 */}
                  {scenario3List.length > 0 && (
                    <div className="col-md-3">
                      <label className="form-label">Scenario Level 4</label>
                      <select
                        className="form-select"
                        value={scenario3 || ""}
                        onChange={(e) => {
                          const selectedId = e.target.value;
                          setScenario3(selectedId);

                          const obj = scenario3List.find(o => o.id == selectedId);
                          setScenario3Name(obj?.ecrName || "");
                        }}
                      >
                        <option value="">Select</option>
                        {scenario3List.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.ecrName}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* 🔹 SCENARIO LEVEL 5 */}
                  {scenario4List.length > 0 && (
                    <div className="col-md-3">
                      <label className="form-label">Scenario Level 5</label>
                      <select
                        className="form-select"
                        value={scenario4 || ""}
                        onChange={(e) => {
                          const selectedId = e.target.value;
                          setScenario4(selectedId);

                          const obj = scenario4List.find(o => o.id == selectedId);
                          setScenario4Name(obj?.ecrName || "");
                        }}
                      >
                        <option value="">Select</option>
                        {scenario4List.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.ecrName}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                    {fields
                      .sort((a, b) => a.fieldNumber - b.fieldNumber)
                      .map((field) => (
                        <div className="col-md-3" key={field.id}>
                          <label className="form-label">{field.FieldName}</label>

                          {/* TextBox */}
                          {field.FieldType === "TextBox" && (
                            <input
                              type="text"
                              name={field.FieldName}
                              className="form-control"
                              value={form[field.FieldName] || ""}
                              onChange={handleChange}
                            />
                          )}

                          {/* TextArea */}
                          {field.FieldType === "TextArea" && (
                            <textarea
                              name={field.FieldName}
                              className="form-control"
                              rows="1"
                              value={form[field.FieldName] || ""}
                              onChange={handleChange}
                            ></textarea>
                          )}

                          {/* DropDown */}
                          {field.FieldType === "DropDown" && (
                            <select
                              name={field.FieldName}
                              className="form-select"
                              value={form[field.FieldName] || ""}
                              onChange={handleChange}
                            >
                              <option value="">Select</option>
                              {field.values.map((v) => (
                                <option key={v.id} value={v.Value}>
                                  {v.Value}
                                </option>
                              ))}
                            </select>
                          )}
                        </div>
                      ))}
                    <div className="col-12">
                      <button
                        type="button"
                        className="btn btn-outline-primary rounded-3 me-2"
                        onClick={() => navigate(-1)}
                      >
                        ← Back
                      </button>
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={handleSubmit}
                      >
                        SUBMIT
                      </button>
                    </div>
                </form>
              </div>
            </div>
          </div>

          {/* RIGHT SIDE — API Response */}
          <div className="col-md-4">
            <div className="card mb-4" style={{ height: "650px", overflowY: "auto" }}>

              <div className="card-body">

                {/* Display API Data */}
                {apiData && apiData.length > 0 ? (
                  apiData.map((item) => (
                    <div className="mb-3 p-2 border rounded" key={item.id}>
                      <h6 className="fw-bold">{item.category}</h6>
                      {/* <p className="mb-1"><strong>Type:</strong> {item.type}</p>
                      <p className="mb-1"><strong>Subtypes:</strong> {item.subtype} / {item.subtype1} / {item.subtype2}</p> */}

                      {/* Show HTML safely */}
                      <div
                        className="mt-2"
                        dangerouslySetInnerHTML={{ __html: item.resolution }}
                      ></div>
                    </div>
                  ))
                ) : (
                  <p> </p>
                )}

              </div>
            </div>
          </div>
        </div>
        </div>

          {/* — History — */}
          <div className="tab-pane fade" id="pane-history" role="tabpanel">
            <div className="card">
              <div className="card-header">
                <h6 className="mb-0">History Log</h6>
              </div>

              <div className="card-body p-0">
                <div className="table-responsive">
                  <table className="table table-hover mb-0">
                    <thead className="table-light">
                      <tr>
                        {historyData.length > 0 &&
                          Object.keys(historyData[0]).map((key) => (
                            <th key={key}>{key}</th>
                          ))}
                      </tr>
                    </thead>

                    <tbody>
                      {loadingHistory ? (
                        <tr>
                          <td colSpan="50" className="text-center p-3">Loading...</td>
                        </tr>
                      ) : historyData.length === 0 ? (
                        <tr>
                          <td colSpan="50" className="text-center p-3">
                            No data available in table
                          </td>
                        </tr>
                      ) : (
                        currentRows.map((row, idx) => (
                          <tr key={idx}>
                            {Object.keys(historyData[0]).map((key) => (
                              <td key={key}>{row[key] || ""}</td>
                            ))}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                  </div>
                  {/* Pagination */}
                  {historyData.length > 0 && (
                    <div className="d-flex justify-content-between align-items-center p-3 border-top">

                      <button
                        className="btn btn-sm btn-outline-primary"
                        onClick={() => goToPage(currentPage - 1)}
                        disabled={currentPage === 1}
                      >
                        Prev
                      </button>

                      <span>
                        Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong>
                      </span>

                      <button
                        className="btn btn-sm btn-outline-primary"
                        onClick={() => goToPage(currentPage + 1)}
                        disabled={currentPage === totalPages}
                      >
                        Next
                      </button>

                    </div>
                  )}                
              </div>
            </div>
          </div>


          {/* — Search — */}
          <div className="tab-pane fade" id="pane-search" role="tabpanel">
            <div className="card mb-4">
              <div className="card-header">
                <h6 className="mb-0">Advanced Search</h6>
              </div>
              <div className="card-body">
                <div className="row g-4 align-items-end">
                    <div className="col-md-3">
                    <label className="form-label">Call From</label>
                    <input
                      type="text"
                      className="form-control"
                      value={form.callFrom || ""}
                      onChange={(e) =>
                        setForm({ ...form, callFrom: e.target.value })
                      }
                    />
                  </div>

                  {/* 🔹 SCENARIO LEVEL 1 */}
                  <div className="col-md-3">
                    <label className="form-label">Scenario Level 1</label>
                    <select
                      className="form-select"
                      value={scenario || ""}
                      onChange={(e) => {
                        const selectedId = e.target.value;
                        setScenario(selectedId);

                        const obj = scenarioList.find(o => o.id == selectedId);
                        setScenarioName(obj?.ecrName || "");
                      }}
                    >
                      <option value="">Select</option>
                      {scenarioList.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.ecrName}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* 🔹 SCENARIO LEVEL 2 */}
                  {scenario1List.length > 0 && (
                    <div className="col-md-3">
                      <label className="form-label">Scenario Level 2</label>
                      <select
                        className="form-select"
                        value={scenario1 || ""}
                        onChange={(e) => {
                          const selectedId = e.target.value;
                          setScenario1(selectedId);

                          const obj = scenario1List.find(o => o.id == selectedId);
                          setScenario1Name(obj?.ecrName || "");
                        }}
                      >
                        <option value="">Select</option>
                        {scenario1List.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.ecrName}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* 🔹 SCENARIO LEVEL 3 */}
                  {scenario2List.length > 0 && (
                    <div className="col-md-3">
                      <label className="form-label">Scenario Level 3</label>
                      <select
                        className="form-select"
                        value={scenario2 || ""}
                        onChange={(e) => {
                          const selectedId = e.target.value;
                          setScenario2(selectedId);

                          const obj = scenario2List.find(o => o.id == selectedId);
                          setScenario2Name(obj?.ecrName || "");
                        }}
                      >
                        <option value="">Select</option>
                        {scenario2List.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.ecrName}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* 🔹 SCENARIO LEVEL 4 */}
                  {scenario3List.length > 0 && (
                    <div className="col-md-3">
                      <label className="form-label">Scenario Level 4</label>
                      <select
                        className="form-select"
                        value={scenario3 || ""}
                        onChange={(e) => {
                          const selectedId = e.target.value;
                          setScenario3(selectedId);

                          const obj = scenario3List.find(o => o.id == selectedId);
                          setScenario3Name(obj?.ecrName || "");
                        }}
                      >
                        <option value="">Select</option>
                        {scenario3List.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.ecrName}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* 🔹 SCENARIO LEVEL 5 */}
                  {scenario4List.length > 0 && (
                    <div className="col-md-3">
                      <label className="form-label">Scenario Level 5</label>
                      <select
                        className="form-select"
                        value={scenario4 || ""}
                        onChange={(e) => {
                          const selectedId = e.target.value;
                          setScenario4(selectedId);

                          const obj = scenario4List.find(o => o.id == selectedId);
                          setScenario4Name(obj?.ecrName || "");
                        }}
                      >
                        <option value="">Select</option>
                        {scenario4List.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.ecrName}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                    {fields
                      .sort((a, b) => a.fieldNumber - b.fieldNumber)
                      .map((field) => (
                        <div className="col-md-3" key={field.id}>
                          <label className="form-label">{field.FieldName}</label>

                          {/* TextBox */}
                          {field.FieldType === "TextBox" && (
                            <input
                              type="text"
                              name={field.FieldName}
                              className="form-control"
                              value={form[field.FieldName] || ""}
                              onChange={handleChange}
                            />
                          )}

                          {/* TextArea */}
                          {field.FieldType === "TextArea" && (
                            <textarea
                              name={field.FieldName}
                              className="form-control"
                              rows="1"
                              value={form[field.FieldName] || ""}
                              onChange={handleChange}
                            ></textarea>
                          )}

                          {/* DropDown */}
                          {field.FieldType === "DropDown" && (
                            <select
                              name={field.FieldName}
                              className="form-select"
                              value={form[field.FieldName] || ""}
                              onChange={handleChange}
                            >
                              <option value="">Select</option>
                              {field.values.map((v) => (
                                <option key={v.id} value={v.Value}>
                                  {v.Value}
                                </option>
                              ))}
                            </select>
                          )}
                        </div>
                      ))}
                  <div className="d-flex justify-content-center mt-3">
                    <button
                      className="btn btn-primary"
                      onClick={handleSearch}
                      // disabled={isFormEmpty()}
                    >
                      Search
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <h6 className="mb-0">Search Results</h6>
              </div>
              <div className="card-body p-2">
                <div className="table-responsive p-3">
                  <table className="table table-hover mb-0">
                    <thead className="table-light">
                      <tr>
                        {searchResults.length > 0 &&
                          Object.keys(searchResults[0]).map((col) => (
                            <th key={col}>{col}</th>
                          ))}
                      </tr>
                    </thead>

                    <tbody>
                      {loadingSearch ? (
                        <tr>
                          <td colSpan="100" className="text-center p-3">
                            Searching...
                          </td>
                        </tr>
                      ) : searchResults.length === 0 ? (
                        <tr>
                          <td colSpan="100" className="text-center p-3">
                            No data available in table
                          </td>
                        </tr>
                      ) : (
                        paginatedSearchResults.map((row, idx) => (
                          <tr key={idx}>
                            {Object.keys(searchResults[0]).map((col) => (
                              <td key={col}>
                                {/* Special formatting for Calling Date */}
                                {col === "Calling Date" && row[col]
                                  ? new Date(row[col]).toLocaleString("en-IN", {
                                      year: "numeric",
                                      month: "2-digit",
                                      day: "2-digit",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                      second: "2-digit",
                                      hour12: false,
                                    })
                                  : row[col] || ""}
                              </td>
                            ))}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                  </div>
                  {/* Pagination */}
                  {searchResults.length > 0 && (
                    <div className="d-flex justify-content-between align-items-center mt-3">
                      <button
                        className="btn btn-sm btn-primary"
                        disabled={searchPage === 1}
                        onClick={() => setSearchPage(searchPage - 1)}
                      >
                        Previous
                      </button>

                      <span>
                        Page {searchPage} of {Math.ceil(searchResults.length / rowsPerPage)}
                      </span>

                      <button
                        className="btn btn-sm btn-primary"
                        disabled={searchPage === Math.ceil(searchResults.length / rowsPerPage)}
                        onClick={() => setSearchPage(searchPage + 1)}
                      >
                        Next
                      </button>
                    </div>
                  )}
                
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    </div>
    </>
  );
}
