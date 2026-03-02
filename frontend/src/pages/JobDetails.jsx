import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { MapPin, Clock, Calendar, DollarSign, Briefcase, ArrowLeft, CheckCircle, AlertCircle, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';

const JobDetails = () => {
    const { id } = useParams();
    const { user } = useAuth();
    const [job, setJob] = useState(null);
    const [loading, setLoading] = useState(true);
    const [applying, setApplying] = useState(false);
    const [applied, setApplied] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);

    useEffect(() => {
        fetch(`http://localhost:8000/jobs/${id}`)
            .then(res => res.json())
            .then(data => {
                setJob({
                    id: data.id,
                    job_id: data.job_id,
                    title: data.job_title,
                    shopName: data.shop_name || "Retail Shop",
                    description: data.description || 'We are looking for a reliable student to handle billing and customer service.',
                    shopType: data.shop_type,
                    location: data.area || "Palakkad",
                    shift: data.shift_type,
                    days: data.is_seasonal ? 'Seasonal' : 'Mon-Fri',
                    salary: data.salary_per_day,
                    openings: data.openings || 1,
                    skills: ['Basic Math', 'Communication', 'Punctuality'],
                    posted: 'Recently'
                });
                setLoading(false);
            })
            .catch(err => {
                console.error("Failed to fetch job:", err);
                setLoading(false);
            });
    }, [id]);

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
            fetch('http://localhost:8000/log-interaction', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    student_id: user.id,
                    job_id: job.job_id,
                    event_type: "apply"
                })
            }).catch(console.error);

            // Submit real application
            const res = await fetch('http://localhost:8000/jobs/apply', {
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

    if (loading) return <div className="text-center py-20 font-bold text-gray-500">Loading job details...</div>;
    if (!job) return <div className="text-center py-20 font-bold text-red-500">Job not found.</div>;


    return (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative">
            <AnimatePresence>
                {showConfirmModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl relative"
                        >
                            <button
                                onClick={() => setShowConfirmModal(false)}
                                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                <X size={24} />
                            </button>

                            <div className="flex flex-col items-center text-center">
                                <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mb-6">
                                    <AlertCircle size={32} />
                                </div>
                                <h3 className="text-2xl font-bold text-gray-900 mb-2">Confirm Application</h3>
                                <p className="text-gray-600 mb-8">
                                    Are you sure you want to apply for the <span className="font-bold text-gray-900">{job.title}</span> position? Your profile matching these skills will be sent to the retailer.
                                </p>

                                <div className="flex gap-4 w-full">
                                    <button
                                        onClick={() => setShowConfirmModal(false)}
                                        className="flex-1 py-3 px-4 rounded-xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors border border-gray-200"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleApply}
                                        className="flex-1 py-3 px-4 rounded-xl font-bold text-white bg-olive-600 hover:bg-olive-700 transition-colors shadow-lg shadow-olive-600/30"
                                    >
                                        Yes, Apply
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <Link to="/jobs" className="inline-flex items-center text-gray-500 hover:text-olive-600 mb-6 transition-colors font-medium">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Jobs
            </Link>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden relative z-10">
                {/* Header */}
                <div className="bg-gradient-to-r from-olive-600 to-green-700 p-8 text-white">
                    <div className="flex justify-between items-start">
                        <div>
                            <h1 className="text-3xl font-bold mb-2">{job.title}</h1>
                            <p className="text-olive-100 text-lg flex items-center gap-2 font-medium">
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
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8 border-b border-gray-100 pb-8">
                        <div className="p-4 bg-gray-50 rounded-xl">
                            <p className="text-xs text-gray-500 uppercase tracking-wide font-bold mb-1">Salary</p>
                            <p className="font-bold text-gray-900 flex items-center gap-1 text-lg">
                                <DollarSign className="h-5 w-5 text-olive-600" />
                                ₹{job.salary}/day
                            </p>
                        </div>
                        <div className="p-4 bg-gray-50 rounded-xl">
                            <p className="text-xs text-gray-500 uppercase tracking-wide font-bold mb-1">Location</p>
                            <p className="font-bold text-gray-900 flex items-center gap-1 text-lg">
                                <MapPin className="h-5 w-5 text-gray-400" />
                                {job.location}
                            </p>
                        </div>
                        <div className="p-4 bg-gray-50 rounded-xl">
                            <p className="text-xs text-gray-500 uppercase tracking-wide font-bold mb-1">Shift</p>
                            <p className="font-bold text-gray-900 flex items-center gap-1 text-lg">
                                <Clock className="h-5 w-5 text-gray-400" />
                                {job.shift}
                            </p>
                        </div>
                        <div className="p-4 bg-gray-50 rounded-xl">
                            <p className="text-xs text-gray-500 uppercase tracking-wide font-bold mb-1">Working Days</p>
                            <p className="font-bold text-gray-900 flex items-center gap-1 text-lg">
                                <Calendar className="h-5 w-5 text-gray-400" />
                                {job.days}
                            </p>
                        </div>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        <div className="md:col-span-2 space-y-8">
                            <section>
                                <h3 className="text-xl font-bold text-gray-900 mb-4">Job Description</h3>
                                <p className="text-gray-600 leading-relaxed text-lg">{job.description}</p>
                            </section>

                            <section>
                                <h3 className="text-xl font-bold text-gray-900 mb-4">Requirements</h3>
                                <div className="flex flex-wrap gap-2">
                                    {job.skills.map(skill => (
                                        <span key={skill} className="px-4 py-2 bg-olive-50 text-olive-800 rounded-lg text-sm font-bold border border-olive-100">
                                            {skill}
                                        </span>
                                    ))}
                                </div>
                            </section>
                        </div>

                        <div className="md:col-span-1">
                            <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100 sticky top-24">
                                <h3 className="font-bold text-gray-900 mb-4 text-lg">Ready to Apply?</h3>
                                {(!user || user.role === 'student') ? (
                                    <>
                                        <button
                                            onClick={initiateApplication}
                                            disabled={applied || applying}
                                            className={`w-full text-white py-3.5 rounded-xl font-bold transition-all shadow-lg mb-3 hover:translate-y-[-2px] ${applied ? "bg-gray-400 cursor-not-allowed" : "bg-olive-500 hover:bg-olive-600 shadow-olive-500/20"
                                                }`}
                                        >
                                            {applied ? "Applied Successfully ✓" : (applying ? "Applying..." : "Apply Now")}
                                        </button>
                                        <button className="w-full bg-white text-gray-700 py-3.5 rounded-xl font-bold border border-gray-200 hover:bg-gray-50 transition-colors">
                                            Save for Later
                                        </button>
                                        <p className="text-xs text-center text-gray-500 mt-4 font-medium">
                                            2 other students applied today
                                        </p>
                                    </>
                                ) : (
                                    <div className="w-full bg-gray-200 text-gray-500 py-3.5 rounded-xl font-bold text-center border border-gray-300">
                                        Retailers Cannot Apply
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default JobDetails;
