
// ReAllocate Plan Page..
import { useState, useEffect } from "react";
import DatePicker from "react-datepicker";
import api from "../api"; // Axios instance
import "react-datepicker/dist/react-datepicker.css";

const ReAllocatePlan = () => {
  const [form, setForm] = useState({
    selectPlan: "",
    selectClient: "",
    startDate: null,
  });

  const [plansList, setPlansList] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch Plans and Clients
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [plansRes, clientsRes] = await Promise.all([
          api.get("/reallocate-plan/plans"),
          api.get("/reallocate-plan/clients"),
        ]);

        setPlansList(plansRes.data);
        setClients(clientsRes.data);
      } catch (err) {
        console.error("Error fetching data:", err);
        alert("Failed to load plans or clients.");
      }
    };

    fetchData();
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
  e.preventDefault();

  if (!form.selectPlan || !form.selectClient || !form.startDate) {
    alert("Please select Plan, Client, and Start Date");
    return;
  }

  setLoading(true);

  try {
    // --- FIX: SEND AS FORMDATA (NOT PARAMS) ---
    const formData = new FormData();
    formData.append("client_id", form.selectClient);
    formData.append("plan_id", form.selectPlan);
    formData.append("start_date", form.startDate.toISOString().split("T")[0]);

    const res = await api.post("/reallocate-plan/save", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    alert(res.data.message || "Plan re-allocated successfully!");
    console.log(res.data);

    // Reset form
    setForm({ selectPlan: "", selectClient: "", startDate: null });

  } catch (err) {
    console.error(err);
    alert(
      err.response?.data?.detail || "Re-allocation failed! Contact Admin."
    );
  } finally {
    setLoading(false);
  }
};


  return (
    <div className="row">
      <div className="col-12">
        {/* Form Card */}
        <div className="card mb-4">
          <h6 className="card-header">RE-ALLOCATE PLAN</h6>
          <div className="card-body">
            <form className="row g-3" onSubmit={handleSubmit}>
              <div className="col-md-4">
                <label className="form-label">Plan</label>
                <select
                  name="selectPlan"
                  className="form-select"
                  value={form.selectPlan}
                  onChange={handleChange}
                >
                  <option value="">Select Plan</option>
                  {plansList.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.plan_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-md-4">
                <label className="form-label">Client</label>
                <select
                  name="selectClient"
                  className="form-select"
                  value={form.selectClient}
                  onChange={handleChange}
                >
                  <option value="">Select Client</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.client_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-md-4">
                <label className="form-label d-block">Start Date</label>
                <DatePicker
                  selected={form.startDate}
                  onChange={(date) => setForm({ ...form, startDate: date })}
                  className="form-control w-100"
                  placeholderText="Plan Start Date"
                  dateFormat="dd-MM-yyyy"
                />
              </div>

              <div className="col-12 mt-5">
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading}
                >
                  {loading ? "Submitting..." : "SUBMIT"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReAllocatePlan;
