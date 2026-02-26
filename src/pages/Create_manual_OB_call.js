import React, { useState, useEffect } from "react";
import api from "../api";

const CampaignDetails = () => {
  const userType = localStorage.getItem("user_type");
  const company_id = localStorage.getItem("company_id");

  const [campaign, setCampaign] = useState("");
  const [allocation, setAllocation] = useState("");
  const [showTaggingPage, setShowTaggingPage] = useState(false);
  const [activeTab, setActiveTab] = useState("tagging");
  const [campaignList, setCampaignList] = useState([]);
  const [allocationList, setAllocationList] = useState([]);
  const [loading, setLoading] = useState(false);

  const [label1List, setLabel1List] = useState([]);
  const [label2List, setLabel2List] = useState([]);
  const [label3List, setLabel3List] = useState([]);
  const [label4List, setLabel4List] = useState([]);
  const [label5List, setLabel5List] = useState([]);

  const [label1, setLabel1] = useState("");
  const [label2, setLabel2] = useState("");
  const [label3, setLabel3] = useState("");
  const [label4, setLabel4] = useState("");
  const [label5, setLabel5] = useState("");

  const [msisdn, setMsisdn] = useState("");

  const [dynamicFields, setDynamicFields] = useState([]);
  const [formData, setFormData] = useState({});


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


  useEffect(() => {
    setCampaign("");
    setAllocation("");
    setCampaignList([]);
    setAllocationList([]);
    if (!activeCompanyId || activeCompanyId === "null")
        return;

    const fetchCampaigns = async () => {
        try {
        setLoading(true);

        const response = await api.get("/call/campaigns", {
            params: {
            CLIENT_ID: activeCompanyId,   // 👈 same pattern as your PUT
            },
        });

        setCampaignList(response.data);

        } catch (error) {
        console.error("Error fetching campaigns:", error);
        } finally {
        setLoading(false);
        }
    };

    fetchCampaigns();
    }, [activeCompanyId]);


    useEffect(() => {
        if (!activeCompanyId || !campaign) {
            setAllocationList([]);
            return;
        }

        const fetchAllocations = async () => {
            try {
            setLoading(true);

            const response = await api.get("/call/allocations", {
                params: {
                CLIENT_ID: activeCompanyId,
                campaign: campaign,
                },
            });

            setAllocationList(response.data);
            } catch (error) {
            console.error("Error fetching allocations:", error);
            setAllocationList([]);
            } finally {
            setLoading(false);
            }
        };

        fetchAllocations();
        }, [campaign, activeCompanyId]);



    useEffect(() => {
    if (!activeCompanyId || !campaign || !showTaggingPage) return;

    const fetchLabel1 = async () => {
        try {
        const res = await api.get("/label1", {
            params: {
            Client: activeCompanyId,
            CampaignId: campaign,
            },
        });

        setLabel1List(res.data);
        } catch (err) {
        console.error("Label1 error", err);
        setLabel1List([]);
        }
    };

    fetchLabel1();
    }, [campaign, activeCompanyId, showTaggingPage]);


    useEffect(() => {
    if (!label1) {
        setLabel2List([]);
        setLabel2("");
        return;
    }

    // 🔥 Reset all children first
    setLabel2("");
    setLabel3("");
    setLabel4("");
    setLabel5("");

    setLabel2List([]);
    setLabel3List([]);
    setLabel4List([]);
    setLabel5List([]);

    const fetchLabel2 = async () => {
        try {
        const res = await api.get("/label2", {
            params: {
            Client: activeCompanyId,
            CampaignId: campaign,
            parent_id: label1,
            },
        });

        setLabel2List(res.data);
        } catch (err) {
        setLabel2List([]);
        }
    };

    fetchLabel2();
    }, [label1, activeCompanyId, campaign]);


    useEffect(() => {
    if (!label2) {
        setLabel3List([]);
        setLabel3("");
        return;
    }

    setLabel3("");
    setLabel4("");
    setLabel5("");

    setLabel3List([]);
    setLabel4List([]);
    setLabel5List([]);

    const fetchLabel3 = async () => {
        try {
        const res = await api.get("/label3", {
            params: {
            Client: activeCompanyId,
            CampaignId: campaign,
            parent_id: label2,
            },
        });

        setLabel3List(res.data);
        } catch {
        setLabel3List([]);
        }
    };

    fetchLabel3();
    }, [label2, activeCompanyId, campaign]);



    useEffect(() => {
    if (!label3) {
        setLabel4List([]);
        setLabel4("");
        return;
    }

    setLabel4("");
    setLabel5("");

    setLabel4List([]);
    setLabel5List([]);


    const fetchLabel4 = async () => {
        try {
        const res = await api.get("/label4", {
            params: {
            Client: activeCompanyId,
            CampaignId: campaign,
            parent_id: label3,
            },
        });

        setLabel4List(res.data);
        } catch {
        setLabel4List([]);
        }
    };

    fetchLabel4();
    }, [label3, activeCompanyId, campaign]);


    useEffect(() => {
    if (!label4) {
        setLabel5List([]);
        setLabel5("");
        return;
    }

    setLabel5("");
    setLabel5List([]);

    const fetchLabel5 = async () => {
        try {
        const res = await api.get("/label5", {
            params: {
            Client: activeCompanyId,
            CampaignId: campaign,
            parent_id: label4,
            },
        });

        setLabel5List(res.data);
        } catch {
        setLabel5List([]);
        }
    };

    fetchLabel5();
    }, [label4, activeCompanyId, campaign]);


  useEffect(() => {
    setLabel1("");
    setLabel2("");
    setLabel3("");
    setLabel4("");
    setLabel5("");

    setLabel1List([]);
    setLabel2List([]);
    setLabel3List([]);
    setLabel4List([]);
    setLabel5List([]);
  }, [campaign]);



  useEffect(() => {
    if (!activeCompanyId || !campaign || !showTaggingPage) return;

    const fetchDynamicFields = async () => {
      try {
        const res = await api.get("/obfield_master", {
          params: {
            ClientId: activeCompanyId,
            CampaignId: campaign,
          },
        });

        setDynamicFields(res.data);

        // Initialize form data
        const initialData = {};
        res.data.forEach((field) => {
          initialData[field.FieldName] = "";
        });
        setFormData(initialData);

      } catch (err) {
        console.error("Error fetching dynamic fields:", err);
        setDynamicFields([]);
      }
    };

    fetchDynamicFields();
  }, [activeCompanyId, campaign, showTaggingPage]);


  const handleFieldChange = (fieldName, value) => {
    setFormData((prev) => ({
      ...prev,
      [fieldName]: value,
    }));
  };






  const handleSubmit = () => {
    if (!campaign || !allocation) {
      alert("Please select Campaign and Allocation");
      return;
    }
    setShowTaggingPage(true);
  };

  const handleSubmitTagging = async () => {
    try {
      setLoading(true);

      const getNameById = (list, id) => {
        const item = list.find((i) => String(i.id) === String(id));
        return item ? item.ecrName : "";
      };

      // 🔥 Build body (DO NOT include ClientId & CampaignId here)
      const body = {
        AllocationId: allocation,
        MSISDN: msisdn,

        Scenario: getNameById(label1List, label1),
        SubScenario1: getNameById(label2List, label2),
        SubScenario2: getNameById(label3List, label3),
        SubScenario3: getNameById(label4List, label4),
        SubScenario4: getNameById(label5List, label5),

        ...formData,
      };

      console.log("Query Params:", {
        ClientId: activeCompanyId,
        CampaignId: campaign,
      });

      console.log("Body:", body);

      const response = await api.post(
        "/save-tagging",
        body,
        {
          params: {
            ClientId: activeCompanyId,
            CampaignId: campaign,
          },
        }
      );

      console.log("API Response:", response.data);

      alert(response.data.message);

      if (response.data.dynamic_fields_saved) {
        console.log(
          "Dynamic Fields Saved:",
          response.data.dynamic_fields_saved
        );
      }

    } catch (error) {
      console.error("Submit error:", error.response?.data || error);
      alert("Submission failed ❌");
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setShowTaggingPage(false);
    setActiveTab("tagging");
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
    <div className="row">
      <div className="col-12">

        {/* -------------------- STEP 1: Selection Screen -------------------- */}
        {!showTaggingPage && (
          <div className="card p-4 mb-4">
            <div className="d-flex justify-content-between align-items-center mb-4">
            <h5 className="mb-4">CAMPAIGN DETAILS</h5>

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

            <div className="d-flex flex-wrap align-items-end gap-4">
              <div style={{ minWidth: "280px" }}>
                <label className="form-label fw-semibold">
                  Campaign Name
                </label>
                <select
                    className="form-select"
                    value={campaign}
                    onChange={(e) => setCampaign(e.target.value)}
                    >
                    <option value="">Select Campaign</option>

                    {campaignList.map((item) => (
                        <option key={item.id} value={item.id}>
                        {item.name}
                        </option>
                    ))}
                </select>
              </div>

              <div style={{ minWidth: "280px" }}>
                <label className="form-label fw-semibold">
                  Allocation Name
                </label>
                <select
                    className="form-select"
                    value={allocation}
                    onChange={(e) => setAllocation(e.target.value)}
                    disabled={!campaign}
                    >
                    <option value="">Select Allocation</option>

                    {allocationList.map((item) => (
                        <option key={item.id} value={item.id}>
                        {item.name}
                        </option>
                    ))}
                </select>
              </div>

              <div>
                <button
                  className="btn btn-primary fw-semibold px-4"
                  onClick={handleSubmit}
                >
                  SUBMIT
                </button>
              </div>
            </div>
          </div>
        )}

        {/* -------------------- STEP 2: Tagging Page -------------------- */}
        {showTaggingPage && (
          <>
            {/* Back Button */}
            <div className="mb-3">
              <button
                className="btn btn-outline-primary btn-sm"
                onClick={handleBack}
              >
                ← Back
              </button>
            </div>

            {/* Tabs */}
            <ul className="nav nav-tabs mb-3">
              <li className="nav-item">
                <button
                  className={`nav-link ${
                    activeTab === "tagging" ? "active" : ""
                  }`}
                  onClick={() => setActiveTab("tagging")}
                >
                  Tagging
                </button>
              </li>
              <li className="nav-item">
                <button
                  className={`nav-link ${
                    activeTab === "history" ? "active" : ""
                  }`}
                  onClick={() => setActiveTab("history")}
                >
                  History
                </button>
              </li>
              <li className="nav-item">
                <button
                  className={`nav-link ${
                    activeTab === "search" ? "active" : ""
                  }`}
                  onClick={() => setActiveTab("search")}
                >
                  Search
                </button>
              </li>
            </ul>

            {/* -------------------- TAGGING TAB -------------------- */}
            {activeTab === "tagging" && (
              <>
                {/* First Card */}
                <div className="card p-4 mb-4">
                  <div className="row g-4 align-items-center">
                    <div className="col-md-2">
                      <label className="form-label">MSISDN</label>
                      <input type="text" className="form-control" value={msisdn} onChange={(e) => setMsisdn(e.target.value)}/>
                    </div>

                    <div className="col-md-2">
                        <label className="form-label">Scenario 1</label>
                        <select
                            className="form-select"
                            value={label1}
                            onChange={(e) => setLabel1(e.target.value)}
                        >
                            <option value="">Select</option>
                            {label1List.map((item) => (
                            <option key={item.id} value={item.id}>
                                {item.ecrName}
                            </option>
                            ))}
                        </select>
                        </div>

                        {label2List.length > 0 && (
                        <div className="col-md-2">
                            <label className="form-label">Scenario 2</label>
                            <select
                            className="form-select"
                            value={label2}
                            onChange={(e) => setLabel2(e.target.value)}
                            >
                            <option value="">Select</option>
                            {label2List.map((item) => (
                                <option key={item.id} value={item.id}>
                                {item.ecrName}
                                </option>
                            ))}
                            </select>
                        </div>
                        )}

                        {label3List.length > 0 && (
                        <div className="col-md-2">
                            <label className="form-label">Scenario 3</label>
                            <select
                            className="form-select"
                            value={label3}
                            onChange={(e) => setLabel3(e.target.value)}
                            >
                            <option value="">Select</option>
                            {label3List.map((item) => (
                                <option key={item.id} value={item.id}>
                                {item.ecrName}
                                </option>
                            ))}
                            </select>
                        </div>
                        )}

                        {label4List.length > 0 && (
                        <div className="col-md-2">
                            <label className="form-label">Scenario 4</label>
                            <select
                            className="form-select"
                            value={label4}
                            onChange={(e) => setLabel4(e.target.value)}
                            >
                            <option value="">Select</option>
                            {label4List.map((item) => (
                                <option key={item.id} value={item.id}>
                                {item.ecrName}
                                </option>
                            ))}
                            </select>
                        </div>
                        )}

                        {label5List.length > 0 && (
                        <div className="col-md-2">
                            <label className="form-label">Scenario 5</label>
                            <select
                            className="form-select"
                            value={label5}
                            onChange={(e) => setLabel5(e.target.value)}
                            >
                            <option value="">Select</option>
                            {label5List.map((item) => (
                                <option key={item.id} value={item.id}>
                                {item.ecrName}
                                </option>
                            ))}
                            </select>
                        </div>
                        )}
                    </div>
                  </div>


                {/* Second Card */}
                <div className="card p-4">
                  <div className="row g-4">

                    {dynamicFields.map((field) => (
                      <div className="col-md-2" key={field.id}>
                        <label className="form-label">{field.FieldName}</label>

                        {/* TextBox */}
                        {field.FieldType === "TextBox" && (
                          <input
                            type="text"
                            className="form-control"
                            value={formData[field.FieldName] || ""}
                            onChange={(e) =>
                              handleFieldChange(field.FieldName, e.target.value)
                            }
                          />
                        )}

                        {/* TextArea */}
                        {field.FieldType === "TextArea" && (
                          <textarea
                            className="form-control"
                            rows="1"
                            value={formData[field.FieldName] || ""}
                            onChange={(e) =>
                              handleFieldChange(field.FieldName, e.target.value)
                            }
                          />
                        )}

                        {/* DropDown */}
                        {field.FieldType === "DropDown" && (
                          <select
                            className="form-select"
                            value={formData[field.FieldName] || ""}
                            onChange={(e) =>
                              handleFieldChange(field.FieldName, e.target.value)
                            }
                          >
                            <option value="">Select</option>
                            {field.values.map((val, idx) => (
                              <option key={idx} value={val}>
                                {val}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    ))}

                    <div className="col-12 text-center mt-3">
                      <button
                        className="btn btn-primary px-4"
                        onClick={handleSubmitTagging}
                        // onClick={() => console.log(formData)}
                      >
                        SUBMIT
                      </button>
                    </div>

                  </div>
                </div>
              </>
            )}

            {/* -------------------- HISTORY TAB -------------------- */}
            {activeTab === "history" && (
              <div className="card p-4">
                <h6>History</h6>
                <p className="text-muted">
                  History data will render here.
                </p>
              </div>
            )}

            {/* -------------------- SEARCH TAB -------------------- */}
            {activeTab === "search" && (
              <div className="card p-4">
                <h6>Search</h6>
                <p className="text-muted">
                  Search functionality will render here.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
    </div>
    </>
  );
};

export default CampaignDetails;