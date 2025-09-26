// client/src/api.js
import axios from 'axios'

export const api = axios.create({
  // Dev'de Vite proxy'sine gider, build'de de aynı yol kalır.
  baseURL: '/api',
  timeout: 10000,
})