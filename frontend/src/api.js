/**
 * API Configuration
 * 
 * In production (Vercel), VITE_API_URL should be set to the backend URL.
 * In development, it defaults to localhost:8000.
 */
const API_BASE_URL = import.meta.env.VITE_API_URL || (import.meta.env.MODE === 'production' ? "/api" : "http://localhost:8000/api");

export default API_BASE_URL;
