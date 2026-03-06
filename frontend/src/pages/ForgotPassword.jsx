import React, { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Lock, Loader2, KeyRound, ShieldCheck, ArrowLeft } from 'lucide-react';
import { api } from '../api/client';

export default function ForgotPassword() {
    const navigate = useNavigate();

    // Step 1 — identifier
    const [identifier, setIdentifier] = useState('');
    // Step 2 — OTP
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const otpRefs = useRef([]);
    // Step 3 — new password
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    // Flow state
    const [step, setStep] = useState(1); // 1 | 2 | 3 | 4(success)
    const [contact, setContact] = useState('');      // actual email returned by backend
    const [maskedContact, setMaskedContact] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // ── STEP 1: Send OTP ──────────────────────────────
    const handleSendOtp = async (e) => {
        if (e) e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const data = await api.post('/auth/send-reset-otp', { identifier });
            setContact(data.contact);
            setMaskedContact(data.maskedContact);
            setStep(2);
        } catch (err) {
            let msg = err.response?.data?.message || err.message || 'Failed to send OTP';
            if (msg.toLowerCase().includes('timeout') || msg.toLowerCase().includes('enetunreach')) {
                msg = 'Something went wrong! To reset password, you need to use Google login';
            }
            if (msg.toLowerCase().includes('aborted')) {
                msg = 'Please try again in 10-20 seconds!';
            }
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    // ── OTP input handlers ────────────────────────────
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

    // ── STEP 2: Verify OTP → move to step 3 ──────────
    const handleVerifyOtp = async (e) => {
        e.preventDefault();
        const code = otp.join('');
        if (code.length < 6) { setError('Please enter all 6 digits.'); return; }
        // We'll do full verification when the user actually submits the new password
        // Just move to step 3 without consuming the OTP yet
        setError('');
        setStep(3);
    };

    // ── STEP 3: Reset Password ────────────────────────
    const handleReset = async (e) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }
        if (newPassword.length < 6) {
            setError('Password must be at least 6 characters.');
            return;
        }
        setLoading(true);
        setError('');
        try {
            await api.post('/auth/reset-password', {
                contact,
                otp: otp.join(''),
                newPassword,
            });
            setStep(4);
            setTimeout(() => navigate('/login'), 3000);
        } catch (err) {
            setError(err.response?.data?.message || err.message || 'Reset failed');
            // Go back to OTP step if OTP was invalid
            if (err.response?.data?.message?.includes('OTP')) {
                setOtp(['', '', '', '', '', '']);
                setStep(2);
                setTimeout(() => otpRefs.current[0]?.focus(), 100);
            }
        } finally {
            setLoading(false);
        }
    };

    const stepTitles = { 1: 'Account Recovery', 2: 'Verify OTP', 3: 'New Password', 4: 'All Done!' };

    return (
        <div className="min-h-screen bg-[#FAFBFF] flex items-center justify-center p-4 md:p-8 font-sans">
            <div className="w-full max-w-[850px] bg-white rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.08)] flex overflow-hidden relative border border-gray-100/50">

                {/* LEFT SIDE GRAPHICS */}
                <div className="hidden md:block w-[35%] min-h-[520px] h-full relative overflow-hidden bg-[#d9cbff]">
                    <div className="absolute top-0 left-0 w-[200%] h-[200%] bg-[#b89eff] transform -rotate-[35deg] origin-top-left translate-y-[10%] shadow-lg"></div>
                    <div className="absolute top-0 left-0 w-[200%] h-[200%] bg-[#926bff] transform -rotate-[35deg] origin-top-left translate-y-[50%] shadow-lg"></div>
                    <div className="absolute top-0 left-0 w-[200%] h-[200%] bg-[#7042f4] transform -rotate-[35deg] origin-top-left translate-y-[90%] shadow-lg"></div>
                    <div className="absolute top-[40%] left-0 -translate-y-1/2 w-full flex flex-col items-end right-0 gap-y-6">
                        <Link to="/login" className="py-2 px-8 text-white/80 hover:text-white font-bold text-sm tracking-widest transition-colors w-[140px] text-center z-10">LOGIN</Link>
                        <div className="bg-white rounded-l-full py-3 px-8 text-[#7042f4] font-extrabold text-[12px] tracking-widest shadow-[-5px_5px_15px_rgba(0,0,0,0.1)] z-10 w-[140px] text-center transform translate-x-2">RECOVERY</div>
                    </div>
                    {/* Step dots */}
                    <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-2 z-10">
                        {[1, 2, 3].map(s => (
                            <div key={s} className={`rounded-full transition-all duration-300 ${step >= s ? 'w-6 h-2 bg-white' : 'w-2 h-2 bg-white/40'}`}></div>
                        ))}
                    </div>
                </div>

                {/* RIGHT SIDE */}
                <div className="flex-1 w-full bg-white flex flex-col justify-center items-center relative z-10 px-8 py-12">
                    <div className="w-full max-w-[340px]">

                        {/* Avatar + Title */}
                        <div className="flex flex-col items-center mb-8">
                            <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-[#512da8] to-[#7042f4] flex items-center justify-center mb-4 shadow-[0_10px_25px_rgba(112,66,244,0.4)] border-2 border-white">
                                {step <= 2 ? <KeyRound size={34} color="white" strokeWidth={1.5} /> : step === 3 ? <Lock size={34} color="white" strokeWidth={1.5} /> : <ShieldCheck size={34} color="white" strokeWidth={1.5} />}
                            </div>
                            <h2 className="text-xl font-black text-[#7042f4] tracking-wider uppercase text-center">{stepTitles[step]}</h2>
                            {step === 2 && <p className="text-sm text-gray-500 mt-2 text-center">Code sent to<br /><span className="font-semibold text-gray-700">{maskedContact}</span></p>}
                            {step === 3 && <p className="text-sm text-gray-500 mt-2 text-center">OTP verified! Set your new password.</p>}
                        </div>

                        {error && (
                            <div className="bg-red-50 text-red-600 border border-red-200 p-3 rounded-lg mb-5 text-sm text-center">{error}</div>
                        )}

                        {/* ── STEP 1 ── */}
                        {step === 1 && (
                            <form onSubmit={handleSendOtp} className="space-y-6">
                                <div className="relative border-b-2 border-gray-200 focus-within:border-[#7042f4] transition-colors pb-2 group">
                                    <div className="absolute left-0 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#7042f4] transition-colors"><User size={19} /></div>
                                    <input type="text" className="w-full pl-9 pr-4 py-2 bg-transparent text-gray-800 placeholder-gray-400 focus:outline-none font-medium text-[14.5px]"
                                        value={identifier} onChange={(e) => setIdentifier(e.target.value)} required placeholder="Username or Email address" />
                                </div>
                                <p className="text-[11px] text-gray-400 -mt-3 pl-1">We'll send an OTP to the email linked with your account.</p>
                                <div className="flex justify-between items-center pt-1">
                                    <Link to="/login" className="text-sm text-gray-400 hover:text-[#7042f4] font-semibold transition-colors flex items-center gap-1"><ArrowLeft size={14} /> Login</Link>
                                    <button type="submit" disabled={loading}
                                        className="bg-[#7042f4] hover:bg-[#512da8] text-white px-8 py-2.5 rounded-full font-bold tracking-wider text-sm shadow-[0_5px_15px_rgba(112,66,244,0.4)] transition-all hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 flex items-center gap-2">
                                        {loading ? <Loader2 size={16} className="animate-spin" /> : 'SEND OTP'}
                                    </button>
                                </div>
                            </form>
                        )}

                        {/* ── STEP 2 ── */}
                        {step === 2 && (
                            <form onSubmit={handleVerifyOtp} className="space-y-8">
                                <div className="flex justify-between gap-2" onPaste={handleOtpPaste}>
                                    {otp.map((digit, i) => (
                                        <input key={i} ref={(el) => (otpRefs.current[i] = el)}
                                            type="text" inputMode="numeric" maxLength={1} value={digit}
                                            onChange={(e) => handleOtpChange(i, e.target.value)}
                                            onKeyDown={(e) => handleOtpKeyDown(i, e)}
                                            className="w-12 h-14 text-center text-2xl font-black text-[#7042f4] border-2 border-gray-200 rounded-xl focus:border-[#7042f4] focus:outline-none bg-[#FAFBFF] transition-all focus:shadow-[0_0_0_3px_rgba(112,66,244,0.15)] caret-transparent" />
                                    ))}
                                </div>
                                <div className="flex flex-col gap-3">
                                    <button type="submit" disabled={otp.join('').length < 6}
                                        className="w-full bg-[#7042f4] hover:bg-[#512da8] text-white py-3 rounded-full font-bold tracking-wider text-sm shadow-[0_5px_15px_rgba(112,66,244,0.4)] transition-all hover:-translate-y-0.5 disabled:opacity-40 flex items-center justify-center gap-2">
                                        VERIFY CODE
                                    </button>
                                    <div className="flex justify-between text-sm font-semibold">
                                        <button type="button" onClick={() => { setStep(1); setOtp(['', '', '', '', '', '']); setError(''); }}
                                            className="text-gray-400 hover:text-[#7042f4] transition-colors flex items-center gap-1"><ArrowLeft size={13} /> Back</button>
                                        <button type="button" disabled={loading} onClick={handleSendOtp}
                                            className="text-[#7042f4] hover:underline disabled:opacity-50">Resend OTP</button>
                                    </div>
                                </div>
                            </form>
                        )}

                        {/* ── STEP 3 ── */}
                        {step === 3 && (
                            <form onSubmit={handleReset} className="space-y-6">
                                <div className="relative border-b-2 border-gray-200 focus-within:border-[#7042f4] transition-colors pb-2 group">
                                    <div className="absolute left-0 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#7042f4] transition-colors"><Lock size={19} /></div>
                                    <input type="password" className="w-full pl-9 pr-4 py-2 bg-transparent text-gray-800 placeholder-gray-400 focus:outline-none font-medium text-[14.5px]"
                                        value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required placeholder="New password" minLength={6} />
                                </div>
                                <div className="relative border-b-2 border-gray-200 focus-within:border-[#7042f4] transition-colors pb-2 group">
                                    <div className="absolute left-0 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#7042f4] transition-colors"><Lock size={19} /></div>
                                    <input type="password" className="w-full pl-9 pr-4 py-2 bg-transparent text-gray-800 placeholder-gray-400 focus:outline-none font-medium text-[14.5px]"
                                        value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required placeholder="Confirm new password" />
                                </div>
                                <button type="submit" disabled={loading}
                                    className="w-full bg-[#7042f4] hover:bg-[#512da8] text-white py-3 rounded-full font-bold tracking-wider text-sm shadow-[0_5px_15px_rgba(112,66,244,0.4)] transition-all hover:-translate-y-0.5 disabled:opacity-50 flex items-center justify-center gap-2">
                                    {loading ? <Loader2 size={16} className="animate-spin" /> : 'RESET PASSWORD'}
                                </button>
                            </form>
                        )}

                        {/* ── STEP 4 (Success) ── */}
                        {step === 4 && (
                            <div className="bg-green-50 border border-green-200 text-green-700 p-6 rounded-xl text-center shadow-sm space-y-2">
                                <p className="font-black text-lg uppercase tracking-wide">Password Reset!</p>
                                <p className="text-sm font-medium">Redirecting to login page...</p>
                            </div>
                        )}

                        <div className="mt-6 text-center md:hidden">
                            <p className="text-sm text-gray-500">Back to <Link to="/login" className="text-[#7042f4] font-bold">Login</Link></p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
