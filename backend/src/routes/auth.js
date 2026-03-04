const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { db } = require('../config/firebase');

// Register
router.post('/register', async (req, res) => {
  try {
    const { username, password, displayName } = req.body;

    // Check if user exists
    const userQuery = await db.collection('users').where('username', '==', username).get();
    if (!userQuery.empty) {
      return res.status(400).json({ message: 'Username already taken' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUserRef = db.collection('users').doc();
    const newUser = {
      uid: newUserRef.id,
      username,
      displayName,
      password: hashedPassword, // In a real app, be careful storing passwords in Firestore. 
      // Ideally use Firebase Auth, but requirements say "Auth: JWT handled by backend only".
      photoURL: `https://ui-avatars.com/api/?name=${displayName}&background=random`,
      createdAt: new Date().toISOString(),
      lastActive: new Date().toISOString(),
      isOnline: true
    };

    await newUserRef.set(newUser);

    const token = jwt.sign({ uid: newUser.uid, username: newUser.username }, process.env.JWT_SECRET, { expiresIn: '24h' });

    res.status(201).json({ token, user: { uid: newUser.uid, username, displayName, photoURL: newUser.photoURL } });
  } catch (error) {
    console.error(error);
    if ((error.code === 'ENOENT' && error.message.includes('service-account.json')) || error.message.includes('Unable to detect a Project Id')) {
      return res.status(500).json({ message: 'Missing Firebase service-account.json in backend directory. Please add it.' });
    }
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
});

// Login
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

    // Update last active
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

// Me
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
      // Don't send password
      const { password, ...safeUser } = user;
      res.json(safeUser);
    } catch (e) {
      res.sendStatus(500);
    }
  });
});

module.exports = router;
