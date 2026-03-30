import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import FilterPanel from "../components/FilterPanel";
import JobCard from "../components/JobCard";
import { Search } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "../context/AuthContext";

const Home = () => {
    const [searchTerm, setSearchTerm] = useState("");
    const [darkMode, setDarkMode] = useState(true);
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [totalMatched, setTotalMatched] = useState(0);

    // Filter States
    const [maxDistance, setMaxDistance] = useState(25);
    const [selectedShifts, setSelectedShifts] = useState([]);
    const [shopType, setShopType] = useState('All Types');
    const [minSalary, setMinSalary] = useState(0);

    const [appliedJobIds, setAppliedJobIds] = useState(new Set());
    const [savedJobIds, setSavedJobIds] = useState(new Set());
    const { user } = useAuth();

    const fetchJobs = async (pageNum = 0, reset = false) => {
        if (pageNum === 0) setLoading(true);
        else setLoadingMore(true);

        try {
            const skip = pageNum * 20;
            const shiftStr = selectedShifts.join(",");
            const queryParams = new URLSearchParams({
                skip: skip,
                limit: 20,
                search: searchTerm,
                distance: maxDistance,
                shifts: shiftStr,
                shop_type: shopType,
                min_salary: minSalary
            }).toString();

            const endpoint = user && user.role === 'student'
                ? `http://localhost:8000/recommend/${user.id}?${queryParams}`
                : `http://localhost:8000/jobs?${queryParams}`;

            const res = await fetch(endpoint, { cache: 'no-store' });
            const data = await res.json();
            
            const jobList = data.jobs || [];
            if (pageNum === 0) setTotalMatched(data.total_count || 0);

            if (jobList.length < 20) setHasMore(false);
            else setHasMore(true);

            const mappedJobs = jobList.map(job => ({
                id: job.id,
                job_id: job.job_id,
                title: job.job_title,
                shopName: job.shop_name || job.shop_type,
                shopType: job.shop_type,
                location: job.area || "Palakkad",
                distance: job.distance !== undefined ? job.distance.toFixed(1) : "N/A",
                shift: job.shift_type,
                days: job.is_seasonal ? 'Seasonal' : 'Mon-Fri',
                salary: job.salary_per_day
            }));

            if (reset) {
                setJobs(mappedJobs);
            } else {
                setJobs(prev => {
                    const existingIds = new Set(prev.map(j => j.id));
                    const newJobs = mappedJobs.filter(j => !existingIds.has(j.id));
                    return [...prev, ...newJobs];
                });
            }
        } catch (err) {
            console.error("Home jobs fetch error:", err);
        } finally {
            if (pageNum === 0) setLoading(false);
            else setLoadingMore(false);
        }
    };

    const handleLoadMore = () => {
        if (!loadingMore && hasMore) {
            const nextPage = page + 1;
            setPage(nextPage);
            fetchJobs(nextPage, false);
        }
    };

    const observer = useRef();
    const lastJobElementRef = useCallback(node => {
        if (loadingMore || loading) return;
        if (observer.current) observer.current.disconnect();
        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && hasMore) {
                const nextPage = page + 1;
                setPage(nextPage);
                fetchJobs(nextPage, false);
            }
        });
        if (node) observer.current.observe(node);
    }, [loadingMore, loading, hasMore, page]);

    // Initialize Jobs and apply Debounced filters
    useEffect(() => {
        const handler = setTimeout(() => {
            setPage(0);
            fetchJobs(0, true);
        }, 300);
        return () => clearTimeout(handler);
    }, [user, searchTerm, maxDistance, selectedShifts, shopType, minSalary]);

    // Fetch user-specific metadata once
    useEffect(() => {
        const fetchUserData = async () => {
            if (user && user.role === 'student') {
                try {
                    const appsRes = await fetch(`http://localhost:8000/student/applications/${user.id}`, { cache: 'no-store' });
                    if (appsRes.ok) {
                        const appsData = await appsRes.json();
                        setAppliedJobIds(new Set(appsData.applications.map(a => a.job_id)));
                    }

                    const wishlistRes = await fetch(`http://localhost:8000/student/wishlist/${user.id}`, { cache: 'no-store' });
                    if (wishlistRes.ok) {
                        const wishlistData = await wishlistRes.json();
                        setSavedJobIds(new Set(wishlistData.wishlist.map(j => j.job_id || j.id)));
                    }
                } catch (err) {}
            }
        };
        fetchUserData();
    }, [user]);

    // Sync with Login toggle
    useEffect(() => {
        const themeKey = user ? `skilllink_theme_${user.id || user.user_id}` : "skilllink_theme_global";
        const savedTheme = localStorage.getItem(themeKey) || localStorage.getItem("skilllink_theme_global");
        setDarkMode(savedTheme !== "light");
    }, [user]);

    return (
        <div
            className={`min-h-screen transition-all duration-700 ${darkMode
                ? "dark-animated-gradient"
                : "bg-gradient-to-br from-emerald-50 via-white to-green-100"
                }`}
        >
            <div className="relative z-10 max-w-7xl mx-auto px-6 py-14">

                {/* HERO SECTION */}
                <motion.div
                    initial={{ opacity: 0, y: -40 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                    className="text-center mb-16"
                >
                    <h1
                        className={`text-4xl md:text-5xl font-extrabold transition-colors duration-500 ${darkMode ? "text-white" : "text-gray-900"
                            }`}
                    >
                        Find Flexible
                        <span className="block text-emerald-400">
                            Part-Time Jobs
                        </span>
                        Near You
                    </h1>

                    <p
                        className={`mt-4 text-lg transition-colors duration-500 ${darkMode ? "text-gray-300" : "text-gray-600"
                            }`}
                    >
                        Earn money while gaining experience.
                    </p>

                    {/* SEARCH BAR */}
                    <div className="relative max-w-2xl mx-auto mt-10">
                        <input
                            type="text"
                            placeholder="Search jobs (Cashier, HSR Layout...)"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className={`w-full pl-14 pr-6 py-4 rounded-2xl 
                         backdrop-blur-xl border transition-all duration-300
                         ${darkMode
                                    ? "bg-white/10 border-white/20 text-white placeholder-gray-400"
                                    : "bg-white border-gray-300 text-gray-900"
                                }`}
                        />

                        <Search
                            className={`absolute left-5 top-4 h-6 w-6 ${darkMode ? "text-gray-300" : "text-gray-400"
                                }`}
                        />
                    </div>
                </motion.div>

                {/* MAIN SECTION */}
                <div className="flex flex-col lg:flex-row gap-10">

                    {/* FILTER PANEL (Glass Style) */}
                    <aside
                        className={`w-full lg:w-72 rounded-3xl p-6 backdrop-blur-2xl border transition-all duration-500 ${darkMode
                            ? "bg-white/10 border-white/20"
                            : "bg-white border-gray-300"
                            }`}
                    >
                        <FilterPanel
                            darkMode={darkMode}
                            maxDistance={maxDistance} setMaxDistance={setMaxDistance}
                            selectedShifts={selectedShifts} setSelectedShifts={setSelectedShifts}
                            shopType={shopType} setShopType={setShopType}
                            minSalary={minSalary} setMinSalary={setMinSalary}
                        />
                    </aside>

                    {/* JOB LIST */}
                    <main className="flex-1">
                        <div className="flex justify-between items-center mb-8">
                            <h2
                                className={`text-2xl font-bold transition-colors duration-500 ${darkMode ? "text-white" : "text-gray-900"
                                    }`}
                            >
                                Recommended for You
                            </h2>

                            <span
                                className={`px-4 py-1.5 rounded-full border text-sm font-medium ${darkMode
                                    ? "bg-emerald-500/20 text-emerald-400 border-transparent"
                                    : "bg-emerald-50 text-emerald-800 border-emerald-300"
                                    }`}
                            >
                                {totalMatched} jobs found
                            </span>
                        </div>

                        {loading ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pb-10">
                                {[...Array(6)].map((_, i) => (
                                    <div key={i} className={`h-[240px] rounded-3xl animate-pulse ${darkMode ? 'bg-white/5 border border-white/10' : 'bg-gray-200 border border-gray-100'}`}>
                                        <div className="p-6 space-y-4">
                                            <div className="flex justify-between">
                                                <div className={`h-8 w-48 rounded-lg ${darkMode ? 'bg-white/10' : 'bg-gray-300'}`} />
                                                <div className={`h-8 w-8 rounded-full ${darkMode ? 'bg-white/10' : 'bg-gray-300'}`} />
                                            </div>
                                            <div className="flex gap-2">
                                                <div className={`h-6 w-24 rounded-full ${darkMode ? 'bg-white/10' : 'bg-gray-300'}`} />
                                                <div className={`h-6 w-24 rounded-full ${darkMode ? 'bg-white/10' : 'bg-gray-300'}`} />
                                            </div>
                                            <div className="space-y-2 pt-2">
                                                <div className={`h-4 w-full rounded ${darkMode ? 'bg-white/5' : 'bg-gray-300'}`} />
                                                <div className={`h-4 w-2/3 rounded ${darkMode ? 'bg-white/5' : 'bg-gray-300'}`} />
                                            </div>
                                            <div className="flex justify-between items-center pt-4">
                                                <div className={`h-10 w-32 rounded-xl ${darkMode ? 'bg-white/10' : 'bg-gray-300'}`} />
                                                <div className={`h-8 w-24 rounded-lg ${darkMode ? 'bg-white/10' : 'bg-gray-300'}`} />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="pb-10 min-h-[600px]">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    {jobs.map((job) => (
                                        <JobCard
                                            key={job.id}
                                            job={job}
                                            darkMode={darkMode}
                                            isApplied={appliedJobIds.has(job.job_id)}
                                            isSaved={savedJobIds.has(job.job_id)}
                                        />
                                    ))}
                                </div>
                                {hasMore && jobs.length > 0 && !loadingMore && (
                                    <div ref={lastJobElementRef} className="h-10 w-full mt-4" />
                                )}
                                {loadingMore && (
                                    <div className={`mt-10 text-center font-bold ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>
                                        <div className="inline-flex h-6 w-6 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" />
                                        <span className="ml-3">Loading more jobs...</span>
                                    </div>
                                )}
                                {!hasMore && jobs.length > 0 && (
                                    <div className={`mt-10 text-center text-sm font-medium ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                                        You've reached the end of the list.
                                    </div>
                                )}
                                {jobs.length === 0 && !loading && (
                                    <div className={`text-center py-20 rounded-3xl border border-dashed ${darkMode ? 'border-white/10 text-gray-400' : 'border-gray-200 text-gray-500'}`}>
                                        <p className="text-xl font-bold">No jobs found matching your criteria</p>
                                        <p className="mt-2">Try adjusting your filters or search terms.</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </main>
                </div>
            </div>
        </div>
    );
};

export default Home;