import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { GraduationCap, Menu, X, User, LogOut, Briefcase } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
    const [isOpen, setIsOpen] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();
    const { user, logout } = useAuth();

    // Fallback for demo if user not set via login page (e.g. direct url access)
    const isRetailerPath = location.pathname.includes('retailer');

    // Decide links based on User Role OR Path (if refreshed)
    const isRetailer = user?.role === 'retailer' || (!user && isRetailerPath);

    const navLinks = isRetailer
        ? [
            { name: 'Dashboard', path: '/retailer' },
            { name: 'Post Job', path: '/retailer/post-job' },
            { name: 'Applicants', path: '/retailer/applicants' },
        ]
        : [
            { name: 'Find Jobs', path: '/jobs' },
            { name: 'My Applications', path: '/student/applications' },
            { name: 'Profile', path: '/student/profile' },
        ];

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    return (
        <nav className="bg-white border-b border-gray-100 sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-20">
                    <div className="flex items-center">
                        <Link to={isRetailer ? "/retailer" : "/jobs"} className="flex items-center gap-2">
                            <div className="bg-olive-500 p-2.5 rounded-xl shadow-lg shadow-olive-500/20">
                                <GraduationCap className="h-6 w-6 text-white" />
                            </div>
                            <span className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 text-transparent bg-clip-text">
                                StudentWorks
                            </span>
                        </Link>
                    </div>

                    {/* Desktop Menu */}
                    <div className="hidden md:flex items-center space-x-8">
                        {navLinks.map((link) => (
                            <Link
                                key={link.name}
                                to={link.path}
                                className={`text-sm font-medium transition-colors duration-200 ${location.pathname === link.path
                                        ? 'text-olive-600'
                                        : 'text-gray-500 hover:text-gray-900'
                                    }`}
                            >
                                {link.name}
                            </Link>
                        ))}

                        <div className="flex items-center gap-4 pl-4 border-l border-gray-200">
                            {user ? (
                                <div className="flex items-center gap-4">
                                    <div className="text-right hidden lg:block">
                                        <p className="text-sm font-medium text-gray-900">{user.name}</p>
                                        <p className="text-xs text-gray-500 capitalize">{user.role}</p>
                                    </div>
                                    <button
                                        onClick={handleLogout}
                                        className="p-2 rounded-full hover:bg-gray-50 text-gray-500 hover:text-red-500 transition-colors"
                                        title="Logout"
                                    >
                                        <LogOut className="h-5 w-5" />
                                    </button>
                                </div>
                            ) : (
                                <Link to="/" className="text-sm font-medium text-olive-600 hover:text-olive-700">
                                    Login
                                </Link>
                            )}
                        </div>
                    </div>

                    {/* Mobile menu button */}
                    <div className="flex items-center md:hidden">
                        <button
                            onClick={() => setIsOpen(!isOpen)}
                            className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none"
                        >
                            {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Menu - Animated Slide Down */}
            <div className={`md:hidden bg-white border-b border-gray-100 overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
                <div className="px-4 py-4 space-y-2">
                    {navLinks.map((link) => (
                        <Link
                            key={link.name}
                            to={link.path}
                            className={`block px-4 py-3 rounded-xl text-base font-medium transition-colors ${location.pathname === link.path
                                    ? 'bg-olive-50 text-olive-700'
                                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                }`}
                            onClick={() => setIsOpen(false)}
                        >
                            {link.name}
                        </Link>
                    ))}
                    {user ? (
                        <button
                            onClick={handleLogout}
                            className="w-full text-left block px-4 py-3 rounded-xl text-base font-medium text-red-600 hover:bg-red-50 transition-colors"
                        >
                            Logout
                        </button>
                    ) : (
                        <Link
                            to="/"
                            onClick={() => setIsOpen(false)}
                            className="block px-4 py-3 rounded-xl text-base font-medium text-olive-700 bg-olive-50 hover:bg-olive-100 transition-colors"
                        >
                            Login
                        </Link>
                    )}
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
