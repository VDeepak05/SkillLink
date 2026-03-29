import React, { useState, useEffect } from 'react';
import { ArrowLeft, Save, Check } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const SKILL_OPTIONS = [
    "Billing & Cashier", "Customer Service", "Inventory Management",
    "Delivery Driver", "Shelf Stocking", "Data Entry",
    "Technical Support", "Sales Associate", "Social Media Management",
    "Graphic Design", "Language Translation", "Tutoring"
];

const PostJob = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [formData, setFormData] = useState({
        jobTitle: '',
        shopType: 'Supermarket',
        salaryPerDay: '',
        shiftType: 'Evening (4 hours)',
        openings: 1,
        isSeasonal: false,
        description: '',
        skills: []
    });
    const [loading, setLoading] = useState(false);

    // Theme State
    const [darkMode, setDarkMode] = useState(true);

    useEffect(() => {
        const savedTheme = localStorage.getItem("theme");
        setDarkMode(savedTheme !== "light"); // Default to dark if not set to light
    }, []);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const toggleSkill = (skill) => {
        setFormData(prev => {
            const currentSkills = prev.skills || [];
            if (currentSkills.includes(skill)) {
                return { ...prev, skills: currentSkills.filter(s => s !== skill) };
            } else {
                return { ...prev, skills: [...currentSkills, skill] };
            }
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const res = await fetch('http://localhost:8000/jobs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    retailer_id: user?.id || "ret_mock456", // Use actual logged in user ID
                    job_title: formData.jobTitle,
                    shop_type: formData.shopType,
                    salary_per_day: parseInt(formData.salaryPerDay),
                    shift_type: formData.shiftType,
                    openings: parseInt(formData.openings),
                    is_seasonal: formData.isSeasonal,
                    description: formData.description,
                    skills: formData.skills || []
                })
            });

            if (res.ok) {
                navigate('/retailer');
            } else {
                alert('Failed to post job');
            }
        } catch (error) {
            console.error(error);
            alert('An error occurred while posting the job.');
        }
        setLoading(false);
    };

    return (
        <div className={`min-h-screen transition-all duration-700 ${darkMode ? "dark-animated-gradient" : "bg-gradient-to-br from-emerald-50 via-white to-green-100"} py-8`}>
            <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
                <Link to="/retailer" className={`inline-flex items-center mb-6 transition-colors font-bold ${darkMode ? "text-gray-400 hover:text-emerald-400" : "text-gray-500 hover:text-olive-600"}`}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Dashboard
                </Link>

                <div className={`${darkMode ? "bg-white/10 border-white/20" : "bg-white border-gray-100"} rounded-3xl shadow-2xl backdrop-blur-xl border overflow-hidden transition-all duration-500`}>
                    <div className={`p-8 border-b ${darkMode ? "border-white/10 bg-white/5" : "border-gray-100 bg-gray-50/80"}`}>
                        <h1 className={`text-3xl font-extrabold ${darkMode ? "text-white" : "text-gray-900"}`}>Post a New Job</h1>
                        <p className={`mt-2 font-medium ${darkMode ? "text-emerald-400/80" : "text-gray-500"}`}>Fill in the details to find the best student for your shop.</p>
                    </div>

                    <form onSubmit={handleSubmit} className="p-8 space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="md:col-span-2">
                                <label className={`block text-xs font-bold uppercase tracking-widest mb-2 ml-1 ${darkMode ? "text-gray-400" : "text-gray-700"}`}>Job Title</label>
                                <input type="text" name="jobTitle" value={formData.jobTitle} onChange={handleChange} placeholder="e.g. Evening Cashier" className={`w-full px-5 py-3.5 rounded-2xl border focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all font-medium ${darkMode ? "bg-white/5 border-white/10 text-white placeholder-gray-500" : "bg-white border-gray-300 focus:border-olive-500 text-gray-900"}`} required />
                            </div>

                            <div>
                                <label className={`block text-xs font-bold uppercase tracking-widest mb-2 ml-1 ${darkMode ? "text-gray-400" : "text-gray-700"}`}>Shop Type</label>
                                <select name="shopType" value={formData.shopType} onChange={handleChange} className={`w-full px-5 py-3.5 rounded-2xl border cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all font-medium appearance-none ${darkMode ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-300 focus:border-olive-500 text-gray-900"}`}>
                                    <option className={darkMode ? "bg-[#0b120f] text-white" : ""}>Supermarket</option>
                                    <option className={darkMode ? "bg-[#0b120f] text-white" : ""}>Bakery</option>
                                    <option className={darkMode ? "bg-[#0b120f] text-white" : ""}>Clothing Store</option>
                                    <option className={darkMode ? "bg-[#0b120f] text-white" : ""}>Cafe</option>
                                    <option className={darkMode ? "bg-[#0b120f] text-white" : ""}>Other</option>
                                </select>
                            </div>

                            <div>
                                <label className={`block text-xs font-bold uppercase tracking-widest mb-2 ml-1 ${darkMode ? "text-gray-400" : "text-gray-700"}`}>Salary per Day (₹)</label>
                                <input type="number" name="salaryPerDay" value={formData.salaryPerDay} onChange={handleChange} placeholder="500" className={`w-full px-5 py-3.5 rounded-2xl border focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all font-medium ${darkMode ? "bg-white/5 border-white/10 text-white placeholder-gray-500" : "bg-white border-gray-300 focus:border-olive-500 text-gray-900"}`} required />
                            </div>

                            <div>
                                <label className={`block text-xs font-bold uppercase tracking-widest mb-2 ml-1 ${darkMode ? "text-gray-400" : "text-gray-700"}`}>Shift Type</label>
                                <select name="shiftType" value={formData.shiftType} onChange={handleChange} className={`w-full px-5 py-3.5 rounded-2xl border cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all font-medium appearance-none ${darkMode ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-300 focus:border-olive-500 text-gray-900"}`}>
                                    <option className={darkMode ? "bg-[#0b120f] text-white" : ""}>Evening (4 hours)</option>
                                    <option className={darkMode ? "bg-[#0b120f] text-white" : ""}>Morning (4 hours)</option>
                                    <option className={darkMode ? "bg-[#0b120f] text-white" : ""}>Weekend Full Day</option>
                                    <option className={darkMode ? "bg-[#0b120f] text-white" : ""}>Flexible</option>
                                </select>
                            </div>

                            <div>
                                <label className={`block text-xs font-bold uppercase tracking-widest mb-2 ml-1 ${darkMode ? "text-gray-400" : "text-gray-700"}`}>Number of Openings</label>
                                <input type="number" name="openings" value={formData.openings} onChange={handleChange} min="1" className={`w-full px-5 py-3.5 rounded-2xl border focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all font-medium ${darkMode ? "bg-white/5 border-white/10 text-white placeholder-gray-500" : "bg-white border-gray-300 focus:border-olive-500 text-gray-900"}`} />
                            </div>

                            <div className="md:col-span-2 pt-2">
                                <label className={`flex items-center gap-3 cursor-pointer p-4 rounded-2xl border transition-all ${darkMode ? "bg-white/5 border-white/10 hover:bg-white/10 text-gray-300" : "bg-gray-50 border-gray-200 hover:bg-gray-100 text-gray-700"}`}>
                                    <input type="checkbox" name="isSeasonal" checked={formData.isSeasonal} onChange={handleChange} className={`w-5 h-5 rounded transition-all focus:ring-emerald-500 ${darkMode ? "text-emerald-500 bg-slate-800 border-gray-600 focus:ring-offset-slate-900" : "text-olive-600 border-gray-300"}`} />
                                    <span className="text-sm font-bold">This is a seasonal job (e.g. Festival Season)</span>
                                </label>
                            </div>

                            <div className="md:col-span-2">
                                <label className={`block text-xs font-bold uppercase tracking-widest mb-3 ml-1 ${darkMode ? "text-gray-400" : "text-gray-700"}`}>Required Skills (Optional)</label>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                    {SKILL_OPTIONS.map(skill => (
                                        <button
                                            key={skill}
                                            type="button"
                                            onClick={() => toggleSkill(skill)}
                                            className={`p-4 rounded-2xl border transition-all flex flex-col items-center justify-center gap-2 text-xs font-bold text-center group/skill
                                                ${(formData.skills || []).includes(skill)
                                                    ? (darkMode ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-400" : "bg-emerald-50 border-emerald-500 text-emerald-800")
                                                    : (darkMode ? "bg-white/5 border-white/5 hover:border-emerald-500/30 text-gray-400 hover:text-emerald-300" : "bg-white border-gray-300 hover:border-emerald-400 text-gray-600 hover:text-emerald-700")
                                                }`}
                                        >
                                            <div className={`p-1.5 rounded-full transition-all ${(formData.skills || []).includes(skill) ? (darkMode ? "bg-emerald-500/20" : "bg-emerald-200") : (darkMode ? "bg-white/5 group-hover/skill:bg-emerald-500/10" : "bg-gray-100 group-hover/skill:bg-emerald-100")}`}>
                                                {(formData.skills || []).includes(skill) ? <Check size={14} /> : <div className="w-3.5 h-3.5" />}
                                            </div>
                                            {skill}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="md:col-span-2">
                                <label className={`block text-xs font-bold uppercase tracking-widest mb-2 ml-1 ${darkMode ? "text-gray-400" : "text-gray-700"}`}>Job Description & Requirements</label>
                                <textarea rows="5" name="description" value={formData.description} onChange={handleChange} className={`w-full px-5 py-4 rounded-2xl border focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all font-medium resize-none ${darkMode ? "bg-white/5 border-white/10 text-white placeholder-gray-500" : "bg-white border-gray-300 focus:border-olive-500 text-gray-900"}`} placeholder="Describe the role, exact timings, and what you are looking for..."></textarea>
                            </div>
                        </div>

                        <div className={`flex justify-end gap-4 pt-8 border-t ${darkMode ? "border-white/10" : "border-gray-100"}`}>
                            <Link to="/retailer" className={`px-8 py-3 rounded-2xl border font-bold transition-all shadow-sm ${darkMode ? "border-white/10 text-white hover:bg-white/5" : "border-gray-300 text-gray-700 hover:bg-gray-50"}`}>Cancel</Link>
                            <button type="submit" disabled={loading} className={`px-8 py-3 rounded-2xl text-white font-bold shadow-xl transition-all flex items-center gap-2 transform hover:-translate-y-0.5 ${loading ? 'bg-gray-500 cursor-not-allowed' : 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/30 dark:shadow-emerald-500/20'}`}>
                                <Save className="h-5 w-5" />
                                {loading ? 'Posting...' : 'Publish Job'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default PostJob;
