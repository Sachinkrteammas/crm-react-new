// Allocate Plan...
import { useState, useEffect } from "react";
import DatePicker from "react-datepicker";
import api from "../api";
import "react-datepicker/dist/react-datepicker.css";

const AllocatePlan = () => {
  const [plans, setPlans] = useState([]); // all allocation rows for table
  const [plansList, setPlansList] = useState([]); // master plans for dropdown
  const [clients, setClients] = useState([]);
  const [form, setForm] = useState({
    selectPlan: "",
    selectClient: "",
    startDate: null,
  });

  // Search + Pagination
  const [searchText, setSearchText] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10); // default 10 rows per page

  // ================================
  // FETCH CLIENTS, PLANS LIST
  // ================================
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [plansRes, clientsRes, masterPlansRes] = await Promise.all([
          api.get("/allocate-plan/list"),
          api.get("/allocate-plan/clients"),
          api.get("/allocate-plan/plans"), // fetch real plan list
        ]);

        setPlans(plansRes.data);

        setClients(
          clientsRes.data.map((c) => ({
            id: c.id,
            name: c.client_name,
          }))
        );

        setPlansList(masterPlansRes.data); // use for dropdown
      } catch (err) {
        console.error("Error fetching data:", err);
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

    const formattedDate = form.startDate.toISOString().split("T")[0]; // YYYY-MM-DD

    try {
      const res = await api.post("/allocate-plan/create", {
        client_id: form.selectClient,
        plan_id: form.selectPlan, // now sends PlanId
        start_date: formattedDate,
      });

      alert("Plan allocated successfully!");
      console.log(res.data);

      // Refresh table after allocation
      const updatedPlans = await api.get("/allocate-plan/list");
      setPlans(updatedPlans.data);

      // Reset form
      setForm({ selectPlan: "", selectClient: "", startDate: null });
    } catch (err) {
      console.error(err);
      alert("Allocation failed!");
    }
  };

  // ================================
  // FILTER TABLE BASED ON SELECTED CLIENT + PLAN + SEARCH
  // ================================
  const filteredPlans = plans.filter((p) => {
    const searchLower = searchText.toLowerCase();
    return (
      (form.selectClient === "" ||
        p.client ===
          clients.find((c) => c.id === Number(form.selectClient))?.name) &&
      (form.selectPlan === "" ||
        p.plan ===
          plansList.find((pl) => pl.id === Number(form.selectPlan))
            ?.plan_name) &&
      Object.values(p).join(" ").toLowerCase().includes(searchLower)
    );
  });

  // Pagination
  const totalPages = Math.ceil(filteredPlans.length / rowsPerPage);
  const displayedPlans = filteredPlans.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  return (
    <div className="row">
      <div className="col-12">
        {/* Form Card */}
        <div className="card mb-4">
          <h6 className="card-header">ALLOCATE PLAN</h6>
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
                  onChange={(e) => {
                    handleChange(e);
                    setCurrentPage(1);
                  }}
                >
                  <option value="">Select Client</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
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

              <div className="col-12">
                <button type="submit" className="btn btn-primary">
                  ALLOCATE
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Search */}
        <div className="row mb-3 align-items-center">
          {/* Search Input */}
          <div className="col-lg-2 mb-2 mb-lg-0">
            <input
              type="text"
              className="form-control"
              placeholder="Search table..."
              value={searchText}
              onChange={(e) => {
                setSearchText(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>

          {/* Rows per page select */}
          <div className="col-lg-2 ms-auto">
            <select
              className="form-select"
              value={rowsPerPage}
              onChange={(e) => setRowsPerPage(Number(e.target.value))}
            >
              <option value={10}>10</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>

        {/* Table Card */}
        <div className="card p-3">
          <div className="table-responsive">
            <table className="table table-bordered table-hover">
              <thead className="table-light">
                <tr>
                  <th>SRN.</th>
                  <th>CLIENT</th>
                  <th>CAMPAIGN</th>
                  <th>PLAN</th>
                  <th>START DATE</th>
                  <th>END DATE</th>
                  <th>SET-UP COST</th>
                  <th>RENTAL COST</th>
                  <th>BALANCE</th>
                  <th>PAYMENT TERMS</th>
                  <th>IB CALL</th>
                  <th>IB CALL NIGHT</th>
                  <th>OB CALL</th>
                  <th>SMS</th>
                  <th>EMAIL</th>
                  <th>MISS CALL</th>
                  <th>VFO</th>
                  <th>Talk Time%</th>
                  <th>Subscription%</th>
                </tr>
              </thead>
              <tbody>
                {displayedPlans.map((plan) => (
                  <tr key={plan.srn}>
                    <td>{plan.srn}</td>
                    <td>{plan.client}</td>
                    <td>{plan.campaign}</td>
                    <td>{plan.plan}</td>
                    <td>{plan.start_date}</td>
                    <td>{plan.end_date}</td>
                    <td>{plan.setUpCost}</td>
                    <td>{plan.rentalCost}</td>
                    <td>{plan.balance}</td>
                    <td>{plan.paymentTerms}</td>
                    <td>{plan.ibCall}</td>
                    <td>{plan.ibCallNight}</td>
                    <td>{plan.obCall}</td>
                    <td>{plan.sms}</td>
                    <td>{plan.email}</td>
                    <td>{plan.missCall}</td>
                    <td>{plan.vfo}</td>
                    <td>{plan.talktime}</td>
                    <td>{plan.subscription}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="d-flex justify-content-center mt-3">
              <ul className="pagination">
                <li
                  className={`page-item ${currentPage === 1 ? "disabled" : ""}`}
                >
                  <button
                    className="page-link"
                    onClick={() => setCurrentPage(currentPage - 1)}
                  >
                    Previous
                  </button>
                </li>
                {[...Array(totalPages)].map((_, idx) => (
                  <li
                    key={idx}
                    className={`page-item ${
                      currentPage === idx + 1 ? "active" : ""
                    }`}
                  >
                    <button
                      className="page-link"
                      onClick={() => setCurrentPage(idx + 1)}
                    >
                      {idx + 1}
                    </button>
                  </li>
                ))}
                <li
                  className={`page-item ${
                    currentPage === totalPages ? "disabled" : ""
                  }`}
                >
                  <button
                    className="page-link"
                    onClick={() => setCurrentPage(currentPage + 1)}
                  >
                    Next
                  </button>
                </li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AllocatePlan;
