const { Resend } = require('resend');

// In-memory OTP store
const otpStore = {};

const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Store a new OTP (valid for 10 minutes) for a given key (email or phone)
 */
const storeOTP = (key) => {
    const otp = generateOTP();
    otpStore[key] = {
        otp,
        expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
    };
    return otp;
};

/**
 * Verify an OTP for a given key. Returns true/false.
 */
const verifyOTP = (key, inputOtp) => {
    const record = otpStore[key];
    if (!record) return false;
    if (Date.now() > record.expiresAt) {
        delete otpStore[key];
        return false;
    }
    if (record.otp !== inputOtp) return false;
    delete otpStore[key]; // One-time use
    return true;
};

/**
 * Send OTP via email using Resend
 */
const sendEmailOTP = async (email, otp) => {
    try {
        await resend.emails.send({
            from: 'Friendo App <onboarding@resend.dev>',
            to: email,
            subject: 'Your Friendo Verification Code',
            html: `
                <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; border-radius: 12px; background: #fafbff; border: 1px solid #e5e7eb;">
                    <div style="text-align: center; margin-bottom: 24px;">
                        <h2 style="color: #7042f4; font-size: 22px; margin: 0;">Welcome to Friendo!</h2>
                        <p style="color: #6b7280; margin-top: 8px;">Please verify your account</p>
                    </div>
                    <div style="background: white; border-radius: 12px; padding: 24px; text-align: center; border: 1px solid #e5e7eb; box-shadow: 0 2px 8px rgba(0,0,0,0.04);">
                        <p style="color: #374151; margin-bottom: 16px; font-size: 15px;">Your 6-digit verification code is:</p>
                        <div style="font-size: 40px; font-weight: 900; letter-spacing: 12px; color: #7042f4; padding: 12px 0;">
                            ${otp}
                        </div>
                        <p style="color: #9ca3af; font-size: 13px; margin-top: 16px;">This code expires in <strong>10 minutes</strong>. Do not share it with anyone.</p>
                    </div>
                </div>
            `,
        });
    } catch (error) {
        console.error('Error sending email via Resend:', error);
        throw error;
    }
};

module.exports = { storeOTP, verifyOTP, sendEmailOTP };
