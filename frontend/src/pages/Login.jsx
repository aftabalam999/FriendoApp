import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { User, Lock, Loader2, Eye, EyeOff } from 'lucide-react';

const friendlyError = (msg = '') => {
    if (!msg) return 'Something went wrong. Please try again.';
    const m = msg.toLowerCase();
    if (m.includes('invalid credentials')) return '❌ Wrong username or password.';
    if (m.includes('network') || m.includes('fetch')) return '🌐 Network error — please check your internet connection.';
    return msg;
};

export default function Login() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const { login } = useAuth();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            await login(username, password);
        } catch (err) {
            console.error('Login Error:', err, err.response?.data);
            setError(friendlyError(err.response?.data?.message || err.message));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#FAFBFF] flex items-center justify-center p-4 md:p-8 font-sans">
            <div className="w-full max-w-[850px] h-[550px] bg-white rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.08)] flex overflow-hidden relative border border-gray-100/50">

                {/* LEFT SIDE GRAPHICS */}
                <div className="hidden md:block w-[35%] h-full relative overflow-hidden bg-[#d9cbff]">
                    {/* Diagonal Overlays */}
                    <div className="absolute top-0 left-0 w-[200%] h-[200%] bg-[#b89eff] transform -rotate-[35deg] origin-top-left translate-y-[10%] shadow-lg"></div>
                    <div className="absolute top-0 left-0 w-[200%] h-[200%] bg-[#926bff] transform -rotate-[35deg] origin-top-left translate-y-[50%] shadow-lg"></div>
                    <div className="absolute top-0 left-0 w-[200%] h-[200%] bg-[#7042f4] transform -rotate-[35deg] origin-top-left translate-y-[90%] shadow-lg"></div>

                    {/* Left text navigation elements */}
                    <div className="absolute top-1/2 left-0 -translate-y-1/2 w-full flex flex-col items-end right-0">
                        <div className="bg-white rounded-l-full py-3 px-8 text-[#7042f4] font-extrabold text-sm tracking-widest shadow-[-5px_5px_15px_rgba(0,0,0,0.1)] z-10 w-[140px] text-center transform translate-x-2">
                            LOGIN
                        </div>
                        <Link to="/register" className="py-4 px-8 text-white/80 hover:text-white font-bold text-sm tracking-widest transition-colors w-[140px] text-center z-10">
                            REGISTER
                        </Link>
                    </div>
                </div>

                {/* RIGHT SIDE FORM */}
                <div className="flex-1 w-full bg-white flex flex-col justify-center items-center relative z-10 px-8 py-10">
                    <div className="w-full max-w-[340px]">

                        {/* Avatar & Title */}
                        <div className="flex flex-col items-center mb-10">
                            <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-[#512da8] to-[#7042f4] flex items-center justify-center mb-4 shadow-[0_10px_25px_rgba(112,66,244,0.4)] border-2 border-white">
                                <User size={36} color="white" strokeWidth={1.5} />
                            </div>
                            <h2 className="text-2xl font-black text-[#7042f4] tracking-wider uppercase">Login</h2>
                        </div>

                        {error && (
                            <div className="bg-red-50 text-red-600 border border-red-200 p-3 rounded-lg mb-6 text-sm text-center">
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Username Input */}
                            <div className="relative border-b-2 border-gray-200 focus-within:border-[#7042f4] transition-colors pb-2 group">
                                <div className="absolute left-0 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#7042f4] transition-colors">
                                    <User size={20} />
                                </div>
                                <input
                                    type="text"
                                    className="w-full pl-10 pr-4 py-2 bg-transparent text-gray-800 placeholder-gray-400 focus:outline-none font-medium"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    required
                                    placeholder="Username"
                                />
                            </div>

                            {/* Password Input */}
                            <div className="relative border-b-2 border-gray-200 focus-within:border-[#7042f4] transition-colors pb-2 group">
                                <div className="absolute left-0 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#7042f4] transition-colors">
                                    <Lock size={20} />
                                </div>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    className="w-full pl-10 pr-10 py-2 bg-transparent text-gray-800 placeholder-gray-400 focus:outline-none font-medium"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    placeholder="Password"
                                />
                                <button type="button" onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-1 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#7042f4] transition-colors p-1">
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>

                            <div className="flex items-center justify-between pt-4">
                                <Link to="/forgot-password" className="text-xs font-semibold text-[#7042f4] hover:text-[#512da8] transition-colors">
                                    Forgot Password?
                                </Link>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="bg-[#7042f4] hover:bg-[#512da8] text-white px-8 py-2.5 rounded-full font-bold tracking-wider text-sm shadow-[0_5px_15px_rgba(112,66,244,0.4)] transition-all transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 flex items-center"
                                >
                                    {loading ? <Loader2 size={18} className="animate-spin" /> : 'LOGIN'}
                                </button>
                            </div>
                        </form>

                        {/* Mobile bottom nav fallback */}
                        <div className="mt-8 text-center md:hidden">
                            <p className="text-sm text-gray-500 font-medium">
                                Don't have an account? <Link to="/register" className="text-[#7042f4] font-bold">Register</Link>
                            </p>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
}
