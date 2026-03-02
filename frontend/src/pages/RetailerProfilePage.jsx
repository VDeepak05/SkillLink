import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { MapPin, Mail, Store, Save, Lock, Edit2, X, CheckCircle, User } from "lucide-react";
import { useNavigate } from "react-router-dom";

const RetailerProfilePage = () => {
    const { user, logout, login } = useAuth();
    const navigate = useNavigate();

    const [profile, setProfile] = useState(null);
    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [editedProfile, setEditedProfile] = useState({});
    const [savingProfile, setSavingProfile] = useState(false);

    // Password change state
    const [oldPassword, setOldPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [pwdStatus, setPwdStatus] = useState({ msg: "", type: "" });
    const [changingPwd, setChangingPwd] = useState(false);

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
        setSavingProfile(true);
        try {
            const res = await fetch(`http://localhost:8000/retailer/profile/${user.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    owner_name: editedProfile.owner_name,
                    shop_name: editedProfile.shop_name,
                    shop_type: editedProfile.shop_type,
                    location: editedProfile.location
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
                alert("Failed to update profile.");
            }
        } catch (error) {
            console.error("Profile save error:", error);
            alert("Network error while saving profile.");
        }
        setSavingProfile(false);
    };

    const handleChangePassword = async (e) => {
        e.preventDefault();
        setPwdStatus({ msg: "", type: "" });

        if (newPassword !== confirmPassword) {
            setPwdStatus({ msg: "New passwords do not match.", type: "error" });
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
                setPwdStatus({ msg: "Password changed successfully! Please log in again.", type: "success" });
                setOldPassword("");
                setNewPassword("");
                setConfirmPassword("");

                setTimeout(() => {
                    logout();
                    navigate("/");
                }, 2500);
            } else {
                const data = await res.json();
                setPwdStatus({ msg: data.detail || "Failed to change password.", type: "error" });
            }
        } catch (error) {
            console.error("Password change error:", error);
            setPwdStatus({ msg: "Network error.", type: "error" });
        }
        setChangingPwd(false);
    };

    if (!profile) return <div className="text-center py-20 font-bold text-gray-500">Loading profile...</div>;

    const isDarkMode = document.documentElement.classList.contains("dark") || localStorage.getItem("theme") === "dark";

    return (
        <div className={`min-h-screen pt-10 pb-20 ${isDarkMode ? "bg-slate-900 text-white" : "bg-gray-50 text-gray-900"} transition-colors duration-500`}>
            <div className="max-w-4xl mx-auto px-6">

                <h1 className="text-3xl font-bold mb-8 flex items-center gap-3">
                    <Store className="text-olive-600" size={32} />
                    Retailer Management Profile
                </h1>

                {/* Account / Business Information Card */}
                <div className={`rounded-3xl p-8 mb-8 border shadow-sm ${isDarkMode ? "bg-slate-800 border-slate-700" : "bg-white border-gray-100"}`}>
                    <div className="flex justify-between items-center mb-6 border-b pb-4">
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            Business Details
                            <span className="bg-emerald-100 text-emerald-700 text-sm py-1 px-3 ml-2 rounded-full flex items-center gap-1">
                                <CheckCircle size={14} /> Verified Account
                            </span>
                        </h2>
                        {!isEditingProfile ? (
                            <button
                                onClick={() => {
                                    setEditedProfile(profile);
                                    setIsEditingProfile(true);
                                }}
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-colors ${isDarkMode ? "bg-slate-700 hover:bg-slate-600 text-white" : "bg-gray-100 hover:bg-gray-200 text-gray-700"}`}
                            >
                                <Edit2 size={16} /> Edit Profile
                            </button>
                        ) : (
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setIsEditingProfile(false)}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-colors ${isDarkMode ? "bg-slate-700 hover:bg-slate-600 text-gray-300" : "bg-gray-100 hover:bg-gray-200 text-gray-600"}`}
                                >
                                    <X size={16} /> Cancel
                                </button>
                                <button
                                    onClick={handleSaveProfile}
                                    disabled={savingProfile}
                                    className="bg-olive-600 hover:bg-olive-700 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-md"
                                >
                                    {savingProfile ? "Saving..." : <><Save size={16} /> Save</>}
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <InfoRow
                            icon={<User size={18} />}
                            label="Owner Name"
                            name="owner_name"
                            value={isEditingProfile ? editedProfile.owner_name : profile.owner_name}
                            dark={isDarkMode}
                            isEditing={isEditingProfile}
                            onChange={handleProfileChange}
                        />
                        <InfoRow
                            icon={<Store size={18} />}
                            label="Shop Name"
                            name="shop_name"
                            value={isEditingProfile ? editedProfile.shop_name : profile.shop_name}
                            dark={isDarkMode}
                            isEditing={isEditingProfile}
                            onChange={handleProfileChange}
                        />
                        <InfoRow
                            icon={<Mail size={18} />}
                            label="Email Address"
                            name="email"
                            value={profile.email}
                            dark={isDarkMode}
                            isEditing={false} // Usually don't allow email edits
                        />
                        <InfoRow
                            icon={<Store size={18} />}
                            label="Shop Category"
                            name="shop_type"
                            value={isEditingProfile ? editedProfile.shop_type : profile.shop_type}
                            dark={isDarkMode}
                            isEditing={isEditingProfile}
                            onChange={handleProfileChange}
                            isSelect={true}
                        />
                        <InfoRow
                            icon={<Store size={18} />}
                            label="Shop ID (Registration)"
                            name="shop_id"
                            value={profile.shop_id}
                            dark={isDarkMode}
                            isEditing={false} // Usually don't allow shop ID edits
                        />
                        <InfoRow
                            icon={<MapPin size={18} />}
                            label="Location Area"
                            name="location"
                            value={isEditingProfile ? editedProfile.location : profile.location}
                            dark={isDarkMode}
                            isEditing={isEditingProfile}
                            onChange={handleProfileChange}
                        />
                    </div>
                </div>

                {/* Change Password Section */}
                <div className={`rounded-3xl p-8 border shadow-sm ${isDarkMode ? "bg-slate-800 border-slate-700" : "bg-white border-gray-100"}`}>
                    <h2 className="text-xl font-bold mb-6 border-b pb-4 flex items-center gap-2">
                        <Lock size={20} className="text-gray-400" />
                        Change Password
                    </h2>

                    {pwdStatus.msg && (
                        <div className={`p-4 rounded-xl mb-6 font-bold text-sm ${pwdStatus.type === 'error' ? 'bg-red-500/10 text-red-500 border border-red-500/30' : 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/30'}`}>
                            {pwdStatus.msg}
                        </div>
                    )}

                    <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
                        <div>
                            <label className={`block text-sm font-bold mb-2 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>Current Password</label>
                            <input
                                type="password"
                                value={oldPassword}
                                onChange={(e) => setOldPassword(e.target.value)}
                                required
                                className={`w-full px-4 py-3 rounded-xl border focus:outline-none transition-colors ${isDarkMode ? "bg-slate-900 border-slate-600 focus:border-olive-500" : "bg-gray-50 border-gray-200 focus:border-olive-500"}`}
                            />
                        </div>
                        <div>
                            <label className={`block text-sm font-bold mb-2 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>New Password</label>
                            <input
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                required
                                className={`w-full px-4 py-3 rounded-xl border focus:outline-none transition-colors ${isDarkMode ? "bg-slate-900 border-slate-600 focus:border-olive-500" : "bg-gray-50 border-gray-200 focus:border-olive-500"}`}
                            />
                        </div>
                        <div>
                            <label className={`block text-sm font-bold mb-2 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>Confirm New Password</label>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                className={`w-full px-4 py-3 rounded-xl border focus:outline-none transition-colors ${isDarkMode ? "bg-slate-900 border-slate-600 focus:border-olive-500" : "bg-gray-50 border-gray-200 focus:border-olive-500"}`}
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={changingPwd}
                            className="w-full mt-4 bg-gray-900 hover:bg-black text-white px-5 py-3 rounded-xl font-bold transition-all shadow-md dark:bg-slate-700 dark:hover:bg-slate-600"
                        >
                            {changingPwd ? "Updating..." : "Update Password"}
                        </button>
                    </form>
                </div>

            </div>
        </div>
    );
};

const InfoRow = ({ icon, label, name, value, dark, isEditing, onChange, type = "text", isSelect }) => (
    <div className="flex items-start gap-4">
        <div className={`p-3 rounded-xl ${dark ? "bg-slate-700 text-emerald-400" : "bg-emerald-50 text-emerald-600"}`}>
            {icon}
        </div>
        <div className="flex-1 w-full">
            <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${dark ? "text-gray-400" : "text-gray-500"}`}>{label}</p>
            {isEditing ? (
                isSelect ? (
                    <select
                        name={name}
                        value={value || ""}
                        onChange={onChange}
                        className={`w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-olive-500 transition-colors ${dark ? "bg-slate-900 border-slate-600 text-white" : "bg-white border-gray-300 text-gray-900"}`}
                    >
                        <option value="Supermarket">Supermarket</option>
                        <option value="Bakery">Bakery</option>
                        <option value="Clothing Store">Clothing Store</option>
                        <option value="Cafe">Cafe</option>
                        <option value="Other">Other</option>
                    </select>
                ) : (
                    <input
                        type={type}
                        name={name}
                        value={value || ''}
                        onChange={onChange}
                        className={`w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-olive-500 transition-colors ${dark ? "bg-slate-900 border-slate-600 text-white" : "bg-white border-gray-300 text-gray-900"}`}
                    />
                )
            ) : (
                <p className={`font-semibold text-lg ${dark ? "text-white" : "text-gray-900"}`}>{value || "Not provided"}</p>
            )}
        </div>
    </div>
);

export default RetailerProfilePage;
