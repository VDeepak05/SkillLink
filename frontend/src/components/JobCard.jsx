import React, { useState } from 'react';
import { MapPin, Clock, Calendar, IndianRupee, Heart, CheckCircle, AlertCircle, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import API_BASE_URL from '../api';

const JobCard = ({ job, isApplied = false, isSaved = false, darkMode = true }) => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [applied, setApplied] = useState(isApplied);
    const [saved, setSaved] = useState(isSaved);
    const [error, setError] = useState("");
    const [showConfirmModal, setShowConfirmModal] = useState(false);

    React.useEffect(() => {
        setApplied(isApplied);
    }, [isApplied]);

    React.useEffect(() => {
        setSaved(isSaved);
    }, [isSaved]);

    const handleToggleWishlist = async (e) => {
        e.preventDefault(); // Prevent navigation if within a Link
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
                    job_id: job.job_id || job.id
                })
            });

            if (res.ok) {
                const data = await res.json();
                setSaved(data.action === 'added');
            }
        } catch (error) {
            console.error("Wishlist error:", error);
        }
    };

    const initiateApplication = (e) => {
        e.preventDefault();
        if (!user) {
            alert("Please log in to apply for jobs.");
            return;
        }

        if (user.role !== 'student') {
            alert("Only students can apply for jobs.");
            return;
        }
        setShowConfirmModal(true);
    };

    const handleApply = async () => {
        setShowConfirmModal(false);
        setLoading(true);
        setError("");

        try {
            const payload = {
                job_id: job.job_id || job.id,
                retailer_id: user.id
            };

            const response = await fetch(`${API_BASE_URL}/jobs/apply`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (response.ok) {
                setApplied(true);
            } else {
                alert(data.detail || "Failed to apply");
            }
        } catch (err) {
            console.error("Apply error:", err);
            setError("Network error. Please try again.");
            alert("Network error. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={`${darkMode ? "bg-white/10 border-white/10 hover:bg-white/15" : "bg-white border-gray-300 hover:shadow-xl"} rounded-2xl shadow-sm border backdrop-blur-md transition-all p-5 flex flex-col h-full group duration-300`}>
            <div className="flex justify-between items-start mb-3">
                <div>
                    <h3 className={`capitalize text-lg font-bold line-clamp-1 transition-colors ${darkMode ? "text-white group-hover:text-emerald-400" : "text-gray-900 group-hover:text-emerald-600"}`}>{job.title}</h3>
                    <p className={`capitalize text-sm font-medium ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                        {job.shopName === job.shopType ? job.shopType : `${job.shopName} • ${job.shopType}`}
                    </p>
                </div>
                <button
                    onClick={handleToggleWishlist}
                    className={`transition-all p-2 rounded-full ${saved
                        ? "text-red-500 bg-red-500/10 shadow-lg shadow-red-500/10"
                        : `${darkMode ? "text-gray-500 bg-white/5 hover:text-red-400" : "text-gray-400 bg-gray-50 hover:text-red-500"} hover:bg-red-500/10`
                        }`}
                >
                    <Heart className={`h-5 w-5 ${saved ? "fill-current" : ""}`} />
                </button>
            </div>

            <div className="space-y-3 mb-6 flex-grow">
                <div className={`flex items-center text-sm gap-3 ${darkMode ? "text-gray-300" : "text-gray-700 font-medium"}`}>
                    <div className={`p-1.5 rounded-lg border ${darkMode ? "bg-white/5 text-emerald-400 border-transparent" : "bg-emerald-50 border-emerald-200 text-emerald-800"}`}>
                        <MapPin className="h-4 w-4" />
                    </div>
                    <span>{job.location} ({job.distance} km)</span>
                </div>
                <div className={`flex items-center text-sm gap-3 ${darkMode ? "text-gray-300" : "text-gray-700 font-medium"}`}>
                    <div className={`p-1.5 rounded-lg border ${darkMode ? "bg-white/5 text-emerald-400 border-transparent" : "bg-emerald-50 border-emerald-200 text-emerald-800"}`}>
                        <Clock className="h-4 w-4" />
                    </div>
                    <span className="capitalize">{job.shift} Shift</span>
                </div>
                <div className={`flex items-center text-sm gap-3 ${darkMode ? "text-gray-300" : "text-gray-700 font-medium"}`}>
                    <div className={`p-1.5 rounded-lg border ${darkMode ? "bg-white/5 text-emerald-400 border-transparent" : "bg-emerald-50 border-emerald-200 text-emerald-800"}`}>
                        <Calendar className="h-4 w-4" />
                    </div>
                    <span>{job.days}</span>
                </div>
                <div className={`flex items-center text-sm gap-3 font-bold ${darkMode ? "text-emerald-400" : "text-emerald-800"}`}>
                    <div className={`p-1.5 rounded-lg border ${darkMode ? "bg-emerald-500/20 border-transparent" : "bg-emerald-100 border-emerald-300 text-emerald-800"}`}>
                        <IndianRupee className="h-4 w-4" />
                    </div>
                    <span>{job.salary}/day</span>
                </div>
            </div>

            <div className="flex gap-3 mt-auto">
                <Link
                    to={`/jobs/${job.id}`}
                    className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold text-center transition-all border
                        ${darkMode
                            ? "bg-white/5 text-white border-white/10 hover:bg-white/10"
                            : "bg-gray-50 text-gray-700 border-gray-200 hover:border-gray-300 hover:bg-gray-100"
                        }`}
                >
                    View Details
                </Link>
                <button
                    onClick={initiateApplication}
                    disabled={applied || loading || (user && user.role !== 'student')}
                    className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold transition-all shadow-xl flex items-center justify-center gap-2
                        ${applied
                            ? "bg-emerald-500/20 text-emerald-400 cursor-default shadow-none border border-emerald-500/30"
                            : loading
                                ? "bg-emerald-400 text-white cursor-wait"
                                : (user && user.role !== 'student')
                                    ? "bg-gray-200 text-gray-500 cursor-not-allowed shadow-none"
                                    : "bg-emerald-500 text-white hover:bg-emerald-600 shadow-emerald-500/20 hover:shadow-emerald-500/30"
                        }`}
                >
                    {applied ? (
                        <>
                            <CheckCircle className="h-4 w-4" />
                            Applied
                        </>
                    ) : loading ? (
                        "Applying..."
                    ) : (
                        "Apply Now"
                    )}
                </button>
            </div>

            <AnimatePresence>
                {showConfirmModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                        onClick={(e) => {
                            // strictly prevent bubbling to avoid weird navigations
                            e.preventDefault();
                            e.stopPropagation();
                        }}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className={`rounded-3xl p-6 max-w-sm w-full shadow-2xl relative border ${darkMode ? 'bg-[#1e293b] border-white/10' : 'bg-white border-gray-200'}`}
                        >
                            <button
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowConfirmModal(false); }}
                                className={`absolute top-4 right-4 transition-colors ${darkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-400 hover:text-gray-600'}`}
                            >
                                <X size={24} />
                            </button>

                            <div className="flex flex-col items-center flex-wrap text-center overflow-hidden">
                                <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-4 ${darkMode ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-50 text-emerald-600'}`}>
                                    <AlertCircle size={28} />
                                </div>
                                <h3 className={`text-xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Confirm Application</h3>
                                <p className={`mb-6 text-sm flex-wrap w-full word-break ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                    Apply for <span className="font-bold">{job.title}</span> at {job.shopName}?
                                </p>

                                <div className="flex gap-3 w-full">
                                    <button
                                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowConfirmModal(false); }}
                                        className={`flex-1 py-2.5 px-4 rounded-xl font-bold transition-colors ${darkMode ? 'bg-white/5 hover:bg-white/10 text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'}`}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleApply(); }}
                                        className="flex-1 py-2.5 px-4 rounded-xl font-bold text-white bg-emerald-500 hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-500/30"
                                    >
                                        Confirm
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default JobCard;
