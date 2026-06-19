import React, { useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import api from "../api";

const Obd_Managements_report = () => {
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState([]);

  const formatDate = (date) => {
    return date?.toISOString().split("T")[0];
  };

  const fetchReport = async () => {
    if (!startDate || !endDate) {
      alert("Please select Start Date and End Date");
      return;
    }

    try {
      setLoading(true);

      const response = await api.get("/report", {
        params: {
          start_date: formatDate(startDate),
          end_date: formatDate(endDate),
        },
      });

      setReportData(response.data.data || []);
    } catch (error) {
      console.error("Error fetching report:", error);
      alert("Failed to load report");
    } finally {
      setLoading(false);
    }
  };

  const exportReport = async () => {
    if (!startDate || !endDate) {
      alert("Please select Start Date and End Date");
      return;
    }

    try {
      setLoading(true);

      let data = reportData;

      // If user directly clicks Export without View
      if (!data.length) {
        const response = await api.get("/report", {
          params: {
            start_date: formatDate(startDate),
            end_date: formatDate(endDate),
          },
        });

        data = response.data.data || [];
      }

      if (!data.length) {
        alert("No data found");
        return;
      }

      const headers = Object.keys(data[0]);

      const csvRows = [
        headers.join(","),
        ...data.map((row) =>
          headers.map((field) => `"${row[field] ?? ""}"`).join(",")
        ),
      ];

      const blob = new Blob([csvRows.join("\n")], {
        type: "text/csv;charset=utf-8;",
      });

      const url = window.URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = "OBD_Report.csv";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

    } catch (error) {
      console.error("Export Error:", error);
      alert("Failed to export report");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="row">
      <div className="col-12">
        <h3 className="mb-4">OBD Management Report</h3>

        <div className="card shadow-sm mb-4">
          <div className="card-body">
            <div className="row g-3 align-items-end">
              <div className="col-md-3">
                <label className="form-label">Start Date</label>
                <DatePicker
                  selected={startDate}
                  onChange={(date) => setStartDate(date)}
                  dateFormat="dd-MM-yyyy"
                  className="form-control"
                  placeholderText="Start Date"
                />
              </div>

              <div className="col-md-3">
                <label className="form-label">End Date</label>
                <DatePicker
                  selected={endDate}
                  onChange={(date) => setEndDate(date)}
                  dateFormat="dd-MM-yyyy"
                  className="form-control"
                  placeholderText="End Date"
                />
              </div>

              <div className="col-md-2">
                <button
                  className="btn btn-primary w-100"
                  onClick={fetchReport}
                  disabled={loading}
                >
                  {loading ? "Loading..." : "VIEW"}
                </button>
              </div>

              <div className="col-md-2">
                <button
                  className="btn btn-secondary w-100"
                  onClick={exportReport}
                  disabled={loading}
                >
                  {loading ? "Exporting..." : "EXPORT"}
                </button>
              </div>
            </div>
          </div>
        </div>

        {reportData.length > 0 && (
          <div className="card shadow-sm">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h6 className="mb-0">Report Data</h6>

              <span className="badge bg-primary">
                Total Records : {reportData.length}
              </span>
            </div>

            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table table-striped table-bordered table-hover mb-0">
                  <thead>
                    <tr>
                      <th>S.No.</th>
                      <th>Date</th>
                      <th>Lead Id</th>
                      <th>User</th>
                      <th>Source Id</th>
                      <th>List Id</th>
                      <th>Phone Number</th>
                      <th>GMT Offset</th>
                      <th>Status</th>
                    </tr>
                  </thead>

                  <tbody>
                    {reportData.map((item, index) => (
                      <tr key={index}>
                        <td>{index + 1}</td>
                        <td>{item.entry_date}</td>
                        <td>{item.lead_id}</td>
                        <td>{item.user}</td>
                        <td>{item.source_id}</td>
                        <td>{item.list_id}</td>
                        <td>{item.phone_number}</td>
                        <td>{item.gmt_offset_now}</td>
                        <td>{item.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Obd_Managements_report;