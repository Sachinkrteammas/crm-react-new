import React, { useState, useEffect } from 'react';
import api from "../api";
import { Trash2, Pencil } from "lucide-react";

const ManageMISReports = () => {

  const userType = localStorage.getItem("user_type");
  const companyId = localStorage.getItem("company_id");
  const [clients, setClients] = useState([]);
  const [reportMaster, setReportMaster] = useState([]);
  const [loading, setLoading] = useState(false);


  const [formData, setFormData] = useState({
    client: companyId || "",
    userName: '',
    designation: '',
    mobile: '',
    email: '',
    cc: '',
    report: '',
    reportType: '',
    reportTime: '',
    sendType: []
  });
  const [showModal, setShowModal] = useState(false);
  const [editData, setEditData] = useState(null);

  const [reports, setReports] = useState([]); // Table data

  const handleChange = (e) => {
    const { name, value, checked, type } = e.target;

    if (type === "checkbox" && name === "sendType") {
      setFormData((prev) => {
        if (checked) {
          return { ...prev, sendType: [...prev.sendType, value] };
        } else {
          return { ...prev, sendType: prev.sendType.filter((v) => v !== value) };
        }
      });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if(!formData.client || formData.client === "null") {
      alert("Please select Client.");
      return;
    }

    // Validation
    if (
      !formData.client ||
      !formData.userName ||
      !formData.designation ||
      !formData.mobile ||
      !formData.email ||
      !formData.cc ||
      !formData.report ||
      !formData.reportType ||
      !formData.reportTime ||
      formData.sendType.length === 0
    ) {
      alert("All fields are required");
      return;
    }

    try {
      setLoading(true);

      const payload = {
        client_id: parseInt(formData.client),
        user_name: formData.userName,
        user_designation: formData.designation,
        user_mobile: formData.mobile,
        user_email: formData.email,
        cc: formData.cc,
        report: formData.report,
        report_type: formData.reportType,
        report_value: formData.reportTime,
        send_type: formData.sendType
      };

      const res = await api.post("/save-report-matrix", payload);

      alert(res.data.message);

      // refresh table
      const reportRes = await api.get(`/report-matrix?CLIENT_ID=${formData.client}`);
      setReports(reportRes.data);

      // reset form
      setFormData({
        client: formData.client,
        userName: "",
        designation: "",
        mobile: "",
        email: "",
        cc: "",
        report: "",
        reportType: "",
        reportTime: "",
        sendType: []
      });

    } catch (err) {
      console.error("Error saving report matrix:", err);
      alert("Failed to save report matrix");
    } finally {
      setLoading(false);
    }
  };


  const handleEdit = (report) => {

    setEditData({
      id: report.id,
      userName: report.user_name,
      designation: report.user_designation,
      mobile: report.user_mobile,
      email: report.user_email,
      cc: report.cc,
      report: report.report,
      reportType: report.report_type,
      reportTime: report.report_value,
      sendType: report.send_type ? report.send_type.split(",") : []
    });

    setShowModal(true);
  };



  const handleUpdate = async () => {

    try {
      setLoading(true);

      const payload = {
        id: editData.id,
        user_name: editData.userName,
        user_designation: editData.designation,
        user_mobile: editData.mobile,
        user_email: editData.email,
        cc: editData.cc,
        report: editData.report,
        report_type: editData.reportType,
        report_value: editData.reportTime,
        send_type: editData.sendType
      };

      const res = await api.put("/report-matrix", payload);

      alert(res.data.message);

      const reportRes = await api.get(`/report-matrix?CLIENT_ID=${formData.client}`);
      setReports(reportRes.data);

      setShowModal(false);

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const res = await api.get("/report-master");

        const sortedReports = res.data.sort((a, b) =>
          a.report_name.localeCompare(b.report_name, "en", { sensitivity: "base" })
        );

        setReportMaster(sortedReports);

      } catch (err) {
        console.error("Error fetching reports:", err);
      }
    };

    fetchReports();
  }, []);


  useEffect(() => {
    if (userType === "Super-Admin" || userType === "Admin") {

      const fetchClients = async () => {
        try {
          const res = await api.get("/agents/clients-rights");

          const sortedClients = res.data.sort((a, b) =>
            a.company_name.localeCompare(b.company_name, "en", { sensitivity: "base" })
          );

          setClients(sortedClients);

        } catch (err) {
          console.error("Error fetching clients:", err);
        }
      };

      fetchClients();
    }
  }, []);

  useEffect(() => {
    if (!(userType === "Super-Admin" || userType === "Admin")) {
      setFormData((prev) => ({
        ...prev,
        client: companyId
      }));
    }
  }, []);

  useEffect(() => {
    const fetchReportMatrix = async () => {
      if (!formData.client || formData.client === "null") return;

      try {
        const res = await api.get(`/report-matrix?CLIENT_ID=${formData.client}`);
        setReports(res.data);
      } catch (err) {
        console.error("Error fetching report matrix:", err);
      }
    };

    fetchReportMatrix();
  }, [formData.client]);


  const handleDelete = async (id) => {

    const confirmDelete = window.confirm("Are you sure you want to delete this record?");
    if (!confirmDelete) return;

    try {
      setLoading(true);

      const res = await api.delete(`/report-matrix?id=${id}`);

      alert(res.data.message);

      // remove deleted row from table
      setReports((prev) => prev.filter((item) => item.id !== id));

    } catch (err) {
      console.error("Delete error:", err);
      alert("Failed to delete record");
    } finally {
      setLoading(false);
    }
  };

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
      <h4 className="mb-4">Manage MIS & Reports</h4>

      <div className="card mb-4">
        <div className="card-header d-flex justify-content-between align-items-center">
          <span>MANAGE MIS & REPORTS</span>

          {(userType === "Super-Admin" || userType === "Admin") && (
            <div style={{ width: "250px" }}>
              <select
                name="client"
                className="form-select form-select-sm"
                value={formData.client}
                onChange={handleChange}
              >
                <option value="">Select Client</option>

                {clients.map((client) => (
                  <option key={client.company_id} value={client.company_id}>
                    {client.company_name}
                  </option>
                ))}
              </select>
            </div>
          )}

        </div>

        <div className="card-body">
          <form onSubmit={handleSubmit} className="row g-3">
            <div className="col-md-3">
              <label className="form-label">User Name</label>
              <input
                type="text"
                className="form-control"
                name="userName"
                value={formData.userName}
                onChange={handleChange}
              />
            </div>

            <div className="col-md-3">
              <label className="form-label">Designation</label>
              <input
                type="text"
                className="form-control"
                name="designation"
                value={formData.designation}
                onChange={handleChange}
              />
            </div>

            <div className="col-md-3">
              <label className="form-label">Mobile</label>
              <input
                type="text"
                className="form-control"
                name="mobile"
                value={formData.mobile}
                onChange={handleChange}
              />
            </div>

            <div className="col-md-3">
              <label className="form-label">Email</label>
              <input
                type="text"
                className="form-control"
                name="email"
                value={formData.email}
                onChange={handleChange}
              />
              <small className="form-text text-muted">
                (e.g. abc@gmail.com,xyz@gmail.com)
              </small>
            </div>

            <div className="col-md-3">
              <label className="form-label">CC</label>
              <input
                type="text"
                className="form-control"
                name="cc"
                value={formData.cc}
                onChange={handleChange}
              />
              <small className="form-text text-muted">
                (e.g. abc@gmail.com,xyz@gmail.com)
              </small>              
            </div>

            <div className="col-md-3">
              <label className="form-label">Select Report</label>
              <select
                name="report"
                className="form-select"
                value={formData.report}
                onChange={handleChange}
              >
                <option value="">Select Report</option>

                {reportMaster.map((item) => (
                  <option key={item.id} value={item.report_name}>
                    {item.report_name}
                  </option>
                ))}

              </select>
            </div>

            <div className="col-md-3">
              <label className="form-label">Report Type</label>
              <select
                name="reportType"
                className="form-select"
                value={formData.reportType}
                onChange={handleChange}
              >
                <option value="">Report Type</option>
                <option value="daily">Daily Report</option>
              </select>
            </div>

            <div className="col-md-3">
              <label className="form-label">Hour Wise</label>
              <input
                type="time"
                className="form-control"
                name="reportTime"
                value={formData.reportTime}
                onChange={handleChange}
              />
            </div>

           <div className="col-md-3">
            <label className="form-label">Send Type</label>
            <div className="form-check mt-2">
              <input
                type="checkbox"
                name="sendType"
                value="email"
                checked={formData.sendType.includes("email")}
                onChange={handleChange}
                className="form-check-input"
              />
              <label className="form-check-label">Email</label>
            </div>
            {/* <div className="form-check">
              <input
                type="checkbox"
                name="sendType"
                value="sms"
                checked={formData.sendType.includes("sms")}
                onChange={handleChange}
                className="form-check-input"
              />
              <label className="form-check-label">SMS</label>
            </div> */}
          </div>          

            <div className="col-11 d-flex justify-content-center mt-8">
              <button type="submit" className="btn btn-primary">SUBMIT</button>
            </div>
          </form>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div className="card-header">VIEW REPORT MATRIX</div>
        <div className="card-body table-responsive">
          <table className="table table-bordered table-hover">
            <thead className="table-light">
              <tr>
                <th>S.N</th>
                <th>USER NAME</th>
                <th>DESIGNATION</th>
                <th>MOBILE</th>
                <th>EMAIL</th>
                <th>CC</th>
                <th>REPORT</th>
                <th>REPORT TYPE</th>
                <th>REPORT TIME</th>
                <th>SEND TYPE</th>
                <th>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {reports.length === 0 ? (
                <tr>
                  <td colSpan="11" className="text-center">No data available in table</td>
                </tr>
              ) : (
                reports.map((report, index) => (
                  <tr key={report.id}>
                    <td>{index + 1}</td>
                    <td>{report.user_name}</td>
                    <td>{report.user_designation}</td>
                    <td>{report.user_mobile}</td>
                    <td>{report.user_email.replace(/,/g, ", ")}</td>
                    <td>{report.cc.replace(/,/g, ", ")}</td>
                    <td>{report.report}</td>
                    <td>{report.report_type}</td>
                    <td>{report.report_value}</td>
                    <td>{report.send_type}</td>
                    <td className="d-flex gap-2">
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => handleEdit(report)}
                      >
                        <Pencil size={15}/>
                      </button>

                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => handleDelete(report.id)}
                      >
                        <Trash2 size={15}/>
                      </button>

                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {showModal && (
          <>
          <div className="modal fade show d-block">
            <div className="modal-dialog modal-lg modal-dialog-centered">
              <div className="modal-content">

                <div className="modal-header">
                  <h5 className="modal-title">Edit MIS Report</h5>
                  <button
                    className="btn-close"
                    onClick={() => setShowModal(false)}
                  ></button>
                </div>

                <div className="modal-body">

                  <div className="row g-3">

                    <div className="col-md-6">
                      <label className="form-label">User Name</label>
                      <input
                        className="form-control"
                        value={editData.userName}
                        onChange={(e)=>setEditData({...editData,userName:e.target.value})}
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label">Designation</label>
                      <input
                        className="form-control"
                        value={editData.designation}
                        onChange={(e)=>setEditData({...editData,designation:e.target.value})}
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label">Mobile</label>
                      <input
                        className="form-control"
                        value={editData.mobile}
                        onChange={(e)=>setEditData({...editData,mobile:e.target.value})}
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label">Email</label>
                      <input
                        className="form-control"
                        value={editData.email}
                        onChange={(e)=>setEditData({...editData,email:e.target.value})}
                      />
                      <small className="text-muted">(e.g. abc@gmail.com,xyz@gmail.com)</small>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label">CC</label>
                      <input
                        className="form-control"
                        value={editData.cc}
                        onChange={(e)=>setEditData({...editData,cc:e.target.value})}
                      />
                      <small className="text-muted">(e.g. abc@gmail.com,xyz@gmail.com)</small>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label">Select Report</label>
                      <select
                        className="form-select"
                        value={editData.report}
                        onChange={(e)=>setEditData({...editData,report:e.target.value})}
                      >
                        <option value="">Select Report</option>

                        {reportMaster.map((item) => (
                          <option key={item.id} value={item.report_name}>
                            {item.report_name}
                          </option>
                        ))}

                      </select>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label">Report Type</label>
                      <select
                        className="form-select"
                        value={editData.reportType}
                        onChange={(e)=>setEditData({...editData,reportType:e.target.value})}
                      >
                        <option value="">Report Type</option>
                        <option value="daily">Daily Report</option>
                      </select>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label">Hour Wise</label>
                      <input
                        type="time"
                        className="form-control"
                        value={editData.reportTime}
                        onChange={(e)=>setEditData({...editData,reportTime:e.target.value})}
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label">Send Type</label>

                      <div className="form-check mt-2">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          value="email"
                          checked={editData.sendType?.includes("email")}
                          onChange={(e)=>{
                            const value = e.target.value;
                            if(e.target.checked){
                              setEditData({...editData,sendType:[...editData.sendType,value]})
                            } else {
                              setEditData({...editData,sendType:editData.sendType.filter(v=>v!==value)})
                            }
                          }}
                        />
                        <label className="form-check-label">Email</label>
                      </div>

                    </div>

                  </div>

                </div>

                <div className="modal-footer">

                  <button
                    className="btn btn-secondary"
                    onClick={()=>setShowModal(false)}
                  >
                    Cancel
                  </button>

                  <button
                    className="btn btn-primary"
                    onClick={handleUpdate}
                  >
                    Update
                  </button>

                </div>

              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show"></div>
          </>
          )}
        </div>
      </div>
    </div>
    </div>
    </div>
    </>
  );
};

export default ManageMISReports;
