
import React, { useState, useEffect } from "react";
import {
  getAbandCallSettings,
  addAbandCallSetting,
  deleteAbandCallSetting,
} from "../services/authService";
import api from "../api";
import { Trash2 } from "lucide-react";

const AbandCallSetting = () => {
  const [form, setForm] = useState({
    client: "",
    startTime: "",
    endTime: "",
    withinMinutes: "",
  });

  const [clients, setClients] = useState([]);
  const [settings, setSettings] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [searchClient, setSearchClient] = useState("");
  const [message, setMessage] = useState({ text: "", type: "" });

  // Auto-hide message after 3 seconds
  useEffect(() => {
    if (message.text) {
      const timer = setTimeout(() => setMessage({ text: "", type: "" }), 3000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const fetchSettings = async () => {
    try {
      const data = await getAbandCallSettings(searchClient);
      const sorted = data.sort((a, b) =>
        String(a.client_id).localeCompare(String(b.client_id))
      );
      setSettings(sorted);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, [searchClient]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const generateTimeOptions = () => {
    let times = [];
    for (let h = 0; h < 24; h++) {
      for (let m = 0; m < 60; m++) {
        const hh = String(h).padStart(2, "0");
        const mm = String(m).padStart(2, "0");
        times.push(`${hh}:${mm}`);
      }
    }
    return times;
  };

  const minuteOptions = Array.from({ length: 100 }, (_, i) => i + 1);

  const handleAdd = async () => {
    if (
      !form.client ||
      !form.startTime ||
      !form.endTime ||
      !form.withinMinutes
    ) {
      setMessage({ text: "Please fill all fields", type: "error" });
      return;
    }
    try {
      await addAbandCallSetting({
        client_id: form.client,
        start_time: form.startTime,
        end_time: form.endTime,
        aband_status: form.withinMinutes.toString(),
      });
      setForm({ client: "", startTime: "", endTime: "", withinMinutes: "" });
      setCurrentPage(1);
      setMessage({ text: "Aband Call added successfully", type: "success" });
      fetchSettings();
    } catch (error) {
      setMessage({ text: error || "Failed to add setting", type: "error" });
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteAbandCallSetting(id);
      setMessage({ text: "Aband Call deleted successfully", type: "success" });
      fetchSettings();
    } catch (error) {
      setMessage({ text: error || "Failed to delete setting", type: "error" });
    }
  };

  const filteredSettings = settings.filter((item) =>
    item.client_id.toLowerCase().includes(searchClient.toLowerCase())
  );

  const totalPages = Math.ceil(filteredSettings.length / rowsPerPage);
  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;
  const currentRows = filteredSettings.slice(indexOfFirstRow, indexOfLastRow);

  useEffect(() => {
    const fetchClients = async () => {
      try {
        const res = await api.get("/agents/clients-rights");
        const sortedClients = res.data.sort((a, b) =>
          a.company_name.localeCompare(b.company_name, "en", {
            sensitivity: "base",
          })
        );
        setClients(sortedClients);
      } catch (err) {
        console.error("Error fetching clients:", err);
      }
    };
    fetchClients();
  }, []);

  return (
    <div className="card p-4 mb-4 position-relative">
      <h5 className="mb-3">Aband Call Setting</h5>

      {/* Floating message */}
      {message.text && (
        <div
          className={`toast align-items-center text-white ${
            message.type === "success" ? "bg-success" : "bg-danger"
          } border-0 show`}
          style={{
            position: "absolute",
            top: "0.5rem",
            right: "0.5rem",
            minWidth: "250px",
            zIndex: 9999,
          }}
        >
          <div className="d-flex">
            <div className="toast-body text-center">{message.text}</div>
          </div>
        </div>
      )}

      {/* Form */}
      <div className="row g-3 align-items-end">
        <div className="col-md-3">
          <select
            className="form-select"
            name="client"
            value={form.client}
            onChange={handleChange}
          >
            <option value="">Select Client</option>
            {clients.map((client) => (
              <option key={client.company_id} value={String(client.company_id)}>
                {client.company_name}
              </option>
            ))}
          </select>
        </div>

        <div className="col-md-3">
          <select
            name="startTime"
            value={form.startTime}
            onChange={handleChange}
            className="form-select"
          >
            <option value="">Select Start Time</option>
            {generateTimeOptions().map((t, idx) => (
              <option key={idx} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        <div className="col-md-3">
          <select
            name="endTime"
            value={form.endTime}
            onChange={handleChange}
            className="form-select"
          >
            <option value="">Select End Time</option>
            {generateTimeOptions().map((t, idx) => (
              <option key={idx} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        <div className="col-md-3">
          <select
            name="withinMinutes"
            value={form.withinMinutes}
            onChange={handleChange}
            className="form-select"
          >
            <option value="">Select Call Within Minutes</option>
            {minuteOptions.map((m) => (
              <option key={m} value={m}>
                {m} min
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-3">
        <button className="btn btn-primary" onClick={handleAdd}>
          Submit
        </button>
      </div>

      {settings.length > 0 && (
        <>
          <div className="d-flex justify-content-between align-items-center mt-10 mb-1 flex-wrap">
            <h6>View Aband Call</h6>
            <div className="d-flex align-items-center flex-wrap gap-2">
              <select
                value={rowsPerPage}
                onChange={(e) => {
                  setRowsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="form-select d-inline-block"
                style={{ width: "80px" }}
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={25}>25</option>
              </select>

              <input
                type="text"
                placeholder="Search Client"
                value={searchClient}
                onChange={(e) => {
                  setSearchClient(e.target.value);
                  setCurrentPage(1);
                }}
                className="form-control"
                style={{ width: "200px" }}
              />
            </div>
          </div>

          <div
            className="table-responsive"
            style={{ maxHeight: "400px", overflow: "auto" }}
          >
            <table className="table table-bordered table-striped table-hover table-sm">
              <thead className="table-light">
                <tr>
                  <th>S.No</th>
                  <th>Client</th>
                  <th>Start Time</th>
                  <th>End Time</th>
                  <th>Aband Call In Minutes</th>
                  <th>Created Date</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {currentRows.map((item, index) => (
                  <tr key={index}>
                    <td>{indexOfFirstRow + index + 1}</td>
                    <td>{item.client_id}</td>
                    <td>{item.start_time}</td>
                    <td>{item.end_time}</td>
                    <td>{item.aband_status} min</td>
                    <td>{item.created_at}</td>
                    <td>
                      <button
                        className="btn btn-danger btn-sm d-flex align-items-center justify-content-center"
                        style={{ padding: "0.25rem 0.5rem" }}
                        onClick={() => handleDelete(item.id)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
                {currentRows.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center">
                      No matching records found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="d-flex justify-content-between align-items-center mt-2 flex-wrap">
            <button
              className="btn btn-sm btn-outline-secondary mb-2"
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
            >
              ◀ Prev
            </button>
            <span className="mb-2">
              {indexOfFirstRow + 1} -{" "}
              {Math.min(indexOfLastRow, filteredSettings.length)} of{" "}
              {filteredSettings.length}
            </span>
            <button
              className="btn btn-sm btn-outline-secondary mb-2"
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
            >
              Next ▶
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default AbandCallSetting;
