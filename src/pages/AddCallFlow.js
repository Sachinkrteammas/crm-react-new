import { useState, useEffect } from "react";
import { Editor } from "@tinymce/tinymce-react";
import api from "../api";

export default function AddCallFlow() {
  const [form, setForm] = useState({
    language: "",
    category: "",
    type: "",
    subtype: "",
    subtype1: "",
    subtype2: "",
    resolution: "",
  });

  const [level1, setLevel1] = useState([]);
  const [level2, setLevel2] = useState([]);
  const [level3, setLevel3] = useState([]);
  const [level4, setLevel4] = useState([]);
  const [level5, setLevel5] = useState([]);

  // store selected IDs ONLY for fetching
  const [selectedIds, setSelectedIds] = useState({
    l1: null,
    l2: null,
    l3: null,
    l4: null,
  });


  // 🔹 User info
  const userType = localStorage.getItem("user_type");
  const companyId = localStorage.getItem("company_id");

  // 🔹 Client dropdown (Admin / Super Admin)
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState(companyId);
  const [callFlows, setCallFlows] = useState([]);
  const [loadingTable, setLoadingTable] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5; // change if needed

  
  



  const activeCompanyId =
    userType === "Super-Admin" || userType === "Admin"
      ? selectedClient
      : companyId;


  const canShowTable =
    userType === "Client"
      ? true
      : !!selectedClient && selectedClient !== "null";


  useEffect(() => {
    if (!activeCompanyId || activeCompanyId == "null") return;

    api
      .get(`/core_api/categories/level1?client_id=${activeCompanyId}`)
      .then((res) => setLevel1(res.data))
      .catch(() => setLevel1([]));
  }, [activeCompanyId]);

  
  useEffect(() => {
    if (!selectedIds.l1) return;
    api
      .get(`/core_api/categories/level2/${selectedIds.l1}?client_id=${activeCompanyId}`)
      .then((res) => setLevel2(res.data));
  }, [selectedIds.l1]);

  useEffect(() => {
    if (!selectedIds.l2) return;
    api
      .get(`/core_api/categories/level3/${selectedIds.l2}?client_id=${activeCompanyId}`)
      .then((res) => setLevel3(res.data));
  }, [selectedIds.l2]);

  useEffect(() => {
    if (!selectedIds.l3) return;
    api
      .get(`/core_api/categories/level4/${selectedIds.l3}?client_id=${activeCompanyId}`)
      .then((res) => setLevel4(res.data));
  }, [selectedIds.l3]);

  useEffect(() => {
    if (!selectedIds.l4) return;
    api
      .get(`/core_api/categories/level5/${selectedIds.l4}?client_id=${activeCompanyId}`)
      .then((res) => setLevel5(res.data));
  }, [selectedIds.l4]);





  // 🔹 Fetch clients
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

  // 🔹 Set default client for non-admin users
  useEffect(() => {
    if (userType !== "Super-Admin" && userType !== "Admin") {
      setSelectedClient(companyId);
    }
  }, [userType, companyId]);


  useEffect(() => {
    if (!selectedClient) return;

    // 🔁 HARD RESET on client change
    setForm({
      language: "",
      category: "",
      type: "",
      subtype: "",
      subtype1: "",
      subtype2: "",
      resolution: "",
    });

    setSelectedIds({ l1: null, l2: null, l3: null, l4: null });

    // clear dependent levels
    setLevel2([]);
    setLevel3([]);
    setLevel4([]);
    setLevel5([]);

  }, [selectedClient]);



  const fetchCallFlows = async () => {
    if (!canShowTable || !activeCompanyId) {
      setCallFlows([]);
      return;
    }

    try {
      setLoadingTable(true);
      const res = await api.get(
        `/callflow?client_id=${activeCompanyId}`
      );

      // ⚠️ your API returns { client_id, count, data }
      setCallFlows(res.data.data || []);
      setCurrentPage(1);
    } catch (err) {
      console.error("Error fetching call flow:", err);
      setCallFlows([]);
    } finally {
      setLoadingTable(false);
    }
  };


  useEffect(() => {
    fetchCallFlows();
  }, [activeCompanyId, canShowTable]);



  const handleSelect = (level, item) => {
    if (!item) return;

    if (level === "category") {
      setForm((p) => ({
        ...p,
        category: item.ecrName,
        type: "",
        subtype: "",
        subtype1: "",
        subtype2: "",
      }));

      setSelectedIds({ l1: item.id, l2: null, l3: null, l4: null });
      setLevel2([]); setLevel3([]); setLevel4([]); setLevel5([]);
      return;
    }

    if (level === "type") {
      setForm((p) => ({
        ...p,
        type: item.ecrName,
        subtype: "",
        subtype1: "",
        subtype2: "",
      }));

      setSelectedIds((p) => ({ ...p, l2: item.id, l3: null, l4: null }));
      setLevel3([]); setLevel4([]); setLevel5([]);
      return;
    }

    if (level === "subtype") {
      setForm((p) => ({
        ...p,
        subtype: item.ecrName,
        subtype1: "",
        subtype2: "",
      }));

      setSelectedIds((p) => ({ ...p, l3: item.id, l4: null }));
      setLevel4([]); setLevel5([]);
      return;
    }

    if (level === "subtype1") {
      setForm((p) => ({
        ...p,
        subtype1: item.ecrName,
        subtype2: "",
      }));

      setSelectedIds((p) => ({ ...p, l4: item.id }));
      setLevel5([]);
      return;
    }

    if (level === "subtype2") {
      setForm((p) => ({
        ...p,
        subtype2: item.ecrName,
      }));
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleEditorChange = (content) => {
    setForm((prev) => ({ ...prev, resolution: content }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!activeCompanyId || activeCompanyId === "null") {
      alert("Client not selected");
      return;
    }

    if (!form.language) {
      alert("Please Select Language.")
      return;
    }

    if(!form.category) {
      alert("Please Select at least one Scenario.")
      return;
    }

    setLoadingTable(true);

    try {
      const formData = new FormData();

      formData.append("language", form.language);
      formData.append("category", form.category);
      formData.append("type", form.type);
      formData.append("subtype", form.subtype);
      formData.append("subtype1", form.subtype1);
      formData.append("subtype2", form.subtype2);
      formData.append("resolution", form.resolution); // 🔥 RAW HTML
      formData.append("createby", activeCompanyId);   // ✅ selected client

      await api.post(
        `/call-flow/create?client_id=${activeCompanyId}`,
        formData
        // ❌ do NOT set headers
      );

      alert("Call flow created successfully");
      handleReset();
      fetchCallFlows();

    } catch (err) {
      console.error("Error saving call flow:", err);
      alert("Failed to save call flow");
    }
    finally {
      setLoadingTable(false);
    }
  };  

  const handleReset = () => {
    setForm({
      language: "",
      category: "",
      type: "",
      subtype: "",
      subtype1: "",
      subtype2: "",
      resolution: "",
    });

    setSelectedIds({ l1: null, l2: null, l3: null, l4: null });
    setLevel2([]); setLevel3([]); setLevel4([]); setLevel5([]);
  };



  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this call flow?")) {
      return;
    }

    try {
      setLoadingTable(true);

      await api.delete(`/call-flow/delete?id=${id}`);

      // ✅ remove row instantly from UI
      setCallFlows((prev) => prev.filter((item) => item.id !== id));

      alert("Call flow deleted successfully");
    } catch (err) {
      console.error("Delete failed:", err);
      alert("Failed to delete call flow");
    } finally {
      setLoadingTable(false);
    }
  };


  const totalPages = Math.ceil(callFlows.length / itemsPerPage);

  const paginatedCallFlows = callFlows.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );



  return (
    <>
      {loadingTable && (
        <div className="loader-overlay">
          <div className="bar"></div>
          <div className="bar"></div>
          <div className="bar"></div>
          <div className="bar"></div>
          <div className="bar"></div>
        </div>
      )}

      <div className={`priority-wrapper ${loadingTable ? "blurred" : ""}`}>
    <div className="row">
      <div className="col-12">
        <div className="mb-3">
          <h4>Add Call Flow</h4>
        </div>

        <div className="card">
          {/* <h6 className="card-header">CALL FLOW</h6> */}
          <div className="card-body">

            <form onSubmit={handleSubmit}>

              <div className="d-flex justify-content-between align-items-center mb-3">
                <h6 className="mb-0">DEFINE RESOLUTION</h6>

                {(userType === "Super-Admin" || userType === "Admin") && (
                  <div style={{ width: "280px" }}>
                    <select
                      className="form-select form-select-sm"
                      value={selectedClient}
                      onChange={(e) => setSelectedClient(e.target.value)}
                    >
                      <option value="">Select Client</option>
                      {clients.map((c) => (
                        <option key={c.company_id} value={c.company_id}>
                          {c.company_name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="row mb-3">
                <label className="col-sm-2 col-form-label">Language</label>
                <div className="col-sm-4">
                  <select
                    name="language"
                    className="form-select"
                    value={form.language}
                    onChange={handleChange}
                  >
                    <option value="">Select</option>
                    <option value="English">English</option>
                    <option value="Hindi">Hindi</option>
                  </select>
                </div>
              </div>

              <div className="row mb-3">
                <label className="col-sm-2 col-form-label">Scenario</label>
                <div className="col-sm-4">
                  <select
                    className="form-select"
                    value={form.category}
                    onChange={(e) => {
                      const item = level1.find(i => i.ecrName === e.target.value);
                      handleSelect("category", item);
                    }}
                  >
                    <option value="">Select</option>
                    {level1.map(i => (
                      <option key={i.id} value={i.ecrName}>
                        {i.ecrName}
                      </option>
                    ))}
                  </select>

                  {level2.length > 0 && (
                    <select
                      className="form-select mt-2"
                      value={form.type}
                      onChange={(e) => {
                        const item = level2.find(i => i.ecrName === e.target.value);
                        handleSelect("type", item);
                      }}
                    >
                      <option value="">Select</option>
                      {level2.map(i => (
                        <option key={i.id} value={i.ecrName}>{i.ecrName}</option>
                      ))}
                    </select>
                  )}

                  {level3.length > 0 && (
                    <select
                      className="form-select mt-2"
                      value={form.subtype}
                      onChange={(e) => {
                        const item = level3.find(i => i.ecrName === e.target.value);
                        handleSelect("subtype", item);
                      }}
                    >
                      <option value="">Select</option>
                      {level3.map(i => (
                        <option key={i.id} value={i.ecrName}>{i.ecrName}</option>
                      ))}
                    </select>
                  )}


                  {level4.length > 0 && (
                    <select
                      className="form-select mt-2"
                      value={form.subtype1}
                      onChange={(e) => {
                        const item = level4.find(i => i.ecrName === e.target.value);
                        handleSelect("subtype1", item);
                      }}
                    >
                      <option value="">Select</option>
                      {level4.map(i => (
                        <option key={i.id} value={i.ecrName}>{i.ecrName}</option>
                      ))}
                    </select>
                  )}

                  {level5.length > 0 && (
                    <select
                      className="form-select mt-2"
                      value={form.subtype2}
                      onChange={(e) => {
                        const item = level5.find(i => i.ecrName === e.target.value);
                        handleSelect("subtype2", item);
                      }}
                    >
                      <option value="">Select</option>
                      {level5.map(i => (
                        <option key={i.id} value={i.ecrName}>{i.ecrName}</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              <div className="row mb-4">
                <label className="col-sm-2 col-form-label">Resolution</label>
                <div className="col-sm-10">
                  <Editor
                    apiKey="ofd6e9qqhtme50qw3m5m9blembl5sv38ngr7dijtcet3e0sy"
                    value={form.resolution}
                    init={{
                      height: 300,
                      menubar: true,
                      plugins: "lists link image paste help wordcount",
                      toolbar:
                        "undo redo | formatselect | bold italic | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | help",
                    }}
                    onEditorChange={handleEditorChange}
                  />
                </div>
              </div>

              <div className="d-flex gap-3">
                <button type="submit" className="btn btn-primary">
                  ADD
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  className="btn btn-secondary"
                >
                  RESET
                </button>
              </div>
            </form>
          </div>
        </div>
        {/* ================= VIEW TABLE ================= */}
        {canShowTable && (
          <div className="card mt-4">
            <h6 className="card-header">VIEW</h6>

            <div className="table-responsive">
              <table className="table table-bordered table-sm">
                <thead className="table-light">
                  <tr>
                    <th>S.NO</th>
                    <th>LANGUAGE</th>
                    <th>SCENARIO</th>
                    <th>SUB SCENARIO 1</th>
                    <th>SUB SCENARIO 2</th>
                    <th>SUB SCENARIO 3</th>
                    <th>SUB SCENARIO 4</th>
                    <th>RESOLUTION</th>
                    <th>ACTION</th>
                  </tr>
                </thead>
                <tbody>
                {loadingTable && (
                  <tr>
                    <td colSpan="9" className="text-center">
                      Loading...
                    </td>
                  </tr>
                )}

                {!loadingTable && callFlows.length === 0 && (
                  <tr>
                    <td colSpan="9" className="text-center">
                      No data found
                    </td>
                  </tr>
                )}

                {!loadingTable &&
                  paginatedCallFlows.map((row, index) => (
                    <tr key={row.id}>
                      <td>{(currentPage - 1) * itemsPerPage + index + 1}</td>
                      <td>{row.language || "-"}</td>
                      <td>{row.category || "-"}</td>
                      <td>{row.type || "-"}</td>
                      <td>{row.subtype || "-"}</td>
                      <td>{row.subtype1 || "-"}</td>
                      <td>{row.subtype2 || "-"}</td>
                      <td>
                        <div
                          dangerouslySetInnerHTML={{
                            __html: row.resolution,
                          }}
                        />
                      </td>
                      <td>
                        <button
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => handleDelete(row.id)}
                        >
                          🗑
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
              </table>

              {callFlows.length > itemsPerPage && (
              <div className="d-flex justify-content-end align-items-center gap-3 p-2">
                <button
                  className="btn btn-sm btn-outline-primary"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(p => p - 1)}
                >
                  Prev
                </button>

                <span className="fw-semibold">
                  {currentPage} of {totalPages}
                </span>

                <button
                  className="btn btn-sm btn-outline-primary"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(p => p + 1)}
                >
                  Next
                </button>
              </div>
            )}

            </div>
          </div>
        )}

      </div>
    </div>
    </div>
    </>
  );
}
