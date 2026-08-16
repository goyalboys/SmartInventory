import axios from "axios";

export const API_BASE = "http://localhost:5000";

const api = axios.create({
  baseURL: `${API_BASE}/api`,
  withCredentials: true,
});

export default api;
