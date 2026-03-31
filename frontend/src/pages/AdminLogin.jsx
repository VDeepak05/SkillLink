import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Shield, Lock } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { motion } from "framer-motion";
import API_BASE_URL from "../api";

const AdminLogin = () => {
    const navigate = useNavigate();
    const { login } = useAuth();
    const [credentials, setCredentials] = useState({ email: "", password: "" });
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");
    const [darkMode, setDarkMode] = useState(true);

    useEffect(() => {
        const savedTheme = localStorage.getItem("theme");
        setDarkMode(savedTheme !== "light");
    }, []);

    const handleChange = (e) => {
        setCredentials({ ...credentials, [e.target.name]: e.target.value });
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setErrorMsg("");

        try {
            const res = await fetch(`${API_BASE_URL}/admin/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(credentials)
            });

            const data = await res.json();

            if (res.ok) {
                login({
                    id: data.id,
                    name: data.name,
                    role: data.role,
                    email: data.email
                });
                navigate("/admin-portal/dashboard");
            } else {
                setErrorMsg(data.detail || "Admin authentication failed.");
            }
        } catch (error) {
            console.error(error);
            setErrorMsg("Connection error.");
        }
        setLoading(false);
    };

    return (
        <div className={`min-h-screen flex items-center justify-center transition-all duration-700 ${darkMode ? "bg-gray-900" : "bg-gray-50"}`}>
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`w-full max-w-md p-8 rounded-3xl shadow-2xl border ${darkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-100"}`}
            >
                <div className="flex justify-center mb-6">
                    <div className="p-4 bg-red-500/10 rounded-full">
                        <Shield className="h-10 w-10 text-red-500" />
                    </div>
                </div>

                <h1 className={`text-2xl font-bold text-center mb-2 ${darkMode ? "text-white" : "text-gray-900"}`}>
                    SkiLink Admin Portal
                </h1>
                <p className={`text-center text-sm mb-8 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                    Restricted access area for SkiLink management.
                </p>

                {errorMsg && (
                    <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-xl text-red-500 text-sm text-center font-medium">
                        {errorMsg}
                    </div>
                )}

                <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                        <input
                            type="email"
                            name="email"
                            value={credentials.email}
                            onChange={handleChange}
                            placeholder="Admin Email"
                            required
                            className={`w-full px-4 py-3 rounded-xl border focus:outline-none transition-colors ${darkMode ? "bg-gray-900 border-gray-700 text-white focus:border-red-500" : "bg-gray-50 border-gray-200 text-gray-900 focus:border-red-500"}`}
                        />
                    </div>
                    <div>
                        <input
                            type="password"
                            name="password"
                            value={credentials.password}
                            onChange={handleChange}
                            placeholder="Admin Password"
                            required
                            className={`w-full px-4 py-3 rounded-xl border focus:outline-none transition-colors ${darkMode ? "bg-gray-900 border-gray-700 text-white focus:border-red-500" : "bg-gray-50 border-gray-200 text-gray-900 focus:border-red-500"}`}
                        />
                    </div>

                    <button
                        disabled={loading}
                        type="submit"
                        className="w-full flex justify-center items-center py-3 mt-6 rounded-xl font-bold text-white bg-red-600 hover:bg-red-700 transition-colors shadow-lg shadow-red-500/20"
                    >
                        {loading ? "Authenticating..." : (
                            <>
                                <Lock className="h-4 w-4 mr-2" />
                                Login
                            </>
                        )}
                    </button>
                </form>
            </motion.div>
        </div>
    );
};

export default AdminLogin;
