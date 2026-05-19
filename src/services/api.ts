import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api'; // nanti backend akan jalan di port 5000

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor untuk error handling (opsional)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);