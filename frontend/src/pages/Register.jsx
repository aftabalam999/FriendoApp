import React, { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { User, Lock, Loader2, BadgeInfo, Mail, Phone, ShieldCheck, ArrowLeft } from 'lucide-react';

export default function Register() {
    const { sendOtp, verifyOtpRegister } = useAuth();

    // Step 1 fields
    const [username, setUsername] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [password, setPassword] = useState('');
    const [contact, setContact] = useState('');

    // Flow state
    const [step, setStep] = useState(1); // 1 = form, 2 = OTP
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [sentContact, setSentContact] = useState('');

    // OTP digits (6 boxes)
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const otpRefs = useRef([]);

    // ── STEP 1: Send OTP ────────────────────────────────
    const handleSendOtp = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const data = await sendOtp(username, displayName, password, contact);
            setSentContact(data.contact);
            setStep(2);
        } catch (err) {
            setError(err.response?.data?.message || err.message || 'Failed to send OTP');
        } finally {
            setLoading(false);
        }
    };

    // ── STEP 2: OTP digit input handlers ───────────────
    const handleOtpChange = (index, value) => {
        if (!/^\d?$/.test(value)) return; // only digits
        const next = [...otp];
        next[index] = value;
        setOtp(next);
        if (value && index < 5) otpRefs.current[index + 1]?.focus();
    };

    const handleOtpKeyDown = (index, e) => {
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            otpRefs.current[index - 1]?.focus();
        }
    };

    const handleOtpPaste = (e) => {
        const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
        if (pasted.length === 6) {
            setOtp(pasted.split(''));
            otpRefs.current[5]?.focus();
        }
        e.preventDefault();
    };

    // ── STEP 2: Verify OTP ─────────────────────────────
    const handleVerifyOtp = async (e) => {
        e.preventDefault();
        const code = otp.join('');
        if (code.length < 6) {
            setError('Please enter all 6 digits.');
            return;
        }
        setLoading(true);
        setError('');
        try {
            await verifyOtpRegister(username, displayName, password, sentContact, code);
            // navigate happens inside verifyOtpRegister
        } catch (err) {
            setError(err.response?.data?.message || err.message || 'Verification failed');
            setOtp(['', '', '', '', '', '']);
            otpRefs.current[0]?.focus();
        } finally {
            setLoading(false);
        }
    };

    const maskedContact = sentContact
        ? sentContact.includes('@')
            ? sentContact.replace(/(.{2})(.*)(@.*)/, (_, a, b, c) => a + '*'.repeat(b.length) + c)
            : sentContact.slice(0, 3) + '****' + sentContact.slice(-3)
        : '';

    return (
        <div className="min-h-screen bg-[#FAFBFF] flex items-center justify-center p-4 md:p-8 font-sans">
            <div className="w-full max-w-[850px] bg-white rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.08)] flex overflow-hidden relative border border-gray-100/50">

                {/* LEFT SIDE GRAPHICS */}
                <div className="hidden md:block w-[35%] min-h-[550px] h-full relative overflow-hidden bg-[#d9cbff]">
                    <div className="absolute top-0 left-0 w-[200%] h-[200%] bg-[#b89eff] transform -rotate-[35deg] origin-top-left translate-y-[10%] shadow-lg"></div>
                    <div className="absolute top-0 left-0 w-[200%] h-[200%] bg-[#926bff] transform -rotate-[35deg] origin-top-left translate-y-[50%] shadow-lg"></div>
                    <div className="absolute top-0 left-0 w-[200%] h-[200%] bg-[#7042f4] transform -rotate-[35deg] origin-top-left translate-y-[90%] shadow-lg"></div>

                    <div className="absolute top-[40%] left-0 -translate-y-1/2 w-full flex flex-col items-end right-0 gap-y-6">
                        <Link to="/login" className="py-2 px-8 text-white/80 hover:text-white font-bold text-sm tracking-widest transition-colors w-[140px] text-center z-10">
                            LOGIN
                        </Link>
                        <div className="bg-white rounded-l-full py-3 px-8 text-[#7042f4] font-extrabold text-sm tracking-widest shadow-[-5px_5px_15px_rgba(0,0,0,0.1)] z-10 w-[140px] text-center transform translate-x-2">
                            REGISTER
                        </div>
                    </div>
                </div>

                {/* RIGHT SIDE FORM */}
                <div className="flex-1 w-full bg-white flex flex-col justify-center items-center relative z-10 px-8 py-12">

                    {/* ── STEP 1: Registration Form ── */}
                    {step === 1 && (
                        <div className="w-full max-w-[340px]">
                            <div className="flex flex-col items-center mb-8">
                                <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-[#512da8] to-[#7042f4] flex items-center justify-center mb-4 shadow-[0_10px_25px_rgba(112,66,244,0.4)] border-2 border-white">
                                    <User size={36} color="white" strokeWidth={1.5} />
                                </div>
                                <h2 className="text-2xl font-black text-[#7042f4] tracking-wider uppercase">Create Account</h2>
                            </div>

                            {error && (
                                <div className="bg-red-50 text-red-600 border border-red-200 p-3 rounded-lg mb-5 text-sm text-center">
                                    {error}
                                </div>
                            )}

                            <form onSubmit={handleSendOtp} className="space-y-5">
                                {/* Username */}
                                <div className="relative border-b-2 border-gray-200 focus-within:border-[#7042f4] transition-colors pb-2 group">
                                    <div className="absolute left-0 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#7042f4] transition-colors">
                                        <User size={18} />
                                    </div>
                                    <input type="text" className="w-full pl-9 pr-4 py-2 bg-transparent text-gray-800 placeholder-gray-400 focus:outline-none font-medium text-[14.5px]"
                                        value={username} onChange={(e) => setUsername(e.target.value)} required placeholder="Username" />
                                </div>

                                {/* Display Name */}
                                <div className="relative border-b-2 border-gray-200 focus-within:border-[#7042f4] transition-colors pb-2 group">
                                    <div className="absolute left-0 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#7042f4] transition-colors">
                                        <BadgeInfo size={18} />
                                    </div>
                                    <input type="text" className="w-full pl-9 pr-4 py-2 bg-transparent text-gray-800 placeholder-gray-400 focus:outline-none font-medium text-[14.5px]"
                                        value={displayName} onChange={(e) => setDisplayName(e.target.value)} required placeholder="Display name" />
                                </div>

                                {/* Password */}
                                <div className="relative border-b-2 border-gray-200 focus-within:border-[#7042f4] transition-colors pb-2 group">
                                    <div className="absolute left-0 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#7042f4] transition-colors">
                                        <Lock size={18} />
                                    </div>
                                    <input type="password" className="w-full pl-9 pr-4 py-2 bg-transparent text-gray-800 placeholder-gray-400 focus:outline-none font-medium text-[14.5px]"
                                        value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="Password (min 6 chars)" minLength={6} />
                                </div>

                                {/* Email or Phone */}
                                <div className="relative border-b-2 border-gray-200 focus-within:border-[#7042f4] transition-colors pb-2 group">
                                    <div className="absolute left-0 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#7042f4] transition-colors">
                                        <Mail size={18} />
                                    </div>
                                    <input type="text" className="w-full pl-9 pr-4 py-2 bg-transparent text-gray-800 placeholder-gray-400 focus:outline-none font-medium text-[14.5px]"
                                        value={contact} onChange={(e) => setContact(e.target.value)} required placeholder="Email address (for OTP)" />
                                </div>
                                <p className="text-[11px] text-gray-400 -mt-2 pl-1">A 6-digit code will be sent to verify your identity.</p>

                                <div className="flex items-center justify-end pt-2">
                                    <button type="submit" disabled={loading}
                                        className="bg-[#7042f4] hover:bg-[#512da8] text-white px-8 py-2.5 rounded-full font-bold tracking-wider text-sm shadow-[0_5px_15px_rgba(112,66,244,0.4)] transition-all transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 flex items-center gap-2">
                                        {loading ? <Loader2 size={16} className="animate-spin" /> : 'SEND OTP'}
                                    </button>
                                </div>
                            </form>

                            <div className="mt-6 text-center md:hidden">
                                <p className="text-sm text-gray-500">Already have an account? <Link to="/login" className="text-[#7042f4] font-bold">Login</Link></p>
                            </div>
                        </div>
                    )}

                    {/* ── STEP 2: OTP Verification ── */}
                    {step === 2 && (
                        <div className="w-full max-w-[340px]">
                            <div className="flex flex-col items-center mb-8">
                                <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-[#512da8] to-[#7042f4] flex items-center justify-center mb-4 shadow-[0_10px_25px_rgba(112,66,244,0.4)] border-2 border-white">
                                    <ShieldCheck size={36} color="white" strokeWidth={1.5} />
                                </div>
                                <h2 className="text-2xl font-black text-[#7042f4] tracking-wider uppercase">Verify OTP</h2>
                                <p className="text-sm text-gray-500 mt-2 text-center">
                                    We sent a 6-digit code to<br />
                                    <span className="font-semibold text-gray-700">{maskedContact}</span>
                                </p>
                            </div>

                            {error && (
                                <div className="bg-red-50 text-red-600 border border-red-200 p-3 rounded-lg mb-5 text-sm text-center">
                                    {error}
                                </div>
                            )}

                            <form onSubmit={handleVerifyOtp} className="space-y-8">
                                {/* 6-digit OTP boxes */}
                                <div className="flex justify-between gap-2" onPaste={handleOtpPaste}>
                                    {otp.map((digit, i) => (
                                        <input
                                            key={i}
                                            ref={(el) => (otpRefs.current[i] = el)}
                                            type="text"
                                            inputMode="numeric"
                                            maxLength={1}
                                            value={digit}
                                            onChange={(e) => handleOtpChange(i, e.target.value)}
                                            onKeyDown={(e) => handleOtpKeyDown(i, e)}
                                            className="w-12 h-14 text-center text-2xl font-black text-[#7042f4] border-2 border-gray-200 rounded-xl focus:border-[#7042f4] focus:outline-none bg-[#FAFBFF] transition-all focus:shadow-[0_0_0_3px_rgba(112,66,244,0.15)] caret-transparent"
                                        />
                                    ))}
                                </div>

                                <div className="flex flex-col gap-3">
                                    <button type="submit" disabled={loading || otp.join('').length < 6}
                                        className="w-full bg-[#7042f4] hover:bg-[#512da8] text-white py-3 rounded-full font-bold tracking-wider text-sm shadow-[0_5px_15px_rgba(112,66,244,0.4)] transition-all transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-40 flex items-center justify-center gap-2">
                                        {loading ? <Loader2 size={16} className="animate-spin" /> : 'VERIFY & CREATE ACCOUNT'}
                                    </button>

                                    <button type="button" onClick={() => { setStep(1); setOtp(['', '', '', '', '', '']); setError(''); }}
                                        className="w-full flex items-center justify-center gap-1.5 text-sm text-gray-500 hover:text-[#7042f4] font-semibold transition-colors py-1">
                                        <ArrowLeft size={14} /> Go back and edit details
                                    </button>

                                    <button type="button" disabled={loading} onClick={handleSendOtp}
                                        className="text-center text-sm text-[#7042f4] hover:underline font-semibold transition-colors disabled:opacity-50">
                                        Resend OTP
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
