import React, { useState, useEffect } from "react";
import { Trash2, Edit, Eye, EyeOff } from "lucide-react";
import api from "../api";

const ManageUserLogin = () => {

  // Compute active company
  const userType = localStorage.getItem("user_type");
  const companyId = localStorage.getItem("company_id");

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
    designation: "",
    rights: [],
  });

  // --------------------
  // State for edit modal
  // --------------------
  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
    designation: "",
  });
  const [editRights, setEditRights] = useState([]);

  const [errorMessage, setErrorMessage] = useState("");

  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState(companyId);

  const [menuData, setMenuData] = useState([]); // store API menu
  const [loading, setLoading] = useState(true);
  const [loadingButton, setLoadingButton] = useState(true);

  const [expanded, setExpanded] = useState({});
  const [expandedEdit, setExpandedEdit] = useState({});
  const [selectedRights, setSelectedRights] = useState([]);   // ← store selected IDs

  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");

  const [editUserId, setEditUserId] = useState(null); // store user being edited
  const [showModal, setShowModal] = useState(false);

  const [loginUsers, setLoginUsers] = useState([]);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);


  const filteredData = loginUsers.filter((d) =>
    d.name.toLowerCase().includes(search.toLowerCase())
  );


  const toggleExpand = (id) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const activeCompanyId =
    userType === "Super-Admin" || userType === "Admin"
      ? selectedClient
      : companyId;

  // Fetch companies for admin users
  useEffect(() => {
    if (userType === "Super-Admin" || userType === "Admin") {
      api.get("/agents/clients-rights")
        .then(res => {
          const sorted = res.data.sort((a, b) => a.company_name.localeCompare(b.company_name));
          setClients(sorted);
        })
        .catch(err => console.error("Client fetch error", err));
    }
  }, []);

  // Auto-set for non-admin
  useEffect(() => {
    if (userType !== "Super-Admin" && userType !== "Admin") {
      setSelectedClient(companyId);
    }
  }, []);


  useEffect(() => {
    const fetchMenu = async () => {
      try {
        const { data } = await api.get("/dynamic-menu");
        setMenuData(data);
      } catch (error) {
        console.error("Error fetching menu:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchMenu();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrorMessage("");
  };



  const handleRightSelect = (id) => {
    setSelectedRights((prev) =>
      prev.includes(id)
        ? prev.filter((item) => item !== id) // remove
        : [...prev, id]                      // add
    );
  };


  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!activeCompanyId || activeCompanyId === "null") {
      alert("Client is not loaded yet!");
      return;
    }
    setErrorMessage("");

    try {
      const payload = {
        name: form.name,
        email: form.email,
        phone: form.phone,
        designation: form.designation,
        password: form.password,
        confirm_password: form.confirmPassword,
        user_rights_new: selectedRights.join(","),
      };

      const { data } = await api.post(
        "create_login_user",
        payload,
        { params: { create_id: activeCompanyId } }
      );

      if (data.status === "success") {
        alert(data.message);
        console.log("Created user:", data.data);

        // Fetch latest users from server
        const { data: refreshed } = await api.get(`/login_users_client/${activeCompanyId}`);
        setLoginUsers(refreshed);

        // reset form
        setForm({
          name: "",
          email: "",
          password: "",
          confirmPassword: "",
          phone: "",
          designation: "",
          rights: [],
        });
        setSelectedRights([]);
      } else {
        alert(data.message || "Error creating user");
      }
    } catch (err) {
        if (err.response && err.response.data) {
          setErrorMessage(
            err.response.data.message || 
            err.response.data.detail || 
            "Something went wrong.");
        } else {
          setErrorMessage("Something went wrong.");
        }
      }
  };


  const renderMenu = (items) => {
    return (
      <ul style={{ listStyle: "none", marginLeft: 10 }}>
        {items.map((item) => {
          const hasChildren = item.children && item.children.length > 0;
          const isExpanded = expanded[item.id];

          return (
            <li key={item.id} style={{ marginBottom: 5 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {hasChildren && (
                  <span
                    onClick={() => toggleExpand(item.id)}
                    style={{ cursor: "pointer", fontWeight: "bold" }}
                  >
                    {/* {isExpanded ? "▼" : "►"} */}
                    {isExpanded ? "▼" : "▶"}
                  </span>
                )}

                <input
                  type="checkbox"
                  checked={selectedRights.includes(item.id)}
                  onChange={() => {
                    handleRightSelect(item.id);

                    // Auto-expand when checkbox is clicked
                    if (hasChildren) {
                      setExpanded((prev) => ({
                        ...prev,
                        [item.id]: true
                      }));
                    }
                  }}
                />

                <label>{item.page_name}</label>
              </div>

              {hasChildren && isExpanded && (
                <div style={{ marginLeft: 20 }}>
                  {renderMenu(item.children)}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    );
  };



  // --------------------
  // Recursive renderMenu for edit modal
  // --------------------
  const renderEditMenu = (items) => {
    return (
      <ul style={{ listStyle: "none", marginLeft: 10, paddingLeft: 0 }}>
        {items.map((item) => {
          const hasChildren = item.children && item.children.length > 0;
          const isExpanded = expandedEdit[item.id];
          return (
            <li key={item.id} style={{ marginBottom: 5 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {hasChildren && (
                  <span
                    style={{ cursor: "pointer", fontWeight: "bold" }}
                    onClick={() =>
                      setExpandedEdit((prev) => ({
                        ...prev,
                        [item.id]: !prev[item.id],
                      }))
                    }
                  >
                    {isExpanded ? "▼" : "▶"}
                  </span>
                )}

                <input
                  type="checkbox"
                  checked={editRights.includes(item.id)}
                  onChange={() => {handleEditRightSelect(item.id);

                    // Auto-expand when checkbox is clicked
                    if (hasChildren) {
                      setExpandedEdit((prev) => ({
                        ...prev,
                        [item.id]: true
                      }));
                    }
                  }}
                />
                <label>{item.page_name}</label>
              </div>

              {hasChildren && isExpanded && (
                <div style={{ marginLeft: 20 }}>{renderEditMenu(item.children)}</div>
              )}
            </li>
          );
        })}
      </ul>
    );
  };




  useEffect(() => {
    if (!activeCompanyId || activeCompanyId === "null") return;

    api
      .get(`/login_users_client/${activeCompanyId}`)
      .then((res) => {
        setLoginUsers(res.data);
      })
      .catch((err) => console.error("Fetch users error:", err));
  }, [activeCompanyId]);



  // Edit user
  const handleEdit = async (id) => {
    try {
      const { data } = await api.get(`/login_users/${id}`);
      setEditUserId(id);
      setEditForm({
        name: data.name || "",
        email: data.username || "",
        password: data.password || "",
        confirmPassword: data.password2 || "",
        phone: data.phone || "",
        designation: data.designation || "",
      });
      setEditRights(
        data.user_right_new ? data.user_right_new.split(",").map(Number) : []
      );
      setShowModal(true);
    } catch (err) {
      console.error(err);
    }
  };

  // --------------------
  // Handle edit input change
  // --------------------
  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
    setErrorMessage("");
  };

  // --------------------
  // Handle rights change in edit
  // --------------------
  const handleEditRightSelect = (id) => {
    setEditRights((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };
  

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!editUserId) return;
    setLoadingButton(true);
    try {
      const payload = {
        name: editForm.name,
        email: editForm.email,
        phone: editForm.phone,
        designation: editForm.designation,
        password: editForm.password,
        confirm_password: editForm.confirmPassword,
        user_rights_new: editRights.join(","),
      };

      const { data } = await api.put(`/login_users/${editUserId}`, payload);
      if (data.status === "success") {
        alert(data.message);
        setShowModal(false);
        setEditUserId(null);
        // refresh users
        const { data: refreshed } = await api.get(
          `/login_users_client/${activeCompanyId}`
        );
        setLoginUsers(refreshed);
      } else {
        setErrorMessage(data.message);
      }
    } catch (err) {
      if (err.response?.data?.detail) setErrorMessage(err.response.data.detail);
      else setErrorMessage("Something went wrong.");
    } finally {
      setLoadingButton(false);
    }
  };



  // --------------------
  // Delete user
  // --------------------
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this user?")) return;

    try {
      const { data } = await api.delete(`/login_users/${id}`);
      if (data.status === "success") {
        alert(data.message);
        // Refresh users
        const { data: refreshed } = await api.get(`/login_users_client/${activeCompanyId}`);
        setLoginUsers(refreshed);
      } else {
        alert(data.message || "Failed to delete user");
      }
    } catch (err) {
      console.error(err);
      alert("Something went wrong while deleting user.");
    }
  };


  useEffect(() => {
    if (!errorMessage) return;
    const timer = setTimeout(() => {
      setErrorMessage("");
    }, 3000);

    return () => clearTimeout(timer);
  }, [errorMessage]);


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
  <div className="row">
    <div className="col-12">
        <div className="mb-3">
            <h4>Manage User Logins</h4>
        </div>
      <div className="card mb-4">
        <div className="card-header d-flex justify-content-between align-items-center">
        <h6 className="mt-4">MANAGE USER LOGINS</h6>
        {(userType === "Super-Admin" || userType === "Admin") && (
                <div style={{ maxWidth: "250px" }}>
                  <select
                    className="form-select"
                    value={selectedClient}
                    onChange={(e) => setSelectedClient(e.target.value)}
                  >
                    <option value="">--Select Client--</option>
                    {clients.map((c) => (
                      <option key={c.company_id} value={c.company_id}>
                        {c.company_name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              </div>
      <div className="card-body">

      <form className="row g-3" onSubmit={handleSubmit}>
        {errorMessage && (
          <div className="alert alert-danger mt-2 p-2">
            {errorMessage}
          </div>
        )}
        <div className="col-md-4">
          <input type="text" name="name" className="form-control" placeholder="Name" value={form.name} onChange={handleChange} />
        </div>
        <div className="col-md-4">
          <input type="email" name="email" className="form-control" placeholder="Email Address" value={form.email} onChange={handleChange} />
        </div>
        
        <div className="col-md-4" style={{ position: "relative" }}>
          <input
            type={showPassword ? "text" : "password"}
            name="password"
            className="form-control"
            placeholder="Password"
            value={form.password}
            onChange={handleChange}
          />
          <span
            style={{
              position: "absolute",
              right: 10,
              top: "50%",
              transform: "translateY(-50%)",
              cursor: "pointer"
            }}
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </span>
        </div>

        <div className="col-md-4" style={{ position: "relative" }}>
          <input
            type={showConfirmPassword ? "text" : "password"}
            name="confirmPassword"
            className="form-control"
            placeholder="Confirm Password"
            value={form.confirmPassword}
            onChange={handleChange}
          />
          <span
            style={{
              position: "absolute",
              right: 10,
              top: "50%",
              transform: "translateY(-50%)",
              cursor: "pointer"
            }}
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
          >
            {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </span>
        </div>

        <div className="col-md-4">
          <input type="text" name="phone" className="form-control" placeholder="Phone No" value={form.phone} onChange={handleChange} />
        </div>
        <div className="col-md-4">
          <input type="text" name="designation" className="form-control" placeholder="Designation" value={form.designation} onChange={handleChange} />
        </div>

        <div className="col-12">
        <label className="mt-2 mb-2">User Rights</label>
        <div
          style={{
            maxHeight: 250,
            overflowY: "auto",
            border: "1px solid #ccc",
            padding: 10,
            borderRadius: 4,
          }}
        >
          {loading ? <p>Loading menu...</p> : renderMenu(menuData)}
        </div>
      </div>
        <div className="col-12">
          <button type="submit" className="btn btn-primary mt-2">SUBMIT</button>
        </div>
      </form>
      </div>
      </div>

      <div className="card mt-4">
        <h6 className="card-header">VIEW LOGIN</h6>
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-center mb-2">
            <div>
              <select className="form-select form-select-sm w-auto">
                <option>10</option>
                <option>25</option>
                <option>50</option>
              </select>
            </div>
            <div>
              <input
                type="text"
                className="form-control form-control-sm"
                style={{ width: "200px" }}
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="table-responsive">
            <table className="table table-bordered">
              <thead className="table-light">
                <tr>
                  <th>S.N</th>
                  <th>NAME</th>
                  <th>PHONE NO</th>
                  <th>EMAIL</th>
                  <th>DESIGNATION</th>
                  <th>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.length ? (
                  filteredData.map((row, idx) => (
                    <tr key={idx}>
                      <td>{idx + 1}</td>
                      <td>{row.name}</td>
                      <td>{row.phone}</td>
                      <td>{row.username}</td>
                      <td>{row.designation}</td>
                      <td>
                        <div style={{ display: "flex", gap: "5px" }}>
                          <button
                            className="btn btn-sm btn-primary d-flex align-items-center justify-content-center"
                            style={{ padding: "0.25rem 0.5rem" }}
                            onClick={() => handleEdit(row.id)}
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            className="btn btn-danger btn-sm d-flex align-items-center justify-content-center"
                            style={{ padding: "0.25rem 0.5rem" }}
                            onClick={() => handleDelete(row.id)}
                          >
                            <Trash2 size={16} />
                          </button>   
                        </div>               
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan="5" className="text-center">No entries found</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Edit Modal */}
          {showModal && (
            <div
              className="modal show d-block"
              tabIndex="-1"
              role="dialog"
              style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
            >
              <div className="modal-dialog">
                <div className="modal-content">
                  <div className="modal-header">
                    <h5 className="modal-title">Edit User</h5>
                    <button
                      type="button"
                      className="btn-close"
                      onClick={() => setShowModal(false)}
                    ></button>
                  </div>
                  <div className="modal-body">
                    <form className="row g-3" onSubmit={handleUpdate}>
                      <div className="col-md-6">
                        <input
                          type="text"
                          name="name"
                          className="form-control"
                          placeholder="Name"
                          value={editForm.name}
                          onChange={handleEditChange}
                        />
                      </div>
                      <div className="col-md-6">
                        <input
                          type="email"
                          name="email"
                          className="form-control"
                          placeholder="Email"
                          value={editForm.email}
                          onChange={handleEditChange}
                        />
                      </div>
                      <div className="col-md-6">
                        <input
                          type="password"
                          name="password"
                          className="form-control"
                          placeholder="Password"
                          value={editForm.password}
                          onChange={handleEditChange}
                        />
                      </div>
                      <div className="col-md-6">
                        <input
                          type="password"
                          name="confirmPassword"
                          className="form-control"
                          placeholder="Confirm Password"
                          value={editForm.confirmPassword}
                          onChange={handleEditChange}
                        />
                      </div>
                      {errorMessage && (
                        <div className="alert alert-danger mt-2 p-2">
                          {errorMessage}
                        </div>
                      )}
                      <div className="col-md-6">
                        <input
                          type="text"
                          name="phone"
                          className="form-control"
                          placeholder="Phone No"
                          value={editForm.phone}
                          onChange={handleEditChange}
                        />
                      </div>
                      <div className="col-md-6">
                        <input
                          type="text"
                          name="designation"
                          className="form-control"
                          placeholder="Designation"
                          value={editForm.designation}
                          onChange={handleEditChange}
                        />
                      </div>
                      <div className="col-12">
                        <label className="mt-2 mb-2">User Rights</label>
                        <div
                          style={{
                            maxHeight: 250,
                            overflowY: "auto",
                            border: "1px solid #ccc",
                            padding: 10,
                            borderRadius: 4,
                          }}
                        >
                          {loading ? <p>Loading menu...</p> : renderEditMenu(menuData)}
                        </div>
                      </div>
                      <div className="col-12 d-flex justify-content-end">
                        <button type="submit" className="btn btn-primary" disabled={loadingButton}>
                          {loadingButton ? "Updating..": "Update"}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="d-flex justify-content-between align-items-center mt-3">
            <small>Showing 1 to {filteredData.length} of {setLoginUsers.length} entries</small>
            <ul className="pagination pagination-sm mb-0">
              <li className="page-item disabled"><span className="page-link">Previous</span></li>
              <li className="page-item active"><span className="page-link">1</span></li>
              <li className="page-item disabled"><span className="page-link">Next</span></li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </div>
  </div>
  </>
  );
};

export default ManageUserLogin;
