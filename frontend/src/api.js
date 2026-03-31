/**
 * API Configuration
 * 
 * In production (Vercel), VITE_API_URL should be set to the backend URL.
 * In development, it defaults to localhost:8000.
 */
let base = import.meta.env.VITE_API_URL || (import.meta.env.MODE === 'production' ? "" : "http://localhost:8000/api");
if (base.endsWith('/')) {
    base = base.slice(0, -1);
}
const API_BASE_URL = base;

export default API_BASE_URL;
