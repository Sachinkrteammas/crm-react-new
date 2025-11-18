import React, { useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

const ProcessUpdates = () => {
  const [form, setForm] = useState({
    dateTime: null,
    clientName: "",
    processUpdate: "",
    updateType: "",
    validFrom: null,
    validTill: null,
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Submitted Data:", form);
  };

  return (
    <div className="row">
      <div className="col-12">
        <h4 className="mb-4">Process Updates</h4>

        <div className="card">
          <div className="card-body">
            <form className="row g-3" onSubmit={handleSubmit}>
              {/* Date/Time */}
              <div className="col-md-6">
                <label className="form-label">
                  Date/Time <span className="text-danger">*</span>
                </label>
                <DatePicker
                  selected={form.dateTime}
                  onChange={(date) => setForm({ ...form, dateTime: date })}
                  showTimeSelect
                  dateFormat="dd-MM-yyyy HH:mm"
                  placeholderText="dd-mm-yyyy  --:--"
                  className="form-control"
                />
              </div>

              {/* Client Name */}
              <div className="col-md-6">
                <label className="form-label">
                  Client Name <span className="text-danger">*</span>
                </label>
                <select
                  name="clientName"
                  className="form-select"
                  value={form.clientName}
                  onChange={handleChange}
                >
                  <option value="">Select Client</option>
                  <option value="Client 1">Client 1</option>
                  <option value="Client 2">Client 2</option>
                </select>
              </div>

              {/* Process Update */}
              <div className="col-md-12">
                <label className="form-label">
                  Process Update <span className="text-danger">*</span>
                </label>
                <textarea
                  name="processUpdate"
                  rows={3}
                  className="form-control"
                  placeholder="Enter Process Update"
                  value={form.processUpdate}
                  onChange={handleChange}
                ></textarea>
              </div>

              {/* Type of Update */}
              <div className="col-md-6">
                <label className="form-label">
                  Types Of Update <span className="text-danger">*</span>
                </label>
                <select
                  name="updateType"
                  className="form-select"
                  value={form.updateType}
                  onChange={handleChange}
                >
                  <option value="">Select</option>
                  <option value="Temporary">Temporary</option>
                  <option value="Permanent">Permanent</option>
                </select>
              </div>

              {/* Update Valid From / Till */}
              <div className="col-md-3">
                <label className="form-label">
                  Update Valid From <span className="text-danger">*</span>
                </label>
                <DatePicker
                  selected={form.validFrom}
                  onChange={(date) => setForm({ ...form, validFrom: date })}
                  dateFormat="dd-MM-yyyy"
                  placeholderText="dd-mm-yyyy"
                  className="form-control"
                />
              </div>

              <div className="col-md-3">
                <label className="form-label">
                  Update Valid Till <span className="text-danger">*</span>
                </label>
                <DatePicker
                  selected={form.validTill}
                  onChange={(date) => setForm({ ...form, validTill: date })}
                  dateFormat="dd-MM-yyyy"
                  placeholderText="dd-mm-yyyy"
                  className="form-control"
                />
              </div>

              {/* Submit Button */}
              <div className="col-12 d-flex justify-content-end mt-3">
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
};

export default ProcessUpdates;
