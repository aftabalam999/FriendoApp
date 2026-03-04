import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api/client';
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const checkAuth = async () => {
            const token = localStorage.getItem('token');
            if (token) {
                try {
                    const userData = await api.get('/auth/me');
                    setUser(userData);
                } catch (error) {
                    console.error('Auth check failed', error);
                    localStorage.removeItem('token');
                }
            }
            setLoading(false);
        };
        checkAuth();
    }, []);

    const login = async (username, password) => {
        const data = await api.post('/auth/login', { username, password });
        localStorage.setItem('token', data.token);
        setUser(data.user);
        navigate('/');
    };

    // Step 1: validate form data & send OTP to email/phone
    const sendOtp = async (username, displayName, password, contact) => {
        const data = await api.post('/auth/send-otp', { username, displayName, password, contact });
        return data; // { message, contact }
    };

    // Step 2: verify OTP and create account
    const verifyOtpRegister = async (username, displayName, password, contact, otp) => {
        const data = await api.post('/auth/verify-otp-register', { username, displayName, password, contact, otp });
        localStorage.setItem('token', data.token);
        setUser(data.user);
        navigate('/');
    };

    const logout = () => {
        localStorage.removeItem('token');
        setUser(null);
        navigate('/login');
    };

    const updateUser = (userData) => {
        setUser(prev => ({ ...prev, ...userData }));
    };

    return (
        <AuthContext.Provider value={{ user, login, sendOtp, verifyOtpRegister, logout, loading, updateUser }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
