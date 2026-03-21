import axios from "axios";

const rawBaseUrl = import.meta.env.VITE_API_URL || "http://localhost:5159";
const normalizedBaseUrl = rawBaseUrl.replace(/\/+$/, "").replace(/\/api$/, "");

export const api = axios.create({
  baseURL: `${normalizedBaseUrl}/api`,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("jobify_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});