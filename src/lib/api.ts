// API utility functions for backend communication

const API_BASE_URL = "http://localhost:8080/api";

// Helper function to handle fetch requests
const apiRequest = async (endpoint: string, options: RequestInit = {}) => {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    credentials: "include",
    ...options,
    headers: {
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.statusText}`);
  }

  return response;
};

// Authentication
export const auth = {
  login: async (username: string, password: string) => {
    const response = await apiRequest("/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    return response.json();
  },

  logout: async () => {
    await apiRequest("/auth/logout", { method: "POST" });
  },

  getCurrentUser: async () => {
    const response = await apiRequest("/auth/me");
    return response.json();
  },
};

// Tasks
export const tasks = {
  getAll: async () => {
    const response = await apiRequest("/tasks");
    return response.json();
  },

  create: async (taskData: { business_name: string; brief: string }) => {
    const response = await apiRequest("/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(taskData),
    });
    return response.json();
  },

  claim: async (taskId: string) => {
    await apiRequest(`/tasks/${taskId}/claim`, { method: "PATCH" });
  },

  complete: async (taskId: string, zipFile: File) => {
    const formData = new FormData();
    formData.append("zip", zipFile);
    
    await apiRequest(`/tasks/${taskId}/complete`, {
      method: "PATCH",
      body: formData,
    });
  },

  revert: async (taskId: string) => {
    await apiRequest(`/tasks/${taskId}/revert`, { method: "PATCH" });
  },

  delete: async (taskId: string) => {
    await apiRequest(`/tasks/${taskId}`, { method: "DELETE" });
  },

  clearHistory: async () => {
    await apiRequest("/tasks/clear-history", { method: "DELETE" });
  },
};

export default { auth, tasks };