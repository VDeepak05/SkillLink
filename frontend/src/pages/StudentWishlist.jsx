import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { Heart, Search, Loader2, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import JobCard from '../components/JobCard';

const StudentWishlist = () => {
    const { user } = useAuth();
    const [wishlist, setWishlist] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

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
        const fetchWishlist = async () => {
            if (!user) return;
            try {
                const res = await fetch(`http://localhost:8000/student/wishlist/${user.id}`);
                const data = await res.json();
                if (res.ok) {
                    // Map data to match JobCard expectations if needed
                    const mappedJobs = data.wishlist.map(job => ({
                        id: job.id,
                        job_id: job.job_id,
                        title: job.job_title,
                        shopName: job.shop_name || "Retail Shop",
                        shopType: job.shop_type,
                        location: job.area || job.location || "Palakkad",
                        distance: job.distance || (Math.random() * 5 + 1).toFixed(1),
                        shift: job.shift_type,
                        days: job.is_seasonal ? 'Seasonal' : 'Mon-Fri',
                        salary: job.salary_per_day
                    }));
                    setWishlist(mappedJobs);
                } else {
                    setError(data.detail || "Failed to fetch wishlist");
                }
            } catch (err) {
                console.error("Error fetching wishlist:", err);
                setError("Connection error. Please try again later.");
            } finally {
                setLoading(false);
            }
        };

        fetchWishlist();
    }, [user]);

    if (loading) {
        return (
            <div className={`min-h-[80vh] flex items-center justify-center ${darkMode ? "dark-animated-gradient" : "bg-white"}`}>
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-10 w-10 text-red-500 animate-spin" />
                    <p className={`${darkMode ? "text-red-400" : "text-gray-500"} font-medium`}>Fetching your saved jobs...</p>
                </div>
            </div>
        );
    }

    return (
        <div className={`min-h-screen transition-all duration-700 ${darkMode ? "dark-animated-gradient" : "bg-gradient-to-br from-emerald-50 via-white to-green-100"} py-12 px-6`}>
            <div className="max-w-6xl mx-auto">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-10 flex justify-between items-end"
                >
                    <div>
                        <h1 className={`text-3xl font-bold mb-2 ${darkMode ? "text-white" : "text-gray-900"}`}>My Wishlist</h1>
                        <p className={`${darkMode ? "text-red-400" : "text-red-600"} font-medium italic`}>Jobs you've saved for later</p>
                    </div>
                    {wishlist.length > 0 && (
                        <span className="bg-red-500/10 text-red-400 px-4 py-1.5 rounded-full text-sm font-bold border border-red-500/20">
                            {wishlist.length} Saved Jobs
                        </span>
                    )}
                </motion.div>

                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl flex items-center gap-3 text-red-500 mb-8">
                        <Heart size={20} />
                        <p>{error}</p>
                    </div>
                )}

                {wishlist.length === 0 && !error ? (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className={`${darkMode ? "bg-white/10 border-white/20" : "bg-white border-gray-200 shadow-xl"} backdrop-blur-md border rounded-3xl p-16 text-center transition-all duration-500`}
                    >
                        <div className="bg-white/5 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 border border-white/10 shadow-xl shadow-black/20">
                            <Heart className="h-12 w-12 text-red-400 fill-red-400/20" />
                        </div>
                        <h2 className={`text-2xl font-bold mb-3 ${darkMode ? "text-white" : "text-gray-900"}`}>Your wishlist is empty</h2>
                        <p className={`mb-10 max-w-md mx-auto ${darkMode ? "text-gray-400" : "text-gray-500 font-medium"}`}>Found a job you like but not ready to apply? Save it here to keep track of it!</p>
                        <Link
                            to="/jobs"
                            className="inline-flex items-center gap-3 bg-red-500 hover:bg-red-600 text-white px-10 py-4 rounded-2xl font-bold transition-all shadow-xl shadow-red-500/20 hover:-translate-y-1"
                        >
                            <Search size={20} />
                            Explore Opportunities
                        </Link>
                    </motion.div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {wishlist.map((job, index) => (
                            <motion.div
                                key={job.id}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: index * 0.05 }}
                            >
                                <JobCard
                                    job={job}
                                    isSaved={true}
                                    darkMode={darkMode}
                                />
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default StudentWishlist;
