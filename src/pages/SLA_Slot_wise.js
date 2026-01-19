import React, { useState, useEffect } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import api from "../api";
import { saveAs } from "file-saver";
import * as XLSX from "xlsx";

const SLAClientWise = () => {
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
  if (!filters.startDate || !filters.endDate) {
    alert("Please select start and end date");
    return;
  }

  if(!filters.type) {
    alert("Please select Type.");
    return;
  }


  // 🔹 Get selected client name for file name
  let clientNameForFile = "All";

  if (filters.client && filters.client !== "ALL") {
    const selectedClient = clients.find(
      (c) => String(c.company_id) === String(filters.client)
    );
    if (selectedClient?.company_name) {
      clientNameForFile = selectedClient.company_name;
    }
  }

  // 🔹 Limit to first 6 characters
  clientNameForFile = clientNameForFile.substring(0, 6);

  const formatDateForFile = (date) => {
    if (!date) return "";
    const d = String(date.getDate()).padStart(2, "0");
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const y = date.getFullYear();
    return `${d}-${m}-${y}`;
  };

  const fileStartDate = formatDateForFile(filters.startDate);
  const fileEndDate = formatDateForFile(filters.endDate);


  setLoading(true);
  try {
    const params = {
      startdate: formatDateForApi(filters.startDate),
      enddate: formatDateForApi(filters.endDate),
      clientID: filters.client || "All",
      sd_type:
        filters.type === "" || filters.type === "ALL"
          ? "All"
          : filters.type === "0"
          ? "Dedicated"
          : "Shared",
    };

    // 🔹 GET JSON DATA
    const res = await api.get("/sla/slot-wise-utilization", { params });
    const jsonData = res.data.data; // <-- note "data" key

    // ---------------------------------------------------
    // 🔹 CONVERT JSON → ROWS (flatten by date + hour)
    // ---------------------------------------------------
    const rows = [];

    Object.entries(jsonData).forEach(([date, hours]) => {
      Object.entries(hours).forEach(([hour, values]) => {
        rows.push({
          Date: date,
          Hour: hour,
          Total: values["Total"],
          Answered: values["Answered"],
          Manpower: values["Manpower"],
          Shared: values["Shared"],
          Dedicated: values["Dedicated"],
          Other: values["Other"],
          Talk: values["Talk"],
          Wait: values["wait"],
          Dispo: values["dispo"],
          // Pause: values["pause"],
          Hold: values["hold"],
          "Al %": values["Al %"],
          "SL %": values["SL %"],
          "RL %": values["RL %"],
          "RL": values["RL"],
          "Total Login": values["Total login"],
          "Net Login": values["Net login"],
          "Utilization %": values["Utilization %"],
          "Within SLA": values["WIthinSLA"],
          "Manpower Agents": values["Manpower Agents"],
          "Shared Agents": values["Shared Agents"],
          "Dedicated Agents": values["Dedicated Agents"],
          "Other Agents": values["Other Agents"],
        });
      });
    });

    // ---------------------------------------------------
    // 🔹 CREATE EXCEL
    // ---------------------------------------------------
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "SLA Slot Wise");

    const fileName = `${clientNameForFile}_SLA_Slot_Wise_Report_${fileStartDate}_to_${fileEndDate}.xlsx`;

    XLSX.writeFile(workbook, fileName);

  } catch (err) {
    console.error(err);
    alert("Failed to export SLA report");
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
        <div className="card mb-4">
          <h6 className="card-header">Slot Wise Utilization</h6>
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

              {/* Filter
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

              */}

              {/* Start Date */}
              <div className="col-md-2">
                <label className="form-label d-block">Start Date</label>
                <DatePicker
                  selected={filters.startDate}
                  onChange={(date) => handleChange("startDate", date)}
                  className="form-control"
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
                  className="form-control"
                  placeholderText="End Date"
                  dateFormat="dd-MM-yyyy"
                />
              </div>

              {/* Export Button */}
              <div className="col-md-2">
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

export default SLAClientWise;
