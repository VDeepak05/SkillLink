import React, { useState, useMemo, useEffect } from "react";
import FilterPanel from "../components/FilterPanel";
import JobCard from "../components/JobCard";
import { Search } from "lucide-react";
import { motion } from "framer-motion";

const Home = () => {
    const [searchTerm, setSearchTerm] = useState("");
    const [darkMode, setDarkMode] = useState(true);
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('http://localhost:8000/jobs')
            .then(res => res.json())
            .then(data => {
                const mappedJobs = data.map(job => ({
                    id: job.id,
                    title: job.job_title,
                    shopName: job.shop_name || "Retail Shop",
                    shopType: job.shop_type,
                    location: job.area || "Bangalore",
                    distance: (Math.random() * 5 + 1).toFixed(1), // Mock distance for now
                    shift: job.shift_type,
                    days: job.is_seasonal ? 'Seasonal' : 'Mon-Fri',
                    salary: job.salary_per_day
                }));
                setJobs(mappedJobs);
                setLoading(false);
            })
            .catch(err => {
                console.error("Failed to fetch jobs:", err);
                setLoading(false);
            });
    }, []);

    // Sync with Login toggle
    useEffect(() => {
        const savedTheme = localStorage.getItem("theme");
        setDarkMode(savedTheme !== "light");
    }, []);

    const filteredJobs = useMemo(() => {
        return jobs.filter((job) =>
            `${job.title} ${job.location} ${job.shopName}`
                .toLowerCase()
                .includes(searchTerm.toLowerCase())
        );
    }, [searchTerm, jobs]);

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
                            className={`w-full pl-14 pr-32 py-4 rounded-2xl 
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

                        <button
                            className="
                absolute right-2.5 top-2.5
                px-6 py-2 rounded-xl font-semibold text-white
                bg-gradient-to-r from-emerald-500 to-green-600
                hover:from-emerald-600 hover:to-green-700
                transform hover:scale-105
                transition-all duration-300
                shadow-lg hover:shadow-2xl
              "
                        >
                            Search
                        </button>
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
                        <FilterPanel darkMode={darkMode} />
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