import React, { useEffect, useState } from "react";
import api from "../api"; // axios instance

const CampaignsMapping = () => {
  const userType = localStorage.getItem("user_type");
  const companyId = localStorage.getItem("company_id");

  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState("");

  const [campaignName, setCampaignName] = useState("");
  const [groupId, setGroupId] = useState("");
  const [multiLangId, setMultiLangId] = useState("");
  const [inboundSkills, setInboundSkills] = useState("");

  const [tableData, setTableData] = useState([]);
  const [editing, setEditing] = useState(false);

  // ================================
  // FETCH CLIENTS
  // ================================
  useEffect(() => {
    if (userType === "Super-Admin" || userType === "Admin") {
      api
        .get("/agents/clients-rights")
        .then((res) => {
          const list = res.data || [];
          list.sort((a, b) =>
            a.company_name?.localeCompare(b.company_name, "en", { sensitivity: "base" })
          );
          setClients(list);
        })
        .catch((err) => console.error("Error fetching clients:", err));
    } else {
      setSelectedClient(String(companyId));
    }
  }, [userType, companyId]);

  // ================================
  // LOAD CAMPAIGN MAPPINGS & AUTO POPULATE FORM
  // ================================
  useEffect(() => {
    const loadMappings = async (cid) => {
      if (!cid) return;
      try {
        const res = await api.get(`/campaign-mapping/list/${cid}`);
        const data = res.data || [];
        setTableData(data);

        if (data.length > 0) {
          const campaign = data[0]; // auto-fill first campaign
          setCampaignName(campaign.campaignid || "");
          setGroupId(campaign.GroupId || "");
          setMultiLangId(campaign.multilang_ivrs || "");
          setInboundSkills(campaign.agent_skills || "");
          setEditing(true);
        } else {
          setCampaignName("");
          setGroupId("");
          setMultiLangId("");
          setInboundSkills("");
          setEditing(false);
        }
      } catch (err) {
        console.error("Error loading mappings:", err);
        setTableData([]);
        setCampaignName("");
        setGroupId("");
        setMultiLangId("");
        setInboundSkills("");
        setEditing(false);
      }
    };

    if (selectedClient) loadMappings(selectedClient);
  }, [selectedClient]);

  // ================================
  // UPDATE CAMPAIGN
  // ================================
  const handleUpdate = async () => {
    if (!selectedClient) return alert("Select a client first");
    if (!campaignName || !groupId) return alert("Campaign Name & Group ID are required");

    try {
      const formData = new FormData();
      formData.append("campaignid", campaignName);
      formData.append("GroupId", groupId);
      formData.append("multilang_ivrs", multiLangId);
      formData.append("agent_skills", inboundSkills);

      if (editing) {
        const res = await api.put(`/campaign-mapping/update/${selectedClient}`, formData);
        alert(res.data.message || "Updated successfully");
      }

      // refresh table
      const res = await api.get(`/campaign-mapping/list/${selectedClient}`);
      setTableData(res.data || []);
    } catch (err) {
      console.error("Update error:", err);
      alert("Failed to update campaign mapping");
    }
  };

  return (
    <div className="row">
      <div className="col-12">
        <h4 className="mb-4">Campaign Mapping</h4>

        {/* Client Dropdown */}
        {(userType === "Super-Admin" || userType === "Admin") && (
          <div className="mb-4 col-md-4 col-lg-3">
            <label className="form-label fw-semibold">Select Client</label>
            <select
              className="form-select"
              value={selectedClient}
              onChange={(e) => setSelectedClient(e.target.value)}
            >
              <option value="">-- Select Client --</option>
              {clients.map((c) => (
                <option key={c.company_id} value={String(c.company_id)}>
                  {c.company_name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Form */}
        <div className="card mb-3">
          <div className="card-body">
            <h5 className="mb-3">{editing ? "Edit Campaign" : "No Campaign Found"}</h5>

            <div className="row">
              <div className="mb-3 col-md-6">
                <label>Campaign Name</label>
                <input
                  type="text"
                  className="form-control"
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                />
              </div>

              <div className="mb-3 col-md-6">
                <label>Group ID</label>
                <input
                  type="text"
                  className="form-control"
                  value={groupId}
                  onChange={(e) => setGroupId(e.target.value)}
                />
              </div>
            </div>

            <div className="row">
              <div className="mb-3 col-md-6">
                <label>Multilanguage Group ID</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Multilanguage Group ID"
                  value={multiLangId}
                  onChange={(e) => setMultiLangId(e.target.value)}
                />
              </div>

              <div className="mb-3 col-md-6">
                <label>Inbound Agent Skills</label>
                <input
                  type="text"
                  className="form-control"
                  value={inboundSkills}
                  onChange={(e) => setInboundSkills(e.target.value)}
                />
              </div>
            </div>

            <p className="text-danger mb-3">
              <b>Note:</b> Do not Add Outbound Campaigns in Inbound Agent Skills.
            </p>

            {editing && (
              <button className="btn btn-primary" onClick={handleUpdate}>
                UPDATE
              </button>
            )}
          </div>
        </div>



        {/* Table */}
        <div className="card">
          <div className="card-body">
            <h5 className="mb-3">View Client Campaign</h5>
            <div className="table-responsive">
              <table className="table table-striped table-bordered">
                <thead className="table-light">
                  <tr>
                    <th>CLIENT CAMPAIGN</th>
                    <th>GROUP ID</th>
                    <th>MULTI LANGUAGE ID</th>
                    <th>INBOUND AGENT SKILLS</th>
                  </tr>
                </thead>
                <tbody>
                  {tableData.length > 0 ? (
                    tableData.map((row) => (
                      <tr key={row.id}>
                        <td>{row.campaignid || ""}</td>
                        <td>{row.GroupId || ""}</td>
                        <td>{row.multilang_ivrs || ""}</td>
                        <td>{row.agent_skills || ""}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="4" className="text-center">
                        No Data Found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default CampaignsMapping;
