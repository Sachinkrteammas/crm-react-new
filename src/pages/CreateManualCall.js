import React, { useState, useEffect } from 'react';
import '../styles/TaggingHistorySearchTabs.css';
import DatePicker from "react-datepicker";
import api from "../api";

export default function CreateManualCall() {
  const [form, setForm] = useState({
    inCallId: "",
    callFrom: "",
    scenario: "",
    scenario1: "",
    Name: "",
    Contact: "",
    City: "",
    State: "",
    pincode: "",
    productname: "",
    sourceofpurchase: "",
    DOP: "",
    Remarks: "",
    dateofpurchase: "",
    });

  const [historyData, setHistoryData] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [clientList, setClientList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [loadingSearch, setLoadingSearch] = useState(false);



  //scenario dropdown data
  const [scenarioList, setScenarioList] = useState([]);
  const [scenario1List, setScenario1List] = useState([]);

  
  // selected values
  const [scenario, setScenario] = useState("");
  const [scenario1, setScenario1] = useState("");

  
  const [scenarioName, setScenarioName] = useState("");
  const [scenario1Name, setScenario1Name] = useState("");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10; // you can change this to 20/50 etc.

  // Search pagination
  const [searchPage, setSearchPage] = useState(1);




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
      console.log("Level 1 Scenario Error:", err);
    }
  };


  useEffect(() => {
    if (scenario) {
      fetchScenarioLevel2(scenario);
    } else {
      setScenario1("");              // reset UI dropdown
      setScenario1Name("");          // reset name
      setScenario1List([]);          // clear list

      // ❗ also clear in form payload
      setForm(prev => ({
        ...prev,
        scenario: "",
        scenario1: ""
      }));
    }
  }, [scenario]);



  const fetchScenarioLevel2 = async (scenarioId) => {
    try {
      const res = await api.get(`/core_api/categories/level2/${scenarioId}`, {
        params: { client_id: activeCompanyId }
      });
      setScenario1List(res.data || []);
    } catch (err) {
      console.log("Level 2 Scenario Error:", err);
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




  const submitTaggingForm = async () => {
  try {
    setLoading(true);

    const payload = {
      client_id: activeCompanyId,
      msisdn: form.callFrom,
      category1: form.scenario,
      category2: form.scenario1,
      field1: form.Name,
      field2: form.Contact,
      field3: form.City,
      field4: form.State,
      field5: form.pincode,
      field6: form.productname,
      field7: form.sourceofpurchase,
      field8: form.DOP,
      field9: form.Remarks,
      field10: form.dateofpurchase,
      call_type: "Inbound"
    };

    const res = await api.post("/call-create", payload);

    alert(res.data.message || "Call inserted successfully");

    // reset after submit
    setForm({
      callFrom: "",
      scenario: "",
      scenario1: "",
      Name: "",
      Contact: "",
      City: "",
      State: "",
      pincode: "",
      productname: "",
      sourceofpurchase: "",
      DOP: "",
      Remarks: "",
      dateofpurchase: "",
    });

    fetchHistoryData(); // refresh table
  } catch (error) {
    console.error("Submit Error:", error);
    alert("Something went wrong");
  } finally {
    setLoading(false);
  }
};



  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Prompt data submitted:", form);
  };

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
            <div className="card mb-4">
              <div className="card-header">
                <h6 className="mb-0">Tagging Form</h6>
              </div>
              <div className="card-body">
                <form className="row g-4" onSubmit={handleSubmit}>
                    <div className="col-md-3">
                      <label className="form-label">Call From</label>
                      <input
                        name="callFrom"
                        className="form-control"
                        value={form.callFrom}
                        onChange={handleChange}
                      />
                    </div>
                    <div className="col-md-3">
                      <label className="form-label">Scenario</label>
                      <select
                        name="scenario"
                        className="form-select"
                        onChange={(e) => {
                          const selectedId = e.target.value;

                          const selectedObj = scenarioList.find(s => s.id == selectedId);
                          const nameValue = selectedObj?.ecrName || "";

                          setScenarioName(nameValue);

                          // send NAME instead of ID
                          handleChange({ target: { name: "scenario", value: nameValue } });

                          // for scenario1 loading
                          setScenario(selectedId);
                        }}
                      >
                        <option value="">Select Scenario</option>
                        {scenarioList.map(item => (
                          <option key={item.id} value={item.id}>
                            {item.ecrName}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-md-3">
                      <label className="form-label">Scenario 1</label>
                        <select
                          name="scenario1"
                          className="form-select"
                          onChange={(e) => {
                            const selectedId = e.target.value;

                            const selectedObj = scenario1List.find(s => s.id == selectedId);
                            const nameValue = selectedObj?.ecrName || "";

                            setScenario1Name(nameValue);

                            // send NAME instead of ID
                            handleChange({ target: { name: "scenario1", value: nameValue } });

                            // if needed for further dropdown
                            setScenario1(selectedId);
                          }}
                        >
                        <option value="">Select Scenario 1</option>
                        {scenario1List.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.ecrName}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-md-3">
                      <label className="form-label">Name</label>
                        <input
                          name="Name"
                          className="form-control"
                          value={form.Name}
                          onChange={handleChange}
                        />
                    </div>

                    <div className="col-md-3">
                      <label className="form-label">Contact</label>
                      <input
                        name="Contact"
                        className="form-control"
                        value={form.Contact}
                        onChange={handleChange}
                      />
                    </div>

                    <div className="col-md-3">
                      <label className="form-label">City</label>
                        <input
                          name="City"
                          className="form-control"
                          value={form.City}
                          onChange={handleChange}
                        />
                    </div>

                    <div className="col-md-3">
                      <label className="form-label">State</label>
                        <input
                          name="State"
                          className="form-control"
                          value={form.State}
                          onChange={handleChange}
                        />
                    </div>

                    <div className="col-md-3">
                      <label className="form-label">Pin Code</label>
                      <input
                        name="pincode"
                        className="form-control"
                        value={form.pincode}
                        onChange={handleChange}
                      />
                    </div>

                    <div className="col-md-3">
                      <label className="form-label">Product Name</label>
                      <input
                        name="productname"
                        className="form-control"
                        value={form.productname}
                        onChange={handleChange}
                      />
                    </div>

                    <div className="col-md-3">
                      <label className="form-label">Source Of Purchase</label>
                      <input
                        name="sourceofpurchase"
                        className="form-control"
                        value={form.sourceofpurchase}
                        onChange={handleChange}
                      />
                    </div>

                    <div className="col-md-3">
                      <label className="form-label">Select DOP</label>
                      <input
                        name="DOP"
                        className="form-control"
                        value={form.DOP}
                        onChange={handleChange}
                      />
                    </div>


                    <div className="col-md-3">
                      <label className="form-label">Remarks</label>
                      <input
                        name="Remarks"
                        className="form-control"
                        value={form.Remarks}
                        onChange={handleChange}
                      />
                    </div>

                    <div className="col-md-3">
                      <label className="form-label">Date Of Purchase</label>
                      <input
                        name="dateofpurchase"
                        className="form-control"
                        value={form.dateofpurchase}
                        onChange={handleChange}
                      />
                    </div>

                    <div className="col-12">
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={submitTaggingForm}
                      >
                        SUBMIT
                      </button>
                    </div>
                </form>
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
                        {[
                          "In Call ID",
                          "Call From",
                          "Scenarios",
                          "Sub Scenarios",
                          "Name",
                          "Contact",
                          "City",
                          "State",
                          "Pin Code",
                          "Product Name",
                          "Source of Purchase",
                          "DOP",
                          "Remarks",
                          "Date of Purchase",
                          "Call Action",
                          "Call Sub Action",
                          "Calling Date"
                        ].map((h) => (
                          <th key={h}>{h}</th>
                        ))}
                      </tr>
                    </thead>

                    <tbody>
                      {loadingHistory ? (
                        <tr>
                          <td colSpan="17" className="text-center p-3">Loading...</td>
                        </tr>
                      ) : historyData.length === 0 ? (
                        <tr>
                          <td colSpan="17" className="text-center p-3">No data available in table</td>
                        </tr>
                      ) : (
                        currentRows.map((row, idx) => (
                          <tr key={idx}>
                            <td>{row["In Call ID"]}</td>
                            <td>{row["Call From"]}</td>
                            <td>{row["Scenarios"]}</td>
                            <td>{row["Sub Scenarios"]}</td>
                            <td>{row["Name"]}</td>
                            <td>{row["Contact"]}</td>
                            <td>{row["City"]}</td>
                            <td>{row["State"]}</td>
                            <td>{row["Pin Code"]}</td>
                            <td>{row["Product Name"]}</td>
                            <td>{row["Source of Purchase"]}</td>
                            <td>{row["DOP"]}</td>
                            <td>{row["Remarks"]}</td>
                            <td>{row["Date of Purchase"]}</td>
                            <td>{row["Call Action"]}</td>
                            <td>{row["Call Sub Action"]}</td>
                            <td>{row["Calling Date"] ? row["Calling Date"].split("T")[0] : ""}</td>
                          </tr>
                        ))
                      )}
                    </tbody>

                  </table>
                  {/* Pagination */}
                  {historyData.length > 0 && (
                    <div className="d-flex justify-content-between align-items-center p-3">

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
                      <label className="form-label">IN CALL ID</label>
                      <input
                        name="inCallId"
                        className="form-control"
                        value={form.inCallId}
                        onChange={handleChange}
                      />
                    </div>
                    <div className="col-md-3">
                      <label className="form-label">Call From</label>
                      <input
                        name="callFrom"
                        className="form-control"
                        value={form.callFrom}
                        onChange={handleChange}
                      />
                    </div>
                    <div className="col-md-3">
                      <label className="form-label d-block">Call Date</label>
                      <DatePicker
                        selected={form.startDate}
                        onChange={(date) => setForm({ ...form, startDate: date })}
                        className="form-control"
                        placeholderText="Call Date"
                        dateFormat="dd-MM-yyyy"
                      />
                    </div>
                    <div className="col-md-3">
                      <label className="form-label">Scenario</label>
                      <select
                        name="scenario"
                        className="form-select"
                        onChange={(e) => {
                          const selectedId = e.target.value;
                          setScenario(selectedId);

                          const selectedObj = scenarioList.find(s => s.id == selectedId);
                          setScenarioName(selectedObj?.ecrName || "");

                          handleChange(e);
                        }}
                      >
                        <option value="">Select Scenario</option>
                        {scenarioList.map(item => (
                          <option key={item.id} value={item.id}>
                            {item.ecrName}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-md-3">
                      <label className="form-label">Scenario 1</label>
                      <select
                        name="scenario1"
                        className="form-select"
                        onChange={(e) => {
                          const selectedId = e.target.value;
                          setScenario1(selectedId);

                          const selectedObj = scenario1List.find(s => s.id == selectedId);
                          setScenario1Name(selectedObj?.ecrName || "");

                          handleChange(e);
                        }}
                      >
                        <option value="">Select Scenario 1</option>
                        {scenario1List.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.ecrName}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-md-3">
                      <label className="form-label">Name</label>
                      <input
                        name="Name"
                        className="form-control"
                        value={form.Name}
                        onChange={handleChange}
                      />
                    </div>

                    <div className="col-md-3">
                      <label className="form-label">Contact</label>
                      <input
                        name="Contact"
                        className="form-control"
                        value={form.Contact}
                        onChange={handleChange}
                      />
                    </div>

                    <div className="col-md-3">
                      <label className="form-label">City</label>
                      <input
                        name="City"
                        className="form-control"
                        value={form.City}
                        onChange={handleChange}
                      />
                    </div>

                    <div className="col-md-3">
                      <label className="form-label">State</label>
                      <input
                        name="State"
                        className="form-control"
                        value={form.State}
                        onChange={handleChange}
                      />
                    </div>

                    <div className="col-md-3">
                      <label className="form-label">Pin Code</label>
                      <input
                        name="pincode"
                        className="form-control"
                        value={form.pincode}
                        onChange={handleChange}
                      />
                    </div>

                    <div className="col-md-3">
                      <label className="form-label">Product Name</label>
                      <input
                        name="productname"
                        className="form-control"
                        value={form.productname}
                        onChange={handleChange}
                      />
                    </div>

                    <div className="col-md-3">
                      <label className="form-label">Source of Purchase</label>
                      <input
                        name="sourceofpurchase"
                        className="form-control"
                        value={form.sourceofpurchase}
                        onChange={handleChange}
                      />
                    </div>

                    <div className="col-md-3">
                      <label className="form-label">Select DOP</label>
                      <select
                        name="DOP"
                        className="form-select"
                        value={form.DOP}
                        onChange={handleChange}
                      >
                      </select>
                    </div>

                    <div className="col-md-3">
                      <label className="form-label">Remarks</label>
                      <input
                        name="Remarks"
                        className="form-control"
                        value={form.Remarks}
                        onChange={handleChange}
                      />
                    </div>

                    <div className="col-md-3">
                      <label className="form-label">Date of Purchase</label>
                      <input
                        name="dateofpurchase"
                        className="form-control"
                        value={form.dateofpurchase}
                        onChange={handleChange}
                      />
                    </div>
                  <div className="d-flex justify-content-center mt-3">
                    <button
                      className="btn btn-primary"
                      onClick={handleSearch}
                      disabled={isFormEmpty()}
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
                        {[
                          
                          "In Call ID",
                          "Call From",
                          "Calling Date",
                          "Scenarios",
                          "Sub Scenarios",
                          "Name",
                          "Contact",
                          "City",
                          "State",
                          "Pin Code",
                          "Product Name",
                          "Source of Purchase",
                          "DOP",
                          "Remarks",
                          "Date of Purchase"
                          
                        ].map(h=> <th key={h}>{h}</th> )}
                      </tr>
                    </thead>
                    <tbody>
                      {loadingSearch ? (
                        <tr>
                          <td colSpan="17" className="text-center p-3">Searching...</td>
                        </tr>
                      ) : searchResults.length === 0 ? (
                        <tr>
                          <td colSpan="17" className="text-center p-3">No data available in table</td>
                        </tr>
                      ) : (
                        paginatedSearchResults.map((row, idx) => (
                          <tr key={idx}>
                            <td>{row["In Call ID"]}</td>
                            <td>{row["Call From"]}</td>
                            <td>
                              {row["Calling Date"]
                                ? new Date(row["Calling Date"]).toLocaleString("en-IN", {
                                    year: "numeric",
                                    month: "2-digit",
                                    day: "2-digit",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                    second: "2-digit",
                                    hour12: false,
                                  })
                                : ""}
                            </td>
                            <td>{row["Scenarios"]}</td>
                            <td>{row["Sub Scenarios"]}</td>
                            <td>{row["Name"]}</td>
                            <td>{row["Contact"]}</td>
                            <td>{row["City"]}</td>
                            <td>{row["State"]}</td>
                            <td>{row["Pin Code"]}</td>
                            <td>{row["Product Name"]}</td>
                            <td>{row["Source of Purchase"]}</td>
                            <td>{row["DOP"]}</td>
                            <td>{row["Remarks"]}</td>
                            <td>{row["Date of Purchase"]}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
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
    </div>
    </>
  );
}
