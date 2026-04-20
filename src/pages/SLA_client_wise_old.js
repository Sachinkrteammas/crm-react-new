import React, { useState, useEffect } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import api from "../api";
import { saveAs } from "file-saver";

const SLAClientWiseOldReport = () => {
  const [filters, setFilters] = useState({
    type: "",
    client: "", // company_id
    filter: "with_0",
    startDate: null,
    endDate: null,
  });

  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const formatDateForApi = (date) => {
    if (!date) return null;
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  /* ------------------ FETCH CLIENTS ------------------ */
  useEffect(() => {
    const fetchClients = async () => {
      try {
        // Determine is_shared_param based on type
        let is_shared_param = null;
        if (filters.type === "0") is_shared_param = 0;
        else if (filters.type === "1") is_shared_param = 1;

        const res = await api.get("/companies", {
          params: is_shared_param !== null ? { is_shared: is_shared_param } : {},
        });

        const sortedClients = res.data.sort((a, b) =>
          (a.company_name || "").localeCompare(b.company_name || "", "en", { sensitivity: "base" })
        );

        setClients([{ company_id: "ALL", company_name: "ALL" }, ...sortedClients]);
      } catch (err) {
        console.error("Error fetching clients:", err);
      }
    };

    fetchClients();
  }, [filters.type]);

  /* ------------------ EXPORT EXCEL ------------------ */
  const handleExport = async () => {
    setLoading(true);
    try {
      const payload = {
        from_date: formatDateForApi(filters.startDate),
        to_date: formatDateForApi(filters.endDate),
        company_id: filters.client || "ALL",
        sd_type: filters.type === "" ? "0" : filters.type,
        filter_type: filters.filter,
      };

      const res = await api.post("/sla_clientwise_report_excel_old", payload, {
        responseType: "blob", // important for Excel
      });

      // Get filename from headers
      const disposition = res.headers["content-disposition"];
      let filename = "sla_clientwise_report.xlsx";
      if (disposition && disposition.includes("filename=")) {
        filename = disposition.split("filename=")[1].replace(/"/g, "");
      }

      // Save the file
      saveAs(res.data, filename);
    } catch (err) {
      console.error("Error exporting SLA report:", err);
      alert("Error exporting SLA report:")
    } finally {
      setLoading(false)
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
        <div className="card mb-4">
          <h6 className="card-header">SLA CLIENT WISE OLD</h6>
          <div className="card-body">
            <div className="row g-3 align-items-end">
              
              {/* Type */}
              <div className="col-md-2">
                <label className="form-label">Select Type</label>
                <select
                  className="form-control"
                  value={filters.type}
                  onChange={(e) => handleChange("type", e.target.value)}
                >
                  <option value="">Select</option>
                  <option value="ALL">All</option>
                  <option value="0">Dedicated</option>
                  <option value="1">Shared</option>
                </select>
              </div>

              {/* Client */}
              <div className="col-md-2">
                <label className="form-label">Select Client</label>
                <select
                  className="form-control"
                  value={filters.client}
                  onChange={(e) => handleChange("client", e.target.value)}
                >
                  {clients.map((c) => (
                    <option key={c.company_id} value={c.company_id}>
                      {c.company_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Filter */}
              <div className="col-md-2">
                <label className="form-label">Filter</label>
                <select
                  className="form-select"
                  value={filters.filter}
                  onChange={(e) => handleChange("filter", e.target.value)}
                >
                  <option value="with_0">Offered with Zero</option>
                  <option value="without_0">Offered without Zero</option>
                </select>
              </div>

              {/* Start Date */}
              <div className="col-md-2">
                <label className="form-label d-block">Start Date</label>
                <DatePicker
                  selected={filters.startDate}
                  onChange={(date) => handleChange("startDate", date)}
                  className="form-control w-100"
                  wrapperClassName="w-100"
                  placeholderText="Start Date"
                  dateFormat="dd-MM-yyyy"
                />
              </div>

              {/* End Date */}
              <div className="col-md-2">
                <label className="form-label d-block">End Date</label>
                <DatePicker
                  selected={filters.endDate}
                  onChange={(date) => handleChange("endDate", date)}
                  className="form-control w-100"
                  wrapperClassName="w-100"
                  placeholderText="End Date"
                  dateFormat="dd-MM-yyyy"
                />
              </div>

              {/* Export Button */}
              <div className="col-11 mt-3 d-flex justify-content-center">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleExport}
                >
                  EXPORT
                </button>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
    </div>
    </>
  );
};

export default SLAClientWiseOldReport;
