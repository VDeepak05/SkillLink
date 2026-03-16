import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { Briefcase, MapPin, Clock, IndianRupee, ChevronRight, AlertCircle, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';

const StudentApplications = () => {
    const { user } = useAuth();
    const [applications, setApplications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Theme State
    const [darkMode, setDarkMode] = useState(() => {
        const saved = localStorage.getItem("theme");
        return saved !== "light"; // Default to dark theme
    });

    useEffect(() => {
        const fetchApplications = async () => {
            if (!user) return;
            try {
                const res = await fetch(`http://localhost:8000/student/applications/${user.id}`);
                const data = await res.json();
                if (res.ok) {
                    setApplications(data.applications);
                } else {
                    setError(data.detail || "Failed to fetch applications");
                }
            } catch (err) {
                console.error("Error fetching applications:", err);
                setError("Connection error. Please try again later.");
            } finally {
                setLoading(false);
            }
        };

        fetchApplications();
    }, [user]);

    const getStatusStyle = (status) => {
        switch (status) {
            case 'accepted':
                return {
                    bg: 'bg-emerald-500/10',
                    text: 'text-emerald-500',
                    border: 'border-emerald-500/20',
                    icon: <CheckCircle2 size={16} />
                };
            case 'rejected':
                return {
                    bg: 'bg-red-500/10',
                    text: 'text-red-500',
                    border: 'border-red-500/20',
                    icon: <XCircle size={16} />
                };
            default:
                return {
                    bg: 'bg-amber-500/10',
                    text: 'text-amber-500',
                    border: 'border-amber-500/20',
                    icon: <Clock size={16} />
                };
        }
    };

    if (loading) {
        return (
            <div className="min-h-[80vh] flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-10 w-10 text-emerald-500 animate-spin" />
                    <p className="text-gray-500 font-medium">Fetching your applications...</p>
                </div>
            </div>
        );
    }

    return (
        <div className={`min-h-screen transition-all duration-700 ${darkMode ? "dark-animated-gradient" : "bg-gradient-to-br from-emerald-50 via-white to-green-100"} py-12 px-6`}>
            <div className="max-w-4xl mx-auto">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-10"
                >
                    <h1 className={`text-3xl font-bold mb-2 ${darkMode ? "text-white" : "text-gray-900"}`}>My Applications</h1>
                    <p className={`${darkMode ? "text-emerald-400" : "text-emerald-600"} font-medium italic`}>Track your journey with SkiLink</p>
                </motion.div>

                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl flex items-center gap-3 text-red-500 mb-8">
                        <AlertCircle size={20} />
                        <p>{error}</p>
                    </div>
                )}

                {applications.length === 0 && !error ? (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-12 text-center"
                    >
                        <div className="bg-white/5 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 border border-white/10">
                            <Briefcase className="h-10 w-10 text-emerald-400" />
                        </div>
                        <h2 className={`text-xl font-bold mb-2 ${darkMode ? "text-white" : "text-gray-900"}`}>No Applications Yet</h2>
                        <p className={`mb-8 ${darkMode ? "text-gray-400" : "text-gray-500 font-medium"}`}>Start your search and apply for jobs that fit your schedule!</p>
                        <Link
                            to="/jobs"
                            className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-lg shadow-emerald-500/20"
                        >
                            Browse Jobs
                        </Link>
                    </motion.div>
                ) : (
                    <div className="space-y-4">
                        {applications.map((app, index) => {
                            const status = getStatusStyle(app.status);
                            return (
                                <motion.div
                                    key={app.id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.1 }}
                                    className={`${darkMode ? "bg-white/10 border-white/20" : "bg-white border-gray-200 shadow-xl"} backdrop-blur-md border rounded-3xl p-6 group hover:border-emerald-500/50 transition-all duration-300`}
                                >
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                <h3 className={`text-xl font-bold transition-colors ${darkMode ? "text-white group-hover:text-emerald-400" : "text-gray-900 group-hover:text-emerald-600"}`}>
                                                    {app.job_title}
                                                </h3>
                                                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${status.bg} ${status.text} ${status.border}`}>
                                                    {status.icon}
                                                    {app.status}
                                                </span>
                                            </div>
                                            <p className="text-emerald-500 font-medium mb-4">{app.shop_name} • {app.shop_type}</p>

                                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                                <div className={`flex items-center gap-2 text-sm font-medium ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                                                    <MapPin size={16} className={darkMode ? "text-emerald-400" : "text-emerald-600"} />
                                                    {app.location}
                                                </div>
                                                <div className={`flex items-center gap-2 text-sm font-medium ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                                                    <IndianRupee size={16} className={darkMode ? "text-emerald-400" : "text-emerald-600"} />
                                                    ₹{app.salary}/day
                                                </div>
                                                <div className={`flex items-center gap-2 text-sm font-medium ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                                                    <Clock size={16} className={darkMode ? "text-emerald-400" : "text-emerald-600"} />
                                                    {app.shift}
                                                </div>
                                            </div>
                                        </div>

                                        <div className={`flex flex-row md:flex-col items-center gap-3 pt-4 md:pt-0 border-t md:border-t-0 md:border-l ${darkMode ? "border-white/10" : "border-gray-100"} md:pl-8`}>
                                            <p className={`text-xs font-bold uppercase tracking-widest hidden md:block ${darkMode ? "text-gray-500" : "text-gray-400"}`}>Applied</p>
                                            <p className={`text-sm font-bold ${darkMode ? "text-white" : "text-gray-900"}`}>
                                                {new Date(app.applied_at).toLocaleDateString('en-IN', {
                                                    day: 'numeric',
                                                    month: 'short',
                                                    year: 'numeric'
                                                })}
                                            </p>
                                            <Link
                                                to={`/jobs/${app.job_id}`}
                                                className="ml-auto md:ml-0 bg-white/5 hover:bg-emerald-500/20 p-3 rounded-2xl transition-all text-emerald-400 border border-white/5 hover:border-emerald-500/30"
                                            >
                                                <ChevronRight size={20} />
                                            </Link>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default StudentApplications;
