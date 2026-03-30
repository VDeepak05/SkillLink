import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { MapPin, Clock, Calendar, IndianRupee, Briefcase, ArrowLeft, CheckCircle, AlertCircle, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import API_BASE_URL from '../api';

const JobDetails = () => {
    const { id } = useParams();
    const { user } = useAuth();
    const [job, setJob] = useState(null);
    const [loading, setLoading] = useState(true);
    const [applying, setApplying] = useState(false);
    const [applied, setApplied] = useState(false);
    const [saved, setSaved] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
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
        const fetchJobData = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/jobs/${id}`);
                const data = await res.json();
                const jobDetails = {
                    id: data.id,
                    job_id: data.job_id,
                    title: data.job_title,
                    shopName: data.shop_name || data.shop_type,
                    description: data.description || 'We are looking for a reliable student to handle billing and customer service.',
                    shopType: data.shop_type,
                    location: data.area || "Palakkad",
                    shift: data.shift_type,
                    days: data.is_seasonal ? 'Seasonal' : 'Mon-Fri',
                    salary: data.salary_per_day,
                    openings: data.openings || 1,
                    skills: data.skills && data.skills.length > 0 ? data.skills : [],
                    posted: 'Recently',
                    applicantCount: data.applicant_count || 0
                };
                setJob(jobDetails);

                // Check application and wishlist status if user is student
                if (user && user.role === 'student') {
                    // Check application
                    const statusRes = await fetch(`${API_BASE_URL}/jobs/${data.job_id}/status/${user.id}`);
                    if (statusRes.ok) {
                        const statusData = await statusRes.json();
                        setApplied(statusData.applied);
                    }

                    // Check wishlist
                    const wishlistRes = await fetch(`${API_BASE_URL}/student/wishlist/${user.id}`);
                    if (wishlistRes.ok) {
                        const wishlistData = await wishlistRes.json();
                        const isSaved = wishlistData.wishlist.some(j => j.job_id === data.job_id || j.id === data.id);
                        setSaved(isSaved);
                    }
                }
            } catch (err) {
                console.error("Failed to fetch job info:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchJobData();
    }, [id, user]);

    const handleToggleWishlist = async () => {
        if (!user || user.role !== 'student') {
            alert("Please log in as a student to save jobs.");
            return;
        }

        try {
            const res = await fetch(`${API_BASE_URL}/student/wishlist/toggle`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    student_id: user.id,
                    job_id: job.job_id
                })
            });

            if (res.ok) {
                const data = await res.json();
                setSaved(data.action === 'added');
            } else {
                alert("Failed to update wishlist");
            }
        } catch (error) {
            console.error("Wishlist error:", error);
        }
    };

    const initiateApplication = () => {
        if (!user || user.role !== 'student') {
            alert("Only registered students can apply for jobs.");
            return;
        }
        setShowConfirmModal(true);
    };

    const handleApply = async () => {
        setShowConfirmModal(false);
        setApplying(true);
        try {
            // Log interaction
            fetch(`${API_BASE_URL}/log-interaction`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    student_id: user.id,
                    job_id: job.job_id,
                    event_type: "apply"
                })
            }).catch(console.error);

            // Submit real application
            const res = await fetch(`${API_BASE_URL}/jobs/apply`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    job_id: job.job_id,
                    retailer_id: user.id // Using this field as student_id because of the backend schema alias
                })
            });

            if (res.ok) {
                setApplied(true);
            } else {
                const errorData = await res.json();
                alert(errorData.detail || "Failed to apply");
            }

        } catch (error) {
            console.error("Failed to apply:", error);
            alert("Network error.");
        }
        setApplying(false);
    };

    if (loading) {
        return (
            <div className={`min-h-screen flex flex-col items-center justify-center gap-4 ${darkMode ? "dark-animated-gradient text-emerald-400" : "bg-white text-gray-500"}`}>
                <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="font-bold text-lg">Loading job details...</p>
            </div>
        );
    }
    if (!job) return <div className={`min-h-screen flex items-center justify-center font-bold text-xl ${darkMode ? "dark-animated-gradient text-red-400" : "bg-white text-red-500"}`}>Job not found.</div>;


    return (
        <div className={`min-h-[90vh] transition-all duration-700 py-8 ${darkMode ? "dark-animated-gradient" : "bg-gradient-to-br from-emerald-50 via-white to-green-100"}`}>
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative">
                <AnimatePresence>
                    {showConfirmModal && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                        >
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.9, opacity: 0 }}
                                className={`rounded-3xl p-8 max-w-md w-full shadow-2xl relative border ${darkMode ? "bg-slate-900 border-white/10" : "bg-white border-gray-100"}`}
                            >
                                <button
                                    onClick={() => setShowConfirmModal(false)}
                                    className={`absolute top-4 right-4 transition-colors ${darkMode ? "text-gray-500 hover:text-gray-300" : "text-gray-400 hover:text-gray-600"}`}
                                >
                                    <X size={24} />
                                </button>

                                <div className="flex flex-col items-center text-center">
                                    <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-6 shadow-inner ${darkMode ? "bg-emerald-500/20 text-emerald-400" : "bg-emerald-50 text-emerald-600"}`}>
                                        <AlertCircle size={32} />
                                    </div>
                                    <h3 className={`text-2xl font-bold mb-2 ${darkMode ? "text-white" : "text-gray-900"}`}>Confirm Application</h3>
                                    <p className={`mb-8 ${darkMode ? "text-gray-300" : "text-gray-600"}`}>
                                        Are you sure you want to apply for the <span className={`font-bold ${darkMode ? "text-emerald-400" : "text-emerald-600"}`}>{job.title}</span> position? Your profile matching these skills will be sent to the retailer.
                                    </p>

                                    <div className="flex gap-4 w-full">
                                        <button
                                            onClick={() => setShowConfirmModal(false)}
                                            className={`flex-1 py-3 px-4 rounded-xl font-bold transition-colors border ${darkMode ? "bg-white/5 border-white/10 text-gray-300 hover:bg-white/10" : "text-gray-600 bg-gray-100 hover:bg-gray-200 border-gray-200"}`}
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleApply}
                                            className={`flex-1 py-3 px-4 rounded-xl font-bold text-white transition-colors shadow-lg ${darkMode ? "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/50" : "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/30"}`}
                                        >
                                            Yes, Apply
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <Link to="/jobs" className={`inline-flex items-center mb-6 transition-colors font-medium ${darkMode ? "text-gray-400 hover:text-emerald-400" : "text-gray-500 hover:text-emerald-600"}`}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Jobs
                </Link>

                <div className={`rounded-3xl shadow-2xl border overflow-hidden relative z-10 backdrop-blur-xl transition-all duration-500 ${darkMode ? "bg-white/5 border-white/20" : "bg-white border-gray-100"}`}>
                    {/* Header */}
                    <div className={`p-8 text-white ${darkMode ? "bg-emerald-900/60 border-b border-emerald-500/20" : "bg-gradient-to-r from-emerald-600 to-green-700"}`}>
                        <div className="flex justify-between items-start">
                            <div>
                                <h1 className="capitalize text-3xl font-bold mb-2">{job.title}</h1>
                                <p className={`capitalize ${darkMode ? "text-emerald-100" : "text-emerald-100"} text-lg flex items-center gap-2 font-medium`}>
                                    <Briefcase className="h-5 w-5" />
                                    {job.shopName}
                                </p>
                            </div>
                            <span className="bg-white/20 backdrop-blur-sm px-4 py-1.5 rounded-full text-sm font-semibold border border-white/30 flex items-center gap-2">
                                <CheckCircle className="h-4 w-4" />
                                Verified Retailer
                            </span>
                        </div>
                    </div>

                    <div className="p-8">
                        {/* Key Info Grid */}
                        <div className={`grid grid-cols-2 md:grid-cols-4 gap-6 mb-8 border-b pb-8 ${darkMode ? "border-white/10" : "border-gray-200"}`}>
                            <div className={`p-4 rounded-xl ${darkMode ? "bg-white/5" : "bg-gray-50"}`}>
                                <p className="text-xs text-gray-500 uppercase tracking-wide font-bold mb-1">Salary</p>
                                <p className={`font-bold flex items-center gap-1 text-lg ${darkMode ? "text-white" : "text-gray-900"}`}>
                                    <IndianRupee className={`h-5 w-5 ${darkMode ? "text-emerald-400" : "text-emerald-600"}`} />
                                    {job.salary}/day
                                </p>
                            </div>
                            <div className={`p-4 rounded-xl ${darkMode ? "bg-white/5" : "bg-gray-50"}`}>
                                <p className="text-xs text-gray-500 uppercase tracking-wide font-bold mb-1">Location</p>
                                <p className={`font-bold flex items-center gap-1 text-lg ${darkMode ? "text-white" : "text-gray-900"}`}>
                                    <MapPin className={`h-5 w-5 ${darkMode ? "text-emerald-400" : "text-gray-400"}`} />
                                    {job.location}
                                </p>
                            </div>
                            <div className={`p-4 rounded-xl ${darkMode ? "bg-white/5" : "bg-gray-50"}`}>
                                <p className="text-xs text-gray-500 uppercase tracking-wide font-bold mb-1">Shift</p>
                                <p className={`capitalize font-bold flex items-center gap-1 text-lg ${darkMode ? "text-white" : "text-gray-900"}`}>
                                    <Clock className={`h-5 w-5 ${darkMode ? "text-emerald-400" : "text-gray-400"}`} />
                                    {job.shift}
                                </p>
                            </div>
                            <div className={`p-4 rounded-xl ${darkMode ? "bg-white/5" : "bg-gray-50"}`}>
                                <p className="text-xs text-gray-500 uppercase tracking-wide font-bold mb-1">Working Days</p>
                                <p className={`font-bold flex items-center gap-1 text-lg ${darkMode ? "text-white" : "text-gray-900"}`}>
                                    <Calendar className={`h-5 w-5 ${darkMode ? "text-emerald-400" : "text-gray-400"}`} />
                                    {job.days}
                                </p>
                            </div>
                        </div>

                        <div className="grid md:grid-cols-3 gap-8">
                            <div className="md:col-span-2 space-y-8">
                                <section>
                                    <h3 className={`text-xl font-bold mb-4 ${darkMode ? "text-white" : "text-gray-900"}`}>Job Description</h3>
                                    <p className={`leading-relaxed text-lg ${darkMode ? "text-gray-300" : "text-gray-700"}`}>{job.description}</p>
                                </section>

                                {job.skills && job.skills.length > 0 && (
                                    <section>
                                        <h3 className={`text-xl font-bold mb-4 ${darkMode ? "text-white" : "text-gray-900"}`}>Requirements</h3>
                                        <div className="flex flex-wrap gap-2">
                                            {job.skills.map(skill => (
                                                <span key={skill} className={`px-4 py-2 rounded-lg text-sm font-bold border ${darkMode ? "bg-slate-800/80 text-emerald-400 border-emerald-500/20" : "bg-emerald-50 text-emerald-800 border-emerald-100"}`}>
                                                    {skill}
                                                </span>
                                            ))}
                                        </div>
                                    </section>
                                )}
                            </div>

                            <div className="md:col-span-1">
                                <div className={`rounded-2xl p-6 border sticky top-24 shadow-sm ${darkMode ? "bg-white/5 border-white/10" : "bg-gray-50 border-gray-200"}`}>
                                    <h3 className={`font-bold mb-4 text-lg ${darkMode ? "text-white" : "text-gray-900"}`}>Ready to Apply?</h3>
                                    {(!user || user.role === 'student') ? (
                                        <>
                                            <button
                                                onClick={initiateApplication}
                                                disabled={applied || applying}
                                                className={`w-full text-white py-3.5 rounded-xl font-bold transition-all shadow-lg mb-3 hover:translate-y-[-2px] ${applied ? (darkMode ? "bg-slate-700 cursor-not-allowed text-gray-400" : "bg-gray-400 cursor-not-allowed") : (darkMode ? "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/50" : "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20")
                                                    }`}
                                            >
                                                {applied ? "Applied Successfully ✓" : (applying ? "Applying..." : "Apply Now")}
                                            </button>
                                            <button
                                                onClick={handleToggleWishlist}
                                                className={`w-full py-3.5 rounded-xl font-bold border transition-colors ${saved
                                                    ? (darkMode ? "bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20" : "bg-red-50 text-red-600 border-red-100 hover:bg-red-100")
                                                    : (darkMode ? "bg-white/5 text-gray-300 border-white/10 hover:bg-white/10 hover:text-white" : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50")
                                                    }`}
                                            >
                                                {saved ? "Saved to Wishlist" : "Save for Later"}
                                            </button>
                                            {job.applicantCount > 0 && (
                                                <p className={`text-xs text-center mt-4 font-medium ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                                                    {job.applicantCount} {job.applicantCount === 1 ? 'student has' : 'students have'} applied
                                                </p>
                                            )}
                                        </>
                                    ) : (
                                        <div className={`w-full py-3.5 rounded-xl font-bold text-center border ${darkMode ? "bg-white/5 text-gray-500 border-white/10" : "bg-gray-200 text-gray-500 border-gray-300"}`}>
                                            Retailers Cannot Apply
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default JobDetails;
