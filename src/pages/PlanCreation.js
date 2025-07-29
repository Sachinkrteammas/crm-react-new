import React, { useState } from "react";

export default function PlanCreation() {
  const [form, setForm] = useState({
    planName: "",
    planMode: "",
    ratePerPulseDay: "",
    outboundCallCharge: "",
    pulse: "",
    emailCharge: "",
    setupFee: "",
    creditValuePerMode: "",
    inboundChargeNight: "",
    pulseDay: "",
    vfoCharge: "",
    noOfUsers: "",
    subscriptionAmount: "",
    creditValue: "",
    inboundChargeDay: "",
    pulseNight: "",
    ratePerPulseNight: "",
    ratePerPulse: "",
    missCallCharge: "",
    chargePerExtraUser: "",
    smsCharge: "",
    ivrCallCharge: "",
    balanceCarry: "",
    startDate: null,
    firstMinute: "disable",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log(form);
  };

  return (
  <div className="row">
    <div className="col-12">
    <div className="card mb-2">
        <h5 className="card-header">PLAN CREATION</h5>
    <div className="card-body">
    <form className="row g-3" onSubmit={handleSubmit}>
        {/* Column 1 */}
        <div className="col-md-4 mb-2">
          <label className="form-label">Plan Name</label>
          <input
            type="text"
            name="planName"
            className="form-control"
            placeholder="Plan Name"
            value={form.planName}
            onChange={handleChange}
          />
        </div>

        <div className="col-md-4 mb-2">
          <label className="form-label">Setup Fee</label>
          <input
            type="text"
            name="setupFee"
            className="form-control"
            placeholder="Setup Cost"
            value={form.setupFee}
            onChange={handleChange}
          />
        </div>

        <div className="col-md-4 mb-2">
          <label className="form-label">Subscription Amount</label>
          <input
            type="text"
            name="subscriptionAmount"
            className="form-control"
            placeholder="Subscription Amount"
            value={form.subscriptionAmount}
            onChange={handleChange}
          />
        </div>

        <div className="col-md-4 mb-2">
          <label className="form-label">Plan Mode</label>
          <input
            type="text"
            name="planMode"
            className="form-control"
            placeholder="Period Type"
            value={form.planMode}
            onChange={handleChange}
          />
        </div>

        <div className="col-md-4 mb-2">
          <label className="form-label">Credit Value as per Plan Mode</label>
          <input
            type="text"
            name="creditValuePerMode"
            className="form-control"
            placeholder="Credit Value as per Plan Mode"
            value={form.creditValuePerMode}
            onChange={handleChange}
          />
        </div>

        <div className="col-md-4 mb-2">
          <label className="form-label">Credit value</label>
          <input
            type="text"
            name="creditValue"
            className="form-control"
            placeholder="Credit value"
            value={form.creditValue}
            onChange={handleChange}
          />
        </div>

        <div className="col-md-4 mb-2">
          <label className="form-label">Rate Per Pulse (Day Shift)</label>
          <input
            type="text"
            name="ratePerPulseDay"
            className="form-control"
            placeholder="Rate Per Pulse"
            value={form.ratePerPulseDay}
            onChange={handleChange}
          />
        </div>

        <div className="col-md-4 mb-2">
          <label className="form-label">Inbound Call Charge (Day Shift)</label>
          <input
            type="text"
            name="inboundChargeDay"
            className="form-control"
            placeholder="Inbound Call Charge"
            value={form.inboundChargeDay}
            onChange={handleChange}
          />
        </div>

        <div className="col-md-4 mb-2">
          <label className="form-label">Pulse (Day Shift)</label>
          <select
            name="pulseDay"
            className="form-select"
            value={form.pulseDay}
            onChange={handleChange}
          >
            <option value="">Select</option>
            <option value="30">30 Sec</option>
            <option value="60">60 Sec</option>
          </select>
        </div>

        <div className="col-md-4 mb-2">
          <label className="form-label">Outbound Call Charge</label>
          <input
            type="text"
            name="outboundCallCharge"
            className="form-control"
            placeholder="Outbound Call Charge"
            value={form.outboundCallCharge}
            onChange={handleChange}
          />
        </div>

        <div className="col-md-4 mb-2">
          <label className="form-label">Pulse</label>
          <select
            name="pulse"
            className="form-select"
            value={form.pulse}
            onChange={handleChange}
          >
            <option value="">Select</option>
            <option value="30">30 Sec</option>
            <option value="60">60 Sec</option>
          </select>
        </div>

        <div className="col-md-4 mb-2">
          <label className="form-label">Inbound Call Charge (Night Shift)</label>
          <input
            type="text"
            name="inboundChargeNight"
            className="form-control"
            placeholder="Inbound Call Charge"
            value={form.inboundChargeNight}
            onChange={handleChange}
          />
        </div>

        <div className="col-md-4 mb-2">
          <label className="form-label">Pulse (Night Shift)</label>
          <select
            name="pulseNight"
            className="form-select"
            value={form.pulseNight}
            onChange={handleChange}
          >
            <option value="">Select</option>
            <option value="30">30 Sec</option>
            <option value="60">60 Sec</option>
          </select>
        </div>

        <div className="col-md-4 mb-2">
          <label className="form-label">Email Charge</label>
          <input
            type="text"
            name="emailCharge"
            className="form-control"
            placeholder="Per Email Charge"
            value={form.emailCharge}
            onChange={handleChange}
          />
        </div>

        <div className="col-md-4 mb-2">
          <label className="form-label">Rate Per Pulse (Night Shift)</label>
          <input
            type="text"
            name="ratePerPulseNight"
            className="form-control"
            placeholder="0"
            value={form.ratePerPulseNight}
            onChange={handleChange}
          />
        </div>

        <div className="col-md-4 mb-2">
          <label className="form-label">Rate Per Pulse</label>
          <input
            type="text"
            name="ratePerPulse"
            className="form-control"
            placeholder="Rate Per Pulse"
            value={form.ratePerPulse}
            onChange={handleChange}
          />
        </div>

        <div className="col-md-4 mb-2">
          <label className="form-label">SMS Char 160</label>
          <input
            type="text"
            name="smsCharge"
            className="form-control"
            placeholder="SMS Charge"
            value={form.smsCharge}
            onChange={handleChange}
          />
        </div>

        <div className="col-md-4 mb-2">
          <label className="form-label">Miss Call Charge</label>
          <input
            type="text"
            name="missCallCharge"
            className="form-control"
            placeholder="Miss Call Rs./Min"
            value={form.missCallCharge}
            onChange={handleChange}
          />
        </div>

        <div className="col-md-4 mb-2">
          <label className="form-label">IVR Call Charge</label>
          <input
            type="text"
            name="ivrCallCharge"
            className="form-control"
            placeholder="IVR Call Rs./CALL"
            value={form.ivrCallCharge}
            onChange={handleChange}
          />
        </div>

        <div className="col-md-4 mb-2">
          <label className="form-label">VFO Call Charge</label>
          <input
            type="text"
            name="vfoCharge"
            className="form-control"
            placeholder="VFO Rs./Min"
            value={form.vfoCharge}
            onChange={handleChange}
          />
        </div>

        <div className="col-md-4 mb-2">
          <label className="form-label">Charge Per Extra User</label>
          <input
            type="text"
            name="chargePerExtraUser"
            className="form-control"
            placeholder="Charge For Extra User Rs./User"
            value={form.chargePerExtraUser}
            onChange={handleChange}
          />
        </div>

        <div className="col-md-4 mb-2">
          <label className="form-label">No. of Users</label>
          <input
            type="text"
            name="noOfUsers"
            className="form-control"
            placeholder="No. Of Free User"
            value={form.noOfUsers}
            onChange={handleChange}
          />
        </div>

        <div className="col-md-4 mb-2">
          <label className="form-label">Balance Carry Forward</label>
          <select
            name="balanceCarry"
            className="form-select"
            value={form.balanceCarry}
            onChange={handleChange}
          >
            <option value="">Select</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
        </div>

        <div className="col-md-4 mb-2">
          <label className="form-label">First Minute</label><br />
          <div className="form-check form-check-inline">
            <input
              type="radio"
              id="enable"
              name="firstMinute"
              value="enable"
              className="form-check-input"
              checked={form.firstMinute === "enable"}
              onChange={handleChange}
            />
            <label htmlFor="enable" className="form-check-label">Enable</label>
          </div>
          <div className="form-check form-check-inline">
            <input
              type="radio"
              id="disable"
              name="firstMinute"
              value="disable"
              className="form-check-input"
              checked={form.firstMinute === "disable"}
              onChange={handleChange}
            />
            <label htmlFor="disable" className="form-check-label">Disable</label>
          </div>
        </div>

        {/* Submit Button */}
        <div className="col-12">
          <button type="submit" className="btn btn-primary px-4">
            SUBMIT
          </button>
        </div>
    </form>
    </div>
    </div>
    </div>
  </div>
  );
}
