import React, { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { User, Lock, Loader2, BadgeInfo, Mail, ShieldCheck, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { useGoogleLogin } from '@react-oauth/google';

// ── Friendly error messages ─────────────────────────────────────
const friendlyError = (msg = '') => {
    if (!msg) return 'Something went wrong. Please try again.';
    const m = msg.toLowerCase();
    if (m.includes('username already taken')) return '❌ That username is already taken — try a different one.';
    if (m.includes('all fields')) return '⚠️ Please fill in all the fields.';
    if (m.includes('phone otp')) return '📧 Phone numbers are not supported yet. Please enter your email address.';
    if (m.includes('invalid or expired otp')) return '🔒 Wrong or expired code. Check your email and try again, or click "Resend OTP".';
    if (m.includes('invalid login') || m.includes('535') || m.includes('credentials'))
        return '⚠️ Email sending failed. Check your email address is correct.';
    if (m.includes('user not found')) return '❌ No account found with that username.';
    if (m.includes('network') || m.includes('fetch'))
        return '🌐 Network error — please check your internet and try again.';
    if (m.includes('aborted') || m.includes('signal is aborted'))
        return '⏳ The server is waking up after being asleep (Render free tier). Please try clicking SEND OTP again in 10-20 seconds!';
    if (m.includes('timeout') || m.includes('enetunreach'))
        return 'Something went wrong! To register, you need to use Google login';
    if (m.includes('failed to send')) return '📧 Could not send OTP email. Please double-check your email address.';
    return msg; // fall back to raw message if nothing matched
};

export default function Register() {
    const { sendOtp, verifyOtpRegister, googleLogin } = useAuth();

    const googleLoginAction = useGoogleLogin({
        onSuccess: async (tokenResponse) => {
            setLoading(true);
            setError('');
            try {
                await googleLogin(tokenResponse.access_token);
            } catch (err) {
                console.error('Google Login Error:', err);
                setError(friendlyError(err.response?.data?.message || err.message));
            } finally {
                setLoading(false);
            }
        },
        onError: () => setError('Google Login Failed'),
    });

    // Step 1 fields
    const [username, setUsername] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [password, setPassword] = useState('');
    const [contact, setContact] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    // Flow state
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [loadingMsg, setLoadingMsg] = useState('');
    const [error, setError] = useState('');
    const [sentContact, setSentContact] = useState('');

    // OTP digits (6 boxes)
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const otpRefs = useRef([]);

    // ── FRONTEND VALIDATION ─────────────────────────────────────
    const validate = () => {
        if (!username.trim())
            return 'Please enter a username.';
        if (username.trim().length < 3)
            return 'Username must be at least 3 characters long.';
        if (!/^[a-zA-Z0-9_]+$/.test(username.trim()))
            return 'Username can only contain letters, numbers, and underscores.';
        if (!displayName.trim())
            return 'Please enter your display name.';
        if (!password)
            return 'Please enter a password.';
        if (password.length < 6)
            return 'Password must be at least 6 characters long.';
        if (!contact.trim())
            return 'Please enter your email address.';
        if (!contact.includes('@') || !contact.includes('.'))
            return 'Please enter a valid email address (e.g. you@gmail.com).';
        return null;
    };

    // ── STEP 1: Send OTP ───────────────────────────────────────
    const handleSendOtp = async (e) => {
        if (e) e.preventDefault();
        setError('');

        const validationError = validate();
        if (validationError) { setError(validationError); return; }

        setLoading(true);
        setLoadingMsg('Sending OTP to your email...');
        try {
            const data = await sendOtp(username.trim(), displayName.trim(), password, contact.trim());
            setSentContact(data.contact);
            setStep(2);
        } catch (err) {
            console.error('Registration OTP Error:', err, err.response?.data);
            setError(friendlyError(err.response?.data?.message || err.message));
        } finally {
            setLoading(false);
            setLoadingMsg('');
        }
    };

    // ── OTP input handlers ─────────────────────────────────────
    const handleOtpChange = (index, value) => {
        if (!/^\d?$/.test(value)) return;
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

    // ── STEP 2: Verify OTP ────────────────────────────────────
    const handleVerifyOtp = async (e) => {
        e.preventDefault();
        const code = otp.join('');
        if (code.length < 6) { setError('Please enter all 6 digits of the code.'); return; }
        setLoading(true);
        setLoadingMsg('Creating your account...');
        setError('');
        try {
            await verifyOtpRegister(username.trim(), displayName.trim(), password, sentContact, code);
        } catch (err) {
            console.error('OTP Verification Error:', err, err.response?.data);
            setError(friendlyError(err.response?.data?.message || err.message));
            setOtp(['', '', '', '', '', '']);
            otpRefs.current[0]?.focus();
        } finally {
            setLoading(false);
            setLoadingMsg('');
        }
    };

    const maskedContact = sentContact
        ? sentContact.replace(/(.{2})(.*)(@.*)/, (_, a, b, c) => a + '*'.repeat(b.length) + c)
        : '';

    return (
        <div className="min-h-screen bg-[#FAFBFF] flex items-center justify-center p-4 md:p-8 font-sans">
            <div className="w-full max-w-[850px] bg-white rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.08)] flex overflow-hidden relative border border-gray-100/50">

                {/* LEFT SIDE GRAPHICS */}
                <div className="hidden md:block w-[35%] min-h-[560px] h-full relative overflow-hidden bg-[#d9cbff]">
                    <div className="absolute top-0 left-0 w-[200%] h-[200%] bg-[#b89eff] transform -rotate-[35deg] origin-top-left translate-y-[10%] shadow-lg"></div>
                    <div className="absolute top-0 left-0 w-[200%] h-[200%] bg-[#926bff] transform -rotate-[35deg] origin-top-left translate-y-[50%] shadow-lg"></div>
                    <div className="absolute top-0 left-0 w-[200%] h-[200%] bg-[#7042f4] transform -rotate-[35deg] origin-top-left translate-y-[90%] shadow-lg"></div>
                    <div className="absolute top-[40%] left-0 -translate-y-1/2 w-full flex flex-col items-end gap-y-6">
                        <Link to="/login" className="py-2 px-8 text-white/80 hover:text-white font-bold text-sm tracking-widest transition-colors w-[140px] text-center z-10">LOGIN</Link>
                        <div className="bg-white rounded-l-full py-3 px-8 text-[#7042f4] font-extrabold text-sm tracking-widest shadow-[-5px_5px_15px_rgba(0,0,0,0.1)] z-10 w-[140px] text-center transform translate-x-2">REGISTER</div>
                    </div>
                </div>

                {/* RIGHT SIDE FORM */}
                <div className="flex-1 w-full bg-white flex flex-col justify-center items-center relative z-10 px-8 py-12">

                    {/* ── STEP 1: Registration Form ── */}
                    {step === 1 && (
                        <div className="w-full max-w-[340px]">
                            <div className="flex flex-col items-center mb-7">
                                <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-[#512da8] to-[#7042f4] flex items-center justify-center mb-4 shadow-[0_10px_25px_rgba(112,66,244,0.4)] border-2 border-white">
                                    <User size={34} color="white" strokeWidth={1.5} />
                                </div>
                                <h2 className="text-2xl font-black text-[#7042f4] tracking-wider uppercase">Create Account</h2>
                                <p className="text-xs text-gray-400 mt-1">Fill in the details below to get started</p>
                            </div>

                            {error && (
                                <div className="bg-red-50 text-red-600 border border-red-200 p-3 rounded-xl mb-5 text-sm text-center leading-snug">
                                    {error}
                                </div>
                            )}

                            <form onSubmit={handleSendOtp} className="space-y-5" noValidate>
                                {/* Username */}
                                <div className="relative border-b-2 border-gray-200 focus-within:border-[#7042f4] transition-colors pb-2 group">
                                    <div className="absolute left-0 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#7042f4] transition-colors"><User size={17} /></div>
                                    <input type="text" className="w-full pl-8 pr-4 py-2 bg-transparent text-gray-800 placeholder-gray-400 focus:outline-none font-medium text-[14.5px]"
                                        value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username (letters, numbers, _)" autoComplete="username" />
                                </div>

                                {/* Display Name */}
                                <div className="relative border-b-2 border-gray-200 focus-within:border-[#7042f4] transition-colors pb-2 group">
                                    <div className="absolute left-0 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#7042f4] transition-colors"><BadgeInfo size={17} /></div>
                                    <input type="text" className="w-full pl-8 pr-4 py-2 bg-transparent text-gray-800 placeholder-gray-400 focus:outline-none font-medium text-[14.5px]"
                                        value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Display name (shown to friends)" />
                                </div>

                                {/* Password with show/hide toggle */}
                                <div className="relative border-b-2 border-gray-200 focus-within:border-[#7042f4] transition-colors pb-2 group">
                                    <div className="absolute left-0 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#7042f4] transition-colors"><Lock size={17} /></div>
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        className="w-full pl-8 pr-10 py-2 bg-transparent text-gray-800 placeholder-gray-400 focus:outline-none font-medium text-[14.5px]"
                                        value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password (min 6 characters)"
                                        autoComplete="new-password"
                                    />
                                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-1 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#7042f4] transition-colors p-1">
                                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>

                                {/* Email */}
                                <div className="relative border-b-2 border-gray-200 focus-within:border-[#7042f4] transition-colors pb-2 group">
                                    <div className="absolute left-0 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#7042f4] transition-colors"><Mail size={17} /></div>
                                    <input type="email" className="w-full pl-8 pr-4 py-2 bg-transparent text-gray-800 placeholder-gray-400 focus:outline-none font-medium text-[14.5px]"
                                        value={contact} onChange={(e) => setContact(e.target.value)} placeholder="Email address" autoComplete="email" />
                                </div>
                                <p className="text-[11px] text-gray-400 -mt-2 pl-1">📧 A 6-digit code will be sent to this email to verify your account.</p>

                                <div className="flex items-center justify-between pt-1">
                                    <p className="text-sm text-gray-400 hidden md:block">
                                        Have an account? <Link to="/login" className="text-[#7042f4] font-bold">Login</Link>
                                    </p>
                                    <button type="submit" disabled={loading}
                                        className="bg-[#7042f4] hover:bg-[#512da8] text-white px-8 py-2.5 rounded-full font-bold tracking-wider text-sm shadow-[0_5px_15px_rgba(112,66,244,0.4)] transition-all hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-60 flex items-center gap-2 ml-auto">
                                        {loading ? (
                                            <><Loader2 size={15} className="animate-spin" /><span className="text-xs">{loadingMsg}</span></>
                                        ) : 'SEND OTP'}
                                    </button>
                                </div>
                            </form>

                            <div className="relative flex py-2 items-center">
                                <div className="flex-grow border-t border-gray-200"></div>
                                <span className="flex-shrink-0 mx-4 text-gray-400 text-xs">OR</span>
                                <div className="flex-grow border-t border-gray-200"></div>
                            </div>

                            <button
                                type="button"
                                onClick={() => googleLoginAction()}
                                disabled={loading}
                                className="w-full flex justify-center items-center gap-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 px-8 py-2.5 rounded-full font-bold text-sm shadow-sm transition-all focus:outline-none"
                            >
                                <img src="https://www.google.com/favicon.ico" alt="Google" className="w-4 h-4" />
                                Sign up with Google
                            </button>

                            <div className="mt-5 text-center md:hidden">
                                <p className="text-sm text-gray-500">Have an account? <Link to="/login" className="text-[#7042f4] font-bold">Login</Link></p>
                            </div>
                        </div>
                    )}

                    {/* ── STEP 2: OTP Verification ── */}
                    {step === 2 && (
                        <div className="w-full max-w-[340px]">
                            <div className="flex flex-col items-center mb-7">
                                <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-[#512da8] to-[#7042f4] flex items-center justify-center mb-4 shadow-[0_10px_25px_rgba(112,66,244,0.4)] border-2 border-white">
                                    <ShieldCheck size={34} color="white" strokeWidth={1.5} />
                                </div>
                                <h2 className="text-2xl font-black text-[#7042f4] tracking-wider uppercase">Verify Email</h2>
                                <p className="text-sm text-gray-500 mt-2 text-center leading-relaxed">
                                    We sent a 6-digit code to<br />
                                    <span className="font-semibold text-gray-700">{maskedContact}</span><br />
                                    <span className="text-xs text-gray-400">Check your inbox (and spam folder)</span>
                                </p>
                            </div>

                            {error && (
                                <div className="bg-red-50 text-red-600 border border-red-200 p-3 rounded-xl mb-5 text-sm text-center leading-snug">
                                    {error}
                                </div>
                            )}

                            <form onSubmit={handleVerifyOtp} className="space-y-7">
                                {/* 6-digit OTP boxes */}
                                <div className="flex justify-between gap-2" onPaste={handleOtpPaste}>
                                    {otp.map((digit, i) => (
                                        <input key={i} ref={(el) => (otpRefs.current[i] = el)}
                                            type="text" inputMode="numeric" maxLength={1} value={digit}
                                            onChange={(e) => handleOtpChange(i, e.target.value)}
                                            onKeyDown={(e) => handleOtpKeyDown(i, e)}
                                            className="w-12 h-14 text-center text-2xl font-black text-[#7042f4] border-2 border-gray-200 rounded-xl focus:border-[#7042f4] focus:outline-none bg-[#FAFBFF] transition-all focus:shadow-[0_0_0_3px_rgba(112,66,244,0.15)] caret-transparent"
                                        />
                                    ))}
                                </div>

                                <div className="flex flex-col gap-3">
                                    <button type="submit" disabled={loading || otp.join('').length < 6}
                                        className="w-full bg-[#7042f4] hover:bg-[#512da8] text-white py-3 rounded-full font-bold tracking-wider text-sm shadow-[0_5px_15px_rgba(112,66,244,0.4)] transition-all hover:-translate-y-0.5 disabled:opacity-40 flex items-center justify-center gap-2">
                                        {loading ? (
                                            <><Loader2 size={15} className="animate-spin" /><span className="text-xs">{loadingMsg}</span></>
                                        ) : 'VERIFY & CREATE ACCOUNT'}
                                    </button>

                                    <button type="button" onClick={() => { setStep(1); setOtp(['', '', '', '', '', '']); setError(''); }}
                                        className="w-full flex items-center justify-center gap-1.5 text-sm text-gray-500 hover:text-[#7042f4] font-semibold transition-colors py-1">
                                        <ArrowLeft size={13} /> Go back and edit details
                                    </button>

                                    <button type="button" disabled={loading} onClick={handleSendOtp}
                                        className="text-center text-sm text-[#7042f4] hover:underline font-semibold transition-colors disabled:opacity-50">
                                        Didn't receive it? Resend OTP
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
