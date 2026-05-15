import React, { useEffect, useState } from "react";
import Select from "react-select";
import api from "../api";

function PlanSetting() {
  const userType = localStorage.getItem("user_type");

  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);

  const [agentOptions, setAgentOptions] = useState([]);

  const [remoteAgents, setRemoteAgents] = useState([]);
  const [dedicatedAgents, setDedicatedAgents] = useState([]);

  const [loading, setLoading] = useState(false);

  /* ---------------------------
     FETCH CLIENTS
  --------------------------- */
  useEffect(() => {
    if (userType === "Super-Admin" || userType === "Admin") {
      api
        .get("/agents/clients-rights")
        .then((res) => {
          const sorted = res.data.sort((a, b) =>
            a.company_name.localeCompare(b.company_name)
          );

          const formattedClients = sorted.map((client) => ({
            value: client.company_id,
            label: client.company_name,
          }));

          setClients(formattedClients);
        })
        .catch((err) => {
          console.error("Error fetching clients:", err);
        });
    }
  }, []);

  /* ---------------------------
     FETCH AGENTS
  --------------------------- */
  useEffect(() => {
    if (!selectedClient) return;

    setLoading(true);

    api
      .get(`/agent?client_id=${selectedClient.value}`)
      .then((res) => {
        const formatted = res.data.map((item) => ({
          value: item.username,

          label: `${item.displayname} - ${item.username}`,

          displayname: item.displayname,

          username: item.username,
        }));

        setAgentOptions(formatted);
      })
      .catch((err) => {
        console.error("Error fetching agents:", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [selectedClient]);

  /* ---------------------------
   FETCH SAVED PLAN
--------------------------- */
useEffect(() => {
  if (!selectedClient || agentOptions.length === 0) return;

  api
    .get(`/get-plan-setting?client_id=${selectedClient.value}`)
    .then((res) => {

      if (res.data.status !== "success") return;

      const remoteUsernames = res.data.remote_agents || [];

      const dedicatedUsernames =
        res.data.dedicated_agents || [];

      // Match usernames with react-select options
      const selectedRemote = agentOptions.filter((agent) =>
        remoteUsernames.includes(agent.value)
      );

      const selectedDedicated = agentOptions.filter((agent) =>
        dedicatedUsernames.includes(agent.value)
      );

      setRemoteAgents(selectedRemote);

      setDedicatedAgents(selectedDedicated);
    })
    .catch((err) => {
      console.error("Error fetching saved plan:", err);
    });

}, [selectedClient, agentOptions]);

  /* ---------------------------
     SUBMIT
  --------------------------- */
  const handleSubmit = async () => {
    if (!selectedClient) {
      alert("Please select client");
      return;
    }

    const payload = {
      client_id: selectedClient.value,

      remote_agents: remoteAgents.map((a) => a.value),

      dedicated_agents: dedicatedAgents.map((a) => a.value),
    };

    try {
      setLoading(true);

      const response = await api.post(
        "/save-plan-setting",
        payload
      );

      if (response.data.status === "success") {
        alert("Plan Setting Saved Successfully");


      } else {
        alert(response.data.message);
      }

    } catch (error) {
      console.error("Save Error:", error);

      alert("Failed to save plan setting");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div
        className="container-fluid"
        style={{
          minHeight: "100vh",
          width: "100%",
          padding: "20px 25px",
        }}
      >
        <div className="row">
          <div className="col-12">

            {/* MAIN CARD */}
            <div
              className="card border-0 shadow-lg"
              style={{
                borderRadius: "18px",
                overflow: "hidden",
              }}
            >

              {/* HEADER */}
              <div
                className="px-4 py-3"
                style={{
                  background: "#ffffff",
                  borderBottom: "1px solid #e5e7eb",
                }}
              >
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <h3
                      className="mb-1 fw-bold"
                      style={{
                        color: "#111827",
                      }}
                    >
                      Plan Setting
                    </h3>

                    <small
                      style={{
                        color: "#6b7280",
                      }}
                    >
                      Configure Remote & Dedicated Agents
                    </small>
                  </div>

                  <div
                    className="px-3 py-2 rounded-pill"
                    style={{
                      background: "#f3f4f6",
                      color: "#374151",
                      fontSize: "13px",
                      fontWeight: "600",
                    }}
                  >
                    Total Agents : {agentOptions.length}
                  </div>
                </div>
              </div>

              {/* BODY */}
              <div className="card-body p-4">

                {/* CLIENT */}
                <div className="mb-4">
                  <label className="form-label fw-semibold mb-2">
                    Select Client
                  </label>

                  <div style={{ width: "350px" }}>
                    <Select
                      options={clients}
                      value={selectedClient}
                      onChange={(value) => {
                        setSelectedClient(value);

                        setRemoteAgents([]);
                        setDedicatedAgents([]);
                      }}
                      placeholder="Search Client..."
                      isSearchable
                    />
                  </div>
                </div>

                {/* AGENT SECTIONS */}
                <div className="row g-4">

                  {/* REMOTE */}
                  <div className="col-md-6">
                    <div
                      className="border h-100 p-3"
                      style={{
                        borderRadius: "14px",
                        background: "#f8fafc",
                      }}
                    >
                      <div className="d-flex justify-content-between align-items-center mb-3">
                        <h5 className="mb-0 fw-bold text-primary">
                          Remote Agents
                        </h5>

                        <span className="badge bg-primary">
                          {remoteAgents.length}
                        </span>
                      </div>

                      <Select
                        isMulti
                        options={agentOptions}
                        value={remoteAgents}
                        onChange={setRemoteAgents}
                        placeholder="Select Remote Agents"
                        isLoading={loading}
                        closeMenuOnSelect={false}
                        getOptionLabel={(option) =>
                          `${option.displayname} - ${option.username}`
                        }
                      />

                      {/* SELECTED */}
                      {remoteAgents.length > 0 && (
                        <div className="mt-3">
                          <small className="text-muted fw-semibold">
                            Selected Agents
                          </small>

                          <div className="d-flex flex-wrap gap-2 mt-2">
                            {remoteAgents.map((agent) => (
                              <span
                                key={agent.value}
                                className="badge rounded-pill bg-primary"
                                style={{
                                  padding: "8px 12px",
                                  fontWeight: 500,
                                }}
                              >
                                {agent.displayname} - {agent.username}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* DEDICATED */}
                  <div className="col-md-6">
                    <div
                      className="border h-100 p-3"
                      style={{
                        borderRadius: "14px",
                        background: "#f8fafc",
                      }}
                    >
                      <div className="d-flex justify-content-between align-items-center mb-3">
                        <h5 className="mb-0 fw-bold text-success">
                          Dedicated Agents
                        </h5>

                        <span className="badge bg-success">
                          {dedicatedAgents.length}
                        </span>
                      </div>

                      <Select
                        isMulti
                        options={agentOptions}
                        value={dedicatedAgents}
                        onChange={setDedicatedAgents}
                        placeholder="Select Dedicated Agents"
                        isLoading={loading}
                        closeMenuOnSelect={false}
                        getOptionLabel={(option) =>
                          `${option.displayname} - ${option.username}`
                        }
                      />

                      {/* SELECTED */}
                      {dedicatedAgents.length > 0 && (
                        <div className="mt-3">
                          <small className="text-muted fw-semibold">
                            Selected Agents
                          </small>

                          <div className="d-flex flex-wrap gap-2 mt-2">
                            {dedicatedAgents.map((agent) => (
                              <span
                                key={agent.value}
                                className="badge rounded-pill bg-success"
                                style={{
                                  padding: "8px 12px",
                                  fontWeight: 500,
                                }}
                              >
                                {agent.displayname} - {agent.username}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* SUMMARY */}
                <div
                  className="mt-4 p-3"
                  style={{
                    background: "#f1f5f9",
                    borderRadius: "14px",
                  }}
                >
                  <div className="row text-center">

                    <div className="col-md-4">
                      <h6 className="text-muted mb-1">
                        Selected Client
                      </h6>

                      <div className="fw-bold">
                        {selectedClient?.label || "-"}
                      </div>
                    </div>

                    <div className="col-md-4">
                      <h6 className="text-muted mb-1">
                        Remote Count
                      </h6>

                      <div className="fw-bold text-primary">
                        {remoteAgents.length}
                      </div>
                    </div>

                    <div className="col-md-4">
                      <h6 className="text-muted mb-1">
                        Dedicated Count
                      </h6>

                      <div className="fw-bold text-success">
                        {dedicatedAgents.length}
                      </div>
                    </div>
                  </div>
                </div>

                {/* BUTTON */}
                <div className="text-end mt-4">
                  <button
                    className="btn btn-lg px-5"
                    style={{
                      background:
                        "linear-gradient(135deg, #4f46e5, #7c3aed)",
                      border: "none",
                      color: "#fff",
                      borderRadius: "12px",
                      fontWeight: "600",
                    }}
                    onClick={handleSubmit}
                    disabled={loading}
                  >
                    {loading
                      ? "Saving..."
                      : "Save Plan Setting"}
                  </button>
                </div>

              </div>
            </div>

          </div>
        </div>
      </div>
    </>
  );
}

export default PlanSetting;