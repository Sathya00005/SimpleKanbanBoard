import axios from "axios";

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3001";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

export function setupInterceptors() {
  const originalFetch = window.fetch;

  window.fetch = async (...args) => {
    let [resource, config] = args;

    if (typeof resource === "string" && resource.startsWith(API_BASE_URL)) {
      const token = localStorage.getItem("token");
      if (token) {
        config = config || {};
        config.headers = {
          ...config.headers,
          Authorization: `Bearer ${token}`,
        };
        args = [resource, config];
      }
    }

    const response = await originalFetch(...args);

    if (response.status === 401) {
      handleUnauthorized();
    }

    return response;
  };

  api.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401) {
        handleUnauthorized();
      }
      return Promise.reject(error);
    }
  );

  api.interceptors.request.use((config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });
}

function handleUnauthorized() {
  localStorage.removeItem("token");
  localStorage.removeItem("userId");
  localStorage.removeItem("username");
  localStorage.removeItem("selectedProject");

  if (
    window.location.pathname !== "/login" &&
    window.location.pathname !== "/signup"
  ) {
    window.location.href = "/login?sessionExpired=true";
  }
}

export default api;
