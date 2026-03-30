import React, { createContext, useContext, useState } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(() => {
        const savedUser = localStorage.getItem('skilllink_authUser');
        return savedUser ? JSON.parse(savedUser) : null;
    });

    const login = (userData) => {
        let finalUser;
        if (typeof userData === 'string') {
            finalUser = userData === 'student' 
                ? { name: 'Alex Johnson', role: 'student' } 
                : { name: 'Fresh Mart Manager', role: 'retailer' };
        } else {
            finalUser = userData;
        }
        setUser(finalUser);
        localStorage.setItem('skilllink_authUser', JSON.stringify(finalUser));
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('skilllink_authUser');
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
