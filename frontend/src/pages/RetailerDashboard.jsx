import React, { useEffect, useState } from "react";
import { Plus, Users, ShoppingBag, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

const RetailerDashboard = () => {
    const [darkMode, setDarkMode] = useState(true);

    useEffect(() => {
        const savedTheme = localStorage.getItem("theme");
        setDarkMode(savedTheme !== "light");
    }, []);

    return (
        <div
            className={`min-h-screen transition-all duration-700 ${darkMode
                    ? "dark-animated-gradient"
                    : "bg-gradient-to-br from-emerald-50 via-white to-green-100"
                }`}
        >
            <div className="relative z-10 max-w-7xl mx-auto px-6 py-14">

                {/* HEADER */}
                <div className="flex justify-between items-center mb-12">
                    <div>
                        <h1
                            className={`text-3xl font-bold transition-colors duration-500 ${darkMode ? "text-white" : "text-gray-900"
                                }`}
                        >
                            Dashboard
                        </h1>
                        <p
                            className={`mt-2 transition-colors duration-500 ${darkMode ? "text-gray-300" : "text-gray-600"
                                }`}
                        >
                            Welcome back, Fresh Mart Supermarket
                        </p>
                    </div>

                    <Link
                        to="/retailer/post-job"
                        className="
              px-6 py-3 rounded-xl font-semibold text-white
              bg-gradient-to-r from-emerald-500 to-green-600
              hover:from-emerald-600 hover:to-green-700
              transform hover:scale-105
              transition-all duration-300
              shadow-lg hover:shadow-2xl
              flex items-center gap-2
            "
                    >
                        <Plus className="h-5 w-5" />
                        Post New Job
                    </Link>
                </div>

                {/* STATS CARDS */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
                    {[
                        {
                            icon: <ShoppingBag className="h-6 w-6" />,
                            label: "Active Jobs",
                            value: 3,
                            color: "emerald",
                        },
                        {
                            icon: <Users className="h-6 w-6" />,
                            label: "Total Applicants",
                            value: 12,
                            color: "blue",
                        },
                        {
                            icon: <TrendingUp className="h-6 w-6" />,
                            label: "Views Today",
                            value: 45,
                            color: "purple",
                        },
                    ].map((card, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.2 }}
                            className={`rounded-3xl p-6 backdrop-blur-2xl border transition-all duration-500 hover:scale-105 ${darkMode
                                    ? "bg-white/10 border-white/20"
                                    : "bg-white/80 border-gray-200"
                                }`}
                        >
                            <div className="flex items-center gap-4">
                                <div
                                    className={`p-3 rounded-xl ${darkMode
                                            ? "bg-white/20 text-white"
                                            : "bg-emerald-100 text-emerald-600"
                                        }`}
                                >
                                    {card.icon}
                                </div>
                                <div>
                                    <p
                                        className={`text-sm ${darkMode ? "text-gray-300" : "text-gray-500"
                                            }`}
                                    >
                                        {card.label}
                                    </p>
                                    <h3
                                        className={`text-2xl font-bold ${darkMode ? "text-white" : "text-gray-900"
                                            }`}
                                    >
                                        {card.value}
                                    </h3>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* ACTIVE JOBS LIST */}
                <div
                    className={`rounded-3xl backdrop-blur-2xl border overflow-hidden transition-all duration-500 ${darkMode
                            ? "bg-white/10 border-white/20"
                            : "bg-white/80 border-gray-200"
                        }`}
                >
                    <div
                        className={`p-6 border-b ${darkMode ? "border-white/20" : "border-gray-200"
                            }`}
                    >
                        <h2
                            className={`text-lg font-bold ${darkMode ? "text-white" : "text-gray-900"
                                }`}
                        >
                            Active Listings
                        </h2>
                    </div>

                    {[1, 2, 3].map((job) => (
                        <div
                            key={job}
                            className={`p-6 transition-all duration-300 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${darkMode
                                    ? "hover:bg-white/5"
                                    : "hover:bg-gray-50"
                                }`}
                        >
                            <div>
                                <h3
                                    className={`font-semibold ${darkMode ? "text-white" : "text-gray-900"
                                        }`}
                                >
                                    Evening Cashier
                                </h3>
                                <p
                                    className={`text-sm ${darkMode ? "text-gray-300" : "text-gray-500"
                                        }`}
                                >
                                    Posted 2 days ago • 4 Applicants
                                </p>

                                <div className="flex gap-2 mt-3">
                                    <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 text-xs font-medium rounded-full">
                                        Active
                                    </span>
                                    <span
                                        className={`px-3 py-1 text-xs font-medium rounded-full ${darkMode
                                                ? "bg-white/10 text-gray-300"
                                                : "bg-gray-100 text-gray-600"
                                            }`}
                                    >
                                        Evening Shift
                                    </span>
                                </div>
                            </div>

                            <div className="flex gap-4">
                                <button
                                    className={`text-sm font-medium transition-colors ${darkMode
                                            ? "text-gray-300 hover:text-white"
                                            : "text-gray-600 hover:text-emerald-600"
                                        }`}
                                >
                                    Edit
                                </button>

                                <button
                                    className="
                    px-4 py-2 rounded-xl font-medium text-white
                    bg-gradient-to-r from-emerald-500 to-green-600
                    hover:from-emerald-600 hover:to-green-700
                    transform hover:scale-105
                    transition-all duration-300
                    shadow-md hover:shadow-xl
                  "
                                >
                                    View Applicants
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default RetailerDashboard;