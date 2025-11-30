const express = require('express');
const router = express.Router();
const { db } = require('../config/firebase');
const authenticateToken = require('../middleware/auth');
const { getDeterministicChatId } = require('../utils/chatId');

// Get my chats
router.get('/', authenticateToken, async (req, res) => {
  try {
    const uid = req.user.uid;
    const snapshot = await db.collection('chats')
        .where('participants', 'array-contains', uid)
        .get();

    const chats = [];
    const userIds = new Set();

    snapshot.forEach(doc => {
        const data = doc.data();
        chats.push({ id: doc.id, ...data });
        // Collect partner UIDs
        data.participants.forEach(pUid => {
            if (pUid !== uid) userIds.add(pUid);
        });
    });

    // Fetch user details for all partners
    const usersRef = db.collection('users');
    const userMap = {};
    
    // Firestore 'in' query supports up to 10 items. For robustness, we'll fetch individually or in batches if needed.
    // Since we might have many chats, let's just fetch them all individually for now or use a more scalable approach later.
    // For a simple chat app, fetching individually in parallel is okay for < 100 chats.
    // A better approach for larger scale would be to duplicate user data in the chat document, but we'll stick to fetching for now to ensure fresh data.

    const userPromises = Array.from(userIds).map(async (partnerUid) => {
        const userDoc = await usersRef.doc(partnerUid).get();
        if (userDoc.exists) {
            const { password, ...userData } = userDoc.data();
            userMap[partnerUid] = userData;
        }
    });

    await Promise.all(userPromises);

    // Attach partner details to chats
    const chatsWithDetails = chats.map(chat => {
        const partnerUid = chat.participants.find(p => p !== uid);
        return {
            ...chat,
            partnerDetails: userMap[partnerUid] || null
        };
    });

    // Sort in memory since we removed the Firestore orderBy
    chatsWithDetails.sort((a, b) => {
        const dateA = new Date(a.lastMessageAt || 0);
        const dateB = new Date(b.lastMessageAt || 0);
        return dateB - dateA;
    });

    res.json(chatsWithDetails);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create Group Chat
router.post('/group', authenticateToken, async (req, res) => {
    try {
        const uid = req.user.uid;
        const { name, participants } = req.body;

        if (!name || !participants || participants.length === 0) {
            return res.status(400).json({ message: 'Group name and participants are required' });
        }

        // Add creator to participants
        const allParticipants = [...new Set([...participants, uid])];

        const chatRef = db.collection('chats').doc();
        const chatData = {
            type: 'group',
            name,
            participants: allParticipants,
            admin: uid,
            createdAt: new Date().toISOString(),
            lastMessageAt: new Date().toISOString(),
            lastMessage: {
                text: `Group "${name}" created`,
                senderId: 'system'
            },
            photoURL: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`
        };

        await chatRef.set(chatData);

        res.json({ id: chatRef.id, ...chatData });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Create or Get Chat (1-on-1)
router.post('/p2p/:targetUid', authenticateToken, async (req, res) => {
    try {
        const uid = req.user.uid;
        const targetUid = req.params.targetUid;
        const chatId = getDeterministicChatId(uid, targetUid);

        const chatRef = db.collection('chats').doc(chatId);
        const doc = await chatRef.get();

        if (!doc.exists) {
            // Get user details for initial data if needed
            await chatRef.set({
                type: 'p2p',
                participants: [uid, targetUid],
                createdAt: new Date().toISOString(),
                lastMessageAt: new Date().toISOString(),
                lastMessage: null
            });
        }

        res.json({ chatId });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get messages
router.get('/:chatId/messages', authenticateToken, async (req, res) => {
    try {
        const { chatId } = req.params;
        // Verify participant
        const chatDoc = await db.collection('chats').doc(chatId).get();
        if (!chatDoc.exists) return res.status(404).json({ message: 'Chat not found' });
        
        if (!chatDoc.data().participants.includes(req.user.uid)) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        const snapshot = await db.collection('chats').doc(chatId).collection('messages')
            .orderBy('createdAt', 'asc') // or desc and reverse on client
            .limit(50)
            .get();

        const messages = [];
        snapshot.forEach(doc => messages.push({ id: doc.id, ...doc.data() }));

        res.json(messages);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Send message
router.post('/:chatId/messages', authenticateToken, async (req, res) => {
    try {
        const { chatId } = req.params;
        const { text, media } = req.body; // media: { url, type, name }

        const chatRef = db.collection('chats').doc(chatId);
        const chatDoc = await chatRef.get();
        if (!chatDoc.exists || !chatDoc.data().participants.includes(req.user.uid)) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        const message = {
            senderId: req.user.uid,
            text: text || '',
            media: media || null,
            seenBy: [req.user.uid],
            createdAt: new Date().toISOString()
        };

        const msgRef = await chatRef.collection('messages').add(message);
        
        const lastMessageData = {
            id: msgRef.id,
            text: text ? (text.length > 30 ? text.substring(0, 30) + '...' : text) : 'Sent an attachment',
            senderId: req.user.uid,
            seenBy: [req.user.uid],
            createdAt: message.createdAt
        };

        // Update chat last message
        await chatRef.update({
            lastMessageAt: message.createdAt,
            lastMessage: lastMessageData
        });

        // Notify participants via socket
        const io = getIo();
        const participants = chatDoc.data().participants;
        participants.forEach(pUid => {
            io.to(pUid).emit('newMessage', {
                chatId,
                message: { id: msgRef.id, ...message },
                lastMessage: lastMessageData
            });
        });

        res.json({ id: msgRef.id, ...message });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get single chat details (for typing status etc)
router.get('/:chatId', authenticateToken, async (req, res) => {
    try {
        const { chatId } = req.params;
        const chatDoc = await db.collection('chats').doc(chatId).get();
        if (!chatDoc.exists) return res.status(404).json({ message: 'Chat not found' });
        
        if (!chatDoc.data().participants.includes(req.user.uid)) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        res.json({ id: chatDoc.id, ...chatDoc.data() });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Update typing status
router.post('/:chatId/typing', authenticateToken, async (req, res) => {
    try {
        const { chatId } = req.params;
        const { isTyping } = req.body;
        const uid = req.user.uid;

        const chatRef = db.collection('chats').doc(chatId);
        
        // Update specific user's typing status in the map
        // We use dot notation to update nested field
        await chatRef.update({
            [`typingIndicators.${uid}`]: isTyping ? new Date().toISOString() : null
        });

        res.json({ success: true });
    } catch (error) {
        // If chat doesn't exist or other error
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Add participant to group
router.post('/:chatId/participants', authenticateToken, async (req, res) => {
    try {
        const { chatId } = req.params;
        const { newParticipants } = req.body; // Array of UIDs
        const uid = req.user.uid;

        const chatRef = db.collection('chats').doc(chatId);
        const chatDoc = await chatRef.get();

        if (!chatDoc.exists) return res.status(404).json({ message: 'Chat not found' });
        const chatData = chatDoc.data();

        if (chatData.type !== 'group') return res.status(400).json({ message: 'Not a group chat' });
        if (!chatData.participants.includes(uid)) return res.status(403).json({ message: 'Not authorized' });

        // Filter out already existing participants
        const toAdd = newParticipants.filter(p => !chatData.participants.includes(p));

        if (toAdd.length > 0) {
            await chatRef.update({
                participants: [...chatData.participants, ...toAdd],
                lastMessage: {
                    text: `${toAdd.length} member(s) added`,
                    senderId: 'system'
                },
                lastMessageAt: new Date().toISOString()
            });
        }

        res.json({ success: true, added: toAdd });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Remove participant from group
router.delete('/:chatId/participants/:targetUid', authenticateToken, async (req, res) => {
    try {
        const { chatId, targetUid } = req.params;
        const uid = req.user.uid;

        const chatRef = db.collection('chats').doc(chatId);
        const chatDoc = await chatRef.get();

        if (!chatDoc.exists) return res.status(404).json({ message: 'Chat not found' });
        const chatData = chatDoc.data();

        if (chatData.type !== 'group') return res.status(400).json({ message: 'Not a group chat' });
        
        // Only admin can remove others
        if (chatData.admin !== uid) return res.status(403).json({ message: 'Only admin can remove members' });
        
        // Cannot remove self via this route (use leave instead if implemented) or allow it?
        // Admin cannot remove themselves if they are the only admin (logic can be complex), but for now let's allow removing others.
        if (targetUid === uid) return res.status(400).json({ message: 'Cannot remove yourself' });

        const newParticipants = chatData.participants.filter(p => p !== targetUid);

        await chatRef.update({
            participants: newParticipants,
            lastMessage: {
                text: `Member removed`,
                senderId: 'system'
            },
            lastMessageAt: new Date().toISOString()
        });

        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

const { getIo } = require('../socket');

// Mark messages as seen
router.post('/:chatId/messages/seen', authenticateToken, async (req, res) => {
    try {
        const { chatId } = req.params;
        const uid = req.user.uid;

        const chatRef = db.collection('chats').doc(chatId);
        const chatDoc = await chatRef.get();
        
        if (!chatDoc.exists || !chatDoc.data().participants.includes(uid)) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        // Get recent messages
        // We fetch last 50 messages and filter in memory to avoid complex Firestore index requirements
        // (where senderId != uid AND orderBy createdAt requires a composite index)
        const snapshot = await chatRef.collection('messages')
            .orderBy('createdAt', 'desc')
            .limit(50)
            .get();

        const batch = db.batch();
        let updatedCount = 0;
        const updatedMessageIds = [];

        snapshot.forEach(doc => {
            const data = doc.data();
            // Only mark messages sent by others that I haven't seen yet
            if (data.senderId !== uid) {
                const seenBy = data.seenBy || [];
                if (!seenBy.includes(uid)) {
                    batch.update(doc.ref, {
                        seenBy: [...seenBy, uid]
                    });
                    updatedCount++;
                    updatedMessageIds.push(doc.id);
                }
            }
        });

        if (updatedCount > 0) {
            // Check if lastMessage needs update
            const lastMessage = chatDoc.data().lastMessage;
            if (lastMessage && updatedMessageIds.includes(lastMessage.id)) {
                const updatedSeenBy = [...(lastMessage.seenBy || []), uid];
                // Ensure uniqueness just in case
                const uniqueSeenBy = [...new Set(updatedSeenBy)];
                
                await chatRef.update({
                    'lastMessage.seenBy': uniqueSeenBy
                });
            }

            await batch.commit();
            
            // Notify other participants
            const io = getIo();
            const otherParticipants = chatDoc.data().participants.filter(p => p !== uid);
            otherParticipants.forEach(pUid => {
                io.to(pUid).emit('messagesSeen', {
                    chatId,
                    messageIds: updatedMessageIds,
                    seenBy: uid
                });
            });
        }

        res.json({ success: true, updatedCount });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
