// client/src/api.js
import axios from "axios";

// Lokal geliştirirken localhost, canlıda Render API
const BASE =
  window.location.hostname === "localhost"
    ? "http://127.0.0.1:4000/api"
    : "https://elci-api.onrender.com/api";

export const api = axios.create({
  baseURL: BASE,
  timeout: 15000,
});