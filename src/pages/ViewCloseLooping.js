
import React, { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { useParams, useSearchParams } from "react-router-dom";
import api from "../api"; // your axios instance
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

export default function CloseLooping() {
  const { callId } = useParams();
  const [searchParams] = useSearchParams();

  const urlClientId = searchParams.get("client_id");

  const [fields, setFields] = useState([]);
  const [labels, setLabels] = useState([]);
  const [storedClientId, setStoredClientId] = useState(null);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [apiRecord, setApiRecord] = useState(null);

  const dynamicFields = fields;   // 👈 this fixes the undefined error



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
    "Sub-scenario3",
    "Sub-scenario4",
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
  const [subScenarioList3, setSubScenarioList3] = useState([]);
  const [subScenarioList4, setSubScenarioList4] = useState([]);

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


  const loadLevel1 = async (clientId) => {
    return await api
      .get(`/core_api/categories/level1?client_id=${storedClientId}`)
      .then(res => res.data || [])
      .catch(() => []);
  };

  const loadLevel2 = async (parentId, clientId) => {
    return await api
      .get(`/core_api/categories/level2/${encodeURIComponent(parentId)}?client_id=${storedClientId}`)
      .then(res => res.data || [])
      .catch(() => []);
  };

  const loadLevel3 = async (parentId, clientId) => {
    return await api
      .get(`/core_api/categories/level3/${encodeURIComponent(parentId)}?client_id=${storedClientId}`)
      .then(res => res.data || [])
      .catch(() => []);
  };

  const loadLevel4 = async (parentId, clientId) => {
    return await api
      .get(`/core_api/categories/level4/${encodeURIComponent(parentId)}?client_id=${storedClientId}`)
      .then(res => res.data || [])
      .catch(() => []);
  };

  const loadLevel5 = async (parentId, clientId) => {
    return await api
      .get(`/core_api/categories/level5/${encodeURIComponent(parentId)}?client_id=${storedClientId}`)
      .then(res => res.data || [])
      .catch(() => []);
  };




const fetchData = async () => {


  let companyId = localStorage.getItem("company_id");
  if (companyId === "null" || companyId === "undefined") companyId = null;

  const clientId =
    urlClientId ||
    companyId;


    const finalCallId =
      callId;




  console.log("clientId in fetchData:", clientId);
  

  // if (!clientId) return;
  
  if (clientId && !storedClientId) {
    setStoredClientId(clientId); 
    }

  setLoading(true);
  try {
    // 1️⃣ Load main scenarios
    let level1 = await api
      .get(`/core_api/categories/level1?client_id=${clientId}`)
      .then((res) => res.data || [])
      .catch(() => []);



    const res = await api.get(
      `/call/call-master/${clientId}`,
      { params: { call_id: finalCallId } }
    );


    if (!res.data) return null;
    const record = Array.isArray(res.data) ? res.data[0] : res.data;

    // 3️⃣ Prefill form
    const copy = { ...initialForm };
    labels.forEach((key) => {
      copy[key] = record[key] ?? record[key.replace(/\s+/g, "_")] ?? record[key.toLowerCase()] ?? "";
    });
    // callLabels.forEach((key) => {
    //   copy[key] = record[key] ?? record[key.replace(/\s+/g, "_")] ?? record[key.toLowerCase()] ?? "";
    // });

    callLabels.forEach((key) => {
      switch(key) {
        case "IN CALL ID":
          copy[key] = record.callId ?? record.id ?? "";
          break;
        case "CALL DATE":
          copy[key] = record.CallDate?.replace("T", " ") ?? "";
          break;
        case "CALL FROM":
          copy[key] = record.CallFrom ?? "";
          break;
        case "TAT":
          copy[key] = record.TAT ?? "";
          break;
        case "DUE DATE":
          copy[key] = record["Due Date"] ?? "";
          break;
        case "CALL CREATED":
          copy[key] = record["Call Created"] ?? "";
          break;
        default:
          copy[key] = record[key] ?? "";
      }
    });

    // 🔥 Prefill close field scenarios (CField values saved in call_master)
    closeFieldScenarios.forEach((sc) => {
      const savedValue =
        record[sc.Scenario] ??
        record[`${sc.Scenario} (Close)`] ??
        "";
      copy[sc.Scenario] = savedValue || "";
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

    // Load Sub-scenario 3
    let sub3List = [];
    if (copy["Sub-scenario2"]) {
      sub3List = await api
        .get(`/core_api/categories/level4/${encodeURIComponent(copy["Sub-scenario2"])}?client_id=${clientId}`)
        .then(res => res.data || [])
        .catch(() => []);
    }
    const sub3Option = sub3List.find(opt => opt.id.toString() === copy["Sub-scenario3"] || opt.ecrName?.trim() === record.Category4?.trim());
    copy["Sub-scenario3"] = sub3Option ? sub3Option.id.toString() : copy["Sub-scenario3"] || "";

    // Load Sub-scenario 4
    let sub4List = [];
    if (copy["Sub-scenario3"]) {
      sub4List = await api
        .get(`/core_api/categories/level5/${encodeURIComponent(copy["Sub-scenario3"])}?client_id=${clientId}`)
        .then(res => res.data || [])
        .catch(() => []);
    }
    const sub4Option = sub4List.find(opt => opt.id.toString() === copy["Sub-scenario4"] || opt.ecrName?.trim() === record.Category5?.trim());
    copy["Sub-scenario4"] = sub4Option ? sub4Option.id.toString() : copy["Sub-scenario4"] || "";

    // 5️⃣ Include current (saved) values if missing in dropdown
    setScenarioList(includeCurrentValue(copy.Scenario, level1));
    setSubScenarioList1(includeCurrentValue(copy["Sub-scenario1"], sub1List));
    setSubScenarioList2(includeCurrentValue(copy["Sub-scenario2"], sub2List));
    setSubScenarioList3(includeCurrentValue(copy["Sub-scenario3"], sub3List));
    setSubScenarioList4(includeCurrentValue(copy["Sub-scenario4"], sub4List));

    // 6️⃣ Set form state
    setForm(copy);
    setApiRecord(record)

    // 7️⃣ Logs for debugging
    console.log("🔹 fetchData - form state:", copy);
    console.log("🔹 scenarioList:", scenarioList);
    console.log("🔹 subScenarioList1:", subScenarioList1);
    console.log("🔹 subScenarioList2:", subScenarioList2);
    console.log("🔹 subScenarioList3:", subScenarioList3);
    console.log("🔹 subScenarioList4:", subScenarioList4);

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
    ...(name === "Scenario" ? { "Sub-scenario1": "", "Sub-scenario2": "", "Sub-scenario3": "", "Sub-scenario4": "" } : {}),
    ...(name === "Sub-scenario1" ? { "Sub-scenario2": "" } : {}),
    ...(name === "Sub-scenario2" ? { "Sub-scenario3": "" } : {}),
    ...(name === "Sub-scenario3" ? { "Sub-scenario4": "" } : {}),
  }));

  const clientId = localStorage.getItem("company_id");

  try {
    if (name === "Scenario") {
      if (!value) {
        setSubScenarioList1([]);
        setSubScenarioList2([]);
        setSubScenarioList3([]);
        setSubScenarioList4([]);
        return;
      }

      const sub1 = await loadLevel2(value, clientId);
      setSubScenarioList1(sub1);
      setSubScenarioList2([]);
      setSubScenarioList3([]);
      setSubScenarioList4([]);
    }


    if (name === "Sub-scenario1") {
      if (!value) {
        setSubScenarioList2([]);
        setSubScenarioList3([]);
        setSubScenarioList4([]);
        return;
      }

      const sub2 = await loadLevel3(value, clientId);
      setSubScenarioList2(sub2);
      setSubScenarioList3([]);
      setSubScenarioList4([]);
    }

    if (name === "Sub-scenario2") {
      if (!value) {
        setSubScenarioList3([]);
        setSubScenarioList4([]);
        return;
      }

      const sub3 = await loadLevel4(value, clientId);
      setSubScenarioList3(sub3);
      setSubScenarioList4([]);
    }

    if (name === "Sub-scenario3") {
      if (!value) {
        setSubScenarioList4([]);
        return;
      }

      const sub4 = await loadLevel5(value, clientId);
      setSubScenarioList4(sub4);
    }
  } catch (err) {
    console.error(err);
  }
};

  useEffect(() => {
    if (!storedClientId) return;

    loadLevel1(storedClientId).then((data) => setScenarioList(data));
  }, [storedClientId]);



  const loadDynamicFields = async () => {
    if (!urlClientId) return;

    try {
      const res = await api.get(`/fields`, {
        params: { client_id: urlClientId  }
      });

      const fieldList = res.data || [];

      setFields(fieldList);

      // 🔥 Build dynamic label list
      setLabels(fieldList.map(f => f.FieldName));
    } catch (err) {
      console.error("Error loading dynamic fields", err);
    }
  };

  useEffect(() => {
  loadDynamicFields();
}, []);


  // 2️⃣ Rebuild form base AFTER labels loaded
  useEffect(() => {
    const base = [
      ...labels,
      ...callLabels,
      "Scenario",
      "Sub-scenario1",
      "Sub-scenario2",
      "Sub-scenario3",
      "Sub-scenario4",
      "CALL ACTION",
      "CALL SUB ACTION",
      "REMARKS"
    ].reduce((acc, label) => {
      acc[label] = "";
      return acc;
    }, {});

    // merge but do NOT overwrite existing fetchData values
    setForm(prev => ({ ...base, ...prev }));
  }, [labels]);


  // ----------------------------
  // Handle Update Function
  // ----------------------------


const handleSubmit = async () => {
  if (!urlClientId || !callId) {
    alert("Client ID or Call ID not found.");
    return;
  }

  const clientId = urlClientId;
  const recordId = callId;


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

    // 🔥🔥🔥 ADD THIS — MAP DYNAMIC FIELDS (field1, field2... field22)
    dynamicFields.forEach((f) => {
      const backendKey = `Field${f.fieldNumber}`;   // field1, field2, field3...
      const formKey = f.FieldName;                 // "Mobile Number", "Address", etc.

      payload[backendKey] = form[formKey] ?? null;
    });

    // 🔥🔥🔥 MAP CLOSE FIELD SCENARIOS (CField columns)
    closeFieldScenarios.forEach((sc) => {
      const backendKey = `CField${sc.Label}`;   // CField1, CField2, CField3...
      payload[backendKey] = form[sc.Scenario] ?? null;
    });

    // ✅ Add mapped Category fields for backend
    payload.Category1 = getNameById(scenarioList, form.Scenario);
    payload.Category2 = getNameById(subScenarioList1, form["Sub-scenario1"]);
    payload.Category3 = getNameById(subScenarioList2, form["Sub-scenario2"]);
    payload.Category4 = getNameById(subScenarioList3, form["Sub-scenario3"]);
    payload.Category5 = getNameById(subScenarioList4, form["Sub-scenario4"]);

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
      setSubScenarioList3(prev => includeCurrentValue(updatedForm["Sub-scenario3"], prev));
      setSubScenarioList4(prev => includeCurrentValue(updatedForm["Sub-scenario4"], prev));

      console.log("✅ Form and dropdowns updated after PUT:", updatedForm);
      console.log("🔹 scenarioList:", scenarioList);
      console.log("🔹 subScenarioList1:", subScenarioList1);
      console.log("🔹 subScenarioList2:", subScenarioList2);
      console.log("🔹 subScenarioList3:", subScenarioList3);
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



  const handleCloseLooping = async () => {
  try {
    // --- SAME CLIENT ID LOGIC AS handleSubmit ---
    let companyId = localStorage.getItem("company_id");
    if (companyId === "null" || companyId === "undefined") companyId = null;

    const clientId =
      urlClientId ||
      companyId;

    const recordId = callId;

    if (!clientId || !recordId) {
      return alert("Client ID or Record ID not found.");
    }

    const action = form["CALL ACTION"];
    const subAction = form["CALL SUB ACTION"];
    const followupDate = form["FOLLOW UP DATE"];

    // 🔥 Prepare payload
    const payload = {
       CloseLoopCate1:
        !action || action === "Select CALL ACTION"
          ? null
          : action,

      CloseLoopCate2:
        !subAction || subAction === "Select CALL SUB ACTION"
          ? null
          : subAction,

      FollowupDate: followupDate ? followupDate : null,
      closelooping_remarks: form["REMARKS"] || null
    };

    // 🔥 API Call
    await api.put("/close-looping", payload, {
      params: {
        client_id: clientId,
        callId: recordId
      }
    });

    // 🔥 Sync local apiRecord state
    setApiRecord(prev => ({
      ...prev,
      "Call Action": payload.CloseLoopCate1,
      "Call Sub Action": payload.CloseLoopCate2,
      "Call Action Remarks": payload.closelooping_remarks,
      "Followup Date": payload.FollowupDate
    }));

    alert("Call closed successfully!");

    // reload page or details if needed
    // loadCallDetails();
  } catch (err) {
    console.error(err);
    alert("Failed to close the call.");
  }
};


const handleCloseFieldScenariosUpdate = async () => {
  if (!urlClientId || !callId) {
    return alert("Client ID or Record ID not found.");
  }

  if (closeFieldScenarios.length === 0) return;

  setLoading(true);
  try {
    const payload = {};
    closeFieldScenarios.forEach((sc) => {
      payload[`CField${sc.Label}`] = form[sc.Scenario] ?? null;
    });

    const res = await api.put(
      `/close_fields/${urlClientId}/${callId}/call-master-cfields`,
      payload
    );

    if (res.status === 200) {
      alert("Close field values updated successfully!");

      // 🔹 Sync apiRecord state with saved close field values
      setApiRecord((prev) => {
        const updated = { ...(prev || {}) };
        closeFieldScenarios.forEach((sc) => {
          updated[sc.Scenario] = form[sc.Scenario] ?? "";
        });
        return updated;
      });
    } else {
      alert("Update failed.");
    }
  } catch (err) {
    console.error("Close field update error:", err);
    alert("Close field update request failed.");
  } finally {
    setLoading(false);
  }
};





// ----------------------------
// Load data on mount / row change
// ----------------------------
useEffect(() => {
  if (callId && urlClientId && labels.length > 0) {
    fetchData();
  }
}, [callId, urlClientId, labels]);


  // ----------------------------
  // Handle Excel Download
  // ----------------------------
  const handleExcelDownload = () => {
  if (!form) {
    showToast("No data to export!", "error");
    return;
  }

  // Flatten form for Excel, override scenario fields with names
  const dataToExport = {
    ...form, // form fields (IDs)
    "IN CALL ID": form["IN CALL ID"] || "",
    "CALL DATE": form["CALL DATE"] || "",
    "CALL FROM": form["CALL FROM"] || "",
    "DUE DATE": form["DUE DATE"] || "",
    "CALL CREATED": form["CALL CREATED"] || "",
    "CALL ACTION": apiRecord?.["Call Action"] || "",
    "CALL SUB ACTION": apiRecord?.["Call Sub Action"] || "",
    "REMARKS": apiRecord?.["Call Action Remarks"] || "",
    Scenario: scenarioList.find(opt => opt.id.toString() === (form.Scenario || "").toString())?.ecrName || form.Scenario,
    "Sub-scenario1": subScenarioList1.find(opt => opt.id.toString() === (form["Sub-scenario1"] || "").toString())?.ecrName || form["Sub-scenario1"],
    "Sub-scenario2": subScenarioList2.find(opt => opt.id.toString() === (form["Sub-scenario2"] || "").toString())?.ecrName || form["Sub-scenario2"],
    "Sub-scenario3": subScenarioList3?.find(opt => opt.id.toString() === (form["Sub-scenario3"] || "").toString())?.ecrName || form["Sub-scenario3"],
    "Sub-scenario4": subScenarioList4?.find(opt => opt.id.toString() === (form["Sub-scenario4"] || "").toString())?.ecrName || form["Sub-scenario4"],
  };

  const worksheet = XLSX.utils.json_to_sheet([dataToExport]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Call Record");

  const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  const file = new Blob([excelBuffer], { type: "application/octet-stream" });
  saveAs(file, `Call-${form["IN CALL ID"] || "record"}.xlsx`);

  showToast("Excel download started!", "success");
};



  const srDetails = labels.map((label) => [label, form[label]]);
  const callDetails = [
  ...callLabels.map((label) => {
    const value = form[label] || ""; // Always take from form populated by fetchData
    return [label, value];
  }),
    [
      "RECORDING",
      <button
        key="recording"
        type="button"
        className="bg-gray-200 px-2 py-1 rounded hover:bg-gray-300 flex justify-center items-center"
        onClick={() => showToast("No Recording!", "success")}
      >
        <Download className="h-3 w-3" />
      </button>,
    ],
    [
      "LOG FILE",
      <button
        key="logfile"
        type="button"
        onClick={() => handleExcelDownload([form])}
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



  const [closeFields, setCloseFields] = useState([
    {
      label: "CALL ACTION",
      type: "select",
      options: ["Select CALL ACTION"],
    },
    {
      label: "CALL SUB ACTION",
      type: "select",
      options: ["Select CALL SUB ACTION"],
    },
    {
      label: "FOLLOW UP DATE",
      type: "date",
    },
    { label: "REMARKS", type: "textarea" },
  ]);

  const [closeFieldScenarios, setCloseFieldScenarios] = useState([]);


  // 🔥 ADD THIS RIGHT HERE
  useEffect(() => {
    const fetchCallActions = async () => {
      try {
        let companyId = localStorage.getItem("company_id");
        if (companyId === "null" || companyId === "undefined") companyId = null;

        const clientId = urlClientId || companyId;

        if (!clientId) return;

        const res = await api.get(`/close-looping/actions`, {
          params: { client_id: clientId },
        });

        const options = res.data || [];

        setCloseFields((prev) =>
          prev.map((field) =>
            field.label === "CALL ACTION"
              ? {
                  ...field,
                  options: ["Select CALL ACTION", ...options],
                }
              : field
          )
        );
      } catch (err) {
        console.error("Failed to load call actions:", err);
      }
    };

    fetchCallActions();
  }, [urlClientId]);


  // 🔥 Load close field scenarios (GET /close_fields/{client_id}/scenarios)
  useEffect(() => {
    const loadCloseFieldScenarios = async () => {
      let companyId = localStorage.getItem("company_id");
      if (companyId === "null" || companyId === "undefined") companyId = null;

      const clientId = urlClientId || companyId;

      if (!clientId) return;

      try {
        const res = await api.get(`/close_fields/${clientId}/scenarios`);
        setCloseFieldScenarios(res.data?.scenarios || []);
      } catch (err) {
        console.error("Failed to load close field scenarios:", err);
      }
    };

    loadCloseFieldScenarios();
  }, [urlClientId]);



  const handleCloseLoopingChange = async (e) => {
    const { name, value } = e.target;

    // Update form state immediately
    setForm((prev) => ({ ...prev, [name]: value }));

    // Only run API when CALL ACTION changes
    if (name !== "CALL ACTION") return;

    try {
      // -------------------------------
      // 🔹 CLIENT ID RESOLUTION (same as handleCloseLooping)
      // -------------------------------
      let companyId = localStorage.getItem("company_id");
      if (companyId === "null" || companyId === "undefined") companyId = null;

      const clientId =
      urlClientId ||
      companyId;

      if (!clientId) {
        console.error("Client ID not found.");
        return;
      }

      // -------------------------------
      // NO API if default option
      // -------------------------------
      if (!value || value === "Select CALL ACTION") return;

      // -------------------------------
      // 🔥 Fetch SUB ACTION list
      // -------------------------------
      const res = await api.get(`/close-looping/sub-actions`, {
        params: {
          action: value,
          client_id: clientId,
        },
      });

      const options = res.data || [];

      // -------------------------------
      // 🔥 Update CALL SUB ACTION options
      // -------------------------------
      setCloseFields((prev) =>
        prev.map((field) =>
          field.label === "CALL SUB ACTION"
            ? {
                ...field,
                options: ["Select CALL SUB ACTION", ...options],
              }
            : field
        )
      );

      // Reset selected sub action
      setForm((prev) => ({ ...prev, "CALL SUB ACTION": "" }));
    } catch (err) {
      console.error("Failed to load sub actions:", err);
    }
  };


  const handleUploadImage = async () => {
    
    // 🔥 SAME CLIENT + CALL ID LOGIC AS fetchData
    let companyId = localStorage.getItem("company_id");
    if (companyId === "null" || companyId === "undefined") companyId = null;

    const clientId =
      urlClientId ||
      companyId;

    const recordId =
      callId;

    if (!clientId || !recordId)
      return alert("Client ID or Call ID missing");

    const formData = new FormData();
    formData.append("call_id", recordId);
    formData.append("image", uploadFile);

    try {
      setUploading(true);
      const res = await api.post(`/upload_image/${clientId}`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      console.log("Upload Response:", res.data);
      alert(`Image uploaded successfully!\nSaved at: ${res.data.file_saved}`);
    } catch (err) {
      console.error("Upload error:", err);
      alert("Image upload failed");
    } finally {
      setUploading(false);
    }
  };




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
    <div className="bg-gray-50 min-h-screen">
      <div className="bg-white shadow rounded-xl p-6 relative">
        {/* {toast.message && (
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
        )} */}


        {toast.message && (
          <div
            style={{
              position: "absolute",
              top: "20px",
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 9999,
              minWidth: "200px",
              maxWidth: "90%",
              padding: "10px 16px",
              borderRadius: "8px",
              textAlign: "center",
              fontWeight: 500,
              fontSize: "14px",
              color: toast.type === "success" ? "#ffffff" : "#ffffff", // dark text for green, white for red
              backgroundColor: toast.type === "success" ? "#22c55e" : "#ef4444", // green or red
              boxShadow: "0 4px 12px rgba(0,0,0,0.15)", // subtle shadow
              opacity: 0.95,
              pointerEvents: "none", // allow clicks through
              transition: "transform 0.3s ease, opacity 0.3s ease",
            }}
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
          {["Scenario","Sub-scenario1","Sub-scenario2", "Sub-scenario3","Sub-scenario4",].map((field) => {
                  const list = field === "Scenario" ? scenarioList : field === "Sub-scenario1" ? subScenarioList1 : field === "Sub-scenario2" ? subScenarioList2 : field === "Sub-scenario3"? subScenarioList3 : field === "Sub-scenario4"? subScenarioList4 : [];
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
                  // <React.Fragment key={label}>
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

                  ))}    

                    {/* {label === "Email ID" && ( */}
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
                    {/* )} */}
                  {/* </React.Fragment> */}
                

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

            {closeFieldScenarios.length > 0 && (
              <>
                <table className="w-full border border-gray-200 text-sm mb-3">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="p-2 text-left font-semibold border">FIELD</th>
                    <th className="p-2 text-left font-semibold border">VALUE</th>
                  </tr>
                </thead>
                <tbody>
                  {closeFieldScenarios.map((sc) => (
                    <tr key={sc.id}>
                      <td className="border p-2">{sc.Scenario}</td>
                      <td className="border p-2">
                        {sc.children && sc.children.length > 0 ? (
                          <select
                            style={selectStyle}
                            name={sc.Scenario}
                            value={form[sc.Scenario] || ""}
                            onChange={handleChange}
                          >
                            <option value="">Select {sc.Scenario}</option>
                            {sc.children.map((child) => (
                              <option key={child.id} value={child.Scenario}>
                                {child.Scenario}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type="text"
                            name={sc.Scenario}
                            value={form[sc.Scenario] || ""}
                            onChange={handleChange}
                            style={commonInputStyle}
                          />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="mt-3 text-right">
                <button
                  className="btn btn-primary"
                  onClick={handleCloseFieldScenariosUpdate}
                  disabled={loading}
                >
                  {loading ? "Updating..." : "UPDATE"}
                </button>
              </div>
              </>
            )}

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
                          onChange={
                            field.label === "CALL ACTION"
                              ? handleCloseLoopingChange
                              : handleChange
                          }
                        >
                          {field.options.map((opt) => (
                            <option key={opt}>{opt}</option>
                          ))}
                        </select>
                      )}
                      {field.type === "date" && (
                        <input
                          type="date"
                          style={commonInputStyle}
                          name={field.label}
                          value={form[field.label] || ""}
                          onChange={handleChange}
                        />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button type="button" className="mt-4 btn btn-primary"  onClick={handleCloseLooping}>
              CLOSE LOOPING
            </button>

            <div className="mt-6 border-t pt-1">
              <h6 className="font-semibold text-gray-700 mb-2">UPLOAD IMAGE</h6>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                {/* File Input */}
                <input
                  type="file"
                  onChange={(e) => setUploadFile(e.target.files[0])}
                  className="border p-2 rounded w-full sm:w-64"
                  style={{ minWidth: "200px" }}
                />

                {/* Submit Button */}
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleUploadImage}
                  disabled={uploading}
                >
                  {uploading ? "Uploading..." : "Submit"}
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
