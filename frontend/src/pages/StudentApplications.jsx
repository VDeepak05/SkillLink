import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Briefcase, MapPin, Clock, IndianRupee, ChevronRight, AlertCircle, CheckCircle2, XCircle, Loader2, User, Phone, Mail } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import API_BASE_URL from '../api';

const StudentApplications = () => {
    const { user } = useAuth();
    const location = useLocation();
    const [applications, setApplications] = useState([]);
    const [filteredApps, setFilteredApps] = useState([]);
    const [activeTab, setActiveTab] = useState(location.state?.activeTab || 'all');
    const [selectedApp, setSelectedApp] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Theme State
    const [darkMode, setDarkMode] = useState(() => {
        const themeKey = user ? `skilllink_theme_${user.id || user.user_id}` : "skilllink_theme_global";
        const saved = localStorage.getItem(themeKey) || localStorage.getItem("skilllink_theme_global");
        return saved !== "light"; // Default to dark theme
    });

    useEffect(() => {
        const themeKey = user ? `skilllink_theme_${user.id || user.user_id}` : "skilllink_theme_global";
        const saved = localStorage.getItem(themeKey) || localStorage.getItem("skilllink_theme_global");
        setDarkMode(saved !== "light");
    }, [user]);

    useEffect(() => {
        const fetchApplications = async () => {
            if (!user) return;
            try {
                const res = await fetch(`${API_BASE_URL}/student/applications/${user.id}`, { cache: 'no-store' });
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

    useEffect(() => {
        if (activeTab === 'all') {
            setFilteredApps(applications);
        } else {
            setFilteredApps(applications.filter(app => app.status === activeTab));
        }
    }, [activeTab, applications, user]);

    // Auto-dismiss relevant inbox notifications when viewing an application's details
    useEffect(() => {
        if (user && selectedApp && (selectedApp.status === 'accepted' || selectedApp.status === 'rejected')) {
            fetch(`${API_BASE_URL}/messages/bulk-read/${user.id}?title_contains=Application`, {
                method: 'PUT'
            }).then(() => {
                // Signal the Navbar to re-fetch its unread count
                window.dispatchEvent(new CustomEvent('inbox-refresh'));
            }).catch(() => {});
        }
    }, [selectedApp, user]);

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
            <div className={`min-h-[80vh] flex items-center justify-center ${darkMode ? "dark-animated-gradient" : "bg-white"}`}>
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-10 w-10 text-emerald-500 animate-spin" />
                    <p className={`${darkMode ? "text-emerald-400" : "text-gray-500"} font-medium`}>Fetching your applications...</p>
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

                {/* TABS COMPONENT */}
                {applications.length > 0 && (
                    <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="flex overflow-x-auto hide-scrollbar gap-2 mb-8 pb-2"
                    >
                        {['all', 'pending', 'accepted', 'rejected'].map(tab => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`px-5 py-2.5 rounded-xl font-bold text-sm whitespace-nowrap transition-all ${activeTab === tab 
                                    ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/30" 
                                    : darkMode ? "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white" : "bg-white text-gray-500 hover:bg-gray-100 border border-gray-200"
                                }`}
                            >
                                {tab === 'all' ? 'All Applications' : tab.charAt(0).toUpperCase() + tab.slice(1)}
                            </button>
                        ))}
                    </motion.div>
                )}

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
                ) : filteredApps.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-12 text-center"
                    >
                        <div className="bg-white/5 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 border border-white/10">
                            <Briefcase className="h-10 w-10 text-emerald-400 opacity-50" />
                        </div>
                        <h2 className={`text-xl font-bold mb-2 ${darkMode ? "text-white" : "text-gray-900"}`}>No {activeTab} applications found</h2>
                        <p className={`mb-8 ${darkMode ? "text-gray-400" : "text-gray-500 font-medium"}`}>You don't have any applications matching this status.</p>
                        <button
                            onClick={() => setActiveTab('all')}
                            className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-emerald-500 px-8 py-3 rounded-xl font-bold transition-all"
                        >
                            View All
                        </button>
                    </motion.div>
                ) : (
                    <div className="space-y-4">
                        {filteredApps.map((app, index) => {
                            const status = getStatusStyle(app.status);
                            return (
                                <motion.div
                                    key={app.id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.1 }}
                                    onClick={() => { if (app.status !== 'pending') setSelectedApp(app); }}
                                    className={`${darkMode ? "bg-white/10 border-white/20" : "bg-white border-gray-200 shadow-xl"} ${app.status !== 'pending' ? 'cursor-pointer hover:border-emerald-400' : 'hover:border-emerald-500/30'} backdrop-blur-md border rounded-3xl p-6 group transition-all duration-300`}
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
                                                    <span className="capitalize">{app.shift}</span>
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

            {/* SELECTION MODAL */}
            <AnimatePresence>
                {selectedApp && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div 
                            initial={{ opacity: 0 }} 
                            animate={{ opacity: 1 }} 
                            exit={{ opacity: 0 }} 
                            className="fixed inset-0 bg-black/60 backdrop-blur-sm" 
                            onClick={() => setSelectedApp(null)} 
                        />
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95, y: 20 }} 
                            animate={{ opacity: 1, scale: 1, y: 0 }} 
                            exit={{ opacity: 0, scale: 0.95, y: 20 }} 
                            className={`relative w-full max-w-md p-8 rounded-3xl shadow-2xl overflow-hidden border ${darkMode ? "bg-[#0b120f] border-gray-700" : "bg-white border-gray-200"}`}
                        >
                            <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-emerald-400 to-emerald-600"></div>
                            
                            <button 
                                onClick={() => setSelectedApp(null)} 
                                className={`absolute top-4 right-4 p-2 rounded-full transition-colors ${darkMode ? "bg-white/5 hover:bg-white/10 text-gray-400" : "bg-gray-100 hover:bg-gray-200 text-gray-600"}`}
                            >
                                <XCircle size={24} />
                            </button>
                            
                            <div className="flex flex-col items-center text-center space-y-4 pt-4">
                                <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-2 shadow-inner ${
                                    selectedApp.status === 'accepted' 
                                        ? (darkMode ? "bg-emerald-500/20 text-emerald-400" : "bg-emerald-100 text-emerald-600")
                                        : (darkMode ? "bg-red-500/20 text-red-400" : "bg-red-100 text-red-600")
                                }`}>
                                    {selectedApp.status === 'accepted' ? <CheckCircle2 size={40} /> : <XCircle size={40} />}
                                </div>
                                
                                <div>
                                    <h3 className={`text-2xl font-black mb-2 ${darkMode ? "text-white" : "text-gray-900"}`}>
                                        {selectedApp.status === 'accepted' ? 'Congratulations!' : 'Application Rejected'}
                                    </h3>
                                    <p className={`text-base font-medium leading-relaxed ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                                        {selectedApp.status === 'accepted' ? (
                                            <>Your application for <span className={`${darkMode ? "text-emerald-400" : "text-emerald-600"} font-bold`}>{selectedApp.job_title}</span> at <span className="font-bold">{selectedApp.shop_name}</span> has been accepted.</>
                                        ) : (
                                            <>Sorry, you were not selected for the <span className={`${darkMode ? "text-red-400" : "text-red-600"} font-bold`}>{selectedApp.job_title}</span> role at <span className="font-bold">{selectedApp.shop_name}</span> this time.</>
                                        )}
                                    </p>
                                </div>
                                
                                {selectedApp.status === 'accepted' ? (
                                    <>
                                        <div className={`w-full p-5 mt-2 rounded-2xl text-left border ${darkMode ? "bg-emerald-900/10 border-emerald-500/20" : "bg-emerald-50 border-emerald-200"}`}>
                                            <p className={`text-xs font-bold uppercase tracking-widest mb-4 ${darkMode ? "text-emerald-500" : "text-emerald-700"}`}>Contact Info</p>
                                            <div className="space-y-3">
                                                <div className={`text-sm flex items-center gap-4 font-medium ${darkMode ? "text-gray-300" : "text-gray-800"}`}>
                                                    <div className={`p-2 rounded-lg ${darkMode ? "bg-white/5 text-gray-400" : "bg-white text-emerald-600 shadow-sm"}`}>
                                                        <User size={16} />
                                                    </div>
                                                    {selectedApp.retailer_name}
                                                </div>
                                                <div className={`text-sm flex items-center gap-4 font-medium ${darkMode ? "text-gray-300" : "text-gray-800"}`}>
                                                    <div className={`p-2 rounded-lg ${darkMode ? "bg-white/5 text-gray-400" : "bg-white text-emerald-600 shadow-sm"}`}>
                                                        <Phone size={16} />
                                                    </div>
                                                    {selectedApp.retailer_phone}
                                                </div>
                                                <div className={`text-sm flex items-center gap-4 font-medium ${darkMode ? "text-gray-300" : "text-gray-800"}`}>
                                                    <div className={`p-2 rounded-lg ${darkMode ? "bg-white/5 text-gray-400" : "bg-white text-emerald-600 shadow-sm"}`}>
                                                        <Mail size={16} />
                                                    </div>
                                                    {selectedApp.retailer_email}
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <p className={`text-sm pt-4 font-medium italic ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                                            The owner will contact you soon, or you can reach out directly!
                                        </p>
                                    </>
                                ) : (
                                    <div className={`w-full p-6 bg-red-500/5 border border-red-500/10 rounded-2xl`}>
                                        <p className={`text-sm font-medium ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                                            Keep applying! There are many other roles available that match your skills.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default StudentApplications;
