import api from "../api";

export const signup = async (username, email, password) => {
  try {
    const response = await api.post("/signup", {
      username,
      email,
      password,
    });
    return response.data; // contains user object
  } catch (error) {
    throw error.response?.data?.detail || "Signup failed";
  }
};


export const login = async (email, password) => {
  try {
    const response = await api.post("auth/login", {
      email: email,         // must match FastAPI model field
      password: password
    });

    console.log(response, "response==");

    // Save values returned from FastAPI
    localStorage.setItem("token", response.data.access_token);
    localStorage.setItem("username", response.data.auth_person);  // change key if needed
    localStorage.setItem("company_id", response.data.company_id);
    localStorage.setItem("user_type", response.data.user_type);

    return response.data;
  } catch (error) {
    throw error.response?.data?.detail || "Login failed";
  }
};


export const fetchCDRReport = async (payload) => {
  const response = await api.post("/report/cdr_report", payload);
  return response.data;
};



export const getCurrentUser = async () => {
  try {
    const response = await api.get("/me");
    return response.data;
  } catch (error) {
    throw error.response?.data?.detail || "Unable to fetch user";
  }
};

export const logout = () => {
  localStorage.removeItem("token");
};



export const getOBCDRReport = async (payload) => {
  try {
    const response = await api.post("report/ob_cdr_report", payload);
    return response.data;
  } catch (error) {
    console.error(error);
    throw error.response?.data?.detail || "Error fetching OB CDR Report";
  }
};


export const getOBSharedCDRReport = async (payload) => {
  try {
    const response = await api.post("/report/ob_shared_cdr_report", payload);
    return response.data;
  } catch (error) {
    console.error("Error fetching OB Shared CDR report:", error);
    throw error.response?.data?.detail || "Failed to fetch report";
  }
};


export const getIVRReport = async (payload) => {
  const response = await api.post("/report/ivr_report", payload);
  return response.data;
};

export const getIVRFunnelReport = async (payload) => {
  try {
    const response = await api.post("/report/ivr_funnel_report", payload);
    return response.data;
  } catch (error) {
    console.error("Error fetching IVR Funnel Report:", error);
    throw error;
  }
};

export const getDashboardReport = async (payload) => {
    try {
        const response = await api.post("/dashboard/dashboard_report", payload);
        return response.data;
    } catch (error) {
        console.error("Error fetching dashboard report:", error);
        throw error;
    }
};


// services/api.js
export const getDashboard = async (companyId) => {
  try {
    const response = await fetch(`/api/dashboard/${companyId}`);
    if (!response.ok) throw new Error("Failed to fetch dashboard");
    return await response.json();
  } catch (error) {
    console.error(error);
    throw error;
  }
};


export const getActiveServices = async (companyId) => {
    try{
        const response = await api.post("/dashboard/active_services", { company_id: companyId });
        return response.data;
    } catch(error){
        console.error("Error fetching dashboard active services:", error);
        throw error;
    }
};


export const getCallAnalysisReport = async (payload) => {
    try {
        const response = await api.post("/dashboard/call_analysis_report", payload);
        return response.data;
    } catch (error) {
        console.error("Error fetching dashboard call analysis report:", error);
        throw error;
    }
};


export const getCallDistributionReport = async (payload) => {
    try {
        const response = await api.post("/dashboard/call_distribution_report", payload);
        return response.data;
    } catch (error) {
        console.error("Error fetching dashboard call distribution report:", error);
        throw error;
    }
};


export const getTicketCaseAnalysis = async (payload) => {
    try{
        const response = await api.post(`/dashboard/ticket_case_analysis?company_id=${payload.company_id}`, payload);
        return response.data;
    } catch(error){
        console.error("Error fetching dashboard ticket case analysis:", error);
        throw error;
    }
};

export const getTicketBySource = async (payload) => {
    try {
        const response = await api.post("/dashboard/ticket_by_source", payload);
        return response.data;
    } catch (error) {
        console.error("Error fetching dashboard ticket by source report:", error);
        throw error;
    }
};

// ---------------- OutCall / Campaign / Allocation ----------------
const toIntIfPresent = (v) => {
  if (v === undefined || v === null || v === "") return undefined;
  const n = parseInt(v, 10);
  return Number.isNaN(n) ? undefined : n;
};

// Get all campaign types for a company
export const getCampaignTypes = async (company_id) => {
  try {
    const response = await api.get("/call/campaign-types", { params: { CLIENT_ID: company_id } });
    return response.data || [];
  } catch (error) {
    console.error("Error fetching campaign types:", error);
    return [];
  }
};

// Get all campaigns for a company based on campaign type
export const getCampaigns = async (company_id, campaignType) => {
  try {
    const response = await api.get("/call/campaigns", { params: { CLIENT_ID: company_id, campaignType } });
    return response.data || [];
  } catch (error) {
    console.error("Error fetching campaigns:", error);
    return [];
  }
};

// Get all allocations for a campaign
export const getAllocations = async (company_id, campaign) => {
  try {
    const response = await api.get("/call/allocations", { params: { CLIENT_ID: company_id, campaign } });
    return response.data || [];
  } catch (error) {
    console.error("Error fetching allocations:", error);
    return [];
  }
};

// Get scenarios or sub-scenarios dynamically
export const getScenarios = async (company_id, allocation, scenario_level = 1, parent_scenario = null) => {
  try {
    const response = await api.get("/call/scenarios", {
      params: { CLIENT_ID: company_id, allocation, scenario_level, parent_scenario },
    });
    return response.data || [];
  } catch (error) {
    console.error("Error fetching scenarios:", error);
    return [];
  }
};

// Get outcall details with filters
export const getOutCallDetails = async (company_id, filters = {}) => {
  try {
    const response = await api.get("/call/outcalls", { params: { CLIENT_ID: company_id, ...filters } });
    return response.data || { data: [], countsFiltered: {}, countsAll: {}, breadcrumb: [] };
  } catch (error) {
    console.error("Error fetching out call details:", error);
    return { data: [], countsFiltered: {}, countsAll: {}, breadcrumb: [] };
  }
};

// Add aband call setting
export const addAbandCallSetting = async (payload) => {
  try {
    const response = await api.post("/in_call/aband_call/add", payload);
    return response.data;
  } catch (error) {
    console.error("Error adding aband call setting:", error);
    throw error.response?.data?.detail || "Failed to add aband call setting";
  }
};

// List aband call settings
export const getAbandCallSettings = async (searchClient = "") => {
  try {
    const params = searchClient ? { search_client: searchClient } : {};
    const response = await api.get("/in_call/aband_call/list", { params });
    return response.data;
  } catch (error) {
    console.error("Error fetching aband call settings:", error);
    throw error.response?.data?.detail || "Failed to fetch aband call settings";
  }
};

// Delete aband call setting
export const deleteAbandCallSetting = async (id) => {
  try {
    const response = await api.delete(`/in_call/aband_call/delete/${id}`);
    return response.data;
  } catch (error) {
    console.error("Error deleting aband call setting:", error);
    throw error.response?.data?.detail || "Failed to delete aband call setting";
  }
};


// ---------------- Upload Training Docs ----------------
export const uploadTrainingDocs = async (ClientId, files, descriptions) => {
  try {
    const formData = new FormData();
    formData.append("ClientId", ClientId);

    files.forEach((file) => formData.append("files", file));
    descriptions.forEach((desc) => formData.append("descriptions", desc));

    const response = await api.post("/in_call/training/upload", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    return response.data;
  } catch (error) {
    console.error("Error uploading training docs:", error);
    throw error.response?.data?.detail || "Failed to upload training docs";
  }
};

// ---------------- List Training Docs ----------------
export const getTrainingDocs = async (ClientId = "") => {
  try {
    const params = ClientId ? { ClientId } : {};
    const response = await api.get("/in_call/training/list", { params });
    return response.data;
  } catch (error) {
    console.error("Error fetching training docs:", error);
    throw error.response?.data?.detail || "Failed to fetch training docs";
  }
};

// ---------------- Delete Training Doc ----------------
export const deleteTrainingDoc = async (id) => {
  try {
    const response = await api.delete(`/in_call/training/delete/${id}`);
    return response.data;
  } catch (error) {
    console.error("Error deleting training doc:", error);
    throw error.response?.data?.detail || "Failed to delete training doc";
  }
};


export const getClientCampaignTypes = async (companyId, outboundAccessId) => {
  const res = await api.get(
    `/call/campaign-types-for-client?CLIENT_ID=${companyId}&id=${outboundAccessId}`
  );
  return res.data;
};