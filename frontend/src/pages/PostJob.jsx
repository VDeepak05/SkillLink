import React, { useState } from 'react';
import { ArrowLeft, Save } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

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
        description: ''
    });
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
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
                    description: formData.description
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
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <Link to="/retailer" className="inline-flex items-center text-gray-500 hover:text-olive-600 mb-6 transition-colors">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
            </Link>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100 bg-gray-50">
                    <h1 className="text-2xl font-bold text-gray-900">Post a New Job</h1>
                    <p className="text-gray-500 mt-1">Fill in the details to find the best student for your shop.</p>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Job Title</label>
                            <input type="text" name="jobTitle" value={formData.jobTitle} onChange={handleChange} placeholder="e.g. Evening Cashier" className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-olive-500 focus:border-olive-500 transition-shadow outline-none" required />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Shop Type</label>
                            <select name="shopType" value={formData.shopType} onChange={handleChange} className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-olive-500 outline-none">
                                <option>Supermarket</option>
                                <option>Bakery</option>
                                <option>Clothing Store</option>
                                <option>Cafe</option>
                                <option>Other</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Salary per Day (₹)</label>
                            <input type="number" name="salaryPerDay" value={formData.salaryPerDay} onChange={handleChange} placeholder="500" className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-olive-500 outline-none" required />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Shift Type</label>
                            <select name="shiftType" value={formData.shiftType} onChange={handleChange} className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-olive-500 outline-none">
                                <option>Evening (4 hours)</option>
                                <option>Morning (4 hours)</option>
                                <option>Weekend Full Day</option>
                                <option>Flexible</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Number of Openings</label>
                            <input type="number" name="openings" value={formData.openings} onChange={handleChange} min="1" className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-olive-500 outline-none" />
                        </div>

                        <div className="md:col-span-2">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" name="isSeasonal" checked={formData.isSeasonal} onChange={handleChange} className="w-4 h-4 text-olive-600 rounded border-gray-300 focus:ring-olive-500" />
                                <span className="text-sm text-gray-700">This is a seasonal job (e.g. Festival Season)</span>
                            </label>
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Job Description & Requirements</label>
                            <textarea rows="4" name="description" value={formData.description} onChange={handleChange} className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-olive-500 outline-none" placeholder="Describe the role and what you are looking for..."></textarea>
                        </div>
                    </div>

                    <div className="flex justify-end gap-4 pt-4 border-t border-gray-100">
                        <Link to="/retailer" className="px-6 py-2 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors">Cancel</Link>
                        <button type="submit" disabled={loading} className={`px-6 py-2 rounded-lg text-white font-medium shadow-md transition-all flex items-center gap-2 ${loading ? 'bg-gray-400' : 'bg-olive-600 hover:bg-olive-700 hover:shadow-lg shadow-olive-600/30'}`}>
                            <Save className="h-4 w-4" />
                            {loading ? 'Posting...' : 'Post Job'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default PostJob;
