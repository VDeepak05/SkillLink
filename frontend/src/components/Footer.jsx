import React from 'react';
import { Heart } from 'lucide-react';

const Footer = () => {
    return (
        <footer className="bg-white border-t border-gray-100 py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-4">
                <p className="text-gray-500 text-sm">
                    © {new Date().getFullYear()} SkiLink. All rights reserved.
                </p>
                <p className="flex items-center gap-1 text-sm text-gray-400">
                    Built with <Heart className="h-4 w-4 text-red-400 fill-current" /> for students
                </p>
            </div>
        </footer>
    );
};

export default Footer;