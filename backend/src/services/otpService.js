const nodemailer = require('nodemailer');
const dns = require('dns');

// Force Node to prefer IPv4. Render sometimes resolves to IPv6 for Google SMTP
// but lacks IPv6 routing, resulting in Connect ENETUNREACH or Timeout errors.
try {
    dns.setDefaultResultOrder('ipv4first');
} catch (e) {
    // Ignore on older Node versions
}

// In-memory OTP store
const otpStore = {};

const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

// Create transporter per-request because Render free tier freezes processes
// and drops persistent sockets, causing pooled connections to hang indefinitely.
const createTransporter = () => {
    return nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        connectionTimeout: 10000, // 10s
        greetingTimeout: 10000,  // 10s
        socketTimeout: 15000,    // 15s
        family: 4, // Force IPv4 routing explicitly in the socket
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
        tls: {
            rejectUnauthorized: false
        }
    });
};

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
 * Send OTP via email using Gmail SMTP (shared transporter)
 */
const sendEmailOTP = async (email, otp) => {
    const transporter = createTransporter();
    await transporter.sendMail({
        from: `"Friendo App" <${process.env.EMAIL_USER}>`,
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
};

module.exports = { storeOTP, verifyOTP, sendEmailOTP };

