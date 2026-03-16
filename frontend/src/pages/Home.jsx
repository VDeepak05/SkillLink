import React, { useState, useMemo, useEffect } from "react";
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

    // Filter States
    const [maxDistance, setMaxDistance] = useState(20);
    const [selectedShifts, setSelectedShifts] = useState([]);
    const [shopType, setShopType] = useState('All Types');
    const [minSalary, setMinSalary] = useState(0);

    const [appliedJobIds, setAppliedJobIds] = useState(new Set());
    const [savedJobIds, setSavedJobIds] = useState(new Set());
    const { user } = useAuth();

    useEffect(() => {
        const fetchHomeData = async () => {
            try {
                // Fetch Jobs
                const jobsRes = await fetch('http://localhost:8000/jobs');
                const jobsData = await jobsRes.json();
                const mappedJobs = jobsData.map(job => ({
                    id: job.id,
                    job_id: job.job_id,
                    title: job.job_title,
                    shopName: job.shop_name || "Retail Shop",
                    shopType: job.shop_type,
                    location: job.area || "Palakkad",
                    distance: (Math.random() * 5 + 1).toFixed(1),
                    shift: job.shift_type,
                    days: job.is_seasonal ? 'Seasonal' : 'Mon-Fri',
                    salary: job.salary_per_day
                }));
                setJobs(mappedJobs);

                // Fetch Student Data if logged in
                if (user && user.role === 'student') {
                    // Fetch Applications
                    const appsRes = await fetch(`http://localhost:8000/student/applications/${user.id}`);
                    if (appsRes.ok) {
                        const appsData = await appsRes.json();
                        const idSet = new Set(appsData.applications.map(a => a.job_id));
                        setAppliedJobIds(idSet);
                    }

                    // Fetch Wishlist
                    const wishlistRes = await fetch(`http://localhost:8000/student/wishlist/${user.id}`);
                    if (wishlistRes.ok) {
                        const wishlistData = await wishlistRes.json();
                        const savedSet = new Set(wishlistData.wishlist.map(j => j.job_id || j.id));
                        setSavedJobIds(savedSet);
                    }
                }
            } catch (err) {
                console.error("Home data fetch error:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchHomeData();
    }, [user]);

    // Sync with Login toggle
    useEffect(() => {
        const savedTheme = localStorage.getItem("theme");
        setDarkMode(savedTheme !== "light");
    }, []);

    const filteredJobs = useMemo(() => {
        return jobs.filter((job) => {
            const matchesSearch = `${job.title} ${job.location} ${job.shopName}`
                .toLowerCase()
                .includes(searchTerm.toLowerCase());

            const matchesDistance = parseFloat(job.distance) <= maxDistance;

            // Shift is typically lowercase in DB, uppercase in UI array
            const matchesShift = selectedShifts.length === 0 ||
                selectedShifts.some(s => s.toLowerCase() === (job.shift || '').toLowerCase());

            const matchesType = shopType === 'All Types' || job.shopType === shopType;

            // Ensure salaries are compared as numbers
            const jobSalary = parseFloat(job.salary) || 0;
            const matchesSalary = jobSalary >= minSalary;

            return matchesSearch && matchesDistance && matchesShift && matchesType && matchesSalary;
        });
    }, [searchTerm, jobs, maxDistance, selectedShifts, shopType, minSalary]);

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
                                    : "bg-white/80 border-gray-200 text-gray-900"
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
                            : "bg-white/80 border-gray-200"
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
                                className={`px-4 py-1.5 rounded-full text-sm font-medium ${darkMode
                                    ? "bg-emerald-500/20 text-emerald-400"
                                    : "bg-emerald-100 text-emerald-700"
                                    }`}
                            >
                                {filteredJobs.length} jobs found
                            </span>
                        </div>

                        {loading ? (
                            <div className={`text-center py-10 ${darkMode ? "text-white" : "text-gray-900"}`}>
                                Loading jobs...
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {filteredJobs.map((job) => (
                                    <JobCard
                                        key={job.id}
                                        job={job}
                                        darkMode={darkMode}
                                        isApplied={appliedJobIds.has(job.job_id)}
                                        isSaved={savedJobIds.has(job.job_id)}
                                    />
                                ))}
                            </div>
                        )}
                    </main>
                </div>
            </div>
        </div>
    );
};

export default Home;