import { useState } from "react";

const CreateAgent = () => {
  const [form, setForm] = useState({
    displayName: "",
    loginId: "",
    password: "",
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log(form); // TODO: Hook up API call here
  };

  return (
    <div className="row">
    <div className="col-12">
        <div className="mb-3">
          <h4>Agent Creation</h4>
      </div>

      {/* Form Card */}
      <div className="card mb-4">
        <h6 className="card-header">CREATE AGENT</h6>
        <div className="card-body">
          <form className="row g-3" onSubmit={handleSubmit}>
            <div className="col-md-4">
              <label className="form-label">Display Name</label>
              <input
                name="displayName"
                className="form-control"
                placeholder="Display Name"
                value={form.displayName}
                onChange={handleChange}
              />
            </div>

            <div className="col-md-4">
              <label className="form-label">Login ID</label>
              <input
                name="loginId"
                className="form-control"
                placeholder="Login ID"
                value={form.loginId}
                onChange={handleChange}
              />
            </div>

            <div className="col-md-4">
              <label className="form-label">Password</label>
              <input
                type="password"
                name="password"
                className="form-control"
                placeholder="Password"
                value={form.password}
                onChange={handleChange}
              />
            </div>
            <div className="col-12">
              <button type="submit" className="btn btn-primary">
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

export default CreateAgent;
