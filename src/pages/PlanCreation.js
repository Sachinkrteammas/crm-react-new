// import React, { useState } from "react";
// import axios from "axios"; // ✅ for API calls

// export default function PlanCreation() {
//   const [form, setForm] = useState({
//     planName: "",
//     setupFee: "",
//     subscriptionAmount: "",
//     planMode: "",
//     creditValuePerMode: "",
//     creditValue: "",
//     ratePerPulseDay: "",
//     inboundChargeDay: "",
//     pulseDay: "",
//     outboundCallCharge: "",
//     pulse: "",
//     inboundChargeNight: "",
//     pulseNight: "",
//     emailCharge: "",
//     ratePerPulseNight: "",
//     ratePerPulse: "",
//     smsCharge: "",
//     missCallCharge: "",
//     ivrCallCharge: "",
//     vfoCharge: "",
//     chargePerExtraUser: "",
//     noOfUsers: "",
//     balanceCarry: "",
//     firstMinute: "disable",
//     multiInboundCharge: "",
//     pulseMultiLang: "",
//     ratePerPulseMultiLang: "",
//     multiOutboundCharge: "",
//     pulseMultiOutbound: "",
//     ratePerPulseMultiOutbound: "",
//     multiLiveChat: "",
//     whatsappSmsCharge: ""
//   });

//   const [loading, setLoading] = useState(false);
//   const [message, setMessage] = useState("");

//   const handleChange = (e) => {
//     const { name, value } = e.target;
//     setForm({ ...form, [name]: value });
//   };

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     setLoading(true);
//     setMessage("");

//     try {
//       // 👇 API call to save plan (adjust URL to your backend)
//       const res = await axios.post("http://localhost:5000/api/plans", form);

//       setMessage("✅ Plan created successfully!");
//       console.log("Saved plan:", res.data);
//       setForm({
//         planName: "",
//         setupFee: "",
//         subscriptionAmount: "",
//         planMode: "",
//         creditValuePerMode: "",
//         creditValue: "",
//         ratePerPulseDay: "",
//         inboundChargeDay: "",
//         pulseDay: "",
//         outboundCallCharge: "",
//         pulse: "",
//         inboundChargeNight: "",
//         pulseNight: "",
//         emailCharge: "",
//         ratePerPulseNight: "",
//         ratePerPulse: "",
//         smsCharge: "",
//         missCallCharge: "",
//         ivrCallCharge: "",
//         vfoCharge: "",
//         chargePerExtraUser: "",
//         noOfUsers: "",
//         balanceCarry: "",
//         firstMinute: "disable",
//         multiInboundCharge: "",
//         pulseMultiLang: "",
//         ratePerPulseMultiLang: "",
//         multiOutboundCharge: "",
//         pulseMultiOutbound: "",
//         ratePerPulseMultiOutbound: "",
//         multiLiveChat: "",
//         whatsappSmsCharge: ""
//       });
//     } catch (err) {
//       console.error("Error saving plan:", err);
//       setMessage("❌ Failed to create plan. Try again.");
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <div className="row">
//       <div className="col-12">
//         <div className="card mb-2">
//           <h5 className="card-header">PLAN CREATION</h5>
//           <div className="card-body">
//             <form className="row g-3" onSubmit={handleSubmit}>
//               {/* -------- Column 1 -------- */}
//               <div className="col-md-4 mb-2">
//                 <label className="form-label">Plan Name</label>
//                 <input type="text" name="planName" className="form-control" placeholder="Plan Name"
//                   value={form.planName} onChange={handleChange} />
//               </div>
//               <div className="col-md-4 mb-2">
//                 <label className="form-label">Setup Fee</label>
//                 <input type="text" name="setupFee" className="form-control" placeholder="Setup Cost"
//                   value={form.setupFee} onChange={handleChange} />
//               </div>
//               <div className="col-md-4 mb-2">
//                 <label className="form-label">Subscription Amount</label>
//                 <input type="text" name="subscriptionAmount" className="form-control" placeholder="Subscription Amount"
//                   value={form.subscriptionAmount} onChange={handleChange} />
//               </div>

//               <div className="col-md-4 mb-2">
//                 <label className="form-label">Plan Mode</label>
//                 <input type="text" name="planMode" className="form-control" placeholder="Period Type"
//                   value={form.planMode} onChange={handleChange} />
//               </div>
//               <div className="col-md-4 mb-2">
//                 <label className="form-label">Credit Value as per Plan Mode</label>
//                 <input type="text" name="creditValuePerMode" className="form-control" placeholder="Credit Value as per Plan Mode"
//                   value={form.creditValuePerMode} onChange={handleChange} />
//               </div>
//               <div className="col-md-4 mb-2">
//                 <label className="form-label">Credit value</label>
//                 <input type="text" name="creditValue" className="form-control" placeholder="Credit value"
//                   value={form.creditValue} onChange={handleChange} />
//               </div>

//               <div className="col-md-4 mb-2">
//                 <label className="form-label">Rate Per Pulse (Day Shift)</label>
//                 <input type="text" name="ratePerPulseDay" className="form-control" placeholder="Rate Per Pulse"
//                   value={form.ratePerPulseDay} onChange={handleChange} />
//               </div>
//               <div className="col-md-4 mb-2">
//                 <label className="form-label">Inbound Call Charge (Day Shift)</label>
//                 <input type="text" name="inboundChargeDay" className="form-control" placeholder="Inbound Call Charge"
//                   value={form.inboundChargeDay} onChange={handleChange} />
//               </div>
//               <div className="col-md-4 mb-2">
//                 <label className="form-label">Pulse (Day Shift)</label>
//                 <select name="pulseDay" className="form-select" value={form.pulseDay} onChange={handleChange}>
//                 <option value="">Select</option>
//                   <option value="1">1 Sec</option>
//                   <option value="15">15 Sec</option>
//                   <option value="30">30 Sec</option>
//                   <option value="45">45 Sec</option>
//                   <option value="60">60 Sec</option>
//                 </select>
//               </div>

//               <div className="col-md-4 mb-2">
//                 <label className="form-label">Outbound Call Charge</label>
//                 <input type="text" name="outboundCallCharge" className="form-control" placeholder="Outbound Call Charge"
//                   value={form.outboundCallCharge} onChange={handleChange} />
//               </div>
//               <div className="col-md-4 mb-2">
//                 <label className="form-label">Pulse</label>
//                 <select name="pulse" className="form-select" value={form.pulse} onChange={handleChange}>
//                    <option value="">Select</option>
//                   <option value="1">1 Sec</option>
//                   <option value="15">15 Sec</option>
//                   <option value="30">30 Sec</option>
//                   <option value="45">45 Sec</option>
//                   <option value="60">60 Sec</option>
//                 </select>
//               </div>
//               <div className="col-md-4 mb-2">
//                 <label className="form-label">Inbound Call Charge (Night Shift)</label>
//                 <input type="text" name="inboundChargeNight" className="form-control" placeholder="Inbound Call Charge"
//                   value={form.inboundChargeNight} onChange={handleChange} />
//               </div>

//               <div className="col-md-4 mb-2">
//                 <label className="form-label">Pulse (Night Shift)</label>
//                 <select name="pulseNight" className="form-select" value={form.pulseNight} onChange={handleChange}>
//                   <option value="">Select</option>
//                   <option value="1">1 Sec</option>
//                   <option value="15">15 Sec</option>
//                   <option value="30">30 Sec</option>
//                   <option value="45">45 Sec</option>
//                   <option value="60">60 Sec</option>
//                 </select>
//               </div>
//               <div className="col-md-4 mb-2">
//                 <label className="form-label">Email Charge</label>
//                 <input type="text" name="emailCharge" className="form-control" placeholder="Per Email Charge"
//                   value={form.emailCharge} onChange={handleChange} />
//               </div>
//               <div className="col-md-4 mb-2">
//                 <label className="form-label">Rate Per Pulse (Night Shift)</label>
//                 <input type="text" name="ratePerPulseNight" className="form-control" placeholder="Rate Per Pulse"
//                   value={form.ratePerPulseNight} onChange={handleChange} />
//               </div>

//               <div className="col-md-4 mb-2">
//                 <label className="form-label">Rate Per Pulse</label>
//                 <input type="text" name="ratePerPulse" className="form-control" placeholder="Rate Per Pulse"
//                   value={form.ratePerPulse} onChange={handleChange} />
//               </div>
//               <div className="col-md-4 mb-2">
//                 <label className="form-label">SMS Char 160</label>
//                 <input type="text" name="smsCharge" className="form-control" placeholder="SMS Charge"
//                   value={form.smsCharge} onChange={handleChange} />
//               </div>
//               <div className="col-md-4 mb-2">
//                 <label className="form-label">Miss Call Charge</label>
//                 <input type="text" name="missCallCharge" className="form-control" placeholder="Miss Call Rs./Min"
//                   value={form.missCallCharge} onChange={handleChange} />
//               </div>

//               <div className="col-md-4 mb-2">
//                 <label className="form-label">IVR Call Charge</label>
//                 <input type="text" name="ivrCallCharge" className="form-control" placeholder="IVR Call Rs./CALL"
//                   value={form.ivrCallCharge} onChange={handleChange} />
//               </div>
//               <div className="col-md-4 mb-2">
//                 <label className="form-label">VFO Call Charge</label>
//                 <input type="text" name="vfoCharge" className="form-control" placeholder="VFO Rs./Min"
//                   value={form.vfoCharge} onChange={handleChange} />
//               </div>
//               <div className="col-md-4 mb-2">
//                 <label className="form-label">Charge Per Extra User</label>
//                 <input type="text" name="chargePerExtraUser" className="form-control" placeholder="Charge For Extra User Rs./User"
//                   value={form.chargePerExtraUser} onChange={handleChange} />
//               </div>

//               <div className="col-md-4 mb-2">
//                 <label className="form-label">No. of Users</label>
//                 <input type="text" name="noOfUsers" className="form-control" placeholder="No. Of Free User"
//                   value={form.noOfUsers} onChange={handleChange} />
//               </div>
//               <div className="col-md-4 mb-2">
//                 <label className="form-label">Balance Carry Forward</label>
//                 <select name="balanceCarry" className="form-select" value={form.balanceCarry} onChange={handleChange}>
//                   <option value="">Select</option>
//                   <option value="yes">Yes</option>
//                   <option value="no">No</option>
//                 </select>
//               </div>
//               <div className="col-md-4 mb-2">
//                 <label className="form-label">First Minute</label><br />
//                 <div className="form-check form-check-inline">
//                   <input type="radio" id="enable" name="firstMinute" value="enable" className="form-check-input"
//                     checked={form.firstMinute === "enable"} onChange={handleChange} />
//                   <label htmlFor="enable" className="form-check-label">Enable</label>
//                 </div>
//                 <div className="form-check form-check-inline">
//                   <input type="radio" id="disable" name="firstMinute" value="disable" className="form-check-input"
//                     checked={form.firstMinute === "disable"} onChange={handleChange} />
//                   <label htmlFor="disable" className="form-check-label">Disable</label>
//                 </div>
//               </div>

//               {/* ---------- Multi Language Section ---------- */}
//               <div className="col-md-4 mb-2">
//                 <label className="form-label">Multi Language (Inbound Charge)</label>
//                 <input type="text" name="multiInboundCharge" className="form-control" placeholder="Multi Language (Inbound Charge)"
//                   value={form.multiInboundCharge} onChange={handleChange} />
//               </div>
//               <div className="col-md-4 mb-2">
//                 <label className="form-label">Pulse (Multi Language)</label>
//                 <select name="pulseMultiLang" className="form-select" value={form.pulseMultiLang} onChange={handleChange}>
//                  <option value="">Select</option>
//                   <option value="1">1 Sec</option>
//                   <option value="15">15 Sec</option>
//                   <option value="30">30 Sec</option>
//                   <option value="45">45 Sec</option>
//                   <option value="60">60 Sec</option>
//                 </select>
//               </div>
//               <div className="col-md-4 mb-2">
//                 <label className="form-label">Rate Per Pulse (Multi Language)</label>
//                 <input type="text" name="ratePerPulseMultiLang" className="form-control" placeholder="Rate Per Pulse"
//                   value={form.ratePerPulseMultiLang} onChange={handleChange} />
//               </div>

//               <div className="col-md-4 mb-2">
//                 <label className="form-label">Multi Language (Outbound Charge)</label>
//                 <input type="text" name="multiOutboundCharge" className="form-control" placeholder="Multi Language (Outbound Charge)"
//                   value={form.multiOutboundCharge} onChange={handleChange} />
//               </div>
//               <div className="col-md-4 mb-2">
//                 <label className="form-label">Pulse (Multi Language OB)</label>
//                 <select name="pulseMultiOutbound" className="form-select" value={form.pulseMultiOutbound} onChange={handleChange}>
//                  <option value="">Select</option>
//                   <option value="1">1 Sec</option>
//                   <option value="15">15 Sec</option>
//                   <option value="30">30 Sec</option>
//                   <option value="45">45 Sec</option>
//                   <option value="60">60 Sec</option>
//                 </select>
//               </div>
//               <div className="col-md-4 mb-2">
//                 <label className="form-label">Rate Per Pulse (Multi Language OB)</label>
//                 <input type="text" name="ratePerPulseMultiOutbound" className="form-control" placeholder="Rate Per Pulse"
//                   value={form.ratePerPulseMultiOutbound} onChange={handleChange} />
//               </div>

//               <div className="col-md-4 mb-2">
//                 <label className="form-label">Multi Language (Live Chat)</label>
//                 <input type="text" name="multiLiveChat" className="form-control" placeholder="Multi Language (Live Chat)"
//                   value={form.multiLiveChat} onChange={handleChange} />
//               </div>
//               <div className="col-md-4 mb-2">
//                 <label className="form-label">Whatsapp SMS Charge</label>
//                 <input type="text" name="whatsappSmsCharge" className="form-control" placeholder="Whatsapp SMS Charge"
//                   value={form.whatsappSmsCharge} onChange={handleChange} />
//               </div>

//               {/* Submit Button */}
//               <div className="col-12">
//                 <button type="submit" className="btn btn-primary px-4">SUBMIT</button>
//               </div>
//             </form>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }

//...New Plan Creation PAge With ADD Edit and View Delete Functionality
import React, { useState, useEffect } from "react";
import axios from "axios";

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

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const res = await axios.get("http://localhost:8000/plan/plans"); // fetch plans
      setPlans(res.data.plans || []);
    } catch (err) {
      console.error("Error fetching plans:", err);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
    setErrors({ ...errors, [name]: "" });
  };

  const validate = () => {
    const newErrors = {};
    if (!form.planName) newErrors.planName = true;
    if (!form.PlanType) newErrors.PlanType = true;
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
    ];
    numericFields.forEach((f) => {
      if (form[f] === "" || isNaN(form[f])) newErrors[f] = true;
    });
    if (!form.pulseDay) newErrors.pulseDay = true;
    if (!form.pulseNight) newErrors.pulseNight = true;
    if (!form.balanceCarry) newErrors.balanceCarry = true;
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
      const payload = { ...form };

      if (editingPlanId) {
        // ✅ Update existing plan using correct id
        await axios.put(
          `http://localhost:8000/plan/plan/${editingPlanId}`,
          payload
        );
        setModalMessage("✅ Plan updated successfully!");
      } else {
        // ✅ Create new plan
        await axios.post("http://localhost:8000/plan/create_plan", payload);
        setModalMessage("✅ Plan created successfully!");
      }

      fetchPlans();
      setForm(initialFormState);
      setEditingPlanId(null);
    } catch (err) {
      console.error("Error saving plan:", err.response || err);
      setModalMessage("❌ Failed to save plan. Try again.");
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
      periodType: plan.PeriodType,
      creditValuePerMode: plan.CreditValuePerMode,
      creditValue: plan.CreditValue,
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
      balanceCarry: plan.balanceCarry || "yes",
      firstMinute: plan.first_minute,
      multiInboundCharge: plan.MultiIBCharges,
      pulseMultiLang: plan.pulse_ib_multi,
      ratePerPulseMultiLang: plan.rate_per_pulse_ib_multi,
      multiOutboundCharge: plan.MultiOBCharges,
      pulseMultiOutbound: plan.pulse_ob_multi,
      ratePerPulseMultiOutbound: plan.rate_per_pulse_ob_multi,
      multiLiveChat: plan.MultiLiveChat,
      whatsappSmsCharge: plan.whatsapp_message_charge,
    });

    setEditingPlanId(plan.Id); // ✅ Use the correct backend primary key
    setShowModal(true);
  };

  const handleDelete = async (planId) => {
    if (!window.confirm("Are you sure you want to delete this plan?")) return;
    try {
      await axios.delete(`http://localhost:8000/plan/plan/${planId}`);
      fetchPlans();
    } catch (err) {
      console.error("Error deleting plan:", err);
    }
  };

  // ✅ Handle View Plan
  const handleView = async (planId) => {
    try {
      const res = await axios.get(`http://localhost:8000/plan/plan/${planId}`);
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
      {/* <div className="d-flex justify-content-between mb-3">
        <h3>Plan Management</h3>
        <button
          className="btn btn-primary"
          onClick={() => {
            setForm(initialFormState);
            setEditingPlanId(null);
            setShowModal(true);
          }}
        >
          + Add Plan
        </button>
      </div> */}

      {/* <div className="overflow-x-auto">
  <table className="table table-bordered table-hover align-middle text-center">
    <thead className="table-light">
      <tr>
        <th className="fw-bold">S. No.</th>
        <th className="fw-bold">Plan Name</th>
        <th className="fw-bold">Plan Mode</th>
        <th className="fw-bold">Setup Cost</th>
        <th className="fw-bold">Rental Amount</th>
        <th className="fw-bold">Actions</th>
      </tr>
    </thead>
    <tbody>
      {plans.map((plan, index) => (
        <tr key={plan.Id} className="align-middle">
          <td>{index + 1}</td>
          <td className="text-start">{plan.PlanName}</td>
          <td>{plan.PlanType}</td>
          <td>{plan.SetupCost}</td>
          <td>{plan.RentalAmount}</td>
          <td>
            <button
              className="btn btn-sm btn-secondary me-1"
              onClick={() => handleView(plan.Id)}
              title="View Plan"
            >
              <i className="bi bi-eye-fill me-1"></i> View
            </button>
            <button
              className="btn btn-sm btn-info me-1"
              onClick={() => handleEdit(plan)}
              title="Edit Plan"
            >
              <i className="bi bi-pencil-square me-1"></i> Edit
            </button>
            <button
              className="btn btn-sm btn-danger"
              onClick={() => handleDelete(plan.Id)}
              title="Delete Plan"
            >
              <i className="bi bi-trash-fill me-1"></i> Delete
            </button>
          </td>
        </tr>
      ))}
    </tbody>
  </table>
</div> */}

      {/* <div className="table-responsive">
        <table className="table table-bordered table-hover align-middle text-center">
          <thead className="table-light">
            <tr>
              <th className="fw-bold">S. No.</th>
              <th className="fw-bold">Plan Name</th>
              <th className="fw-bold">Plan Mode</th>
              <th className="fw-bold">Setup Cost</th>
              <th className="fw-bold">Rental Amount</th>
              <th className="fw-bold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {plans.map((plan, index) => (
              <tr key={plan.Id} className="align-middle">
                <td>{index + 1}</td>
                <td className="text-start">{plan.PlanName}</td>
                <td>{plan.PlanType}</td>
                <td>{plan.SetupCost}</td>
                <td>{plan.RentalAmount}</td>
                <td className="d-flex flex-wrap justify-content-center gap-2">
                  <button
                    className="btn btn-sm btn-secondary"
                    onClick={() => handleView(plan.Id)}
                    title="View Plan"
                  >
                    <i className="bi bi-eye-fill me-1"></i> View
                  </button>
                  <button
                    className="btn btn-sm btn-info"
                    onClick={() => handleEdit(plan)}
                    title="Edit Plan"
                  >
                    <i className="bi bi-pencil-square me-1"></i> Edit
                  </button>
                  <button
                    className="btn btn-sm btn-danger"
                    onClick={() => handleDelete(plan.Id)}
                    title="Delete Plan"
                  >
                    <i className="bi bi-trash-fill me-1"></i> Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div> */}


      <div className="d-flex justify-content-between align-items-center mb-3">
  <h3>Plan Management</h3>
  <button
    className="btn btn-primary"
    onClick={() => {
      setForm(initialFormState);
      setEditingPlanId(null);
      setShowModal(true);
    }}
  >
    + Add Plan
  </button>
</div>

{/* Plans Table */}
<div className="table-responsive" style={{ maxHeight: "600px", overflowY: "auto" }}>
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
      {plans.length > 0 ? (
        plans.map((plan, index) => (
          <tr key={plan.Id}>
            <td className="text-center">{index + 1}</td>
            <td className="text-start">{plan.PlanName}</td>
            <td className="text-center">{plan.PlanType}</td>
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


      {/* ✅ View Plan Modal */}
      {showViewModal && viewPlan && (
        <div className="modal show fade d-block" tabIndex="-1">
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">View Plan - {viewPlan.PlanName}</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowViewModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <div className="row">
                  {Object.keys(viewPlan).map((key) => (
                    <div className="col-md-6 mb-2" key={key}>
                      <strong>{key}:</strong> {viewPlan[key]}
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
                  }}
                ></button>
              </div>

              <div className="modal-body">
                {/* If submission message exists → show it, else show form */}
                {modalMessage ? (
                  <div className="text-center">
                    <p>{modalMessage}</p>
                  </div>
                ) : (
                  <form className="row g-3" onSubmit={handleSubmit}>
                    {renderInput("Plan Name", "planName", "Plan Name")}
                    {renderInput(
                      "Setup Fee",
                      "setupFee",
                      "Setup Cost",
                      "number"
                    )}
                    {renderInput(
                      "Subscription Amount",
                      "subscriptionAmount",
                      "Subscription Amount",
                      "number"
                    )}
                    {renderInput("Plan Mode", "PlanType", "Period Type")}
                    {renderInput(
                      "Credit Value as per Plan Mode",
                      "creditValuePerMode",
                      "Credit Value per Plan Mode",
                      "number"
                    )}
                    {renderInput(
                      "Credit Value",
                      "creditValue",
                      "Credit Value",
                      "number"
                    )}
                    {renderInput(
                      "Rate Per Pulse (Day Shift)",
                      "ratePerPulseDay",
                      "Rate Per Pulse",
                      "number"
                    )}
                    {renderInput(
                      "Inbound Call Charge (Day Shift)",
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
                      "Outbound Call Charge",
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
                      "Inbound Call Charge (Night Shift)",
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
                      "Email Charge",
                      "emailCharge",
                      "Per Email Charge",
                      "number"
                    )}
                    {renderInput(
                      "Rate Per Pulse (Night Shift)",
                      "ratePerPulseNight",
                      "Rate Per Pulse",
                      "number"
                    )}
                    {renderInput(
                      "Rate Per Pulse",
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
                      "Miss Call Charge",
                      "missCallCharge",
                      "Miss Call Rs./Min",
                      "number"
                    )}
                    {renderInput(
                      "IVR Call Charge",
                      "ivrCallCharge",
                      "IVR Call Rs./CALL",
                      "number"
                    )}
                    {renderInput(
                      "VFO Call Charge",
                      "vfoCharge",
                      "VFO Rs./Min",
                      "number"
                    )}
                    {renderInput(
                      "Charge Per Extra User",
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
                      { value: "yes", label: "Yes" },
                      { value: "no", label: "No" },
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
                      "Multi Language (Inbound Charge)",
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
                      "Rate Per Pulse (Multi Language)",
                      "ratePerPulseMultiLang",
                      "Rate Per Pulse",
                      "number"
                    )}
                    {renderInput(
                      "Multi Language (Outbound Charge)",
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
                      "Rate Per Pulse (Multi Language OB)",
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
                      "Whatsapp SMS Charge",
                      "whatsappSmsCharge",
                      "Whatsapp SMS Charge",
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
                )}
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
