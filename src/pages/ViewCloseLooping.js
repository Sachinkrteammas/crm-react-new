
import React, { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import api from "../api"; // your axios instance

export default function CloseLooping() {
  const location = useLocation();
  const navigate = useNavigate();

  const rowFromState = location.state?.row ?? null;

  // Labels for SR Details
  const labels = [
    "Mobile Number",
    "First Name",
    "Last Name",
    "Address",
    "State",
    "District/Area",
    "Pin Code",
    "Customer type",
    "Date of Purchase",
    "Dealer contact number",
    "Dealer shop Name",
    "Product Model Name",
    "Not Serviceable Area PIN Code",
    "Remark",
    "CRM Issue",
    "19 digit Sr. NO.",
    "Invoice Date",
    "Invoice No.",
    "Email ID",
  ];

  // Labels for Call Details
  const callLabels = [
    "IN CALL ID",
    "CALL DATE",
    "CALL FROM",
    "TAT",
    "DUE DATE",
    "CALL CREATED",
  ];

  // Initialize form state with SR + Call fields
  const initialForm = [
    ...labels,
    ...callLabels,
    "Scenario",
    "Sub-scenario1",
    "Sub-scenario2",
    "CALL ACTION",
    "CALL SUB ACTION",
    "REMARKS",
  ].reduce((acc, label) => {
    acc[label] = "";
    return acc;
  }, {});

  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ message: "", type: "success" });
  const companyId = localStorage.getItem("company_id");

  // Scenario options state
  const [scenarioList, setScenarioList] = useState([]);
  const [subScenarioList1, setSubScenarioList1] = useState([]);
  const [subScenarioList2, setSubScenarioList2] = useState([]);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: "", type: "success" }), 3000);
  };

const includeCurrentValue = (value, list) => {
  if (!value) return list;
  if (!list.some(o => o.id.toString() === value)) {
    return [{ id: value, ecrName: "Current (Saved)" }, ...list];
  }
  return list;
};

const fetchData = async () => {
  if (!rowFromState) return;

let companyId = localStorage.getItem("company_id");
if (companyId === "null" || companyId === "undefined") companyId = null;

const rawClientId = location.state?.client_id;
const clientId =
  (rawClientId && rawClientId !== "null" && rawClientId !== "undefined"
    ? rawClientId
    : null) ||
  companyId ||
  rowFromState?.ClientId ||
  rowFromState?.client_id;

  const callId = rowFromState?.in_call_id || rowFromState?.id;

  console.log("clientId in fetchData:", clientId);
  console.log("rowFromState:", rowFromState);

  if (!clientId) return;

  setLoading(true);
  try {
    // 1️⃣ Load main scenarios
    let level1 = await api
      .get(`/core_api/categories/level1?client_id=${clientId}`)
      .then((res) => res.data || [])
      .catch(() => []);

    // 2️⃣ Load call record
    const res = callId
      ? await api.get(`/call/call-master/${clientId}`, { params: { call_id: callId } })
      : await api.get(`/call/call-master/${clientId}`);

    if (!res.data) return null;
    const record = Array.isArray(res.data) ? res.data[0] : res.data;

    // 3️⃣ Prefill form
    const copy = { ...initialForm };
    labels.forEach((key) => {
      copy[key] = record[key] ?? record[key.replace(/\s+/g, "_")] ?? record[key.toLowerCase()] ?? "";
    });
    callLabels.forEach((key) => {
      copy[key] = record[key] ?? record[key.replace(/\s+/g, "_")] ?? record[key.toLowerCase()] ?? "";
    });

    // 4️⃣ Scenario/Sub-scenario mapping
    // Map Scenario
    const scenarioOption = level1.find(opt => opt.id.toString() === copy.Scenario || opt.ecrName?.trim() === record.Category1?.trim());
    copy.Scenario = scenarioOption ? scenarioOption.id.toString() : copy.Scenario || "";

    // Load Sub-scenario 1
    let sub1List = [];
    if (copy.Scenario) {
      sub1List = await api
        .get(`/core_api/categories/level2/${encodeURIComponent(copy.Scenario)}?client_id=${clientId}`)
        .then(res => res.data || [])
        .catch(() => []);
    }
    const sub1Option = sub1List.find(opt => opt.id.toString() === copy["Sub-scenario1"] || opt.ecrName?.trim() === record.Category2?.trim());
    copy["Sub-scenario1"] = sub1Option ? sub1Option.id.toString() : copy["Sub-scenario1"] || "";

    // Load Sub-scenario 2
    let sub2List = [];
    if (copy["Sub-scenario1"]) {
      sub2List = await api
        .get(`/core_api/categories/level3/${encodeURIComponent(copy["Sub-scenario1"])}?client_id=${clientId}`)
        .then(res => res.data || [])
        .catch(() => []);
    }
    const sub2Option = sub2List.find(opt => opt.id.toString() === copy["Sub-scenario2"] || opt.ecrName?.trim() === record.Category3?.trim());
    copy["Sub-scenario2"] = sub2Option ? sub2Option.id.toString() : copy["Sub-scenario2"] || "";

    // 5️⃣ Include current (saved) values if missing in dropdown
    setScenarioList(includeCurrentValue(copy.Scenario, level1));
    setSubScenarioList1(includeCurrentValue(copy["Sub-scenario1"], sub1List));
    setSubScenarioList2(includeCurrentValue(copy["Sub-scenario2"], sub2List));

    // 6️⃣ Set form state
    setForm(copy);

    // 7️⃣ Logs for debugging
    console.log("🔹 fetchData - form state:", copy);
    console.log("🔹 scenarioList:", scenarioList);
    console.log("🔹 subScenarioList1:", subScenarioList1);
    console.log("🔹 subScenarioList2:", subScenarioList2);

    return copy;
  } catch (err) {
    console.error("fetchData error:", err.response || err);
    return null;
  } finally {
    setLoading(false);
  }
};

  // ----------------------------
  // Handle Form Change
  // ---------------------------- 

const handleChange = async (e) => {
  const { name, value } = e.target;

  setForm(prev => ({
    ...prev,
    [name]: value,
    ...(name === "Scenario" ? { "Sub-scenario1": "", "Sub-scenario2": "" } : {}),
    ...(name === "Sub-scenario1" ? { "Sub-scenario2": "" } : {}),
  }));

  const clientId = localStorage.getItem("company_id") || rowFromState?.ClientId || rowFromState?.client_id;

  try {
    if (name === "Scenario" && value) {
      const res = await api.get(`/core_api/categories/level2/${encodeURIComponent(value)}?client_id=${clientId}`);
      setSubScenarioList1(includeCurrentValue("", res.data || []));
      setSubScenarioList2([]);
    }

    if (name === "Sub-scenario1" && value) {
      const res = await api.get(`/core_api/categories/level3/${encodeURIComponent(value)}?client_id=${clientId}`);
      setSubScenarioList2(includeCurrentValue("", res.data || []));
    }
  } catch (err) {
    console.error(err);
  }
};

  // ----------------------------
  // Handle Update Function
  // ----------------------------
 

const handleSubmit = async () => {
  const clientId = localStorage.getItem("company_id") || rowFromState?.ClientId || rowFromState?.client_id;
  const recordId = rowFromState?.id || rowFromState?.in_call_id;
  if (!clientId || !recordId) return alert("Client ID or Record ID not found.");

  setLoading(true);
  try {
    const datetimeFields = ["CALL DATE", "DUE DATE", "Date of Purchase", "Invoice Date", "Invoice No."];
    const payload = {};

    // Map Scenario/Sub-scenario IDs to names for backend
    const getNameById = (list, id) => {
      const option = list.find(o => o.id.toString() === id);
      return option ? option.ecrName : "";
    };

    Object.entries(form).forEach(([key, value]) => {
      if (datetimeFields.includes(key) && (value === "" || value === null)) value = null;
      payload[key] = value;
    });

    // ✅ Add mapped Category fields for backend
    payload.Category1 = getNameById(scenarioList, form.Scenario);
    payload.Category2 = getNameById(subScenarioList1, form["Sub-scenario1"]);
    payload.Category3 = getNameById(subScenarioList2, form["Sub-scenario2"]);

    const res = await api.put(`/call/call-master/${clientId}/${recordId}`, payload);

    if (res.status === 200) {
      alert("Record updated successfully!");
      console.log("✅ PUT Response payload sent:", payload);
      console.log("✅ PUT Response data:", res.data);

      // 🔹 Update form immediately from payload
      const updatedForm = { ...form, ...payload };
      setForm(updatedForm);

      // 🔹 Update dropdowns to include current selections
      setScenarioList(prev => includeCurrentValue(updatedForm.Scenario, prev));
      setSubScenarioList1(prev => includeCurrentValue(updatedForm["Sub-scenario1"], prev));
      setSubScenarioList2(prev => includeCurrentValue(updatedForm["Sub-scenario2"], prev));

      console.log("✅ Form and dropdowns updated after PUT:", updatedForm);
      console.log("🔹 scenarioList:", scenarioList);
      console.log("🔹 subScenarioList1:", subScenarioList1);
      console.log("🔹 subScenarioList2:", subScenarioList2);
    } else {
      alert("Update failed.");
    }
  } catch (err) {
    console.error("PUT error:", err);
    alert("Update request failed.");
  } finally {
    setLoading(false);
  }
};


// ----------------------------
// Load data on mount / row change
// ----------------------------
useEffect(() => {
  if (location.state) {
    fetchData();
  }
}, [location.state]);


  // ----------------------------
  // Handle Excel Download
  // ----------------------------
  const handleExcelDownload = () => {
    showToast("Excel download started!", "success");
  };

  const srDetails = labels.map((label) => [label, form[label]]);
  const callDetails = [
  ...callLabels.map((label) => {
    let value = form[label] || "";

    // For IN CALL ID, show backend 'id' from rowFromState
    if (label === "IN CALL ID") {
      value = rowFromState?.id || value;
    }

    // Fallback for other fields if missing
    if (!value) {
      value = rowFromState?.[label] ?? "";
    }

    return [label, value];
  }),
    [
      "RECORDING",
      <button
        key="recording"
        type="button"
        className="bg-gray-200 px-2 py-1 rounded hover:bg-gray-300 flex justify-center items-center"
        onClick={() => showToast("Recording clicked!", "success")}
      >
        <Download className="h-3 w-3" />
      </button>,
    ],
    [
      "LOG FILE",
      <button
        key="logfile"
        type="button"
        onClick={handleExcelDownload}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "6px",
          backgroundColor: "#1d4ed8",
          color: "white",
          padding: "6px 10px",
          borderRadius: "6px",
          fontSize: "13px",
          fontWeight: "500",
          border: "none",
          cursor: "pointer",
          transition: "background-color 0.2s ease",
        }}
        onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "#2563eb")}
        onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "#1d4ed8")}
      >
        <Download style={{ width: "14px", height: "14px" }} />
        <span>Download Excel</span>
      </button>,
    ],
  ];

  const closeFields = [
    {
      label: "CALL ACTION",
      type: "select",
      options: ["Select CALL ACTION", "Resolved", "Pending"],
    },
    {
      label: "CALL SUB ACTION",
      type: "select",
      options: ["Select CALL SUB ACTION", "Follow-up", "Escalated"],
    },
    { label: "REMARKS", type: "textarea" },
  ];

  const commonInputStyle = {
    width: "100%",
    boxSizing: "border-box",
    border: "1px solid #d1d5db",
    borderRadius: "6px",
    padding: "6px 8px",
    fontSize: "14px",
  };

  const selectStyle = {
    ...commonInputStyle,
    appearance: "none",
    WebkitAppearance: "none",
    MozAppearance: "none",
    backgroundColor: "#fff",
    backgroundImage:
      "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20'%3E%3Cpath fill='%23666' d='M7 7l3 3 3-3z'/%3E%3C/svg%3E\")",
    backgroundRepeat: "no-repeat",
    backgroundPosition: "right 10px center",
    backgroundSize: "14px",
    paddingRight: "28px",
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
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="bg-white shadow rounded-xl p-6 relative">
        {toast.message && (
          <div
            className={`absolute top-4 left-1/2 transform -translate-x-1/2 px-4 py-2 rounded-lg shadow-md text-sm font-medium ${
              toast.type === "success"
                ? "bg-green-500 text-white"
                : "bg-red-500 text-white"
            }`}
            style={{ zIndex: 50, minWidth: "220px", textAlign: "center" }}
          >
            {toast.message}
          </div>
        )}

        <h5 className="text-lg font-semibold mb-4">EDIT — CLOSE LOOPING</h5>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* LEFT: SR DETAILS */}
          <div
            className="bg-white shadow rounded-xl p-4 overflow-y-auto"
            style={{ flex: 1, height: "650px" }}
          >
            <h6 className="font-semibold text-gray-700 mb-3">SR DETAILS</h6>
            <table className="w-full border border-gray-200 text-sm">
              <tbody>
                <tr className="bg-gray-100">
                  <th className="p-2 text-left font-semibold border">
                    Scenario
                  </th>
                  <th className="p-2 text-left font-semibold border">VALUE</th>
                </tr>

                {/* Scenario Fields */}
          {["Scenario","Sub-scenario1","Sub-scenario2"].map((field) => {
                  const list = field === "Scenario" ? scenarioList : field === "Sub-scenario1" ? subScenarioList1 : subScenarioList2;
                  return (
                    <tr key={field}>
                      <td className="border p-2 font-semibold">{field}</td>
                      <td className="border p-2">
                        <select name={field} value={form[field] || ""} onChange={handleChange} style={selectStyle}>
                          <option value="">Select {field}</option>
                          {list.map(opt => (<option key={opt.id} value={opt.id}>{opt.ecrName}</option>))}
                        </select>
                      </td>
                    </tr>
                  );
                })}

                {/* Rest of SR and Call fields */}
                <tr className="bg-gray-100">
                  <th className="p-2 text-left font-semibold border">
                    REQUIRED FIELD
                  </th>
                  <th className="p-2 text-left font-semibold border">VALUE</th>
                </tr>

                {labels.map((label, index) => (
                  <React.Fragment key={label}>
                    <tr className={index % 2 === 0 ? "bg-gray-50" : "bg-white"}>
                      <td className="border p-2">{label}</td>
                      <td className="border p-2">
                        <input
                          type="text"
                          name={label}
                          value={form[label] || ""}
                          onChange={handleChange}
                          style={commonInputStyle}
                        />
                      </td>
                    </tr>

                    {label === "Email ID" && (
                      <tr>
                        <td colSpan={2} className="p-3 text-right">
                          <div className="mt-3 text-right">
                            <button
                              className="btn btn-primary"
                              onClick={handleSubmit}
                              disabled={loading}
                            >
                              {loading ? "Updating..." : "UPDATE"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}

                <tr className="bg-gray-200">
                  <th className="p-2 text-left font-semibold border">
                    CALL DETAILS
                  </th>
                  <th className="p-2 text-left font-semibold border">VALUE</th>
                </tr>

                {callDetails.map(([label, value], index) => (
                  <tr
                    key={label}
                    className={index % 2 === 0 ? "bg-gray-50" : "bg-white"}
                  >
                    <td className="border p-2">{label}</td>
                    <td className="border p-2">{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* RIGHT: CLOSE FIELDS */}
          <div className="bg-white shadow rounded-xl p-4" style={{ flex: 1 }}>
            <h6 className="font-semibold text-gray-700 mb-2">CLOSE FIELDS</h6>
            <table className="w-full border border-gray-200 text-sm">
              <thead>
                <tr className="bg-gray-100">
                  <th className="p-2 text-left font-semibold border">FIELD</th>
                  <th className="p-2 text-left font-semibold border">VALUE</th>
                </tr>
              </thead>
              <tbody>
                {closeFields.map((field) => (
                  <tr key={field.label}>
                    <td className="border p-2">{field.label}</td>
                    <td className="border p-2">
                      {field.type === "textarea" && (
                        <textarea
                          rows={3}
                          style={{ ...commonInputStyle, minHeight: "70px" }}
                          name={field.label}
                          value={form[field.label] || ""}
                          onChange={handleChange}
                        />
                      )}
                      {field.type === "select" && (
                        <select
                          style={selectStyle}
                          name={field.label}
                          value={form[field.label] || field.options[0]}
                          onChange={handleChange}
                        >
                          {field.options.map((opt) => (
                            <option key={opt}>{opt}</option>
                          ))}
                        </select>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button type="button" className="mt-4 btn btn-primary">
              CLOSE LOOPING
            </button>

            <div className="mt-6 border-t pt-1">
              <h6 className="font-semibold text-gray-700 mb-2">UPLOAD IMAGE</h6>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                <input
                  type="file"
                  className="border p-2 rounded w-full sm:w-64"
                  style={{ minWidth: "200px" }}
                />
                <button type="button" className="btn btn-primary">
                  Submit
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
}
