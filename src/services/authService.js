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
