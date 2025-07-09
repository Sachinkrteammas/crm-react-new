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


export const login = async (usernameOrEmail, password) => {
  try {
    const formData = new FormData();
    formData.append("username", usernameOrEmail);
    formData.append("password", password);

    const response = await api.post("/login", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    const { access_token } = response.data;
    localStorage.setItem("token", access_token);
    localStorage.setItem("username", response.data.username);
    return access_token;
  } catch (error) {
    throw error.response?.data?.detail || "Login failed";
  }
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
