const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { db } = require('../config/firebase');
const { storeOTP, verifyOTP, sendEmailOTP } = require('../services/otpService');

// ─── SEND OTP ────────────────────────────────────────────────────────────────
// Step 1 of registration: validate form data, generate + send OTP
router.post('/send-otp', async (req, res) => {
  try {
    const { username, displayName, password, contact } = req.body;

    if (!username || !displayName || !password || !contact) {
      return res.status(400).json({ message: 'All fields are required.' });
    }

    // Check username uniqueness
    const userQuery = await db.collection('users').where('username', '==', username).get();
    if (!userQuery.empty) {
      return res.status(400).json({ message: 'Username already taken.' });
    }

    // Detect email vs phone
    const isEmail = contact.includes('@');
    if (!isEmail) {
      return res.status(400).json({ message: 'Phone OTP is not supported yet. Please use an email address.' });
    }

    // Generate and send OTP
    const otp = storeOTP(contact);
    await sendEmailOTP(contact, otp);

    res.json({ message: 'OTP sent successfully.', contact });
  } catch (error) {
    console.error('send-otp error:', error);
    res.status(500).json({ message: 'Failed to send OTP: ' + error.message });
  }
});

// ─── VERIFY OTP + REGISTER ───────────────────────────────────────────────────
// Step 2: verify OTP and create the account
router.post('/verify-otp-register', async (req, res) => {
  try {
    const { username, displayName, password, contact, otp } = req.body;

    if (!otp) {
      return res.status(400).json({ message: 'OTP is required.' });
    }

    const isValid = verifyOTP(contact, otp);
    if (!isValid) {
      return res.status(400).json({ message: 'Invalid or expired OTP. Please try again.' });
    }

    // Re-check username just in case
    const userQuery = await db.collection('users').where('username', '==', username).get();
    if (!userQuery.empty) {
      return res.status(400).json({ message: 'Username already taken.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUserRef = db.collection('users').doc();
    const newUser = {
      uid: newUserRef.id,
      username,
      displayName,
      password: hashedPassword,
      contact,
      photoURL: `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=random`,
      createdAt: new Date().toISOString(),
      lastActive: new Date().toISOString(),
      isOnline: true,
    };

    await newUserRef.set(newUser);

    const token = jwt.sign(
      { uid: newUser.uid, username: newUser.username },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      token,
      user: { uid: newUser.uid, username, displayName, photoURL: newUser.photoURL },
    });
  } catch (error) {
    console.error('verify-otp-register error:', error);
    if (
      (error.code === 'ENOENT' && error.message.includes('service-account.json')) ||
      error.message.includes('Unable to detect a Project Id')
    ) {
      return res.status(500).json({ message: 'Missing Firebase service-account.json.' });
    }
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
});

// ─── LOGIN ────────────────────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    const userQuery = await db.collection('users').where('username', '==', username).limit(1).get();
    if (userQuery.empty) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const userDoc = userQuery.docs[0];
    const user = userDoc.data();

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    await userDoc.ref.update({ lastActive: new Date().toISOString(), isOnline: true });

    const token = jwt.sign({ uid: user.uid, username: user.username }, process.env.JWT_SECRET, { expiresIn: '24h' });

    res.json({ token, user: { uid: user.uid, username: user.username, displayName: user.displayName, photoURL: user.photoURL } });
  } catch (error) {
    console.error(error);
    if ((error.code === 'ENOENT' && error.message.includes('service-account.json')) || error.message.includes('Unable to detect a Project Id')) {
      return res.status(500).json({ message: 'Missing Firebase service-account.json in backend directory. Please add it.' });
    }
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
});

// ─── SEND RESET OTP ────────────────────────────────────────────────────────────
// Step 1 of password reset: look up user by username, send OTP to their contact
router.post('/send-reset-otp', async (req, res) => {
  try {
    const { identifier } = req.body; // username or email

    if (!identifier) {
      return res.status(400).json({ message: 'Please provide your username or email.' });
    }

    // Try to find user by username first, then by contact (email)
    let userDoc = null;
    const byUsername = await db.collection('users').where('username', '==', identifier).limit(1).get();
    if (!byUsername.empty) {
      userDoc = byUsername.docs[0];
    } else {
      const byEmail = await db.collection('users').where('contact', '==', identifier).limit(1).get();
      if (!byEmail.empty) userDoc = byEmail.docs[0];
    }

    if (!userDoc) {
      return res.status(404).json({ message: 'No account found with that username or email.' });
    }

    const userData = userDoc.data();
    const contact = userData.contact;

    if (!contact || !contact.includes('@')) {
      return res.status(400).json({ message: 'No email address linked to this account. Cannot send OTP.' });
    }

    const otp = storeOTP(contact);
    await sendEmailOTP(contact, otp);

    // Mask the email for the response
    const masked = contact.replace(/(.{2})(.*)(@.*)/, (_, a, b, c) => a + '*'.repeat(b.length) + c);

    res.json({ message: 'OTP sent.', maskedContact: masked, contact });
  } catch (error) {
    console.error('send-reset-otp error:', error);
    res.status(500).json({ message: 'Failed to send OTP: ' + error.message });
  }
});

// ─── RESET PASSWORD (with OTP verification) ────────────────────────────────────
router.post('/reset-password', async (req, res) => {
  try {
    const { contact, otp, newPassword } = req.body;

    if (!contact || !otp || !newPassword) {
      return res.status(400).json({ message: 'All fields are required.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long.' });
    }

    // Verify OTP
    const isValid = verifyOTP(contact, otp);
    if (!isValid) {
      return res.status(400).json({ message: 'Invalid or expired OTP. Please try again.' });
    }

    // Find user by contact email
    const userQuery = await db.collection('users').where('contact', '==', contact).limit(1).get();
    if (userQuery.empty) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const userDoc = userQuery.docs[0];
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await userDoc.ref.update({ password: hashedPassword });

    res.json({ message: 'Password reset successfully.' });
  } catch (error) {
    console.error('reset-password error:', error);
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
});

// ─── ME ───────────────────────────────────────────────────────────────────────
router.get('/me', async (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.sendStatus(401);

  jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
    if (err) return res.sendStatus(403);

    try {
      const userDoc = await db.collection('users').doc(decoded.uid).get();
      if (!userDoc.exists) return res.sendStatus(404);
      const user = userDoc.data();
      const { password, ...safeUser } = user;
      res.json(safeUser);
    } catch (e) {
      res.sendStatus(500);
    }
  });
});

module.exports = router;
