import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Check, ArrowRight } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const SKILL_OPTIONS = [
    "Billing & Cashier",
    "Customer Service",
    "Inventory Management",
    "Delivery Driver",
    "Shelf Stocking",
    "Data Entry",
    "Technical Support",
    "Sales Associate",
    "Social Media Management",
    "Graphic Design",
    "Language Translation",
    "Tutoring"
];

const StudentSetup = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [selectedSkills, setSelectedSkills] = useState([]);
    const [saving, setSaving] = useState(false);
    const [darkMode, setDarkMode] = useState(true);

    useEffect(() => {
        if (!user || user.role !== "student") {
            navigate("/");
        }
    }, [user, navigate]);

    const toggleSkill = (skill) => {
        if (selectedSkills.includes(skill)) {
            setSelectedSkills(selectedSkills.filter(s => s !== skill));
        } else {
            setSelectedSkills([...selectedSkills, skill]);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await fetch(`http://localhost:8000/student/profile/${user.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ skills: selectedSkills })
            });
            if (res.ok) {
                navigate("/jobs");
            } else {
                alert("Failed to save skills");
            }
        } catch (error) {
            console.error(error);
            alert("Network error.");
        }
        setSaving(false);
    };

    return (
        <div className={`min-h-screen transition-all duration-700 flex items-center justify-center p-6
            ${darkMode ? 'dark-animated-gradient' : 'bg-gradient-to-br from-emerald-50 via-white to-green-100'}`}>
            <div className="max-w-2xl w-full bg-white/80 dark:bg-white/5 backdrop-blur-2xl p-10 rounded-3xl shadow-2xl border border-white/20 dark:border-white/5">
                <div className="text-center mb-10">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">Welcome to SkillLink! 🎉</h1>
                    <p className="text-gray-600 dark:text-emerald-100/70">Let's set up your profile. Select the skills you possess so retailers know what you bring to the table.</p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-10">
                    {SKILL_OPTIONS.map(skill => {
                        const isSelected = selectedSkills.includes(skill);
                        return (
                            <button
                                key={skill}
                                onClick={() => toggleSkill(skill)}
                                className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-2 text-sm font-bold text-center h-24 focus:outline-none focus:ring-2 focus:ring-emerald-500/40
                                    ${isSelected
                                        ? "bg-emerald-500/10 border-emerald-500 text-emerald-600 dark:text-emerald-400 shadow-md transform scale-105"
                                        : "bg-white/50 dark:bg-white/5 border-gray-100 dark:border-white/5 text-gray-600 dark:text-emerald-100/60 hover:border-emerald-300 dark:hover:border-emerald-500/50"
                                    }`}
                            >
                                {isSelected ? <Check size={20} className="text-emerald-500" /> : <span className="text-xl">+</span>}
                                {skill}
                            </button>
                        );
                    })}
                </div>

                <div className="flex justify-between items-center pt-6 border-t border-gray-200 dark:border-gray-700">
                    <button
                        onClick={() => navigate("/jobs")}
                        className="text-gray-500 dark:text-gray-400 font-bold hover:text-gray-900 dark:hover:text-white transition-colors"
                    >
                        Skip for now
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-8 py-3 bg-olive-600 hover:bg-olive-700 text-white font-bold rounded-xl shadow-lg transition-all flex justify-center items-center gap-2"
                    >
                        {saving ? "Saving..." : <>Save & Continue <ArrowRight size={18} /></>}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default StudentSetup;
