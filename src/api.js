// src/api.js
import axios from "axios";

// const API_BASE_URL = "http://172.12.13.119:8000";

// Adjust this to your FastAPI backend URL
const API_BASE_URL = "http://172.12.13.119:8000";

const api = axios.create({
  baseURL: API_BASE_URL,
});

// Attach JWT token automatically if present
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;


