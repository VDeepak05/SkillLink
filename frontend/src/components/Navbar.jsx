import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, LogOut, Mail } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import SkillLinkLogo from '../images/SkiLinkLogoNew.png';

const Navbar = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const location = useLocation();
    const navigate = useNavigate();
    const { user, logout } = useAuth();

    const fetchNotifications = async () => {
        if (!user || (!user.id && !user.user_id)) return;
        const userId = user.id || user.user_id;
        try {
            const res = await fetch(`http://localhost:8000/messages/${userId}`);
            if (res.ok) {
                const data = await res.json();
                const unread = Array.isArray(data) ? data.filter(msg => !msg.read).length : 0;
                setUnreadCount(unread);
            }
        } catch (error) {
            console.error("Failed to fetch notifications count:", error);
        }
    };

    // Fetch unread notifications
    useEffect(() => {
        fetchNotifications();
    }, [user, location.pathname]);

    // Also re-fetch when other pages signal that inbox was updated
    useEffect(() => {
        const handleRefresh = () => fetchNotifications();
        window.addEventListener('inbox-refresh', handleRefresh);
        return () => window.removeEventListener('inbox-refresh', handleRefresh);
    }, [user]);

    // Fallback for demo if user not set via login page (e.g. direct url access)
    const isRetailerPath = location.pathname.includes('retailer');

    // Decide links based on User Role OR Path (if refreshed)
    const isRetailer = user?.role === 'retailer' || (!user && isRetailerPath);

    const navLinks = isRetailer
        ? [
            { name: 'Dashboard', path: '/retailer' },
            { name: 'Post Job', path: '/retailer/post-job' },
            { name: 'Jobs', path: '/jobs' },
        ]
        : [
            { name: 'Find Jobs', path: '/jobs' },
            { name: 'My Applications', path: '/student/applications' },
            { name: 'My Wishlist', path: '/student/wishlist' },
        ];

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    return (
        <nav className="premium-green-glass sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-20">
                    <div className="flex items-center">
                        <Link to={isRetailer ? "/retailer" : "/jobs"} className="group relative flex items-center gap-2">
                            <img src={SkillLinkLogo} alt="SkillLink Logo" className="h-10 object-contain transition-all duration-500 group-hover:scale-110 group-hover:rotate-6 brightness-0 invert" />
                            
                            <div className="relative flex items-center h-full pt-1">
                                <div className="flex text-2xl font-black tracking-tight">
                                    <span className="transition-colors duration-500 text-white group-hover:text-emerald-400">Ski</span>
                                    <span className="transition-colors duration-500 text-emerald-400 group-hover:text-white">Link</span>
                                </div>
                                
                                {/* Dynamic Underline that follows the green part */}
                                <div className="absolute -bottom-1 left-0 h-0.5 bg-emerald-400 transition-all duration-500 ease-out translate-x-[36px] w-[45px] group-hover:translate-x-0 group-hover:w-[36px]" />
                            </div>
                        </Link>
                    </div>

                    {/* Desktop Menu */}
                    <div className="hidden md:flex items-center space-x-8">
                        {navLinks.map((link) => (
                            <Link
                                key={link.name}
                                to={link.path}
                                className={`text-sm font-semibold tracking-wide transition-all duration-300 relative py-1 px-2 rounded-lg hover:bg-white/5 ${location.pathname === link.path
                                    ? 'text-emerald-400 bg-emerald-500/10 shadow-[0_0_15px_rgba(52,211,153,0.1)]'
                                    : 'text-gray-400 hover:text-white'
                                    }`}
                            >
                                {link.name}
                            </Link>
                        ))}

                        <div className="flex items-center gap-4 pl-4 border-l border-gray-200">
                            {user ? (
                                <div className="flex items-center gap-4">
                                    <button
                                        onClick={() => navigate('/inbox')}
                                        className="relative p-2 rounded-xl bg-white/5 hover:bg-white/10 text-emerald-400 transition-all duration-300"
                                        title="Inbox"
                                    >
                                        <Mail className="h-5 w-5" />
                                        {/* Notification Badge */}
                                        {unreadCount > 0 && (
                                            <span className="absolute top-0 right-0 inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-black leading-none text-white transform translate-x-1/4 -translate-y-1/4 bg-red-500 rounded-full animate-pulse shadow-lg border border-[#0b120f]">
                                                {unreadCount > 99 ? '99+' : unreadCount}
                                            </span>
                                        )}
                                    </button>
                                    <button
                                        onClick={() => navigate(user.role === 'retailer' ? '/retailer/profile' : '/student/profile')}
                                        className="hidden lg:flex flex-col items-end group"
                                    >
                                        <p className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors tracking-tight">{user.name}</p>
                                        <p className="text-[10px] text-emerald-500/70 uppercase tracking-tighter font-black">{user.role}</p>
                                    </button>
                                    <button
                                        onClick={handleLogout}
                                        className="p-2 rounded-xl bg-white/5 hover:bg-red-500/10 text-gray-400 hover:text-red-400 transition-all duration-300"
                                        title="Logout"
                                    >
                                        <LogOut className="h-5 w-5" />
                                    </button>
                                </div>
                            ) : (
                                <Link to="/" className="text-sm font-black text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 px-4 py-2 rounded-xl border border-emerald-500/20 transition-all">
                                    Login
                                </Link>
                            )}
                        </div>
                    </div>

                    {/* Mobile Menu Button */}
                    <div className="flex items-center md:hidden">
                        <button
                            onClick={() => setIsOpen(!isOpen)}
                            className="inline-flex items-center justify-center p-2 rounded-xl text-emerald-400 bg-emerald-500/5 border border-emerald-500/20 hover:bg-emerald-500/10 transition-all"
                        >
                            {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                        </button>
                    </div>
                </div>
            </div>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="md:hidden bg-[#0b120f] border-b border-white/5 overflow-hidden"
                    >
                        <div className="px-4 pt-2 pb-6 space-y-1">
                            {navLinks.map((link) => (
                                <Link
                                    key={link.name}
                                    to={link.path}
                                    onClick={() => setIsOpen(false)}
                                    className={`block px-4 py-4 rounded-2xl text-base font-bold transition-all ${location.pathname === link.path
                                        ? 'text-emerald-400 bg-emerald-500/10'
                                        : 'text-gray-400 hover:bg-white/5 hover:text-white'
                                        }`}
                                >
                                    {link.name}
                                </Link>
                            ))}
                            {user ? (
                                <div className="space-y-2 pt-4 border-t border-white/5 mt-4">
                                    <button
                                        onClick={() => {
                                            setIsOpen(false);
                                            navigate('/inbox');
                                        }}
                                        className="w-full flex items-center justify-between px-4 py-4 rounded-2xl text-base font-bold text-gray-400 hover:bg-white/5 hover:text-white transition-all"
                                    >
                                        <div className="flex items-center gap-3">
                                            <Mail size={20} />
                                            <span>Inbox</span>
                                        </div>
                                        {unreadCount > 0 && (
                                            <span className="bg-red-500 text-white text-xs font-black px-2 py-1 rounded-full shadow-lg">
                                                {unreadCount} NEW
                                            </span>
                                        )}
                                    </button>
                                    <button
                                        onClick={handleLogout}
                                        className="w-full text-left flex items-center gap-3 px-4 py-4 rounded-2xl text-base font-bold text-red-400 hover:bg-red-500/10 transition-all font-black"
                                    >
                                        <LogOut size={20} />
                                        Logout
                                    </button>
                                </div>
                            ) : (
                                <Link
                                    to="/"
                                    onClick={() => setIsOpen(false)}
                                    className="block px-4 py-4 mt-4 rounded-2xl text-center text-base font-black text-white bg-gradient-to-r from-emerald-500 to-green-600 shadow-xl"
                                >
                                    Login to SkillLink
                                </Link>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </nav>
    );
};

export default Navbar;
