import React, { useState, useEffect } from "react";
import api from "../api";

const CampaignListUI = () => {
  const userType = localStorage.getItem("user_type");
  const company_id = localStorage.getItem("company_id");

  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState(company_id);
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState(10);
  const [listId, setListId] = useState("");
  const [listName, setListName] = useState("");
  const [campaign, setCampaign] = useState("");
  const [campaignList, setCampaignList] = useState([]);
  const [campaignData, setCampaignData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // Active Client ID
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
    setCampaignList([]);

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





  // ✅ Fetch Campaign List (NO params)
  useEffect(() => {
    const fetchCampaignList = async () => {
      try {
        setLoading(true);

        const res = await api.get("/campaign-list");

        if (res.data?.status === "success") {
          setCampaignData(res.data.data || []);
        }
      } catch (err) {
        console.error("Failed to load campaign list:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchCampaignList();
  }, []);


  // 🔍 Search + Row Limit
  // 🔍 Filter Data
  const filteredData = campaignData.filter((item) =>
    (item?.company_name ?? "")
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  // 📄 Pagination Logic
  const totalPages = Math.ceil(filteredData.length / rows);
  const startIndex = (currentPage - 1) * rows;
  const endIndex = startIndex + rows;
  const paginatedData = filteredData.slice(startIndex, endIndex);



  const handleSubmit = async () => {
    if (!activeCompanyId || !campaign || !listId || !listName) {
      alert("Please fill all required fields.");
      return;
    }

    if (listName.length < 8) {
      alert("List Name must be minimum 8 characters.");
      return;
    }

    try {
      setLoading(true);

      const storedUserData = JSON.parse(localStorage.getItem("userData"));
      const updateUser = storedUserData?.auth_person;

      const payload = {
        client_id: Number(activeCompanyId),
        campaign_id: Number(campaign),
        list_id: listId,
        list_name: listName,
        logged_in_admin: updateUser,
      };

      const response = await api.post("/add-campaign-list", payload);

      if (response.data?.status === "success") {
        alert(response.data.message);

        // Reset fields after success
        setListId("");
        setListName("");
        setCampaign("");

        // Optional: Refresh campaign list table
        const res = await api.get("/campaign-list");
        if (res.data?.status === "success") {
          setCampaignData(res.data.data || []);
        }
      }

    } catch (error) {
      console.error("Error adding campaign list:", error);

      if (error.response) {
        // Backend error (like 400)
        const message =
          error.response.data?.detail || "Something went wrong.";

        alert(message);
      } else {
        // Network error
        alert("Server not reachable.");
      }
    } finally {
      setLoading(false);
    }
  };


  const formatDate = (dateString) => {
    const options = { day: "2-digit", month: "short", year: "numeric" };
    return new Date(dateString).toLocaleDateString("en-GB", options);
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

        {/* ADD CAMPAIGN LIST */}
        <div className="card p-4 mb-4">
          <div className="d-flex justify-content-between align-items-center mb-3">
          <h5 className="mb-4">ADD CAMPAIGN LIST ID</h5>

          {(userType === "Super-Admin" || userType === "Admin") &&
          clients.length > 0 && (
            <div className="d-flex align-items-center">
              <label className="form-label fw-semibold me-2 mb-0">
                Select Client:
              </label>
              <select
                className="form-select form-select-sm"
                style={{ width: "220px" }}
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

          <div className="d-flex flex-wrap align-items-end gap-3">

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

            <div style={{ maxWidth: "200px" }}>
              <label className="form-label fw-semibold">
                  List ID
                </label>
              <input
                type="text"
                className="form-control"
                placeholder="List ID *"
                value={listId}
                onChange={(e) => setListId(e.target.value)}
              />
            </div>

            <div style={{ maxWidth: "250px" }}>
              <label className="form-label fw-semibold">
                  List Name
                </label>
              <input
                type="text"
                className="form-control"
                placeholder="List Name Minimum 8 Characters"
                value={listName}
                onChange={(e) => setListName(e.target.value)}
              />
            </div>

              <button
                className="btn btn-primary fw-semibold"
                style={{ height: "38px" }}
                onClick={handleSubmit}
              >
                SUBMIT
              </button>

          </div>
        </div>

        {/* VIEW CLIENT CAMPAIGN LIST */}
        <div className="card p-4">
          <h5 className="mb-3">VIEW CLIENT CAMPAIGN LIST ID</h5>

          <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-3">

            <div style={{ maxWidth: "100px" }}>
              <select
                className="form-select"
                value={rows}
                onChange={(e) => setRows(Number(e.target.value))}
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>

            <div style={{ maxWidth: "250px" }}>
              <input
                type="text"
                className="form-control"
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

          </div>

          {loading ? (
            <div>Loading...</div>
          ) : (
            <div className="table-responsive">
              <table className="table table-bordered table-hover">
                <thead className="table-light">
                  <tr>
                    <th>S.No.</th>
                    <th>LIST ID</th>
                    <th>CAMPAIGN NAME</th>
                    <th>CREATE DATE</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedData.map((item, index) => (
                    <tr key={item.id}>
                      <td>{startIndex + index + 1}</td>
                      <td>{item.list_id}</td>
                      <td>{item.company_name}</td>
                      <td>{formatDate(item.create_date)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="d-flex justify-content-between align-items-center mt-3 mb-3">

                <button
                  className="btn btn-outline-primary btn-sm"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((prev) => prev - 1)}
                >
                  Previous
                </button>

                <div>
                  Page {currentPage} of {totalPages}
                </div>

                <button
                  className="btn btn-outline-primary btn-sm"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((prev) => prev + 1)}
                >
                  Next
                </button>

              </div>
            </div>
          )}
        </div>

      </div>
    </div>
    </div>
    </>
  );
};

export default CampaignListUI;
