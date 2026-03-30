import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { Bell, Check, Clock, XCircle, Search, Mail, Building2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";

const Inbox = () => {
    const { user } = useAuth();
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);
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
        
        if (user && user.id) {
            fetchMessages();
        }
    }, [user]);

    const fetchMessages = async () => {
        try {
            const res = await fetch(`http://localhost:8000/messages/${user.id}`);
            if (res.ok) {
                const data = await res.json();
                setMessages(data);
            }
        } catch (error) {
            console.error("Error fetching messages:", error);
        } finally {
            setLoading(false);
        }
    };

    const markAsRead = async (messageId) => {
        const msg = messages.find(m => m.id === messageId);
        if (!msg) return;

        const executeNavigation = () => {
            if (user.role === 'retailer' && msg.title === "New Applicant") {
                navigate("/retailer");
            } else if (user.role === 'student' && msg.title.includes("Accepted")) {
                navigate("/student/applications", { state: { activeTab: "accepted" } });
            }
        };

        if (msg.read) {
            executeNavigation();
            return;
        }

        // Optimistic update
        setMessages(prev => prev.map(m => m.id === messageId ? { ...m, read: true } : m));

        try {
            await fetch(`http://localhost:8000/messages/${messageId}/read`, {
                method: "PUT"
            });

            executeNavigation();
        } catch (error) {
            console.error("Error marking message as read:", error);
            // Revert on error
            setMessages(prev => prev.map(m => m.id === messageId ? { ...m, read: false } : m));
        }
    };

    if (loading) {
        return (
            <div className={`min-h-[60vh] flex items-center justify-center ${darkMode ? "dark-animated-gradient text-emerald-400" : "bg-white text-gray-500"}`}>
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="font-bold text-lg">Loading inbox...</p>
                </div>
            </div>
        );
    }

    const unreadCount = messages.filter(m => !m.read).length;

    return (
        <div className={`min-h-screen transition-all duration-700 py-12 px-6 ${darkMode ? "dark-animated-gradient" : "bg-gradient-to-br from-emerald-50 via-white to-green-100"}`}>
            <div className="max-w-4xl mx-auto space-y-8">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div>
                        <h1 className={`text-3xl font-black mb-2 flex items-center gap-3 ${darkMode ? "text-white" : "text-gray-900"}`}>
                            <div className="p-3 bg-emerald-500/20 text-emerald-600 rounded-2xl">
                                <Mail className="h-8 w-8" />
                            </div>
                            Inbox
                        </h1>
                        <p className={`text-lg font-medium ${darkMode ? "text-gray-400" : "text-gray-700"}`}>
                            Important updates about your job applications
                        </p>
                    </div>

                    <div className={`p-4 rounded-2xl border flex items-center gap-4 ${darkMode ? "bg-white/5 border-white/10" : "bg-white shadow-md border-gray-300"}`}>
                        <div className={`${unreadCount > 0 ? "bg-emerald-600" : darkMode ? "bg-gray-700" : "bg-gray-300"} p-2 rounded-full text-white transition-colors`}>
                            <Bell size={20} />
                        </div>
                        <div>
                            <p className={`text-sm font-bold ${darkMode ? "text-gray-400" : "text-gray-600"}`}>Unread Messages</p>
                            <p className={`text-xl font-black ${darkMode ? "text-white" : "text-gray-900"}`}>{unreadCount}</p>
                        </div>
                    </div>
                </div>

                {/* Messages List Context */}
                <div className={`rounded-3xl border overflow-hidden backdrop-blur-xl ${darkMode ? "bg-white/5 border-white/10" : "bg-white shadow-xl shadow-gray-200/50 border-gray-300"}`}>
                    <div className={`px-6 py-4 border-b flex justify-between items-center ${darkMode ? "border-white/10" : "border-gray-300 bg-gray-100"}`}>
                        <h2 className={`font-bold ${darkMode ? "text-gray-300" : "text-gray-900"}`}>All Messages</h2>
                        <span className={`text-sm px-3 py-1 rounded-full font-bold ${darkMode ? "bg-white/10 text-gray-400" : "bg-gray-300 text-gray-800"}`}>
                            {messages.length} Total
                        </span>
                    </div>

                    {messages.length === 0 ? (
                        <div className={`p-16 text-center ${darkMode ? "text-gray-500" : "text-gray-500"}`}>
                            <Mail className="mx-auto h-16 w-16 mb-4 opacity-30" />
                            <h3 className={`text-xl font-bold mb-2 ${darkMode ? "text-gray-300" : "text-gray-800"}`}>Your inbox is empty</h3>
                            <p className="font-medium">When there are updates on your job applications, they'll appear here.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-200 dark:divide-white/5">
                            <AnimatePresence>
                                {messages.map((msg) => (
                                    <motion.div
                                        key={msg.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        onClick={() => markAsRead(msg.id)}
                                        className={`p-6 transition-all cursor-pointer relative overflow-hidden group
                                            ${!msg.read
                                                ? darkMode ? "bg-emerald-900/10 hover:bg-emerald-900/20" : "bg-emerald-50 hover:bg-emerald-100/50"
                                                : darkMode ? "hover:bg-white/5" : "hover:bg-gray-50"
                                            }
                                        `}
                                    >
                                        {/* Unread Indicator Bar */}
                                        {!msg.read && (
                                            <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-emerald-600"></div>
                                        )}

                                        <div className="flex gap-4">
                                            <div className={`mt-1 flex-shrink-0 p-2 rounded-full h-fit
                                                ${!msg.read
                                                    ? "bg-emerald-600 text-white"
                                                    : darkMode ? "bg-gray-800 text-gray-500" : "bg-gray-300 text-gray-600"
                                                }
                                            `}>
                                                {msg.message.includes("Sorry") || msg.message.includes("rejected") ? <XCircle size={20} /> : (msg.title === "New Applicant" ? <Building2 size={20} /> : <Check size={20} />)}
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-start justify-between gap-4 mb-2">
                                                    <h3 className={`text-lg font-bold truncate ${!msg.read
                                                        ? darkMode ? "text-emerald-400" : "text-emerald-800"
                                                        : darkMode ? "text-gray-300" : "text-gray-900"
                                                        }`}>
                                                        {msg.title}
                                                    </h3>
                                                    <span className={`text-xs whitespace-nowrap flex items-center gap-1 font-bold ${darkMode ? "text-gray-500" : "text-gray-500"}`}>
                                                        <Clock size={12} />
                                                        {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                                                    </span>
                                                </div>
                                                <p className={`text-base leading-relaxed whitespace-pre-wrap font-medium ${!msg.read
                                                    ? darkMode ? "text-gray-300" : "text-gray-900"
                                                    : darkMode ? "text-gray-500" : "text-gray-700"
                                                    }`}>
                                                    {msg.message}
                                                </p>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Inbox;
