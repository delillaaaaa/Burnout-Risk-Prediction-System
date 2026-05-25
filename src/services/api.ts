import axios from 'axios';

// Backend Express (simpan data)
export const backendApi = axios.create({
  baseURL: 'http://localhost:5000/api',
  headers: { 'Content-Type': 'application/json' }
});

// FastAPI ML (prediksi)
export const mlApi = axios.create({
  baseURL: 'http://localhost:8000',
  headers: { 'Content-Type': 'application/json' }
});