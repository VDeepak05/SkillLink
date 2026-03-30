import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Shield, CheckCircle, XCircle, Search, RefreshCw, LogOut } from "lucide-react";
import API_BASE_URL from "../api";
import { useAuth } from "../context/AuthContext";
import { motion, AnimatePresence } from "framer-motion";

const AdminDashboard = () => {
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const [retailers, setRetailers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [darkMode, setDarkMode] = useState(true);

    useEffect(() => {
        const savedTheme = localStorage.getItem("theme");
        setDarkMode(savedTheme !== "light");
    }, []);

    // Security check
    useEffect(() => {
        if (!user || user.role !== "admin") {
            navigate("/admin-portal");
        }
    }, [user, navigate]);

    const fetchRetailers = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/admin/retailers`);
            if (res.ok) {
                const data = await res.json();
                setRetailers(data.retailers || []);
            }
        } catch (error) {
            console.error("Error fetching retailers:", error);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchRetailers();
    }, []);

    const handleVerify = async (id, shopName) => {
        if (!window.confirm(`Are you sure you want to approve ${shopName}?`)) return;

        try {
            const res = await fetch(`${API_BASE_URL}/admin/retailers/${id}/verify`, {
                method: "PUT"
            });
            if (res.ok) {
                // Update local state without refetching to be snappy
                setRetailers(retailers.map(r => r.id === id ? { ...r, verified: true } : r));
            } else {
                alert("Failed to verify retailer.");
            }
        } catch (error) {
            console.error("Error verifying:", error);
        }
    };

    const handleReject = async (id, shopName) => {
        if (!window.confirm(`CRITICAL: Are you sure you want to completely reject/delete ${shopName}? This cannot be undone.`)) return;

        try {
            const res = await fetch(`http://localhost:8000/admin/retailers/${id}/reject`, {
                method: "DELETE"
            });
            if (res.ok) {
                // Remove from local state
                setRetailers(retailers.filter(r => r.id !== id));
            } else {
                alert("Failed to reject retailer.");
            }
        } catch (error) {
            console.error("Error rejecting:", error);
        }
    };

    const handleLogout = () => {
        logout();
        navigate("/admin-portal");
    };

    const filteredRetailers = retailers.filter(r =>
        (r.shop_name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.owner_name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.shop_id || "").toLowerCase().includes(searchTerm.toLowerCase())
    );

    const pendingRetailers = filteredRetailers.filter(r => !r.verified);
    const verifiedRetailers = filteredRetailers.filter(r => r.verified);

    return (
        <div className={`min-h-screen pb-20 transition-all duration-700 ${darkMode ? "bg-gray-900 text-white" : "bg-gray-50 text-gray-900"}`}>

            {/* Minimalist Admin Header */}
            <header className={`sticky top-0 z-50 px-6 py-4 flex items-center justify-between border-b ${darkMode ? "bg-gray-900/80 border-gray-800 backdrop-blur-xl" : "bg-white/80 border-gray-200 backdrop-blur-xl"}`}>
                <div className="flex items-center gap-3">
                    <Shield className="h-6 w-6 text-red-500" />
                    <h1 className="text-xl font-bold tracking-tight">SkiLink Admin</h1>
                </div>
                <div className="flex items-center gap-6">
                    <span className={`text-sm font-medium px-3 py-1 rounded-full ${darkMode ? "bg-gray-800" : "bg-gray-100"}`}>
                        Total Retailers: {retailers.length}
                    </span>
                    <button onClick={handleLogout} className="flex items-center gap-2 text-sm font-bold text-red-500 hover:text-red-600 transition-colors">
                        <LogOut className="h-4 w-4" />
                        Sys Logout
                    </button>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 mt-12">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                    <div>
                        <h2 className="text-3xl font-bold mb-2">Retailer Verification Queue</h2>
                        <p className={`${darkMode ? "text-gray-400" : "text-gray-500"}`}>Review and approve pending store registrations to allow them to post jobs.</p>
                    </div>

                    <div className="flex gap-4">
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Search shops..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className={`pl-10 pr-4 py-2.5 rounded-xl border focus:outline-none transition-colors w-64 ${darkMode ? "bg-gray-800 border-gray-700 focus:border-red-500" : "bg-white border-gray-300 focus:border-red-500"}`}
                            />
                            <Search className={`absolute left-3 top-3 h-4 w-4 ${darkMode ? "text-gray-500" : "text-gray-400"}`} />
                        </div>
                        <button onClick={fetchRetailers} className={`p-2.5 rounded-xl border transition-colors ${darkMode ? "border-gray-700 hover:bg-gray-800" : "border-gray-300 hover:bg-gray-100"}`}>
                            <RefreshCw className={`h-5 w-5 ${loading ? "animate-spin" : ""}`} />
                        </button>
                    </div>
                </div>

                <div className="space-y-12">
                    {/* PENDING SECTION */}
                    <section>
                        <div className="flex items-center gap-3 mb-6">
                            <div className="h-8 w-1.5 bg-yellow-500 rounded-full"></div>
                            <h3 className="text-xl font-bold">Pending Approval ({pendingRetailers.length})</h3>
                        </div>

                        {loading ? (
                            <div className="text-center py-10 opacity-50">Fetching database...</div>
                        ) : pendingRetailers.length === 0 ? (
                            <div className={`p-8 text-center rounded-2xl border ${darkMode ? "bg-gray-800/50 border-gray-800 text-gray-400" : "bg-white border-gray-200 text-gray-500"}`}>
                                No pending retailers found.
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                <AnimatePresence>
                                    {pendingRetailers.map(r => (
                                        <RetailerCard
                                            key={r.id}
                                            retailer={r}
                                            darkMode={darkMode}
                                            onVerify={() => handleVerify(r.id, r.shop_name)}
                                            onReject={() => handleReject(r.id, r.shop_name)}
                                        />
                                    ))}
                                </AnimatePresence>
                            </div>
                        )}
                    </section>

                    {/* VERIFIED SECTION */}
                    <section>
                        <div className="flex items-center gap-3 mb-6 border-t pt-12 border-gray-200 dark:border-gray-800">
                            <div className="h-8 w-1.5 bg-emerald-500 rounded-full"></div>
                            <h3 className="text-xl font-bold">Verified Stores ({verifiedRetailers.length})</h3>
                        </div>

                        {verifiedRetailers.length === 0 ? (
                            <div className={`p-8 text-center rounded-2xl border ${darkMode ? "bg-gray-800/50 border-gray-800 text-gray-400" : "bg-white border-gray-200 text-gray-500"}`}>
                                No verified retailers yet.
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 opacity-80">
                                {verifiedRetailers.map(r => (
                                    <RetailerCard key={r.id} retailer={r} darkMode={darkMode} isVerified={true} />
                                ))}
                            </div>
                        )}
                    </section>
                </div>
            </main>
        </div>
    );
};

const RetailerCard = ({ retailer, darkMode, isVerified, onVerify, onReject }) => {
    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className={`p-6 rounded-2xl border transition-all ${darkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200 shadow-sm"}`}
        >
            <div className="flex justify-between items-start mb-4">
                <div>
                    <h4 className="text-lg font-bold line-clamp-1">{retailer.shop_name}</h4>
                    <span className="text-sm text-emerald-500 font-medium">{retailer.shop_type}</span>
                </div>
                {isVerified && <CheckCircle className="h-6 w-6 text-emerald-500" />}
            </div>

            <div className={`space-y-2 text-sm mb-6 ${darkMode ? "text-gray-300" : "text-gray-600"}`}>
                <p><span className="font-semibold opacity-70">Owner:</span> {retailer.owner_name}</p>
                <p><span className="font-semibold opacity-70">Email:</span> {retailer.email}</p>
                <p><span className="font-semibold opacity-70">Location:</span> {retailer.location}</p>
                <p><span className="font-semibold opacity-70">Reg ID:</span> <span className="font-mono bg-gray-500/10 px-1.5 py-0.5 rounded">{retailer.shop_id}</span></p>
                <p className="text-xs pt-1 opacity-50">Joined: {retailer.created_at ? new Date(retailer.created_at).toLocaleDateString() : 'Unknown'}</p>
            </div>

            {!isVerified && (
                <div className="flex gap-3 mt-auto">
                    <button
                        onClick={onVerify}
                        className="flex-1 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold transition-colors flex items-center justify-center gap-2"
                    >
                        <CheckCircle className="h-4 w-4" /> Approve
                    </button>
                    <button
                        onClick={onReject}
                        className={`py-2 px-4 rounded-xl border font-bold transition-colors flex items-center justify-center gap-2 ${darkMode ? "border-gray-700 text-red-500 hover:bg-red-500/10" : "border-red-200 text-red-600 hover:bg-red-50"}`}
                    >
                        <XCircle className="h-4 w-4" /> Reject
                    </button>
                </div>
            )}
        </motion.div>
    );
};

export default AdminDashboard;
