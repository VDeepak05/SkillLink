import React, { useState } from 'react';
import { Sliders } from 'lucide-react';

const FilterPanel = () => {
    const [distance, setDistance] = useState(5);
    const [isMobileOpen, setIsMobileOpen] = useState(false);

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden sticky top-24">
            {/* Header - Clickable on Mobile */}
            <div
                onClick={() => setIsMobileOpen(!isMobileOpen)}
                className="p-6 flex items-center justify-between cursor-pointer lg:cursor-default hover:bg-gray-50 lg:hover:bg-white transition-colors"
            >
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-olive-50 rounded-lg">
                        <Sliders className="h-5 w-5 text-olive-600" />
                    </div>
                    <h3 className="font-bold text-gray-900 text-lg">Filters</h3>
                </div>
                <div className="lg:hidden text-olive-600 font-semibold text-sm bg-olive-50 px-3 py-1 rounded-full">
                    {isMobileOpen ? 'Hide' : 'Show'}
                </div>
            </div>

            {/* Content - Hidden on mobile unless open, always visible on desktop */}
            <div className={`px-6 pb-6 space-y-8 ${isMobileOpen ? 'block' : 'hidden lg:block'}`}>
                {/* Distance Slider */}
                <div>
                    <label className="flex justify-between text-sm font-semibold text-gray-700 mb-4">
                        Max Distance <span className="text-olive-600 bg-olive-50 px-2 py-0.5 rounded-md text-xs">{distance} km</span>
                    </label>
                    <input
                        type="range"
                        min="1"
                        max="20"
                        value={distance}
                        onChange={(e) => setDistance(e.target.value)}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-olive-500 hover:accent-olive-600"
                    />
                    <div className="flex justify-between text-xs text-gray-400 mt-2 font-medium">
                        <span>1km</span>
                        <span>20km</span>
                    </div>
                </div>

                {/* Shift Preference */}
                <div>
                    <h4 className="text-sm font-bold text-gray-900 mb-3">Preferred Shift</h4>
                    <div className="space-y-3">
                        {['Morning', 'Evening', 'Night', 'Flexible'].map((shift) => (
                            <label key={shift} className="flex items-center gap-3 cursor-pointer group">
                                <div className="relative flex items-center">
                                    <input type="checkbox" className="peer w-5 h-5 rounded border-gray-300 text-olive-600 focus:ring-olive-500" />
                                </div>
                                <span className="text-sm text-gray-600 font-medium group-hover:text-gray-900 transition-colors">{shift}</span>
                            </label>
                        ))}
                    </div>
                </div>

                {/* Shop Type */}
                <div>
                    <h4 className="text-sm font-bold text-gray-900 mb-3">Shop Type</h4>
                    <select className="w-full text-sm border-gray-300 rounded-xl focus:ring-olive-500 focus:border-olive-500 p-3 border outline-none bg-gray-50/50 hover:bg-white transition-colors">
                        <option>All Types</option>
                        <option>Supermarket</option>
                        <option>Bakery</option>
                        <option>Clothing Store</option>
                        <option>Cafe</option>
                    </select>
                </div>

                <button className="w-full py-3 rounded-xl bg-gray-900 text-white font-semibold hover:bg-gray-800 transition-colors">
                    Apply Filters
                </button>
            </div>
        </div>
    );
};

export default FilterPanel;
