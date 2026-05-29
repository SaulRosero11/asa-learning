import axios from "axios";

export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080",
  timeout: 10000,
  headers: { "Content-Type": "application/json" },
  withCredentials: true, // envía cookies HttpOnly en cada request
});

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: unknown) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(undefined);
  });
  failedQueue = [];
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      }).then(() => apiClient(originalRequest));
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      await apiClient.post("/api/v1/auth/refresh");
      processQueue(null);
      return apiClient(originalRequest);
    } catch (refreshError: any) {
      processQueue(refreshError);
      if (typeof window !== "undefined") {
        const isCompromised = refreshError?.response?.data?.message === "SESSION_COMPROMISED";
        if (isCompromised) {
          alert("Tu sesión fue cerrada por seguridad. Por favor inicia sesión de nuevo.");
        }
        window.location.href = "/login";
      }
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);
