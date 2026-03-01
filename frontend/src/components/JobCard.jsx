import React from 'react';
import { MapPin, Clock, Calendar, DollarSign, Heart } from 'lucide-react';
import { Link } from 'react-router-dom';

const JobCard = ({ job }) => {
    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow p-5 flex flex-col h-full group">
            <div className="flex justify-between items-start mb-3">
                <div>
                    <h3 className="text-lg font-bold text-gray-900 line-clamp-1 group-hover:text-olive-600 transition-colors">{job.title}</h3>
                    <p className="text-sm text-gray-500 font-medium">{job.shopName} • {job.shopType}</p>
                </div>
                <button className="text-gray-400 hover:text-red-500 transition-colors p-2 hover:bg-red-50 rounded-full">
                    <Heart className="h-5 w-5" />
                </button>
            </div>

            <div className="space-y-3 mb-6 flex-grow">
                <div className="flex items-center text-sm text-gray-600 gap-3">
                    <div className="p-1.5 bg-gray-50 rounded-lg text-gray-400">
                        <MapPin className="h-4 w-4" />
                    </div>
                    <span>{job.location} ({job.distance} km)</span>
                </div>
                <div className="flex items-center text-sm text-gray-600 gap-3">
                    <div className="p-1.5 bg-gray-50 rounded-lg text-gray-400">
                        <Clock className="h-4 w-4" />
                    </div>
                    <span>{job.shift} Shift</span>
                </div>
                <div className="flex items-center text-sm text-gray-600 gap-3">
                    <div className="p-1.5 bg-gray-50 rounded-lg text-gray-400">
                        <Calendar className="h-4 w-4" />
                    </div>
                    <span>{job.days}</span>
                </div>
                <div className="flex items-center text-sm text-gray-600 gap-3 font-semibold text-olive-600">
                    <div className="p-1.5 bg-olive-50 rounded-lg">
                        <DollarSign className="h-4 w-4" />
                    </div>
                    <span>₹{job.salary}/day</span>
                </div>
            </div>

            <div className="flex gap-3 mt-auto">
                <Link
                    to={`/jobs/${job.id}`}
                    className="flex-1 bg-gray-50 text-gray-700 py-3 px-4 rounded-xl text-sm font-bold hover:bg-gray-100 text-center transition-colors border border-transparent hover:border-gray-200"
                >
                    View Details
                </Link>
                <button className="flex-1 bg-olive-500 text-white py-3 px-4 rounded-xl text-sm font-bold hover:bg-olive-600 transition-all shadow-lg shadow-olive-500/20 hover:shadow-olive-500/30">
                    Apply Now
                </button>
            </div>
        </div>
    );
};

export default JobCard;
