const express = require('express');
const router = express.Router();
const { db } = require('../config/firebase');
const authenticateToken = require('../middleware/auth');

// Search users
router.get('/search', authenticateToken, async (req, res) => {
  try {
    const { q } = req.query;
    
    let snapshot;
    const usersRef = db.collection('users');

    if (!q) {
        // Return all users (limit 50)
        snapshot = await usersRef.limit(50).get();
    } else {
        // Prefix search implementation
        snapshot = await usersRef
        .where('username', '>=', q)
        .where('username', '<=', q + '\uf8ff')
        .limit(50)
        .get();
    }

    const users = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      if (data.uid !== req.user.uid) { // Exclude self
          const { password, ...safeUser } = data;
          users.push(safeUser);
      }
    });

    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user profile
router.get('/:uid', authenticateToken, async (req, res) => {
  try {
    const doc = await db.collection('users').doc(req.params.uid).get();
    if (!doc.exists) return res.status(404).json({ message: 'User not found' });
    
    const data = doc.data();
    const { password, ...safeUser } = data;
    res.json(safeUser);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update my profile
router.put('/me', authenticateToken, async (req, res) => {
    try {
        const { displayName, photoURL, bio, dob } = req.body;
        const uid = req.user.uid;
        
        const updates = {};
        if (displayName) updates.displayName = displayName;
        if (photoURL) updates.photoURL = photoURL;
        if (bio !== undefined) updates.bio = bio;
        if (dob !== undefined) updates.dob = dob;

        await db.collection('users').doc(uid).update(updates);
        
        // Return updated user data
        const doc = await db.collection('users').doc(uid).get();
        const { password, ...safeUser } = doc.data();
        
        res.json(safeUser);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
