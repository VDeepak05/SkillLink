import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { User, Mail, Phone, Calendar, BookOpen, Hash, Check, Save, Lock, Edit2, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

const SKILL_OPTIONS = [
    "Billing & Cashier", "Customer Service", "Inventory Management",
    "Delivery Driver", "Shelf Stocking", "Data Entry",
    "Technical Support", "Sales Associate", "Social Media Management",
    "Graphic Design", "Language Translation", "Tutoring"
];

const StudentProfilePage = () => {
    const { user, logout, login } = useAuth();
    const navigate = useNavigate();

    const [profile, setProfile] = useState(null);
    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [editedProfile, setEditedProfile] = useState({});
    const [savingProfile, setSavingProfile] = useState(false);
    const [profileErrorMsgs, setProfileErrorMsgs] = useState("");

    const [selectedSkills, setSelectedSkills] = useState([]);
    const [savingSkills, setSavingSkills] = useState(false);

    // Password change state
    const [oldPassword, setOldPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [pwdStatus, setPwdStatus] = useState({ msg: "", type: "" });
    const [changingPwd, setChangingPwd] = useState(false);

    useEffect(() => {
        if (!user || user.role !== "student") {
            navigate("/");
            return;
        }

        const fetchProfile = async () => {
            try {
                const res = await fetch(`http://localhost:8000/student/profile/${user.id}`);
                if (res.ok) {
                    const data = await res.json();
                    setProfile(data.profile);
                    setEditedProfile(data.profile);
                    setSelectedSkills(data.profile.skills || []);
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

        // Age validation
        if (editedProfile.dob) {
            const today = new Date();
            const birthDate = new Date(editedProfile.dob);
            let age = today.getFullYear() - birthDate.getFullYear();
            const m = today.getMonth() - birthDate.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
                age--;
            }
            if (age < 18) {
                setProfileErrorMsgs("Age cannot be less than 18");
                return;
            }
        }

        setSavingProfile(true);
        try {
            const res = await fetch(`http://localhost:8000/student/profile/${user.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: editedProfile.name,
                    phone_no: editedProfile.phone_no,
                    dob: editedProfile.dob,
                    college: editedProfile.college,
                    college_reg_no: editedProfile.college_reg_no
                })
            });
            if (res.ok) {
                setProfile(editedProfile);
                setIsEditingProfile(false);
                // Also update User context name if it changed
                if (editedProfile.name !== user.name) {
                    login({ ...user, name: editedProfile.name });
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

    const toggleSkill = (skill) => {
        if (selectedSkills.includes(skill)) {
            setSelectedSkills(selectedSkills.filter(s => s !== skill));
        } else {
            setSelectedSkills([...selectedSkills, skill]);
        }
    };

    const handleSaveSkills = async () => {
        setSavingSkills(true);
        try {
            const res = await fetch(`http://localhost:8000/student/profile/${user.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ skills: selectedSkills })
            });
            if (res.ok) {
                alert("Skills update successful!");
            }
        } catch (error) {
            console.error("Skills save error:", error);
        }
        setSavingSkills(false);
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
            const res = await fetch(`http://localhost:8000/student/password/${user.id}`, {
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

    // Sort skills so selected ones are at the top
    const sortedSkills = [...SKILL_OPTIONS].sort((a, b) => {
        if (selectedSkills.includes(a) && !selectedSkills.includes(b)) return -1;
        if (!selectedSkills.includes(a) && selectedSkills.includes(b)) return 1;
        return 0;
    });

    return (
        <div className={`min-h-screen pt-10 pb-20 ${isDarkMode ? "bg-slate-900 text-white" : "bg-gray-50 text-gray-900"} transition-colors duration-500`}>
            <div className="max-w-4xl mx-auto px-6">

                <h1 className="text-3xl font-bold mb-8 flex items-center gap-3">
                    <User className="text-olive-600" size={32} />
                    Student Profile
                </h1>

                {/* Personal Information Card */}
                <div className={`rounded-3xl p-8 mb-8 border shadow-sm ${isDarkMode ? "bg-slate-800 border-slate-700" : "bg-white border-gray-100"}`}>
                    <div className="flex justify-between items-center mb-6 border-b pb-4">
                        <h2 className="text-xl font-bold flex items-center gap-2">Personal Information</h2>
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
                                    onClick={() => {
                                        setIsEditingProfile(false);
                                        setProfileErrorMsgs("");
                                    }}
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

                    {profileErrorMsgs && (
                        <div className="mb-6 p-3 rounded-xl bg-red-500/20 border border-red-500/50 text-red-500 text-sm text-center font-bold">
                            {profileErrorMsgs}
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <InfoRow
                            icon={<User size={18} />}
                            label="Full Name"
                            name="name"
                            value={isEditingProfile ? editedProfile.name : profile.name}
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
                            isEditing={false} // Email shouldn't be editable here usually
                        />
                        <InfoRow
                            icon={<Phone size={18} />}
                            label="Phone Number"
                            name="phone_no"
                            value={isEditingProfile ? editedProfile.phone_no : profile.phone_no}
                            dark={isDarkMode}
                            isEditing={isEditingProfile}
                            onChange={handleProfileChange}
                        />
                        <InfoRow
                            icon={<Calendar size={18} />}
                            label="Date of Birth"
                            name="dob"
                            value={isEditingProfile ? editedProfile.dob : profile.dob}
                            dark={isDarkMode}
                            isEditing={isEditingProfile}
                            customInput={isEditingProfile && (
                                <DatePicker
                                    selected={editedProfile.dob ? new Date(editedProfile.dob) : null}
                                    onChange={(date) => {
                                        if (date) {
                                            const year = date.getFullYear();
                                            const month = String(date.getMonth() + 1).padStart(2, '0');
                                            const day = String(date.getDate()).padStart(2, '0');
                                            handleProfileChange({ target: { name: 'dob', value: `${year}-${month}-${day}` } });
                                        } else {
                                            handleProfileChange({ target: { name: 'dob', value: '' } });
                                        }
                                    }}
                                    dateFormat="yyyy-MM-dd"
                                    placeholderText="Date of Birth"
                                    maxDate={new Date()}
                                    showYearDropdown
                                    scrollableYearDropdown
                                    yearDropdownItemNumber={100}
                                    className={`w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-olive-500 transition-colors ${isDarkMode ? "bg-slate-900 border-slate-600 text-white" : "bg-white border-gray-300 text-gray-900"}`}
                                    wrapperClassName="w-full"
                                    required
                                />
                            )}
                        />
                        <InfoRow
                            icon={<BookOpen size={18} />}
                            label="College Name"
                            name="college"
                            value={isEditingProfile ? editedProfile.college : profile.college}
                            dark={isDarkMode}
                            isEditing={isEditingProfile}
                            onChange={handleProfileChange}
                        />
                        <InfoRow
                            icon={<Hash size={18} />}
                            label="Registration No."
                            name="college_reg_no"
                            value={isEditingProfile ? editedProfile.college_reg_no : profile.college_reg_no}
                            dark={isDarkMode}
                            isEditing={isEditingProfile}
                            onChange={handleProfileChange}
                        />
                    </div>
                </div>

                {/* Skills Section */}
                <div className={`rounded-3xl p-8 mb-8 border shadow-sm ${isDarkMode ? "bg-slate-800 border-slate-700" : "bg-white border-gray-100"}`}>
                    <div className="flex justify-between items-center mb-6 border-b pb-4">
                        <h2 className="text-xl font-bold">My Skills</h2>
                        <button
                            onClick={handleSaveSkills}
                            disabled={savingSkills}
                            className="bg-olive-600 hover:bg-olive-700 text-white px-5 py-2 rounded-xl font-bold flex gap-2 transition-all shadow-md"
                        >
                            {savingSkills ? "Saving..." : <><Save size={18} /> Save Skills</>}
                        </button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                        {sortedSkills.map(skill => {
                            const isSelected = selectedSkills.includes(skill);
                            return (
                                <button
                                    key={skill}
                                    onClick={() => toggleSkill(skill)}
                                    className={`p-3 rounded-xl border transition-all flex flex-col items-center justify-center gap-1 text-xs font-bold text-center h-20
                                        ${isSelected
                                            ? "bg-emerald-500/10 border-emerald-500 text-emerald-600 shadow-sm"
                                            : `${isDarkMode ? "bg-slate-700/50 border-slate-600 hover:border-emerald-500 hover:text-emerald-400" : "bg-gray-50 border-gray-200 hover:border-emerald-400 hover:text-emerald-600 text-gray-600"}`
                                        }`}
                                >
                                    {isSelected ? <Check size={16} /> : <span>+</span>}
                                    {skill}
                                </button>
                            );
                        })}
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

const InfoRow = ({ icon, label, name, value, dark, isEditing, onChange, type = "text", customInput }) => (
    <div className="flex items-start gap-4">
        <div className={`p-3 rounded-xl ${dark ? "bg-slate-700 text-emerald-400" : "bg-emerald-50 text-emerald-600"}`}>
            {icon}
        </div>
        <div className="flex-1 w-full max-w-full">
            <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${dark ? "text-gray-400" : "text-gray-500"}`}>{label}</p>
            {isEditing ? (
                customInput ? customInput : (
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

export default StudentProfilePage;
