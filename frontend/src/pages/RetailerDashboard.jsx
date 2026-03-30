import React, { useEffect, useState } from "react";
import { Plus, Users, ShoppingBag, Store, TrendingUp, Briefcase, CheckCircle, XCircle, User, MapPin, ExternalLink, Link as LinkIcon, Edit3, Phone, Lock, ChevronRight, Mail, X } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../context/AuthContext";

const RetailerDashboard = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    // Theme State
    const [darkMode, setDarkMode] = useState(() => {
        const themeKey = user ? `skilllink_theme_${user.id || user.user_id}` : "skilllink_theme_global";
        const saved = localStorage.getItem(themeKey) || localStorage.getItem("skilllink_theme_global");
        return saved !== "light"; // Default to dark
    });

    useEffect(() => {
        const themeKey = user ? `skilllink_theme_${user.id || user.user_id}` : "skilllink_theme_global";
        const saved = localStorage.getItem(themeKey) || localStorage.getItem("skilllink_theme_global");
        setDarkMode(saved !== "light");
    }, [user]);

    useEffect(() => {
        if (!user || user.role !== "retailer") {
            navigate("/");
            return;
        }
        fetchDashboardData();
    }, [user, navigate]);

    // When a job is expanded and applicants are visible, dismiss all "New Applicant" inbox messages
    // and fire a custom event so the Navbar badge re-polls immediately (no route change needed)
    useEffect(() => {
        if (expandedJobId && user) {
            fetch(`http://localhost:8000/messages/bulk-read/${user.id}?title_contains=New Applicant`, {
                method: 'PUT'
            }).then(() => {
                // Signal the Navbar to re-fetch its unread count
                window.dispatchEvent(new CustomEvent('inbox-refresh'));
            }).catch(() => {});
        }
    }, [expandedJobId, user]);

    const fetchDashboardData = async () => {
        setLoading(true);
        try {
            // Fetch jobs
            const jobsRes = await fetch(`http://localhost:8000/retailer/jobs/${user.id}`);
            if (jobsRes.ok) {
                const data = await jobsRes.json();
                setJobs(data.jobs || []);
            }

            // Fetch applications
            const appsRes = await fetch(`http://localhost:8000/retailer/applications/${user.id}`);
            if (appsRes.ok) {
                const data = await appsRes.json();
                setApplications(data.applications || []);
            }

            // Fetch profile (assuming profile is returned in some user query, or we just keep it local for now. Note: for MVP, I am leaving this as local state unless we fetch user details API)
        } catch (error) {
            console.error("Dashboard fetch error:", error);
        }
        setLoading(false);
    };

    const handleProfileChange = (e) => {
        setProfile({ ...profile, [e.target.name]: e.target.value });
    };

    const saveProfile = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const res = await fetch(`http://localhost:8000/retailer/profile/${user.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(profile)
            });
            if (res.ok) {
                alert("Profile saved successfully!");
            } else {
                alert("Failed to save profile.");
            }
        } catch (error) {
            console.error("Profile save error:", error);
        }
        setSaving(false);
    };

    const handleAppStatus = async (appId, newStatus) => {
        try {
            const res = await fetch(`http://localhost:8000/retailer/applications/${appId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: newStatus })
            });

            if (res.ok) {
                // Update local state to reflect change instantly
                setApplications(applications.map(app => app.id === appId ? { ...app, status: newStatus } : app));
                // Update selectedApp if it's currently open
                if (selectedApp && selectedApp.id === appId) {
                    // Update its status. If accepted, fetch full application data to get phone and email.
                    if (newStatus === 'accepted') {
                        const appsRes = await fetch(`http://localhost:8000/retailer/applications/${user.id}`);
                        if (appsRes.ok) {
                            const data = await appsRes.json();
                            setApplications(data.applications || []);
                            const updatedApp = data.applications.find(a => a.id === appId);
                            if (updatedApp) setSelectedApp(updatedApp);
                        }
                    } else {
                        setSelectedApp(prev => ({ ...prev, status: newStatus }));
                    }
                }
            } else {
                alert("Failed to update status");
            }
        } catch (error) {
            console.error("Status update error:", error);
        }
    };

    if (loading) {
        return (
            <div className={`min-h-screen flex flex-col items-center justify-center gap-4 ${darkMode ? "dark-animated-gradient text-emerald-400" : "bg-white text-gray-500"}`}>
                <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="font-bold text-lg">Loading Dashboard...</p>
            </div>
        );
    }

    const pendingCount = applications.filter(a => a.status === 'pending').length;

    return (
        <div
            className={`min-h-screen pb-20 transition-all duration-700 ${darkMode
                ? "dark-animated-gradient"
                : "bg-gradient-to-br from-emerald-50 via-white to-green-100"
                }`}
        >
            <div className="relative z-10 max-w-7xl mx-auto px-6 py-14">

                {/* HEADER */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
                    <div>
                        <h1 className={`text-3xl font-bold transition-colors duration-500 ${darkMode ? "text-white" : "text-gray-900"}`}>
                            Shop Manager
                        </h1>
                        <p className={`mt-2 transition-colors duration-500 flex items-center gap-2 ${darkMode ? "text-gray-300" : "text-gray-600"}`}>
                            <Store size={18} /> Welcome back, {user?.name || "Retailer"}
                        </p>
                    </div>

                    <Link
                        to="/retailer/post-job"
                        className="px-6 py-3 rounded-xl font-bold text-white bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 shadow-lg hover:shadow-2xl transition-all flex items-center gap-2"
                    >
                        <Plus className="h-5 w-5" />
                        Post New Job
                    </Link>
                </div>

                {/* TABS COMPONENT */}
                <div className="flex space-x-2 mb-8 overflow-x-auto pb-2 scrollbar-hide">
                    <TabButton
                        active={activeTab === 'overview'}
                        onClick={() => setActiveTab('overview')}
                        icon={<Briefcase size={18} />}
                        label={`Active Jobs (${jobs.length})`}
                        darkMode={darkMode}
                    />
                    <TabButton
                        active={activeTab === 'profile'}
                        onClick={() => setActiveTab('profile')}
                        icon={<Store size={18} />}
                        label="Shop Profile"
                        darkMode={darkMode}
                    />
                </div>

                {/* TAB CONTENT */}
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                    >
                        {activeTab === 'overview' && (
                            <div className="space-y-8">
                                {/* STATS CARDS */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                    <StatCard icon={<ShoppingBag />} label="Active Jobs" value={jobs.length} darkMode={darkMode} />
                                    <StatCard icon={<Users />} label="Total Applications" value={applications.length} darkMode={darkMode} />
                                    <StatCard icon={<TrendingUp />} label="Pending Actions" value={pendingCount} darkMode={darkMode} highlight={pendingCount > 0} />
                                </div>

                                {/* ACTIVE JOBS LIST */}
                                <div className={`rounded-3xl backdrop-blur-2xl border overflow-hidden transition-all duration-500 ${darkMode ? "bg-white/10 border-white/20" : "bg-white/80 border-gray-200"}`}>
                                    <div className={`p-6 border-b flex justify-between items-center ${darkMode ? "border-white/20" : "border-gray-200"}`}>
                                        <h2 className={`text-lg font-bold ${darkMode ? "text-white" : "text-gray-900"}`}>Posted Listings</h2>
                                    </div>

                                    {jobs.length === 0 ? (
                                        <div className="p-10 text-center opacity-70 italic text-gray-500">You haven't posted any jobs yet.</div>
                                    ) : (
                                        jobs.map((job) => {
                                            const jobApps = applications.filter(a => a.job_id === job.job_id);
                                            const jobPendingCount = jobApps.filter(a => a.status === 'pending').length;
                                            const isExpanded = expandedJobId === job.job_id;

                                            return (
                                                <div key={job.id} className={`border-b last:border-0 transition-all ${darkMode ? "border-white/10" : "border-gray-100"}`}>
                                                    <div 
                                                        onClick={() => setExpandedJobId(isExpanded ? null : job.job_id)}
                                                        className={`p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer transition-all ${darkMode ? "hover:bg-white/5" : "hover:bg-gray-50 bg-white"}`}
                                                    >
                                                        <div>
                                                            <div className="flex items-center gap-3">
                                                                <h3 className={`font-bold text-lg ${darkMode ? "text-white" : "text-gray-900"}`}>{job.job_title}</h3>
                                                                {jobPendingCount > 0 && (
                                                                    <span className="px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full">{jobPendingCount} New</span>
                                                                )}
                                                            </div>
                                                            <p className={`text-sm mt-1 flex items-center gap-1 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                                                                <MapPin size={14} /> {job.area || "Location"} • ₹{job.salary_per_day}/day
                                                            </p>
                                                            <div className="flex gap-2 mt-3">
                                                                <span className="px-3 py-1 bg-emerald-500/20 text-emerald-500 text-xs font-bold rounded-full border border-emerald-500/30">Active</span>
                                                                <span className={`px-3 py-1 text-xs font-bold rounded-full border ${darkMode ? "bg-white/5 border-white/10 text-gray-300" : "bg-gray-100 border-gray-200 text-gray-600"}`}>{job.shift_type}</span>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-3">
                                                            <button onClick={(e) => { e.stopPropagation(); navigate(`/jobs/${job.job_id}`); }} className="px-4 py-2 rounded-xl font-bold bg-gray-500/10 hover:bg-gray-500/20 text-emerald-600 dark:text-emerald-400 transition-colors flex items-center gap-2">
                                                                <ExternalLink size={16} /> View Listing
                                                            </button>
                                                            <div className={`p-2 rounded-full transition-transform duration-300 ${isExpanded ? "rotate-90" : ""} ${darkMode ? "bg-white/5 text-gray-400" : "bg-gray-100 text-gray-600"}`}>
                                                                <ChevronRight size={20} />
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Nested Applicants Accordion */}
                                                    <AnimatePresence>
                                                        {isExpanded && (
                                                            <motion.div
                                                                initial={{ height: 0, opacity: 0 }}
                                                                animate={{ height: "auto", opacity: 1 }}
                                                                exit={{ height: 0, opacity: 0 }}
                                                                className={`overflow-hidden ${darkMode ? "bg-black/20 border-t border-white/5" : "bg-gray-50 border-t border-gray-100"}`}
                                                            >
                                                                <div className="p-6">
                                                                    <h4 className={`text-xs font-bold uppercase tracking-widest mb-4 flex items-center gap-2 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                                                                        <Users size={14} /> Applicants for this role ({jobApps.length})
                                                                    </h4>
                                                                    
                                                                    {jobApps.length === 0 ? (
                                                                        <div className={`p-6 text-center rounded-2xl border border-dashed ${darkMode ? "border-white/10 text-gray-400" : "border-gray-200 text-gray-500"}`}>
                                                                            <p className="italic font-medium">No students have applied for this position yet.</p>
                                                                        </div>
                                                                    ) : (
                                                                        <div className="space-y-3">
                                                                            {jobApps.sort((a, b) => new Date(b.applied_at) - new Date(a.applied_at)).map((app) => (
                                                                                <div key={app.id} className={`p-4 rounded-2xl border flex flex-col sm:flex-row justify-between sm:items-center gap-4 transition-all ${darkMode ? "bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/10" : "bg-white border-gray-200 shadow-sm hover:border-emerald-500/30 hover:shadow-md"}`}>
                                                                                    <div className="flex items-center gap-4">
                                                                                        <div className={`p-3 rounded-full ${app.status === 'pending' ? "bg-emerald-500/20 text-emerald-500" : app.status === 'accepted' ? "bg-blue-500/20 text-blue-500" : "bg-red-500/20 text-red-500"}`}>
                                                                                            <User size={20} />
                                                                                        </div>
                                                                                        <div>
                                                                                            <h3 className={`font-bold ${darkMode ? "text-white" : "text-gray-900"}`}>{app.student_name}</h3>
                                                                                            <p className={`text-xs font-bold uppercase tracking-wide mt-1 ${app.status === 'pending' ? (darkMode ? "text-gray-400" : "text-gray-500") : app.status === 'accepted' ? "text-emerald-500" : "text-red-500"}`}>
                                                                                                Status: {app.status}
                                                                                            </p>
                                                                                        </div>
                                                                                    </div>
                                                                                    <button
                                                                                        onClick={() => setSelectedApp(app)}
                                                                                        className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors ${darkMode ? "bg-white/10 hover:bg-white/20 text-white" : "bg-emerald-50 hover:bg-emerald-100 text-emerald-700"}`}
                                                                                    >
                                                                                        View Details <ChevronRight size={16} />
                                                                                    </button>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </motion.div>
                                                        )}
                                                    </AnimatePresence>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        )}

                        {activeTab === 'profile' && (
                            <div className="max-w-3xl">
                                <form onSubmit={saveProfile} className={`p-8 rounded-3xl border ${darkMode ? "bg-white/10 border-white/20" : "bg-white border-gray-200"}`}>
                                    <div className="mb-8">
                                        <h2 className={`text-2xl font-bold mb-2 ${darkMode ? "text-white" : "text-gray-900"}`}>Public Shop Profile</h2>
                                        <p className={`${darkMode ? "text-gray-400" : "text-gray-500"}`}>This information will be visible to students applying to your jobs.</p>
                                    </div>

                                    <div className="space-y-6">
                                        <div>
                                            <label className={`block mb-2 font-bold ${darkMode ? "text-gray-300" : "text-gray-700"}`}>Shop Description</label>
                                            <textarea
                                                name="description"
                                                value={profile.description}
                                                onChange={handleProfileChange}
                                                placeholder="Tell students what your shop does and what you expect..."
                                                rows={4}
                                                className={`w-full px-4 py-3 rounded-xl border focus:outline-none transition-colors ${darkMode ? "bg-gray-800/50 border-gray-700 text-white focus:border-emerald-500" : "bg-gray-50 border-gray-200 text-gray-900 focus:border-emerald-500"}`}
                                            />
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <label className={`block mb-2 font-bold flex items-center gap-2 ${darkMode ? "text-gray-300" : "text-gray-700"}`}><LinkIcon size={16} /> Website</label>
                                                <input
                                                    name="website"
                                                    value={profile.website}
                                                    onChange={handleProfileChange}
                                                    type="url"
                                                    placeholder="https://"
                                                    className={`w-full px-4 py-3 rounded-xl border focus:outline-none transition-colors ${darkMode ? "bg-gray-800/50 border-gray-700 text-white focus:border-emerald-500" : "bg-gray-50 border-gray-200 text-gray-900 focus:border-emerald-500"}`}
                                                />
                                            </div>
                                            <div>
                                                <label className={`block mb-2 font-bold flex items-center gap-2 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>📸 Instagram URL</label>
                                                <input
                                                    name="instagram"
                                                    value={profile.instagram}
                                                    onChange={handleProfileChange}
                                                    type="url"
                                                    placeholder="https://instagram.com/..."
                                                    className={`w-full px-4 py-3 rounded-xl border focus:outline-none transition-colors ${darkMode ? "bg-gray-800/50 border-gray-700 text-white focus:border-emerald-500" : "bg-gray-50 border-gray-200 text-gray-900 focus:border-emerald-500"}`}
                                                />
                                            </div>
                                        </div>

                                        <button disabled={saving} type="submit" className="w-full mt-8 py-4 rounded-xl font-bold text-white bg-olive-600 hover:bg-olive-700 shadow-lg shadow-olive-600/30 transition-all flex justify-center items-center gap-2">
                                            {saving ? "Saving..." : <><Edit3 size={18} /> Update Public Profile</>}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        )}
                    </motion.div>
                </AnimatePresence>

            </div>

            {/* Application Details Modal */}
            <AnimatePresence>
                {selectedApp && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                            onClick={() => setSelectedApp(null)}
                        />
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            className={`relative w-full max-w-lg overflow-hidden rounded-3xl shadow-2xl border ${darkMode ? "bg-slate-900 border-white/10" : "bg-white border-gray-200"}`}
                        >
                            <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-white/10">
                                <h3 className={`text-xl font-bold flex items-center gap-2 ${darkMode ? "text-white" : "text-gray-900"}`}>
                                    <User className="text-emerald-500" /> {selectedApp.student_name}'s Application
                                </h3>
                                <button onClick={() => setSelectedApp(null)} className={`p-2 rounded-full transition-colors ${darkMode ? "text-gray-400 hover:bg-white/10" : "text-gray-500 hover:bg-gray-100"}`}>
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="p-6 space-y-6">
                                <div className={`px-4 py-3 rounded-xl border text-sm flex justify-between items-center ${darkMode ? "bg-white/5 border-white/10" : "bg-gray-50 border-gray-200"}`}>
                                    <span className={`${darkMode ? "text-gray-400" : "text-gray-500"}`}>Applied Role</span>
                                    <strong className={`${darkMode ? "text-emerald-400" : "text-emerald-600"}`}>{selectedApp.job_title}</strong>
                                </div>

                                <div className={`space-y-4 text-sm ${darkMode ? "text-gray-300" : "text-gray-600"}`}>
                                    <div className="flex justify-between items-center pb-2 border-b border-gray-200 dark:border-white/10">
                                        <span className={darkMode ? "text-gray-400" : "text-gray-500"}>Age</span>
                                        <span className="font-semibold">{selectedApp.student_age ? `${selectedApp.student_age} years old` : 'Not provided'}</span>
                                    </div>
                                    <div className="flex justify-between items-center pb-2 border-b border-gray-200 dark:border-white/10">
                                        <span className={darkMode ? "text-gray-400" : "text-gray-500"}>College</span>
                                        <span className="font-semibold text-right">{selectedApp.student_college || 'Not provided'}<br />{selectedApp.student_reg_no && <span className="text-xs opacity-70">Reg: {selectedApp.student_reg_no}</span>}</span>
                                    </div>

                                    {selectedApp.student_skills && selectedApp.student_skills.length > 0 && (
                                        <div className="pt-2">
                                            <span className={`block mb-2 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>Relevant Skills</span>
                                            <div className="flex flex-wrap gap-2 mt-2">
                                                {selectedApp.student_skills.map(skill => (
                                                    <span key={skill} className={`text-xs font-bold px-3 py-1.5 rounded-lg border ${darkMode ? "bg-slate-800 border-slate-700 text-emerald-400" : "bg-emerald-50 border-emerald-100 text-emerald-700"}`}>
                                                        {skill}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {selectedApp.status === 'accepted' ? (
                                    <div className="space-y-3 text-sm bg-emerald-500/10 p-5 rounded-2xl border border-emerald-500/20">
                                        <p className="font-bold text-emerald-800 dark:text-emerald-400 border-b border-emerald-500/20 pb-2 flex items-center gap-2">
                                            <CheckCircle size={16} /> Contact Details Unlocked
                                        </p>
                                        <div className="space-y-2 mt-3">
                                            <div className="text-emerald-900 dark:text-emerald-100 flex items-center gap-3 font-medium">
                                                <div className="bg-emerald-500/20 p-2 rounded-lg text-emerald-600 dark:text-emerald-400"><Phone size={16} /></div>
                                                <span>{selectedApp.student_phone || selectedApp.student_contact}</span>
                                            </div>
                                            <div className="text-emerald-900 dark:text-emerald-100 flex items-center gap-3 font-medium">
                                                <div className="bg-emerald-500/20 p-2 rounded-lg text-emerald-600 dark:text-emerald-400"><Mail size={16} /></div>
                                                <span>{selectedApp.student_email || 'No email provided'}</span>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className={`space-y-2 text-sm bg-gray-500/10 p-5 rounded-2xl border flex flex-col items-center justify-center text-center ${darkMode ? "border-gray-700" : "border-gray-200"}`}>
                                        <div className={`p-3 rounded-full mb-2 ${darkMode ? "bg-gray-800 text-gray-400" : "bg-gray-200 text-gray-500"}`}>
                                            <Lock size={24} />
                                        </div>
                                        <p className={`font-bold text-lg ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                                            Contact Details Locked
                                        </p>
                                        <p className={`${darkMode ? "text-gray-500" : "text-gray-500"}`}>
                                            Accept this application to view the student's phone number and email address.
                                        </p>
                                    </div>
                                )}
                            </div>

                            <div className={`p-6 border-t ${darkMode ? "bg-white/5 border-white/10" : "bg-gray-50 border-gray-200"}`}>
                                <div className="flex items-center gap-3">
                                    {selectedApp.status === 'pending' && (
                                        <>
                                            <button onClick={() => { handleAppStatus(selectedApp.id, 'rejected'); }} className={`flex-1 px-6 py-3 rounded-xl border font-bold transition-all flex justify-center items-center gap-2 ${darkMode ? "border-gray-600 text-gray-300 hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/50" : "border-gray-300 text-gray-700 hover:bg-red-50 hover:text-red-600 hover:border-red-200"}`}>
                                                Reject Application
                                            </button>
                                            <button onClick={() => { handleAppStatus(selectedApp.id, 'accepted'); }} className="flex-1 px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold transition-all shadow-xl shadow-emerald-500/20 flex justify-center items-center gap-2">
                                                <CheckCircle size={18} /> Accept Applicant
                                            </button>
                                        </>
                                    )}
                                    {selectedApp.status === 'accepted' && (
                                        <div className="w-full text-center px-4 py-3 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold rounded-xl border border-emerald-500/30 flex justify-center items-center gap-2">
                                            <CheckCircle size={18} /> Application Approved
                                        </div>
                                    )}
                                    {selectedApp.status === 'rejected' && (
                                        <div className="w-full text-center px-4 py-3 bg-red-500/10 text-red-500 font-bold rounded-xl border border-red-500/20 flex justify-center items-center gap-2">
                                            <XCircle size={18} /> Application Rejected
                                        </div>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

/* --- HELPER COMPONENTS --- */

const TabButton = ({ active, onClick, icon, label, darkMode }) => {
    return (
        <button
            onClick={onClick}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all whitespace-nowrap
                ${active
                    ? `bg-emerald-500 text-white shadow-lg`
                    : `${darkMode ? "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white" : "bg-white text-gray-600 hover:bg-gray-100 hover:text-gray-900"}`
                }
            `}
        >
            {icon} {label}
        </button>
    );
};

const StatCard = ({ icon, label, value, darkMode, highlight = false }) => {
    return (
        <div className={`p-6 rounded-3xl border flex items-center gap-5 transition-all ${darkMode ? "bg-white/10 border-white/20" : "bg-white border-gray-200 shadow-sm"}`}>
            <div className={`p-4 rounded-2xl ${highlight ? "bg-red-500 text-white" : "bg-emerald-500/20 text-emerald-500"}`}>
                {icon}
            </div>
            <div>
                <p className={`text-sm font-bold mb-1 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>{label}</p>
                <h3 className={`text-3xl font-black ${darkMode ? "text-white" : "text-gray-900"}`}>{value}</h3>
            </div>
        </div>
    );
};

export default RetailerDashboard;