import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

let accessToken: string | null = null;
let refreshPromise: Promise<string | null> | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const res = await axios.post(
        `${API_URL}/auth/refresh`,
        {},
        { withCredentials: true },
      );
      setAccessToken(res.data.accessToken);
      return res.data.accessToken;
    } catch {
      setAccessToken(null);
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    const isRefreshCall = originalRequest.url?.includes("/auth/refresh");

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !isRefreshCall
    ) {
      originalRequest._retry = true;
      const newToken = await refreshAccessToken();

      if (newToken) {
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      }
    }

    return Promise.reject(error);
  },
);
