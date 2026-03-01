import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { GraduationCap, Store, Sun, Moon, ArrowLeft } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import JobHunt from "../images/JobHunt.svg";

const Login = () => {
    const navigate = useNavigate();
    const { login } = useAuth();

    const [darkMode, setDarkMode] = useState(true);
    const [activeRole, setActiveRole] = useState(null); // 'student' or 'retailer'
    const [isLogin, setIsLogin] = useState(true);
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        name: "", // Student: name, Retailer: owner_name
        email: "",
        password: "",
        college: "", // Student
        dob: "", // Student
        phone_no: "", // Student
        shop_name: "", // Retailer
        shop_id: "", // Retailer
        shop_type: "Supermarket", // Retailer
        location: "" // Retailer
    });

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    // Load saved theme
    useEffect(() => {
        const savedTheme = localStorage.getItem("theme");

        if (savedTheme === "light") {
            setDarkMode(false);
        } else {
            setDarkMode(true);
        }
    }, []);

    const toggleTheme = () => {
        const newMode = !darkMode;
        setDarkMode(newMode);
        localStorage.setItem("theme", newMode ? "dark" : "light");
    };

    const handleAuth = async (e) => {
        e.preventDefault();
        setLoading(true);

        const endpoint = isLogin
            ? "http://localhost:8000/auth/signin"
            : `http://localhost:8000/auth/signup/${activeRole}`;

        let payload = {};

        if (isLogin) {
            payload = { email: formData.email, password: formData.password };
        } else if (activeRole === "student") {
            payload = {
                name: formData.name,
                college: formData.college,
                dob: formData.dob,
                phone_no: formData.phone_no,
                email: formData.email,
                password: formData.password
            };
        } else {
            payload = {
                owner_name: formData.name,
                shop_name: formData.shop_name,
                shop_id: formData.shop_id,
                shop_type: formData.shop_type,
                location: formData.location,
                email: formData.email,
                password: formData.password
            };
        }

        try {
            const res = await fetch(endpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            const data = await res.json();

            if (res.ok) {
                // Pass the full user object to AuthContext
                login({
                    id: data.id,
                    name: data.name,
                    role: data.role,
                    email: data.email
                });
                navigate(data.role === "student" ? "/jobs" : "/retailer");
            } else {
                alert(data.detail || "Authentication Failed");
            }
        } catch (error) {
            console.error(error);
            alert("An error occurred during authentication.");
        }
        setLoading(false);
    };

    return (
        <div
            className={`min-h-screen transition-all duration-700 
      flex items-center justify-center px-6 relative overflow-hidden
      ${darkMode
                    ? "dark-animated-gradient"
                    : "bg-gradient-to-br from-emerald-50 via-white to-green-100"
                }`}
        >
            {/* 🌙 Toggle Button */}
            <button
                onClick={toggleTheme}
                className={`absolute top-6 right-6 z-50 
                   backdrop-blur-xl 
                   p-3 rounded-full 
                   border transition-all duration-300 hover:scale-110
                   ${darkMode
                        ? "bg-white/10 border-white/20"
                        : "bg-white/70 border-gray-300"
                    }`}
            >
                {darkMode ? (
                    <Sun className="text-yellow-400" size={20} />
                ) : (
                    <Moon className="text-slate-800" size={20} />
                )}
            </button>

            <div className="relative z-10 max-w-6xl w-full flex flex-col md:flex-row items-center justify-between gap-16">

                {/* LEFT SIDE */}
                <motion.div
                    initial={{ x: -80, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ duration: 1 }}
                    className="flex-1 text-center md:text-left"
                >
                    <motion.img
                        src={JobHunt}
                        alt="Student working"
                        className="w-80 md:w-96 mx-auto md:mx-0"
                        animate={{ y: [0, -12, 0] }}
                        transition={{ duration: 5, repeat: Infinity }}
                    />

                    <h1
                        className={`text-4xl md:text-5xl font-extrabold mt-6 transition-colors duration-500 ${darkMode ? "text-white" : "text-gray-900"
                            }`}
                    >
                        StudentWorks
                    </h1>

                    <p
                        className={`mt-4 text-lg transition-colors duration-500 ${darkMode ? "text-gray-300" : "text-gray-600"
                            }`}
                    >
                        Connect, work, and earn while you learn.
                    </p>
                </motion.div>

                {/* RIGHT SIDE - CARD */}
                <motion.div
                    initial={{ x: 80, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ duration: 1 }}
                    className="flex-1 max-w-md w-full"
                >
                    <motion.div
                        animate={{ y: [0, -6, 0] }}
                        transition={{ duration: 6, repeat: Infinity }}
                        className={`relative backdrop-blur-2xl rounded-3xl p-10 
                       border shadow-xl space-y-6 transition-all duration-500
                       ${darkMode
                                ? "bg-white/10 border-white/20"
                                : "bg-white/80 border-gray-200"
                            }`}
                    >
                        {/* CONDITIONAL RENDERING: SELECTION OR FORM */}
                        <AnimatePresence mode="wait">
                            {!activeRole ? (
                                <motion.div
                                    key="selection"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    className="space-y-6"
                                >
                                    <div
                                        onClick={() => setActiveRole("student")}
                                        className={`flex items-center gap-4 p-5 
                                        rounded-2xl hover:scale-105
                                        transition-all duration-300 cursor-pointer
                                        ${darkMode
                                                ? "bg-white/5 border border-white/10 hover:border-emerald-400"
                                                : "bg-white border border-gray-200 hover:border-emerald-400"
                                            }`}
                                    >
                                        <div
                                            className={`p-3 rounded-full ${darkMode
                                                ? "bg-emerald-500/20"
                                                : "bg-emerald-100"
                                                }`}
                                        >
                                            <GraduationCap
                                                className={`h-6 w-6 ${darkMode ? "text-emerald-400" : "text-emerald-600"
                                                    }`}
                                            />
                                        </div>

                                        <div>
                                            <h3
                                                className={`text-lg font-bold transition-colors duration-300 ${darkMode ? "text-white" : "text-gray-900"
                                                    }`}
                                            >
                                                I am a Student
                                            </h3>
                                            <p
                                                className={`text-sm transition-colors duration-300 ${darkMode ? "text-gray-300" : "text-gray-500"
                                                    }`}
                                            >
                                                Find part-time jobs nearby
                                            </p>
                                        </div>
                                    </div>

                                    <div
                                        onClick={() => setActiveRole("retailer")}
                                        className={`flex items-center gap-4 p-5 
                                        rounded-2xl hover:scale-105
                                        transition-all duration-300 cursor-pointer
                                        ${darkMode
                                                ? "bg-white/5 border border-white/10 hover:border-emerald-400"
                                                : "bg-white border border-gray-200 hover:border-emerald-400"
                                            }`}
                                    >
                                        <div
                                            className={`p-3 rounded-full ${darkMode
                                                ? "bg-emerald-500/20"
                                                : "bg-emerald-100"
                                                }`}
                                        >
                                            <Store
                                                className={`h-6 w-6 ${darkMode ? "text-emerald-400" : "text-emerald-600"
                                                    }`}
                                            />
                                        </div>

                                        <div>
                                            <h3
                                                className={`text-lg font-bold transition-colors duration-300 ${darkMode ? "text-white" : "text-gray-900"
                                                    }`}
                                            >
                                                I am a Retailer
                                            </h3>
                                            <p
                                                className={`text-sm transition-colors duration-300 ${darkMode ? "text-gray-300" : "text-gray-500"
                                                    }`}
                                            >
                                                Post jobs and hire students
                                            </p>
                                        </div>
                                    </div>
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="form"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                >
                                    <button
                                        onClick={() => {
                                            setActiveRole(null);
                                            setIsLogin(true);
                                        }}
                                        className={`flex items-center gap-2 mb-6 text-sm hover:underline ${darkMode ? "text-emerald-400" : "text-emerald-600"}`}
                                    >
                                        <ArrowLeft size={16} /> Back to Role Selection
                                    </button>

                                    <h2 className={`text-2xl font-bold mb-6 text-center ${darkMode ? "text-white" : "text-gray-900"}`}>
                                        {isLogin ? `Sign In as ${activeRole === 'student' ? 'Student' : 'Retailer'}` : `Sign Up as ${activeRole === 'student' ? 'Student' : 'Retailer'}`}
                                    </h2>

                                    <form onSubmit={handleAuth} className="space-y-4">
                                        {!isLogin && activeRole === "student" && (
                                            <>
                                                <input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="Full Name" required className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-400 focus:outline-none focus:border-emerald-500 transition-colors" />
                                                <input type="text" name="college" value={formData.college} onChange={handleChange} placeholder="College Name" required className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-400 focus:outline-none focus:border-emerald-500 transition-colors" />
                                                <input type="date" name="dob" value={formData.dob} onChange={handleChange} placeholder="Date of Birth" required className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-400 focus:outline-none focus:border-emerald-500 transition-colors" />
                                                <input type="tel" name="phone_no" value={formData.phone_no} onChange={handleChange} placeholder="Phone Number" required className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-400 focus:outline-none focus:border-emerald-500 transition-colors" />
                                            </>
                                        )}

                                        {!isLogin && activeRole === "retailer" && (
                                            <>
                                                <input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="Owner Name" required className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-400 focus:outline-none focus:border-emerald-500 transition-colors" />
                                                <input type="text" name="shop_name" value={formData.shop_name} onChange={handleChange} placeholder="Shop Name" required className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-400 focus:outline-none focus:border-emerald-500 transition-colors" />
                                                <input type="text" name="shop_id" value={formData.shop_id} onChange={handleChange} placeholder="Registration / Shop ID" required className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-400 focus:outline-none focus:border-emerald-500 transition-colors" />
                                                <select name="shop_type" value={formData.shop_type} onChange={handleChange} className="w-full px-4 py-3 rounded-xl bg-[#2a3831] border border-white/10 text-white focus:outline-none focus:border-emerald-500 transition-colors">
                                                    <option value="Supermarket">Supermarket</option>
                                                    <option value="Bakery">Bakery</option>
                                                    <option value="Clothing Store">Clothing Store</option>
                                                    <option value="Cafe">Cafe</option>
                                                    <option value="Other">Other</option>
                                                </select>
                                                <input type="text" name="location" value={formData.location} onChange={handleChange} placeholder="Shop Location Area" required className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-400 focus:outline-none focus:border-emerald-500 transition-colors" />
                                            </>
                                        )}

                                        <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="Email Address" required className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-400 focus:outline-none focus:border-emerald-500 transition-colors" />
                                        <input type="password" name="password" value={formData.password} onChange={handleChange} placeholder="Password" required className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-400 focus:outline-none focus:border-emerald-500 transition-colors" />

                                        <button disabled={loading} type="submit" className="w-full py-3 mt-4 rounded-xl font-bold text-white bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 transition-all shadow-lg">
                                            {loading ? "Processing..." : isLogin ? "Sign In" : "Sign Up"}
                                        </button>
                                    </form>

                                    <p className={`mt-6 text-center text-sm ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
                                        {isLogin ? "Don't have an account? " : "Already have an account? "}
                                        <button onClick={() => setIsLogin(!isLogin)} className="text-emerald-500 hover:underline font-semibold">
                                            {isLogin ? "Sign Up" : "Sign In"}
                                        </button>
                                    </p>
                                </motion.div>
                            )}
                        </AnimatePresence>

                    </motion.div>
                </motion.div>

            </div>
        </div>
    );
};

export default Login;