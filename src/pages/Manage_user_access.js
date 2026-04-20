import React, { useState, useEffect } from "react";
import api from "../api";

const ManageUserAccess = () => {
  const userType = localStorage.getItem("user_type");
  const companyId = localStorage.getItem("company_id");

  const [userEmails, setUserEmails] = useState([]);
  const [email, setEmail] = useState("");
  const [selectedMenu, setSelectedMenu] = useState("Out Call Management");

  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState(companyId);

  const [campaigns, setCampaigns] = useState([]);

  const [selectedCampaigns, setSelectedCampaigns] = useState([]);

  // ---------------- FETCH CLIENTS ----------------
  useEffect(() => {
    if (userType === "Super-Admin" || userType === "Admin") {
      api.get("/agents/clients-rights")
        .then(res => {
          const sorted = res.data.sort((a, b) =>
            a.company_name.localeCompare(b.company_name)
          );
          setClients(sorted);
        })
        .catch(err => console.error("Client fetch error", err));
    }
  }, []);

  useEffect(() => {
    if (!selectedClient) return;

    api
        .get(`/login_users_username/basic`, {
        params: { create_id: selectedClient },
        })
        .then((res) => {
        if (res.data.status === "success") {
            setUserEmails(res.data.data);
        }
        })
        .catch((err) => console.error("User fetch error", err));
    }, [selectedClient]);

    useEffect(() => {
        setEmail("");
    }, [selectedClient]);


    useEffect(() => {
        if (!selectedClient) return;

        api
            .get(`/campaigns_name`, {
            params: { client_id: selectedClient },
            })
            .then((res) => {
            if (res.data.status === "success") {
                setCampaigns(res.data.data);
            }
            })
            .catch((err) => console.error("Campaign fetch error", err));
    }, [selectedClient]);

    useEffect(() => {
      setSelectedCampaigns([]);
    }, [selectedClient]);


  useEffect(() => {
    if (!email) return;

    const selectedUser = userEmails.find(
        (u) => u.username === email
    );

    if (!selectedUser) return;

    const userId = selectedUser.id;

    api
        .get(`/login_users/${userId}/outbound_access`)
        .then((res) => {
        if (res.data.status === "success") {
            const access = res.data.outbound_access;

            if (access) {
            // convert "635,663" → [635, 663]
            const campaignIds = access
                .split(",")
                .map((id) => Number(id));

            setSelectedCampaigns(campaignIds);
            } else {
            setSelectedCampaigns([]);
            }
        }
        })
        .catch((err) => {
        console.error("Outbound access fetch error", err);
        });
    }, [email, userEmails]);


    useEffect(() => {
      setSelectedCampaigns([]);
    }, [email]);

  // ---------------- HANDLE CHECKBOX ----------------
  const handleCheckboxChange = (campaign) => {
    if (selectedCampaigns.includes(campaign)) {
      setSelectedCampaigns(
        selectedCampaigns.filter((item) => item !== campaign)
      );
    } else {
      setSelectedCampaigns([...selectedCampaigns, campaign]);
    }
  };

  // ---------------- SUBMIT ----------------
  const handleSubmit = async () => {
    if (!selectedClient) {
        alert("Please select a client");
        return;
    }

    if (!email) {
        alert("Please select user");
        return;
    }

    if (selectedCampaigns.length === 0) {
        alert("Please select at least one campaign");
        return;
    }

    try {
        // 🔥 Get selected user object
        const selectedUser = userEmails.find(
        (u) => u.username === email
        );

        if (!selectedUser) {
        alert("User not found");
        return;
        }

        const userId = selectedUser.id;

        // Convert campaign IDs to comma-separated string
        const campaignIds = selectedCampaigns.join(",");

        const { data } = await api.put(
        `/login_users_access/${userId}/outbound_access`,
        null,
        {
            params: {
            outbound_access: campaignIds,
            },
        }
        );

        if (data.status === "success") {
        alert(data.message);
        console.log("Response:", data);
        } else {
        alert(data.message || "Failed to update access");
        }

    } catch (err) {
        console.error(err);
        alert("Something went wrong");
    }
    };

  return (
  <div>
    <h3 className="mb-4">Manage User Access</h3>

    <div className="card p-4">

      {/* Header Row */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h6 className="text-uppercase text-muted mb-0">
          Manage User Access
        </h6>

        {(userType === "Super-Admin" || userType === "Admin") && (
          <div style={{ width: "250px" }}>
            <select
              className="form-control"
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

      {/* ✅ MAIN FORM AREA */}
      <div className="row">
        <div className="col-md-5">

          {/* Email */}
          <div className="mb-3">
            <select
              className="form-control"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={!selectedClient}
            >
              <option value="">Select User</option>
              {userEmails.map((user) => (
                <option key={user.id} value={user.username}>
                  {user.username}
                </option>
              ))}
            </select>
          </div>

          {/* Menu */}
          <div className="mb-3">
            <select
              className="form-control"
              value={selectedMenu}
              onChange={(e) => setSelectedMenu(e.target.value)}
              disabled={!selectedClient}
            >
              <option>Out Call Management</option>
            </select>
          </div>

          {/* Campaign */}
          {selectedClient && (
            <>
              <label className="mb-2 fw-semibold">Select Campaign</label>

              <div
                style={{
                  maxHeight: "150px",
                  overflowY: "auto",
                  border: "1px solid #ddd",
                  padding: "10px",
                  borderRadius: "4px",
                }}
              >
                {campaigns.length > 0 ? (
                  campaigns.map((campaign) => (
                    <div key={campaign.id} className="form-check">
                      <input
                        type="checkbox"
                        className="form-check-input"
                        id={campaign.id}
                        checked={selectedCampaigns.includes(campaign.id)}
                        onChange={() => handleCheckboxChange(campaign.id)}
                      />
                      <label
                        className="form-check-label"
                        htmlFor={campaign.id}
                      >
                        {campaign.CampaignName}
                      </label>
                    </div>
                  ))
                ) : (
                  <p className="text-muted small mb-0">
                    No campaigns found
                  </p>
                )}
              </div>
            </>
          )}

          {/* Submit */}
          <div className="mt-4">
            <button
              className="btn btn-primary"
              onClick={handleSubmit}
              disabled={!selectedClient || !email}
            >
              SUBMIT
            </button>
          </div>

        </div>
      </div>
    </div>
  </div>
);
};

export default ManageUserAccess;