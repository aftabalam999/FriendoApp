const express = require('express');
const router = express.Router();
const { db } = require('../config/firebase');
const authenticateToken = require('../middleware/auth');

// Send friend request
router.post('/request/:uid', authenticateToken, async (req, res) => {
  try {
    const toUid = req.params.uid;
    const fromUid = req.user.uid;

    if (toUid === fromUid) return res.status(400).json({ message: 'Cannot add self' });

    // Check if already friends
    const friendDoc = await db.collection('friends').doc(`${fromUid}_${toUid}`).get();
    const reverseFriendDoc = await db.collection('friends').doc(`${toUid}_${fromUid}`).get();

    if (friendDoc.exists || reverseFriendDoc.exists) {
      return res.status(400).json({ message: 'Already friends' });
    }

    const requestRef = db.collection('friend_requests').doc(`${fromUid}_${toUid}`);
    const doc = await requestRef.get();

    if (doc.exists) {
      return res.status(400).json({ message: 'Request already sent' });
    }

    // Check if they sent me one
    const reverseRequest = await db.collection('friend_requests').doc(`${toUid}_${fromUid}`).get();
    if (reverseRequest.exists) {
      return res.status(400).json({ message: 'They already sent you a request. Check your requests!' });
    }

    await requestRef.set({
      from: fromUid,
      to: toUid,
      status: 'pending',
      createdAt: new Date().toISOString()
    });

    // Emit socket event (skipped on Vercel serverless)
    try {
      const io = require('../socket').getIo();
      if (io) {
        const userDoc = await db.collection('users').doc(fromUid).get();
        if (userDoc.exists) {
          const { password, ...safeUser } = userDoc.data();
          io.to(toUid).emit('newFriendRequest', safeUser);
        }
      }
    } catch (e) {
      console.error('Socket emit error:', e);
    }

    res.json({ message: 'Request sent' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

const { getDeterministicChatId } = require('../utils/chatId');

// Accept friend request
router.post('/accept/:uid', authenticateToken, async (req, res) => {
  try {
    const fromUid = req.params.uid; // The person who sent the request
    const toUid = req.user.uid; // Me

    const requestRef = db.collection('friend_requests').doc(`${fromUid}_${toUid}`);
    const doc = await requestRef.get();

    if (!doc.exists || doc.data().status !== 'pending') {
      return res.status(404).json({ message: 'Request not found' });
    }

    await requestRef.update({ status: 'accepted' });

    // Add to friends collection (bidirectional)
    await db.collection('friends').doc(`${fromUid}_${toUid}`).set({
      users: [fromUid, toUid],
      createdAt: new Date().toISOString()
    });

    // Create Chat with default message
    const chatId = getDeterministicChatId(fromUid, toUid);
    const chatRef = db.collection('chats').doc(chatId);
    const chatDoc = await chatRef.get();

    if (!chatDoc.exists) {
      const now = new Date().toISOString();
      await chatRef.set({
        type: 'p2p',
        participants: [fromUid, toUid],
        createdAt: now,
        lastMessageAt: now,
        lastMessage: {
          text: 'You both can chat now',
          senderId: 'system'
        }
      });

      // Add the actual message to the subcollection
      await chatRef.collection('messages').add({
        text: 'You both can chat now',
        senderId: 'system',
        createdAt: now,
        media: null
      });
    }

    // Emit socket event to the sender that request was accepted (skipped on Vercel serverless)
    try {
      const io = require('../socket').getIo();
      if (io) {
        const userDoc = await db.collection('users').doc(toUid).get();
        if (userDoc.exists) {
          const { password, ...safeUser } = userDoc.data();
          io.to(fromUid).emit('friendRequestAccepted', safeUser);
        }
      }
    } catch (e) {
      console.error('Socket emit error:', e);
    }

    res.json({ message: 'Request accepted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get friends
router.get('/', authenticateToken, async (req, res) => {
  try {
    const uid = req.user.uid;
    // Find friends where users array contains uid
    const snapshot = await db.collection('friends').where('users', 'array-contains', uid).get();

    const friendUids = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      const friendUid = data.users.find(u => u !== uid);
      friendUids.push(friendUid);
    });

    if (friendUids.length === 0) return res.json([]);

    // Fetch user details
    // Firestore 'in' query supports up to 10 items. For production, batch or individual fetches.
    // Here assuming small number for starter or just fetch all users and filter (bad)
    // Let's do individual fetches for now or chunks

    const friends = [];
    for (const fUid of friendUids) {
      const uDoc = await db.collection('users').doc(fUid).get();
      if (uDoc.exists) {
        const { password, ...safeUser } = uDoc.data();
        friends.push(safeUser);
      }
    }

    res.json(friends);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get pending requests (received)
router.get('/requests', authenticateToken, async (req, res) => {
  try {
    const uid = req.user.uid;
    const snapshot = await db.collection('friend_requests')
      .where('to', '==', uid)
      .where('status', '==', 'pending')
      .get();

    const requests = [];
    for (const doc of snapshot.docs) {
      const data = doc.data();
      const uDoc = await db.collection('users').doc(data.from).get();
      if (uDoc.exists) {
        const { password, ...safeUser } = uDoc.data();
        requests.push(safeUser);
      }
    }
    res.json(requests);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get outgoing requests (sent)
router.get('/requests/sent', authenticateToken, async (req, res) => {
  try {
    const uid = req.user.uid;
    const snapshot = await db.collection('friend_requests')
      .where('from', '==', uid)
      .where('status', '==', 'pending')
      .get();

    const sent = [];
    snapshot.forEach(doc => sent.push(doc.data().to)); // Just return UIDs for checking
    res.json(sent);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
