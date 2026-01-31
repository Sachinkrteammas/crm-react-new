import React, { useEffect, useState } from "react";
import api from "../api";

const RealtimeAgentMapWithClients = () => {
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState("");
  const [tableData, setTableData] = useState([]);
  const [loading, setLoading] = useState(false);

  /* ------------------ FETCH CLIENTS ------------------ */
  useEffect(() => {
    const fetchClients = async () => {
      try {
        const res = await api.get("/companies");

        const sortedClients = res.data.sort((a, b) =>
          (a.company_name || "").localeCompare(
            b.company_name || "",
            "en",
            { sensitivity: "base" }
          )
        );

        setClients(sortedClients);
      } catch (err) {
        console.error("Error fetching clients:", err);
      }
    };

    fetchClients();
  }, []);

  /* ------------------ FETCH AGENT DATA (REUSABLE) ------------------ */
  const fetchAgentData = async (clientIds = []) => {
    setLoading(true);
    try {
      const res = await api.post("/client_live_agent", {
        client_ids: clientIds, // [] = ALL clients
      });

      const transformedData = Object.entries(res.data).map(
        ([clientName, skillsObj]) => ({
          client_name: clientName,
          skills: Object.entries(skillsObj).map(
            ([skillName, agentCount]) => ({
              skill_name: skillName,
              agent_count: agentCount,
            })
          ),
        })
      );

      setTableData(transformedData);
    } catch (err) {
      console.error("Error fetching realtime agent map:", err);
      alert("Error fetching data");
    } finally {
      setLoading(false);
    }
  };

  /* ------------------ LOAD ALL DATA ON PAGE OPEN ------------------ */
  useEffect(() => {
    fetchAgentData([]); // 👈 EMPTY ARRAY = LOAD ALL CLIENTS
  }, []);

  /* ------------------ VIEW BUTTON ------------------ */
  const handleView = () => {
    if (selectedClient) {
      fetchAgentData([Number(selectedClient)]);
    } else {
      fetchAgentData([]); // If no client selected → ALL
    }
  };


  const downloadAgentExcel = async (igpname) => {
    try {
      const response = await api.get(
        "/export-agent-excel",
        {
          params: { igpname },
          responseType: "blob", // 👈 VERY IMPORTANT
        }
      );

      // Create blob URL
      const url = window.URL.createObjectURL(
        new Blob([response.data])
      );

      // Get filename from response headers
      const contentDisposition = response.headers["content-disposition"];
      let fileName = "agent_list.xlsx";

      if (contentDisposition) {
        const match = contentDisposition.match(/filename="(.+)"/);
        if (match && match[1]) {
          fileName = match[1];
        }
      }

      // Trigger download
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();

      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Excel download failed", err);
      alert("Failed to download Excel");
    }
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
        {/* ------------------ FILTER CARD ------------------ */}
        <div className="row">
          <div className="col-12">
            <div className="card mb-4">
              <h6 className="card-header">REALTIME AGENT MAP WITH CLIENTS</h6>
              <div className="card-body">
                <div className="row g-3 align-items-end">

                  {/* Client Select */}
                  <div className="col-md-3">
                    <label className="form-label">Select Client</label>
                    <select
                      className="form-control"
                      value={selectedClient}
                      onChange={(e) => setSelectedClient(e.target.value)}
                    >
                      <option value="">ALL</option>
                      {clients.map((c) => (
                        <option key={c.company_id} value={c.company_id}>
                          {c.company_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* View Button */}
                  <div className="col-md-2">
                    <button
                      className="btn btn-primary"
                      onClick={handleView}
                    >
                      VIEW
                    </button>
                  </div>

                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ------------------ TABLE CARD ------------------ */}
        <div className="row">
          <div className="col-12">
            <div className="card">
              <h6 className="card-header">REALTIME AGENT MAP WITH CLIENTS</h6>
              <div className="card-body p-0">
                <div className="table-responsive">
                  <table className="table table-bordered table-striped mb-0">
                    <thead className="table-primary">
                      <tr>
                        <th style={{ width: "80px" }}>SNO.</th>
                        <th>CLIENT NAME</th>
                        <th>SKILLED</th>
                        <th style={{ width: "150px" }}>AGENT COUNT</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tableData.length > 0 ? (
                        tableData.map((row, index) => (
                          <React.Fragment key={index}>
                            {row.skills.map((skill, i) => (
                              <tr key={i}>
                                {i === 0 && (
                                  <>
                                    <td rowSpan={row.skills.length}>
                                      {index + 1}
                                    </td>
                                    <td rowSpan={row.skills.length}>
                                      {row.client_name}
                                    </td>
                                  </>
                                )}
                                <td>{skill.skill_name}</td>
                                <td
                                  className="text-primary fw-bold"
                                  style={{ cursor: "pointer" }}
                                  onClick={() => downloadAgentExcel(skill.skill_name)}
                                >
                                  {skill.agent_count}
                                </td>
                              </tr>
                            ))}
                          </React.Fragment>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="4" className="text-center">
                            No data available
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

      </div>
    </>
  );
};

export default RealtimeAgentMapWithClients;
