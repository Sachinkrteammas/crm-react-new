import React, { useState, useEffect } from "react";
import axios from "axios";
import api from "../api";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// Keep your full PlanCreation form state
const initialFormState = {
  planName: "",
  setupFee: "",
  subscriptionAmount: "",
  PlanType: "",
  creditValuePerMode: "",
  creditValue: "",
  ratePerPulseDay: "",
  inboundChargeDay: "",
  pulseDay: "",
  outboundCallCharge: "",
  pulse: "",
  inboundChargeNight: "",
  pulseNight: "",
  emailCharge: "",
  ratePerPulseNight: "",
  ratePerPulse: "",
  smsCharge: "",
  missCallCharge: "",
  ivrCallCharge: "",
  vfoCharge: "",
  chargePerExtraUser: "",
  noOfUsers: "",
  balanceCarry: "",
  firstMinute: 0,
  multiInboundCharge: "",
  pulseMultiLang: "",
  ratePerPulseMultiLang: "",
  multiOutboundCharge: "",
  pulseMultiOutbound: "",
  ratePerPulseMultiOutbound: "",
  multiLiveChat: "",
  whatsappSmsCharge: "",
  CreditPointPercent: "",
  TalktimePercent: "",
  totalSeat: "0",
  seatRate: "0",
  remoteUser: 0,
  remoteUserRate: "",
  totalRemoteUser: "0",
};


const VIEW_FIELD_LABELS = {
  CreditPointPercent: "Subscription Credit %",
  TalktimePercent: "Topup Talktime %",
  TotalSeat: "Total Seat",
  SeatRate: "Seat Rate",
  RemoteUser: "Remote User",
  RemoteUserRate: "Remote User Rate",
  TotalRemoteUser: "Total Remote User",
};


export default function PlanManagement() {
  const [plans, setPlans] = useState([]);
  const [form, setForm] = useState(initialFormState);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [editingPlanId, setEditingPlanId] = useState(null);

  // ✅ New state for View Plan
  const [viewPlan, setViewPlan] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);

  // ✅ Pagination & Search
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  useEffect(() => {
    fetchPlans();
  }, []);


  const fetchPlans = async () => {
  try {
    const res = await api.get("/plan/plans"); // ✅ use api instance
    setPlans(res.data.plans || []);
  } catch (err) {
    console.error("Error fetching plans:", err);
  }
};


  // Filtered + Paginated Data
  const filteredPlans = plans.filter(
    (plan) =>
      plan.PlanName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      plan.PlanType.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filteredPlans.length / rowsPerPage);
  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;
  const currentPlans = filteredPlans.slice(indexOfFirstRow, indexOfLastRow);

  const handlePageChange = (pageNumber) => {
    if (pageNumber > 0 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    let newErrors = { ...errors };

    const decimalFields = [
      "inboundChargeDay",
      "ratePerPulseDay",
      "ratePerPulseNight",
      "ratePerPulse",
      "inboundChargeNight",
    ];

    if (decimalFields.includes(name)) {
      const regex = /^\d*\.?\d{0,2}$/;

      // ✅ Valid input → update value & CLEAR error
      if (value === "" || regex.test(value)) {
        setForm({ ...form, [name]: value });

        if (newErrors[name]) {
          delete newErrors[name];
          setErrors(newErrors);
        }

        return;
      }

      // ❌ Invalid input → show error ONLY ONCE
      if (!newErrors[name]) {
        setErrors({
          ...newErrors,
          [name]: "Only up to 2 decimal places allowed",
        });
      }

      return;
    }

    // ✅ Only validate these two percentage fields
    if (name === "CreditPointPercent" || name === "TalktimePercent") {
    const numericValue = parseFloat(value);

    if (value === "" || (!isNaN(numericValue) && numericValue >= 0)) {
      // Set or clear error based on value
      if (numericValue > 100) {
        newErrors[name] = "Value cannot exceed 100";
      } else {
        delete newErrors[name];
      }
      setForm({ ...form, [name]: value });
      setErrors(newErrors);
    }
    // Ignore invalid input (do not update state)
    return;
  }

    // ✅ Create updated form object first
    let updatedForm = {
      ...form,
      [name]: value,
    };

    // ✅ Auto calculate Credit Value as per Plan Mode
    const creditValue = parseFloat(updatedForm.creditValue || 0);

    const periodType = updatedForm.periodType
      ?.toString()
      .trim()
      .toLowerCase();

    let calculatedValue = creditValue;

    if (!isNaN(creditValue)) {
      switch (periodType) {
        case "quater":
          calculatedValue = creditValue / 4;
          break;

        case "half":
          calculatedValue = creditValue / 2;
          break;

        case "month":
          calculatedValue = creditValue / 12;
          break;

        case "year":
        default:
          calculatedValue = creditValue;
          break;
      }

      updatedForm.creditValuePerMode =
        calculatedValue % 1 === 0
          ? calculatedValue.toString()
          : calculatedValue.toFixed(2);
    }

    // ✅ IMPORTANT
    setForm(updatedForm);

    setErrors({
      ...errors,
      [name]: "",
    });
  };

  const validate = () => {
    const newErrors = {};
    if (!form.planName) newErrors.planName = true;
    if (!form.periodType) newErrors.periodType = true;
    const numericFields = [
      "setupFee",
      "subscriptionAmount",
      "creditValuePerMode",
      "creditValue",
      "ratePerPulseDay",
      "inboundChargeDay",
      "outboundCallCharge",
      "inboundChargeNight",
      "emailCharge",
      "ratePerPulseNight",
      "ratePerPulse",
      "smsCharge",
      "missCallCharge",
      "ivrCallCharge",
      "vfoCharge",
      "chargePerExtraUser",
      "noOfUsers",
      "multiInboundCharge",
      "ratePerPulseMultiLang",
      "multiOutboundCharge",
      "ratePerPulseMultiOutbound",
      "multiLiveChat",
      "whatsappSmsCharge",
      "totalSeat",
      "seatRate",
    ];

    // ✅ Validate remoteUserRate only when Remote User is enabled
    if (form.remoteUser === 1) {
      numericFields.push("remoteUserRate");
      numericFields.push("totalRemoteUser");
    }

    numericFields.forEach((f) => {
      if (form[f] === "" || isNaN(form[f])) newErrors[f] = true;
    });
    if (!form.pulseDay) newErrors.pulseDay = true;
    if (!form.pulseNight) newErrors.pulseNight = true;
    if (!form.balanceCarry) newErrors.balanceCarry = true;
    if (!form.pulseMultiOutbound) newErrors.pulseMultiOutbound = true;
    if (!form.pulseMultiLang) newErrors.pulseMultiLang = true;
    return newErrors;
  };


  const handleSubmit = async (e) => {
  e.preventDefault();

  const validationErrors = validate();
  if (Object.keys(validationErrors).length > 0) {
    setErrors(validationErrors);
    return;
  }

  setLoading(true);

  try {
    // const payload = { ...form };
    const payload = {
    planName: form.planName,
    setupCost: form.setupFee,  // ✅ FIXED key name
    rentalAmount: form.subscriptionAmount,
    periodType: form.periodType,
    // creditValuePerMode: form.creditValuePerMode,
    creditValue: form.creditValuePerMode,
    ratePerPulseDay: form.ratePerPulseDay,
    inboundChargeDay: form.inboundChargeDay,
    pulseDay: form.pulseDay,
    outboundCallCharge: form.outboundCallCharge,
    inboundChargeNight: form.inboundChargeNight,
    pulseNight: form.pulseNight,
    emailCharge: form.emailCharge,
    ratePerPulseNight: form.ratePerPulseNight,
    smsCharge: form.smsCharge,
    missCallCharge: form.missCallCharge,
    ivrCharge: form.ivrCallCharge,
    vfoCharge: form.vfoCharge,
    chargePerExtraUser: form.chargePerExtraUser,
    noOfUsers: form.noOfUsers,
    balance: form.creditValue,
    transferafterrental: form.balanceCarry,
    firstMinute: form.firstMinute,
    multiIBCharges: form.multiInboundCharge,
    pulseIBMulti: form.pulseMultiLang,
    ratePerPulseIBMulti: form.ratePerPulseMultiLang,
    multiOBCharges: form.multiOutboundCharge,
    pulseOBMulti: form.pulseMultiOutbound,
    ratePerPulseOBMulti: form.ratePerPulseMultiOutbound,
    multiLiveChat: form.multiLiveChat,
    whatsappMessageCharge: form.whatsappSmsCharge,
    CreditPointPercent: form.CreditPointPercent,
    TalktimePercent: form.TalktimePercent,
    totalSeat: form.totalSeat,
    seatRate: form.seatRate,
    remoteUser: form.remoteUser,
    remoteUserRate: form.remoteUser === 0 ? 0 : form.remoteUserRate,
    totalRemoteUser: form.remoteUser === 0 ? 0 : form.totalRemoteUser,
  };

    if (editingPlanId) {
      // ✅ Update existing plan using correct id
      await api.put(`/plan/plan/${editingPlanId}`, payload);
      toast.success("Plan updated successfully!");
    } else {
      // ✅ Create new plan
      await api.post("/plan/create_plan", payload);
      toast.success("Plan created successfully!");
    }

    fetchPlans();
    setForm(initialFormState);
    setEditingPlanId(null);
    setShowModal(false); // Close modal after success
  } catch (err) {
    console.error("Error saving plan:", err.response || err);
    toast.error("Failed to save plan. Try again.");
  } finally {
    setLoading(false);
  }
};


  const handleEdit = (plan) => {
    setForm({
      planName: plan.PlanName,
      setupFee: plan.SetupCost,
      subscriptionAmount: plan.RentalAmount,
      PlanType: plan.PlanType, // Correct PlanType
      periodType: plan.PeriodType
        ? plan.PeriodType.toString().trim().toLowerCase()
        : "",
      creditValuePerMode: plan.CreditValue,
      creditValue: plan.Balance,
      ratePerPulseDay: plan.rate_per_pulse_day_shift,
      inboundChargeDay: plan.InboundCallCharge,
      pulseDay: plan.pulse_day_shift,
      outboundCallCharge: plan.OutboundCallCharge,
      pulse: plan.pulse_day_shift,
      inboundChargeNight: plan.InboundCallChargeNight,
      pulseNight: plan.pulse_night_shift,
      emailCharge: plan.EmailCharge,
      ratePerPulseNight: plan.rate_per_pulse_night_shift,
      ratePerPulse: plan.rate_per_pulse_day_shift,
      smsCharge: plan.SMSCharge,
      missCallCharge: plan.MissCallCharge,
      ivrCallCharge: plan.IVR_Charge,
      vfoCharge: plan.VFOCallCharge,
      chargePerExtraUser: plan.ChargePerExtraUser,
      noOfUsers: plan.NoOfFreeUser,
      balanceCarry: plan.TransferAfterRental || "No",
      firstMinute: plan.first_minute === 1 || plan.first_minute === "1" || plan.first_minute === "Enable"
            ? 1
            : 0,
      multiInboundCharge: plan.MultiIBCharges,
      pulseMultiLang: plan.pulse_ib_multi,
      ratePerPulseMultiLang: plan.rate_per_pulse_ib_multi,
      multiOutboundCharge: plan.MultiOBCharges,
      pulseMultiOutbound: plan.pulse_ob_multi,
      ratePerPulseMultiOutbound: plan.rate_per_pulse_ob_multi,
      multiLiveChat: plan.MultiLiveChat,
      whatsappSmsCharge: plan.whatsapp_message_charge,
      CreditPointPercent: plan.CreditPointPercent,
      TalktimePercent: plan.TalktimePercent,
      totalSeat: plan.TotalSeat,
      seatRate: plan.SeatRate,
      remoteUser: plan.RemoteUser === 1 ||  plan.RemoteUser === "1" || plan.RemoteUser === true || plan.RemoteUser === "Enable"
        ? 1
        : 0,
      remoteUserRate: plan.RemoteUserRate,
      totalRemoteUser: plan.TotalRemoteUser,
    });

    setEditingPlanId(plan.Id); // ✅ Use the correct backend primary key
    setShowModal(true);
  };

  

  const handleDelete = async (planId) => {
  if (!window.confirm("Are you sure you want to delete this plan?")) return;
  try {
    await api.delete(`/plan/plan/${planId}`); // ✅ use api instance
    toast.success("Plan deleted successfully!");
    fetchPlans();
  } catch (err) {
    console.error("Error deleting plan:", err);
  }
};


 

  const handleView = async (planId) => {
  try {
    const res = await api.get(`/plan/plan/${planId}`); // ✅ use api instance
    setViewPlan(res.data.plan);
    setShowViewModal(true);
  } catch (err) {
    console.error("Error fetching plan:", err);
    alert("Failed to load plan details.");
  }
};


  // Reuse your PlanCreation form rendering here
  const renderInput = (label, name, placeholder, type = "text") => (
    <div className="col-md-4 mb-2">
      <label className="form-label">{label}</label>
      <input
        type={type}
        name={name}
        className={`form-control ${errors[name] ? "is-invalid" : ""}`}
        placeholder={placeholder}
        value={form[name]}
        onChange={handleChange}
      />
      {errors[name] && <div className="invalid-feedback">{errors[name]}</div>}
    </div>
  );

  const renderSelect = (label, name, options) => (
    <div className="col-md-4 mb-2">
      <label className="form-label">{label}</label>
      <select
        name={name}
        className={`form-select ${errors[name] ? "is-invalid" : ""}`}
        value={form[name]}
        onChange={handleChange}
      >
        <option value="">Select</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );

  return (
    <div className="mt-4">
      <ToastContainer position="top-center" autoClose={2500} hideProgressBar style={{ marginTop: '90px' }} />
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h3>Plan Management</h3>
        <button
          className="btn btn-primary"
          onClick={() => {
            setForm(initialFormState);
            setEditingPlanId(null);
            setErrors({}); 
            setShowModal(true);
          }}
        >
          + Add Plan
        </button>
      </div>

      {/* ✅ Search & Rows per page */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <input
          type="text"
          className="form-control w-25"
          placeholder="🔍 Search by name or type..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setCurrentPage(1);
          }}
        />
        <select
          className="form-select w-auto me-6"
          value={rowsPerPage}
          onChange={(e) => {
            setRowsPerPage(Number(e.target.value));
            setCurrentPage(1);
          }}
        >
          <option value={10}>10</option>
          <option value={25}>25</option>
        </select>
      </div>

      {/* Plans Table */}
      <div
        className="table-responsive"
        style={{ maxHeight: "600px", overflowY: "auto" }}
      >
        <table className="table table-hover table-striped table-bordered align-middle shadow-sm">
          <thead className="table-dark sticky-top">
            <tr>
              <th className="text-center">S. No.</th>
              <th className="text-start">Plan Name</th>
              <th className="text-center">Plan Mode</th>
              <th className="text-center">Setup Cost</th>
              <th className="text-center">Rental Amount</th>
              <th className="text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {currentPlans.length > 0 ? (
              currentPlans.map((plan, index) => (
                <tr key={plan.Id}>
                  <td className="text-center">{indexOfFirstRow + index + 1}</td>
                  <td className="text-start">{plan.PlanName}</td>
                  <td className="text-center">{plan.PeriodType?.toString().trim().toUpperCase()}</td>
                  <td className="text-center">{plan.SetupCost}</td>
                  <td className="text-center">{plan.RentalAmount}</td>
                  <td className="text-center">
                    <button
                      className="btn btn-sm btn-outline-secondary me-2 mb-1"
                      onClick={() => handleView(plan.Id)}
                      title="View Plan"
                    >
                      👁 View
                    </button>
                    <button
                      className="btn btn-sm btn-outline-warning me-2 mb-1"
                      onClick={() => handleEdit(plan)}
                      title="Edit Plan"
                    >
                      ✏ Edit
                    </button>
                    <button
                      className="btn btn-sm btn-outline-danger mb-1"
                      onClick={() => handleDelete(plan.Id)}
                      title="Delete Plan"
                    >
                      🗑 Delete
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" className="text-center text-muted py-3">
                  No plans found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ✅ Pagination */}
      {totalPages > 1 && (
        <div className="d-flex justify-content-between align-items-center mt-3">
          <button
            className="btn btn-sm btn-outline-primary"
            disabled={currentPage === 1}
            onClick={() => handlePageChange(currentPage - 1)}
          >
            ⬅ Previous
          </button>
          <span>
            Page {currentPage} of {totalPages}
          </span>
          <button
            className="btn btn-sm btn-outline-primary"
            disabled={currentPage === totalPages}
            onClick={() => handlePageChange(currentPage + 1)}
          >
            Next ➡
          </button>
        </div>
      )}

      {/* ✅ View Plan Modal */}
   {/* ✅ View Plan Modal */}
{showViewModal && viewPlan && (
  <div className="modal show fade d-block" tabIndex="-1" style={{ display: "block", backgroundColor: "rgba(0,0,0,0.5)" }}>
    <div className="modal-dialog modal-xl"> {/* <-- wider modal */}
      <div className="modal-content">
        <div className="modal-header">
          <h5 className="modal-title">View Plan - {viewPlan.PlanName}</h5>
          <button
            type="button"
            className="btn-close"
            onClick={() => {setShowViewModal(false);  setErrors({});}}
          ></button>
        </div>
        <div className="modal-body">
          <div className="row">
            {Object.keys(viewPlan).map((key) => (
              <div className="col-md-4 mb-3" key={key}>
                <strong>{VIEW_FIELD_LABELS[key] || key}:</strong> {viewPlan[key]}
              </div>
            ))}
          </div>
        </div>
        <div className="modal-footer">
          <button
            className="btn btn-secondary"
            onClick={() => setShowViewModal(false)}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  </div>
)}


      {/* Modal for Add/Edit Plan */}
      {showModal && (
        <div
          className="modal fade show"
          style={{ display: "block", backgroundColor: "rgba(0,0,0,0.5)" }}
        >
          <div className="modal-dialog modal-xl modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  {modalMessage
                    ? modalMessage.includes("updated")
                      ? "Update Plan"
                      : "Create Plan"
                    : editingPlanId
                    ? "Edit Plan"
                    : "Add Plan"}
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => {
                    setModalMessage(""); // reset message
                    setShowModal(false);
                    setErrors({});
                  }}
                ></button>
              </div>

              <div className="modal-body">
                  <form className="row g-3" onSubmit={handleSubmit}>
                    {renderInput("Plan Name", "planName", "Plan Name")}
                    {renderInput(
                      "Setup Fee - Rs.",
                      "setupFee",
                      "Setup Cost",
                      "number"
                    )}
                    {renderInput(
                      "Subscription Amount - Rs.",
                      "subscriptionAmount",
                      "Subscription Amount",
                      "number"
                    )}
                    {renderInput(
                      "Credit Value - Rs.",
                      "creditValue",
                      "Credit Value",
                      "number"
                    )}
                    {renderSelect("Plan Mode", "periodType", [
                      { value: "year", label: "Year" },
                      { value: "month", label: "Month" },
                      { value: "half", label: "Half" },
                      { value: "quater", label: "Quater" },
                    ])}
                    {/* {renderInput(
                      "Credit Value as per Plan Mode - Rs.",
                      "creditValuePerMode",
                      "Credit Value per Plan Mode",
                      "number"
                    )}                     */}
                    <div className="col-md-4 mb-2">
                      <label className="form-label">
                        Credit Value as per Plan Mode - Rs.
                      </label>

                      <input
                        type="number"
                        name="creditValuePerMode"
                        className="form-control"
                        value={form.creditValuePerMode}
                        readOnly
                      />
                    </div>
                    {renderInput(
                      "Rate Per Pulse (Day Shift) - Rs.",
                      "ratePerPulseDay",
                      "Rate Per Pulse",
                      "number"
                    )}
                    {renderInput(
                      "Inbound Call Charge (Day Shift) - Rs.",
                      "inboundChargeDay",
                      "Inbound Call Charge",
                      "number"
                    )}
                    {renderSelect("Pulse (Day Shift)", "pulseDay", [
                      { value: "1", label: "1 Sec" },
                      { value: "15", label: "15 Sec" },
                      { value: "30", label: "30 Sec" },
                      { value: "45", label: "45 Sec" },
                      { value: "60", label: "60 Sec" },
                    ])}
                    {renderInput(
                      "Outbound Call Charge - Rs.",
                      "outboundCallCharge",
                      "Outbound Call Charge",
                      "number"
                    )}
                    {renderSelect("Pulse", "pulse", [
                      { value: "1", label: "1 Sec" },
                      { value: "15", label: "15 Sec" },
                      { value: "30", label: "30 Sec" },
                      { value: "45", label: "45 Sec" },
                      { value: "60", label: "60 Sec" },
                    ])}
                    {renderInput(
                      "Inbound Call Charge (Night Shift) - Rs.",
                      "inboundChargeNight",
                      "Inbound Call Charge",
                      "number"
                    )}
                    {renderSelect("Pulse (Night Shift)", "pulseNight", [
                      { value: "1", label: "1 Sec" },
                      { value: "15", label: "15 Sec" },
                      { value: "30", label: "30 Sec" },
                      { value: "45", label: "45 Sec" },
                      { value: "60", label: "60 Sec" },
                    ])}
                    {renderInput(
                      "Email Charge - Rs.",
                      "emailCharge",
                      "Per Email Charge",
                      "number"
                    )}
                    {renderInput(
                      "Rate Per Pulse (Night Shift) - Rs.",
                      "ratePerPulseNight",
                      "Rate Per Pulse",
                      "number"
                    )}
                    {renderInput(
                      "Rate Per Pulse - Rs.",
                      "ratePerPulse",
                      "Rate Per Pulse",
                      "number"
                    )}
                    {renderInput(
                      "SMS Charge 160",
                      "smsCharge",
                      "SMS Charge",
                      "number"
                    )}
                    {renderInput(
                      "Miss Call Charge - Rs./Min",
                      "missCallCharge",
                      "Miss Call Rs./Min",
                      "number"
                    )}
                    {renderInput(
                      "IVR Call Charge - Rs.",
                      "ivrCallCharge",
                      "IVR Call Rs./CALL",
                      "number"
                    )}
                    {renderInput(
                      "VFO Call Charge - Rs.",
                      "vfoCharge",
                      "VFO Rs./Min",
                      "number"
                    )}
                    {renderInput(
                      "Charge Per Extra User - Rs./User",
                      "chargePerExtraUser",
                      "Charge Per Extra User Rs./User",
                      "number"
                    )}
                    {renderInput(
                      "No. of Users",
                      "noOfUsers",
                      "No. Of Free User",
                      "number"
                    )}
                    {renderSelect("Balance Carry Forward", "balanceCarry", [
                      { value: "Yes", label: "Yes" },
                      { value: "No", label: "No" },
                    ])}

                    <div className="col-md-4 mb-2">
                      <label className="form-label">First Minute</label>
                      <br />
                      <div className="form-check form-check-inline">
                        <input
                          type="radio"
                          id="enable"
                          name="firstMinute"
                          value={1}
                          className="form-check-input"
                          checked={form.firstMinute === 1}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              firstMinute: parseInt(e.target.value),
                            })
                          }
                        />
                        <label htmlFor="enable" className="form-check-label">
                          Enable
                        </label>
                      </div>
                      <div className="form-check form-check-inline">
                        <input
                          type="radio"
                          id="disable"
                          name="firstMinute"
                          value={0}
                          className="form-check-input"
                          checked={form.firstMinute === 0}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              firstMinute: parseInt(e.target.value),
                            })
                          }
                        />
                        <label htmlFor="disable" className="form-check-label">
                          Disable
                        </label>
                      </div>
                    </div>

                    {renderInput(
                      "Multi Language (Inbound Charge) - Rs.",
                      "multiInboundCharge",
                      "Multi Language Inbound Charge",
                      "number"
                    )}
                    {renderSelect("Pulse (Multi Language)", "pulseMultiLang", [
                      { value: "1", label: "1 Sec" },
                      { value: "15", label: "15 Sec" },
                      { value: "30", label: "30 Sec" },
                      { value: "45", label: "45 Sec" },
                      { value: "60", label: "60 Sec" },
                    ])}
                    {renderInput(
                      "Rate Per Pulse (Multi Language) - Rs.",
                      "ratePerPulseMultiLang",
                      "Rate Per Pulse",
                      "number"
                    )}
                    {renderInput(
                      "Multi Language (Outbound Charge) - Rs.",
                      "multiOutboundCharge",
                      "Multi Language Outbound Charge",
                      "number"
                    )}
                    {renderSelect(
                      "Pulse (Multi Language OB)",
                      "pulseMultiOutbound",
                      [
                        { value: "1", label: "1 Sec" },
                        { value: "15", label: "15 Sec" },
                        { value: "30", label: "30 Sec" },
                        { value: "45", label: "45 Sec" },
                        { value: "60", label: "60 Sec" },
                      ]
                    )}
                    {renderInput(
                      "Rate Per Pulse (Multi Language OB) - Rs.",
                      "ratePerPulseMultiOutbound",
                      "Rate Per Pulse",
                      "number"
                    )}
                    {renderInput(
                      "Multi Language (Live Chat)",
                      "multiLiveChat",
                      "Multi Language Live Chat",
                      "number"
                    )}
                    {renderInput(
                      "Whatsapp Charge - Rs.",
                      "whatsappSmsCharge",
                      "Whatsapp Charge",
                      "number"
                    )}
                    {renderInput(
                      "Subscription Credit %",
                      "CreditPointPercent",
                      "Subscription Credit %",
                      "number"
                    )}
                    {renderInput(
                      "Topup Talktime %",
                      "TalktimePercent",
                      "Topup Talktime %",
                      "number"
                    )}
                    {renderInput(
                      "Total Seat",
                      "totalSeat",
                      "Total Seat",
                      "number"
                    )}

                    {renderInput(
                      "Seat Rate - Rs.",
                      "seatRate",
                      "Seat Rate",
                      "number"
                    )}

                    <div className="col-md-4 mb-2">
                      <label className="form-label">Remote User</label>
                      <br />

                      <div className="form-check form-check-inline">
                        <input
                          type="radio"
                          id="remoteUserEnable"
                          name="remoteUser"
                          value={1}
                          className="form-check-input"
                          checked={form.remoteUser === 1}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              remoteUser: parseInt(e.target.value),
                            })
                          }
                        />
                        <label
                          htmlFor="remoteUserEnable"
                          className="form-check-label"
                        >
                          Enable
                        </label>
                      </div>

                      <div className="form-check form-check-inline">
                        <input
                          type="radio"
                          id="remoteUserDisable"
                          name="remoteUser"
                          value={0}
                          className="form-check-input"
                          checked={form.remoteUser === 0}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              remoteUser: parseInt(e.target.value),
                              remoteUserRate: parseInt(e.target.value) === 0 ? 0 : form.remoteUserRate,
                              totalRemoteUser: parseInt(e.target.value) === 0 ? 0 : form.totalRemoteUser,
                            })
                          }
                        />
                        <label
                          htmlFor="remoteUserDisable"
                          className="form-check-label"
                        >
                          Disable
                        </label>
                      </div>
                    </div>

                    {form.remoteUser === 1 && renderInput(
                      "Remote User Rate - Rs.",
                      "remoteUserRate",
                      "Remote User Rate",
                      "number"
                    )}

                    {form.remoteUser === 1 && renderInput(
                      "Total Remote User",
                      "totalRemoteUser",
                      "Total Remote User",
                      "number"
                    )}

                    <div className="col-12">
                      <button
                        type="submit"
                        className="btn btn-primary px-4"
                        disabled={loading}
                      >
                        {loading ? "Saving..." : "SUBMIT"}
                      </button>
                    </div>
                  </form>
              </div>

              <div className="modal-footer">
                {modalMessage && (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      setModalMessage(""); // clear message for next time
                      setShowModal(false);
                    }}
                  >
                    Close
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
