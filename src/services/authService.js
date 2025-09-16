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


// Get Out Call Details (GET with params)
// export const getOutCallDetails = async (company_id, payload) => {
//     try {
//         const response = await api.get("/call/outcalls", {
//             params: { CLIENT_ID: company_id, ...payload },
//         });
//         return response.data;
//     } catch (error) {
//         console.error("Error fetching out call details:", error);
//         throw error;
//     }
// };

// // Get Campaign Types
// export const getCampaignTypes = async (company_id) => {
//     try {
//         const response = await api.get("/call/types", {
//             params: { CLIENT_ID: company_id },
//         });
//         return response.data;
//     } catch (error) {
//         console.error("Error fetching campaign types:", error);
//         throw error;
//     }
// };

// // Get Campaigns for a given parent (campaign type)
// export const getCampaigns = async (company_id, parentId) => {
//     try {
//         const response = await api.get("/call/campaigns", {
//             params: { CLIENT_ID: company_id, type: parentId },
//         });
//         return response.data;
//     } catch (error) {
//         console.error("Error fetching campaigns:", error);
//         throw error;
//     }
// };

// // Get Allocations for a given campaign
// export const getAllocations = async (company_id, campaignId) => {
//     try {
//         const response = await api.get("/call/allocations", {
//             params: { CLIENT_ID: company_id, campaign: campaignId },
//         });
//         return response.data;
//     } catch (error) {
//         console.error("Error fetching allocations:", error);
//         throw error;
//     }

    
// };



// // ------------------ OutCall / Campaign / Allocation ------------------
const toIntIfPresent = (v) => {
  if (v === undefined || v === null || v === "") return undefined;
  const n = parseInt(v, 10);
  return Number.isNaN(n) ? undefined : n;
};


 // Get OutCall Details with optional filters
export const getOutCallDetails = async (company_id, filters = {}) => {
  try {
    // Build params only with non-empty fields
    const params = { CLIENT_ID: company_id };

    Object.entries(filters).forEach(([k, v]) => {
      if (v === undefined || v === null || v === "") return;
      params[k] = v;
    });

    // Convert only campaign & allocation to integers (backend expects int for these)
    const campaignInt = toIntIfPresent(params.campaign);
    const allocationInt = toIntIfPresent(params.allocation);
    if (campaignInt !== undefined) params.campaign = campaignInt;
    if (allocationInt !== undefined) params.allocation = allocationInt;

    // Note: Do NOT parse scenario or subScenario* to int — your backend compares those as strings.
    const response = await api.get("/call/outcalls", { params });
    return response.data || { data: [], counts: {}, breadcrumb: [] };
  } catch (error) {
    console.error("Error fetching OutCall details:", error);
    // bubble up useful shape so frontend doesn't break
    return { data: [], counts: {}, breadcrumb: [] };
  }
};

// Get all campaign types for a company
export const getCampaignTypes = async (company_id) => {
  try {
    const response = await api.get("/call/types", {
      params: { CLIENT_ID: company_id },
    });
    return response.data || [];
  } catch (error) {
    console.error("Error fetching campaign types:", error);
    return [];
  }
};

// Get campaigns under a specific campaign type
export const getCampaigns = async (company_id, campaignType) => {
  if (!campaignType) return [];
  try {
    const response = await api.get("/call/campaigns", {
      params: { CLIENT_ID: company_id, campaignType },
    });
    return response.data || [];
  } catch (error) {
    console.error("Error fetching campaigns:", error);
    return [];
  }
};


 // Get allocations under a campaign
export const getAllocations = async (company_id, campaignId) => {
  // campaignId must be numeric id; if it's empty or not parseable, return [].
  const cid = toIntIfPresent(campaignId);
  if (cid === undefined) return [];
  try {
    const response = await api.get("/call/allocations", {
      params: { CLIENT_ID: company_id, campaign: cid },
    });
    return response.data || [];
  } catch (error) {
    console.error("Error fetching allocations:", error);
    return [];
  }
};

/**
 * getScenarios:
 * - allocationId is numeric id (we parse it)
 * - scenarioLevel is numeric (1..4)
 * - parentScenario: backend expects a string (the parent category name) — do NOT parse to int
 */
export const getScenarios = async (
  company_id,
  allocationId,
  scenarioLevel,
  parentScenario = null
) => {
  const alloc = toIntIfPresent(allocationId);
  if (alloc === undefined) return []; 
  try {
    const params = {
      CLIENT_ID: company_id,
      allocation: alloc,
      scenario_level: scenarioLevel,
    };
    if (parentScenario !== undefined && parentScenario !== null && parentScenario !== "")
      params.parent_scenario = parentScenario; 
    const response = await api.get("/call/scenarios", { params });
    return response.data || [];
  } catch (error) {
    console.error("Error fetching scenarios:", error);
    return [];
  }
};
