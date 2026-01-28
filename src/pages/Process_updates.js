import React, { useState, useEffect } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import api from "../api";

const ProcessUpdates = () => {

  const userType = localStorage.getItem("user_type");
  const companyId = localStorage.getItem("company_id");

  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState(companyId);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    dateTime: null,
    clientName: "",
    processUpdate: "",
    updateType: "",
    validFrom: null,
    validTill: null,
  });


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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!selectedClient) {
        alert("Please select a client.");
        return;
      }

      // Helper to format datetime as YYYY-MM-DDTHH:MM
      const formatDateTime = (date) => {
        if (!date) return null;
        const pad = (n) => n.toString().padStart(2, "0");
        const year = date.getFullYear();
        const month = pad(date.getMonth() + 1);
        const day = pad(date.getDate());
        const hours = pad(date.getHours());
        const minutes = pad(date.getMinutes());
        return `${year}-${month}-${day}T${hours}:${minutes}`;
      };

      function formatDateTimeLocal(date) {
        if (!date) return null;
        const y = date.getFullYear();
        const m = String(date.getMonth()+1).padStart(2,'0');
        const d = String(date.getDate()).padStart(2,'0');
        const h = String(date.getHours()).padStart(2,'0');
        const min = String(date.getMinutes()).padStart(2,'0');
        return `${y}-${m}-${d}T${h}:${min}`;
      }

      const payload = {
        Datetime: formatDateTime(form.dateTime),  // YYYY-MM-DDTHH:MM
        clientID: selectedClient,                 // integer
        processdate: form.processUpdate,
        type: form.updateType,
        validfrom: formatDateTimeLocal(form.validFrom)?.split("T")[0],
        validtill: formatDateTimeLocal(form.validTill)?.split("T")[0],
      };

      console.log("Sending Payload:", payload);

      const response = await api.post("/save_process_update", payload);

      console.log("API Response:", response.data);
      alert("Process Update saved successfully!");

      setForm({
        dateTime: null,
        clientName: "",
        processUpdate: "",
        updateType: "",
        validFrom: null,
        validTill: null,
      });
      setSelectedClient(companyId);

    } catch (error) {
      console.error("Error saving process update:", error);
      alert(
        error.response?.data?.detail || "Failed to save process update."
      );
    } finally {
      setLoading(false);
    }
  };


  return (
    <>
      {/* Full-screen loader */}
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
        <h4 className="mb-4">Process Updates</h4>

        <div className="card">
          <div className="card-body">
            <form className="row g-3" onSubmit={handleSubmit}>

              {/* LEFT + RIGHT */}
              <div className="col-12">
                <div className="row align-items-stretch g-3">

                  {/* LEFT SIDE */}
                  <div className="col-md-6">

                    {/* First line: Date/Time + Client Name */}
                    <div className="row g-3 mb-3">
                      <div className="col-md-6 d-flex flex-column">
                        <label className="form-label">
                          Date/Time <span className="text-danger">*</span>
                        </label>
                        <DatePicker
                          selected={form.dateTime}
                          onChange={(date) =>
                            setForm({ ...form, dateTime: date })
                          }
                          showTimeSelect
                          timeIntervals={1} 
                          dateFormat="dd-MM-yyyy HH:mm"
                          placeholderText="dd-mm-yyyy  --:--"
                          className="form-control"
                          required
                        />
                      </div>

                      <div className="col-md-6 d-flex flex-column">
                        <label className="form-label">
                          Client Name <span className="text-danger">*</span>
                        </label>
                        <select
                          name="clientName"
                          className="form-select"
                          value={selectedClient}
                          onChange={(e) => setSelectedClient(parseInt(e.target.value))}
                          required
                        >
                          <option value="">Select Client</option>
                          {clients.map((client) => (
                            <option key={client.company_id} value={client.company_id}>
                              {client.company_name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Second line: Types of Update + Valid From + Valid Till */}
                    <div className="row g-3">
                      <div className="col-md-4 d-flex flex-column">
                        <label className="form-label">
                          Types Of Update <span className="text-danger">*</span>
                        </label>
                        <select
                          name="updateType"
                          className="form-select"
                          value={form.updateType}
                          onChange={handleChange}
                          required
                        >
                          <option value="">Select</option>
                          <option value="Temporary">Temporary</option>
                          <option value="Permanent">Permanent</option>
                        </select>
                      </div>

                      <div className="col-md-4 d-flex flex-column">
                        <label className="form-label">
                          Update Valid From <span className="text-danger">*</span>
                        </label>
                        <DatePicker
                          selected={form.validFrom}
                          onChange={(date) =>
                            setForm({ ...form, validFrom: date })
                          }
                          dateFormat="dd-MM-yyyy"
                          placeholderText="dd-mm-yyyy"
                          className="form-control"
                          required
                        />
                      </div>

                      <div className="col-md-4 d-flex flex-column">
                        <label className="form-label">
                          Update Valid Till <span className="text-danger">*</span>
                        </label>
                        <DatePicker
                          selected={form.validTill}
                          onChange={(date) =>
                            setForm({ ...form, validTill: date })
                          }
                          dateFormat="dd-MM-yyyy"
                          placeholderText="dd-mm-yyyy"
                          className="form-control"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  {/* RIGHT SIDE – PROCESS UPDATE */}
                  <div className="col-md-6 d-flex flex-column">
                    <label className="form-label">
                      Process Update <span className="text-danger">*</span>
                    </label>
                    <textarea
                      name="processUpdate"
                      className="form-control flex-grow-1"
                      placeholder="Enter Process Update"
                      value={form.processUpdate}
                      onChange={handleChange}
                      required
                    ></textarea>
                  </div>

                </div>
              </div>

              {/* SUBMIT */}
              <div className="col-12 d-flex justify-content-center mt-6">
                <button type="submit" className="btn btn-primary">
                  SUBMIT
                </button>
              </div>

            </form>
          </div>
        </div>
      </div>
    </div>
    </div>
    </>
  );
};

export default ProcessUpdates;
