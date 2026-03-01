import React, { createContext, useContext, useState } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null); // { id: '...', name: '...', role: 'student' | 'retailer', email: '...' }

    const login = (userData) => {
        // If userData comes as a string (legacy call), mock it
        if (typeof userData === 'string') {
            if (userData === 'student') {
                setUser({ name: 'Alex Johnson', role: 'student' });
            } else {
                setUser({ name: 'Fresh Mart Manager', role: 'retailer' });
            }
        } else {
            setUser(userData);
        }
    };

    const logout = () => {
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
