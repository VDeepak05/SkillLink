import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { Store, User, Mail, MapPin, Hash, Phone, Check, Save, Lock, Edit2, X, AlertCircle, Loader2, CheckCircle2, Sun, Moon, Settings } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

const RetailerProfilePage = () => {
    const { user, logout, login } = useAuth();
    const navigate = useNavigate();

    const [profile, setProfile] = useState(null);
    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [editedProfile, setEditedProfile] = useState({});
    const [savingProfile, setSavingProfile] = useState(false);
    const [profileErrorMsgs, setProfileErrorMsgs] = useState("");

    // Password change state
    const [oldPassword, setOldPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [pwdStatus, setPwdStatus] = useState({ msg: "", type: "" });
    const [changingPwd, setChangingPwd] = useState(false);

    // Theme State
    const [darkMode, setDarkMode] = useState(() => {
        const themeKey = user ? `skilllink_theme_${user.id}` : "skilllink_theme_global";
        const saved = localStorage.getItem(themeKey) || localStorage.getItem("skilllink_theme_global");
        return saved !== "light"; // Default to dark
    });

    const toggleTheme = () => {
        const newMode = !darkMode;
        setDarkMode(newMode);
        const themeKey = user ? `skilllink_theme_${user.id}` : "skilllink_theme_global";
        localStorage.setItem(themeKey, newMode ? "dark" : "light");
    };

    useEffect(() => {
        if (!user || user.role !== "retailer") {
            navigate("/");
            return;
        }

        const fetchProfile = async () => {
            try {
                // We use the new /retailer/profile GET route
                const res = await fetch(`http://localhost:8000/retailer/profile/${user.id}`);
                if (res.ok) {
                    const data = await res.json();
                    setProfile(data.profile);
                    setEditedProfile(data.profile);
                }
            } catch (error) {
                console.error("Failed to load profile:", error);
            }
        };

        fetchProfile();
    }, [user, navigate]);

    const handleProfileChange = (e) => {
        const { name, value } = e.target;
        setEditedProfile(prev => ({ ...prev, [name]: value }));
    };

    const handleSaveProfile = async () => {
        setProfileErrorMsgs("");
        setSavingProfile(true);
        try {
            const res = await fetch(`http://localhost:8000/retailer/profile/${user.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    owner_name: editedProfile.owner_name,
                    shop_name: editedProfile.shop_name,
                    shop_type: editedProfile.shop_type,
                    location: editedProfile.location,
                    phone_no: editedProfile.phone_no
                })
            });
            if (res.ok) {
                setProfile(editedProfile);
                setIsEditingProfile(false);
                // Also update User context name if it changed
                if (editedProfile.owner_name !== user.name) {
                    login({ ...user, name: editedProfile.owner_name });
                }
            } else {
                setProfileErrorMsgs("Failed to update profile.");
            }
        } catch (error) {
            console.error("Profile save error:", error);
            setProfileErrorMsgs("Network error while saving profile.");
        }
        setSavingProfile(false);
    };

    const handleChangePassword = async (e) => {
        e.preventDefault();
        setPwdStatus({ msg: "", type: "" });

        if (newPassword !== confirmPassword) {
            setPwdStatus({ msg: "Passwords do not match.", type: "error" });
            return;
        }

        if (newPassword.length < 6) {
            setPwdStatus({ msg: "New password must be at least 6 characters.", type: "error" });
            return;
        }

        setChangingPwd(true);
        try {
            const res = await fetch(`http://localhost:8000/retailer/password/${user.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ old_password: oldPassword, new_password: newPassword })
            });

            if (res.ok) {
                setPwdStatus({ msg: "Success! Logging you out for security.", type: "success" });
                setOldPassword("");
                setNewPassword("");
                setConfirmPassword("");

                setTimeout(() => {
                    logout();
                    navigate("/");
                }, 2000);
            } else {
                const data = await res.json();
                setPwdStatus({ msg: data.detail || "Update failed.", type: "error" });
            }
        } catch (error) {
            console.error("Password change error:", error);
            setPwdStatus({ msg: "Network error.", type: "error" });
        }
        setChangingPwd(false);
    };

    if (!profile) return (
        <div className="min-h-screen dark-animated-gradient flex items-center justify-center">
            <Loader2 className="h-12 w-12 text-emerald-500 animate-spin" />
        </div>
    );

    return (
        <div className={`min-h-screen transition-all duration-700 ${darkMode ? "dark-animated-gradient" : "bg-gradient-to-br from-emerald-50 via-white to-green-100"} py-12 px-6`}>
            <div className="max-w-4xl mx-auto">

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex justify-between items-end mb-12"
                >
                    <div>
                        <h1 className={`text-4xl font-extrabold mb-2 ${darkMode ? "text-white" : "text-gray-900"}`}>Business Profile</h1>
                        <p className={`${darkMode ? "text-emerald-400" : "text-emerald-600"} font-medium font-outfit italic tracking-wide`}>Manage your retailer credentials</p>
                    </div>
                </motion.div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* Left Column - Business Info & Security */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 }}
                        className="lg:col-span-2 space-y-8"
                    >
                        <div className={`${darkMode ? "bg-white/10 border-white/20" : "bg-white/80 border-gray-200"} backdrop-blur-md border rounded-3xl p-8 shadow-2xl relative overflow-hidden group transition-all duration-500`}>
                            <div className="absolute top-0 right-0 p-6">
                                {!isEditingProfile ? (
                                    <button
                                        onClick={() => {
                                            setEditedProfile(profile);
                                            setIsEditingProfile(true);
                                        }}
                                        className="bg-white/5 hover:bg-emerald-500/20 p-3 rounded-2xl transition-all text-emerald-400 border border-white/5 hover:border-emerald-500/30"
                                    >
                                        <Edit2 size={20} />
                                    </button>
                                ) : (
                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => {
                                                setIsEditingProfile(false);
                                                setProfileErrorMsgs("");
                                            }}
                                            className="bg-white/5 hover:bg-red-500/20 p-3 rounded-2xl transition-all text-red-400 border border-white/5 hover:border-red-500/30"
                                        >
                                            <X size={20} />
                                        </button>
                                        <button
                                            onClick={handleSaveProfile}
                                            disabled={savingProfile}
                                            className="bg-emerald-500 hover:bg-emerald-600 p-3 rounded-2xl transition-all text-white shadow-lg shadow-emerald-500/20"
                                        >
                                            {savingProfile ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                                        </button>
                                    </div>
                                )}
                            </div>

                            <h2 className={`text-xl font-bold mb-8 flex items-center gap-3 ${darkMode ? "text-white" : "text-gray-900"}`}>
                                <span className={`p-2 rounded-lg ${darkMode ? "bg-emerald-500/20 text-emerald-400" : "bg-emerald-100 text-emerald-600"}`}><Store size={20} /></span>
                                Business Details
                            </h2>

                            {profileErrorMsgs && (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-8 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm font-bold flex items-center gap-3">
                                    <AlertCircle size={18} />
                                    {profileErrorMsgs}
                                </motion.div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-10">
                                <ProfileField icon={<User />} label="Owner Name" name="owner_name" value={isEditingProfile ? editedProfile.owner_name : profile.owner_name} editing={isEditingProfile} onChange={handleProfileChange} darkMode={darkMode} />
                                <ProfileField icon={<Store />} label="Shop Name" name="shop_name" value={isEditingProfile ? editedProfile.shop_name : profile.shop_name} editing={isEditingProfile} onChange={handleProfileChange} darkMode={darkMode} />
                                <ProfileField icon={<Mail />} label="Email" name="email" value={profile.email} editing={false} darkMode={darkMode} />
                                <ProfileField icon={<Store />} label="Category" name="shop_type" value={isEditingProfile ? editedProfile.shop_type : profile.shop_type} editing={isEditingProfile} onChange={handleProfileChange} type="select" darkMode={darkMode} />
                                <ProfileField icon={<Hash />} label="Shop ID" name="shop_id" value={profile.shop_id} editing={false} darkMode={darkMode} />
                                <ProfileField icon={<MapPin />} label="Location" name="location" value={isEditingProfile ? editedProfile.location : profile.location} editing={isEditingProfile} onChange={handleProfileChange} darkMode={darkMode} />
                                <ProfileField icon={<Phone />} label="Phone Number" name="phone_no" value={isEditingProfile ? editedProfile.phone_no : profile.phone_no} editing={isEditingProfile} onChange={handleProfileChange} type="tel" darkMode={darkMode} />
                            </div>
                        </div>

                        {/* Password Change Card (Moved Below Profile) */}
                        <div className={`${darkMode ? "bg-white/10 border-white/20" : "bg-white/80 border-gray-200"} backdrop-blur-md border rounded-3xl p-8 shadow-2xl transition-all duration-500`}>
                            <h2 className={`text-xl font-bold mb-6 flex items-center gap-3 ${darkMode ? "text-white" : "text-gray-900"}`}>
                                <span className={`p-2 rounded-lg ${darkMode ? "bg-white/5 text-gray-400" : "bg-gray-100 text-gray-500"}`}><Lock size={20} /></span>
                                Security
                            </h2>

                            {pwdStatus.msg && (
                                <div className={`p-4 rounded-2xl mb-6 text-xs font-bold border ${pwdStatus.type === 'error' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>
                                    {pwdStatus.msg}
                                </div>
                            )}

                            <form onSubmit={handleChangePassword} className="space-y-5">
                                <div className="space-y-2">
                                    <label className={`text-xs font-bold uppercase tracking-widest ml-1 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>Current Password</label>
                                    <input type="password" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} required className={`w-full border rounded-2xl px-5 py-3.5 focus:outline-none focus:border-emerald-500/50 transition-all ${darkMode ? "bg-white/5 border-white/10 text-white" : "bg-gray-50 border-gray-200 text-gray-900"}`} />
                                </div>
                                <div className="space-y-2">
                                    <label className={`text-xs font-bold uppercase tracking-widest ml-1 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>New Password</label>
                                    <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required className={`w-full border rounded-2xl px-5 py-3.5 focus:outline-none focus:border-emerald-500/50 transition-all font-outfit ${darkMode ? "bg-white/5 border-white/10 text-white" : "bg-gray-50 border-gray-200 text-gray-900"}`} />
                                </div>
                                <div className="space-y-2">
                                    <label className={`text-xs font-bold uppercase tracking-widest ml-1 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>Confirm New</label>
                                    <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required className={`w-full border rounded-2xl px-5 py-3.5 focus:outline-none focus:border-emerald-500/50 transition-all ${darkMode ? "bg-white/5 border-white/10 text-white" : "bg-gray-50 border-gray-200 text-gray-900"}`} />
                                </div>
                                <button
                                    type="submit"
                                    disabled={changingPwd}
                                    className={`w-full border rounded-2xl px-5 py-4 font-bold transition-all shadow-xl flex items-center justify-center gap-2 group ${darkMode ? "bg-white/5 hover:bg-white/10 border-white/10 text-white" : "bg-white hover:bg-gray-50 border-gray-200 text-gray-900"}`}
                                >
                                    {changingPwd ? <Loader2 className="animate-spin" size={20} /> : "Update Credentials"}
                                </button>
                            </form>
                        </div>
                    </motion.div>

                    {/* Right Column - Account Status & Settings */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 }}
                        className="space-y-8"
                    >
                        {/* Display Settings Card */}
                        <div className={`${darkMode ? "bg-white/10 border-white/20" : "bg-white/80 border-gray-200"} backdrop-blur-md border rounded-3xl p-8 shadow-2xl transition-all duration-500 mb-8`}>
                            <h2 className={`text-xl font-bold mb-6 flex items-center gap-3 ${darkMode ? "text-white" : "text-gray-900"}`}>
                                <span className={`p-2 rounded-lg ${darkMode ? "bg-white/5 text-gray-400" : "bg-gray-100 text-gray-500"}`}>
                                    <Settings size={20} />
                                </span>
                                Display Settings
                            </h2>

                            <div className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${darkMode ? "bg-white/5 border-white/5" : "bg-gray-50/50 border-gray-100"}`}>
                                <div className="flex items-center gap-3">
                                    <div className={`p-2.5 rounded-xl transition-all ${darkMode ? "bg-yellow-500/20 text-yellow-400" : "bg-indigo-500/10 text-indigo-600"}`}>
                                        {darkMode ? <Moon size={20} /> : <Sun size={20} />}
                                    </div>
                                    <div>
                                        <p className={`text-sm font-bold ${darkMode ? "text-white" : "text-gray-900"}`}>Appearance</p>
                                        <p className="text-xs text-gray-500 font-medium">{darkMode ? "Dark Mode" : "Light Mode"}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={toggleTheme}
                                    className={`relative w-14 h-7 rounded-full transition-all duration-300 outline-none
                                        ${darkMode ? "bg-emerald-500" : "bg-gray-300"}`}
                                >
                                    <div className={`absolute top-1 left-1 bg-white w-5 h-5 rounded-full transition-all duration-500 shadow-lg flex items-center justify-center
                                        ${darkMode ? "translate-x-7 rotate-0" : "translate-x-0 rotate-180"}`}
                                    >
                                        {darkMode ? <Moon size={12} className="text-emerald-500" /> : <Sun size={12} className="text-gray-400" />}
                                    </div>
                                </button>
                            </div>
                        </div>

                        {/* Status Card */}
                        <div className={`${darkMode ? "bg-emerald-500/10 border-emerald-500/20" : "bg-emerald-50 border-emerald-100"} backdrop-blur-md border rounded-3xl p-8 shadow-2xl transition-all duration-500`}>
                            <div className="flex items-center gap-4 mb-6">
                                <div className={`p-3 rounded-2xl ${darkMode ? "bg-emerald-500/20 text-emerald-400" : "bg-white shadow-sm text-emerald-600"}`}>
                                    <Store size={24} />
                                </div>
                                <div>
                                    <p className={`text-xs font-bold uppercase tracking-widest ${darkMode ? "text-emerald-500/60" : "text-emerald-600/60"}`}>Account Status</p>
                                    <p className={`text-lg font-bold ${darkMode ? "text-white" : "text-emerald-700"}`}>Verified Retailer</p>
                                </div>
                            </div>
                            <p className={`text-sm leading-relaxed ${darkMode ? "text-gray-400" : "text-gray-600 font-medium"}`}>
                                Your business profile is active. You can now post job listings and recruit potential candidates.
                            </p>
                        </div>
                    </motion.div>
                </div>
            </div>
        </div>
    );
};

const ProfileField = ({ icon, label, name, value, editing, onChange, type = "text", darkMode = true }) => (
    <div className="space-y-3 group/field">
        <label className={`flex items-center gap-2 text-xs font-bold uppercase tracking-widest ml-1 transform transition-transform group-focus-within/field:translate-x-1 ${darkMode ? "text-emerald-500/60" : "text-emerald-600/70"}`}>
            <span className={darkMode ? "text-emerald-500" : "text-emerald-600"}>{React.cloneElement(icon, { size: 14 })}</span>
            {label}
        </label>
        {editing ? (
            type === "select" ? (
                <select
                    name={name}
                    value={value || ""}
                    onChange={onChange}
                    className={`w-full border rounded-2xl px-5 py-3.5 focus:outline-none focus:border-emerald-500/50 transition-all text-sm font-medium ${darkMode ? "bg-white/5 border-white/10 text-white" : "bg-gray-50 border-gray-200 text-gray-900"}`}
                >
                    <option value="Supermarket" className="text-gray-900">Supermarket</option>
                    <option value="Bakery" className="text-gray-900">Bakery</option>
                    <option value="Clothing Store" className="text-gray-900">Clothing Store</option>
                    <option value="Cafe" className="text-gray-900">Cafe</option>
                    <option value="Other" className="text-gray-900">Other</option>
                </select>
            ) : (
                <input
                    type={type}
                    name={name}
                    value={value || ''}
                    onChange={onChange}
                    className={`w-full border rounded-2xl px-5 py-3.5 focus:outline-none focus:border-emerald-500/50 transition-all text-sm font-medium ${darkMode ? "bg-white/5 border-white/10 text-white" : "bg-gray-50 border-gray-200 text-gray-900"}`}
                />
            )
        ) : (
            <div className="px-1">
                <p className={`text-lg font-bold tracking-tight ${darkMode ? "text-white" : "text-gray-900"}`}>{value || "—"}</p>
            </div>
        )}
    </div>
);

export default RetailerProfilePage;
