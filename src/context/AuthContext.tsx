import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { UserRole } from '../types';

interface AuthContextType {
    role: UserRole;
    isAuthenticated: boolean;
    login: (role: UserRole, data?: any) => void;
    logout: () => void;
    user: any; // Can be typed more strictly with User interface
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [role, setRole] = useState<UserRole>(UserRole.NONE);
    const [user, setUser] = useState<any>(null); // Store patientId or doctor details

    useEffect(() => {
        // Check localStorage on mount
        const storedRole = localStorage.getItem('dermolink_role');
        const storedUser = localStorage.getItem('dermolink_user');

        if (storedRole && storedRole !== UserRole.NONE) {
            setRole(storedRole as UserRole);
            if (storedUser) {
                setUser(JSON.parse(storedUser));
            }
        }
    }, []);

    const login = (newRole: UserRole, userData?: any) => {
        setRole(newRole);
        setUser(userData);
        localStorage.setItem('dermolink_role', newRole);
        if (userData) {
            localStorage.setItem('dermolink_user', JSON.stringify(userData));
        }
    };

    const logout = () => {
        setRole(UserRole.NONE);
        setUser(null);
        localStorage.removeItem('dermolink_role');
        localStorage.removeItem('dermolink_user');
    };

    const isAuthenticated = role !== UserRole.NONE;

    return (
        <AuthContext.Provider value={{ role, isAuthenticated, login, logout, user }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
