import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { api } from '../api/client';
import { Search, LogOut, Send, Paperclip, Image as ImageIcon, MessageCircle, Users, Check, Phone, Video, Info, Smile, ChevronLeft, Heart, X, PlusCircle } from 'lucide-react';
import Toast from '../components/Toast';
import VideoCall from '../components/VideoCall';
import CreateGroupModal from '../components/CreateGroupModal';
import GroupMembersModal from '../components/GroupMembersModal';

export default function Home() {
    const { user, logout } = useAuth();
    const { callUser, socket } = useSocket();
    const [activeTab, setActiveTab] = useState('messages'); // messages, requests, friends, search
    const [chats, setChats] = useState([]);
    const [friends, setFriends] = useState([]);
    const [requests, setRequests] = useState([]);
    const [sentRequests, setSentRequests] = useState([]);
    const [searchResults, setSearchResults] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeChat, setActiveChat] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [toast, setToast] = useState(null);
    const [partnerTyping, setPartnerTyping] = useState(false);
    const [selectedImage, setSelectedImage] = useState(null);
    const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
    const [isMembersModalOpen, setIsMembersModalOpen] = useState(false);
    const [memberDetails, setMemberDetails] = useState({});

    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);
    const lastTypingSentRef = useRef(0);

    // Initial Data Fetch
    useEffect(() => {
        fetchChats();
        fetchFriends();
        fetchRequests();
        fetchSentRequests();
        fetchAllUsers();
    }, []);

    // Poll for messages and typing status - REMOVED for performance
    // Relying on socket events for real-time updates
    useEffect(() => {
        if (activeChat) {
            fetchChatData(activeChat.id);
        }
    }, [activeChat]);

    useEffect(() => {
        if (activeChat?.type === 'group') {
            const fetchMembers = async () => {
                const participantUids = activeChat.participants || [];
                const messageUids = messages.map(m => m.senderId);
                const uniqueUids = [...new Set([...participantUids, ...messageUids])];

                const newMembers = {};
                const promises = uniqueUids.map(async (uid) => {
                    if (memberDetails[uid] || uid === 'system') return;
                    try {
                        const data = await api.get(`/users/${uid}`);
                        newMembers[uid] = data;
                    } catch (e) { console.error(e); }
                });

                await Promise.all(promises);
                if (Object.keys(newMembers).length > 0) {
                    setMemberDetails(prev => ({ ...prev, ...newMembers }));
                }
            };
            fetchMembers();
        }
    }, [activeChat, messages]);

    const showToast = (message, type = 'info') => {
        setToast({ message, type });
    };

    const fetchChats = async () => {
        try {
            const data = await api.get('/chats');
            setChats(data);
        } catch (error) { console.error(error); }
    };

    const fetchFriends = async () => {
        try {
            const data = await api.get('/friends');
            setFriends(data);
        } catch (error) { console.error(error); }
    };

    const fetchRequests = async () => {
        try {
            const data = await api.get('/friends/requests');
            setRequests(data);
        } catch (error) { console.error(error); }
    };

    const fetchSentRequests = async () => {
        try {
            const data = await api.get('/friends/requests/sent');
            setSentRequests(data);
        } catch (error) { console.error(error); }
    };

    const fetchAllUsers = async () => {
        try {
            const data = await api.get('/users/search');
            setSearchResults(data);
        } catch (error) { console.error(error); }
    };

    const handleSearch = async (e) => {
        e.preventDefault();
        try {
            const data = await api.get(`/users/search?q=${searchQuery}`);
            setSearchResults(data);
        } catch (error) { console.error(error); }
    };

    const sendRequest = async (uid) => {
        try {
            await api.post(`/friends/request/${uid}`);
            showToast('Friend request sent!', 'success');
            setSentRequests([...sentRequests, uid]);
        } catch (error) {
            showToast(error.response?.data?.message || error.message, 'error');
        }
    };

    const acceptRequest = async (uid) => {
        try {
            await api.post(`/friends/accept/${uid}`);
            showToast('Friend request accepted!', 'success');
            fetchRequests();
            fetchFriends();
            fetchChats();
        } catch (error) { showToast(error.message, 'error'); }
    };

    const startChat = async (targetUid) => {
        try {
            const { chatId } = await api.post(`/chats/p2p/${targetUid}`);
            const existing = chats.find(c => c.id === chatId);
            if (existing) {
                setActiveChat(existing);
            } else {
                await fetchChats();
                setActiveChat({ id: chatId, participants: [user.uid, targetUid] });
            }
            setActiveTab('messages');
        } catch (error) { console.error(error); }
    };

    const fetchChatData = async (chatId) => {
        try {
            const msgs = await api.get(`/chats/${chatId}/messages`);
            setMessages(msgs);

            const chatDetails = await api.get(`/chats/${chatId}`);
            const otherUid = chatDetails.participants.find(p => p !== user.uid);
            const indicators = chatDetails.typingIndicators || {};
            const lastTyped = indicators[otherUid];

            if (lastTyped) {
                const isRecent = (new Date() - new Date(lastTyped)) < 5000;
                setPartnerTyping(isRecent);
            } else {
                setPartnerTyping(false);
            }
        } catch (error) { console.error(error); }
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleTyping = async () => {
        const now = Date.now();
        if (now - lastTypingSentRef.current > 2000) {
            lastTypingSentRef.current = now;
            try {
                await api.post(`/chats/${activeChat.id}/typing`, { isTyping: true });
            } catch (error) { console.error(error); }
        }
    };

    const sendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() && !isUploading) return;

        try {
            await api.post(`/chats/${activeChat.id}/messages`, { text: newMessage });
            await api.post(`/chats/${activeChat.id}/typing`, { isTyping: false });
            setNewMessage('');
            fetchChatData(activeChat.id);
            fetchChats();
        } catch (error) { console.error(error); }
    };

    const markMessagesAsSeen = async () => {
        if (!activeChat) return;
        try {
            await api.post(`/chats/${activeChat.id}/messages/seen`);
        } catch (error) { console.error(error); }
    };

    useEffect(() => {
        if (activeChat && messages.length > 0) {
            const lastMsg = messages[messages.length - 1];
            if (lastMsg.senderId !== user.uid) {
                const seenBy = lastMsg.seenBy || [];
                if (!seenBy.includes(user.uid)) {
                    markMessagesAsSeen();
                }
            }
        }
    }, [activeChat, messages]);

    useEffect(() => {
        if (!socket) return;

        const handleMessagesSeen = ({ chatId, messageIds, seenBy }) => {
            // Update active chat messages
            if (activeChat?.id === chatId) {
                setMessages(prev => prev.map(msg => {
                    if (messageIds.includes(msg.id)) {
                        const existingSeenBy = msg.seenBy || [];
                        if (!existingSeenBy.includes(seenBy)) {
                            return { ...msg, seenBy: [...existingSeenBy, seenBy] };
                        }
                    }
                    return msg;
                }));
            }

            // Update chat list lastMessage status
            setChats(prev => prev.map(chat => {
                if (chat.id === chatId && chat.lastMessage && messageIds.includes(chat.lastMessage.id)) {
                    const existingSeenBy = chat.lastMessage.seenBy || [];
                    if (!existingSeenBy.includes(seenBy)) {
                        return {
                            ...chat,
                            lastMessage: {
                                ...chat.lastMessage,
                                seenBy: [...existingSeenBy, seenBy]
                            }
                        };
                    }
                }
                return chat;
            }));
        };

        const handleNewMessage = ({ chatId, message, lastMessage }) => {
            // Update active chat messages
            if (activeChat?.id === chatId) {
                setMessages(prev => {
                    // Avoid duplicates
                    if (prev.some(m => m.id === message.id)) return prev;
                    return [...prev, message];
                });
            }

            // Update chat list
            setChats(prev => {
                const otherChats = prev.filter(c => c.id !== chatId);
                const chatToUpdate = prev.find(c => c.id === chatId);

                if (chatToUpdate) {
                    // Optimistically mark as seen if we are in this chat
                    let updatedLastMessage = lastMessage;
                    if (activeChat?.id === chatId) {
                        const seenBy = lastMessage.seenBy || [];
                        if (!seenBy.includes(user.uid)) {
                            updatedLastMessage = { ...lastMessage, seenBy: [...seenBy, user.uid] };
                        }
                    }

                    return [{
                        ...chatToUpdate,
                        lastMessageAt: message.createdAt,
                        lastMessage: updatedLastMessage
                    }, ...otherChats];
                } else {
                    // New chat (might need to fetch details, but for now just ignore or fetchChats)
                    fetchChats();
                    return prev;
                }
            });
        };

        socket.on('messagesSeen', handleMessagesSeen);
        socket.on('newMessage', handleNewMessage);

        return () => {
            socket.off('messagesSeen', handleMessagesSeen);
            socket.off('newMessage', handleNewMessage);
        };
    }, [socket, activeChat]);

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const { url, name, type } = await api.upload('/upload', file);
            await api.post(`/chats/${activeChat.id}/messages`, {
                text: '',
                media: { url, name, type }
            });
            // fetchChatData(activeChat.id); // Handled by socket now
        } catch (error) { showToast('Upload failed', 'error'); }
        setIsUploading(false);
    };

    const getFriendStatus = (uid) => {
        if (friends.some(f => f.uid === uid)) return 'friend';
        if (sentRequests.includes(uid)) return 'sent';
        if (requests.some(r => r.uid === uid)) return 'received';
        return 'none';
    };

    const getChatPartner = (chat) => {
        if (!chat || !chat.participants) return { displayName: 'Chat', photoURL: '' };

        // Handle Group Chat
        if (chat.type === 'group') {
            return {
                displayName: chat.name,
                photoURL: chat.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(chat.name)}&background=random`
            };
        }

        if (chat.partnerDetails) return chat.partnerDetails;

        const partnerUid = chat.participants.find(uid => uid !== user.uid);
        const friend = friends.find(f => f.uid === partnerUid);
        if (friend) return friend;
        const searchUser = searchResults.find(u => u.uid === partnerUid);
        if (searchUser) return searchUser;
        return { displayName: 'User', photoURL: 'https://via.placeholder.com/40' };
    };

    const getUserColor = (uid) => {
        const colors = ['#FFADAD', '#FFD6A5', '#FDFFB6', '#CAFFBF', '#9BF6FF', '#A0C4FF', '#BDB2FF', '#FFC6FF'];
        let hash = 0;
        for (let i = 0; i < uid.length; i++) {
            hash = uid.charCodeAt(i) + ((hash << 5) - hash);
        }
        return colors[Math.abs(hash) % colors.length];
    };

    const activePartner = activeChat ? getChatPartner(activeChat) : null;

    const isUnread = (chat) => {
        return chat.lastMessage?.senderId !== user.uid &&
            chat.lastMessage?.seenBy &&
            !chat.lastMessage.seenBy.includes(user.uid);
    };

    const hasUnreadMessages = chats.some(isUnread);

    const handleChatClick = (chat) => {
        setActiveChat(chat);
        // Optimistically mark as seen
        setChats(prev => prev.map(c => {
            if (c.id === chat.id && c.lastMessage) {
                const seenBy = c.lastMessage.seenBy || [];
                if (!seenBy.includes(user.uid)) {
                    return {
                        ...c,
                        lastMessage: {
                            ...c.lastMessage,
                            seenBy: [...seenBy, user.uid]
                        }
                    };
                }
            }
            return c;
        }));
    };

    return (
        <div className="flex h-[100dvh] bg-black text-white font-sans overflow-hidden">
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

            {/* Navigation Rail */}
            <div className="hidden md:flex flex-col items-center w-[72px] py-6 border-r border-gray-800 bg-black z-20">
                <div className="mb-8">
                    <div className="w-8 h-8 bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-500 rounded-lg flex items-center justify-center">
                        <MessageCircle size={20} className="text-white" />
                    </div>
                </div>
                <div className="flex flex-col space-y-6 w-full items-center">
                    <div onClick={() => setActiveTab('messages')} className={`p-3 rounded-lg cursor-pointer transition-all duration-200 group relative ${activeTab === 'messages' ? 'bg-gray-900' : 'hover:bg-gray-900'}`}>
                        <MessageCircle size={24} className={`${activeTab === 'messages' ? 'text-white' : 'text-gray-500 group-hover:text-white'}`} />
                        {hasUnreadMessages && <div className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-black"></div>}
                    </div>
                    <div onClick={() => setActiveTab('friends')} className={`p-3 rounded-lg cursor-pointer transition-all duration-200 group relative ${activeTab === 'friends' ? 'bg-gray-900' : 'hover:bg-gray-900'}`}>
                        <Users size={24} className={`${activeTab === 'friends' ? 'text-white' : 'text-gray-500 group-hover:text-white'}`} />
                        {requests.length > 0 && <div className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-black"></div>}
                    </div>
                    <div onClick={() => setActiveTab('search')} className={`p-3 rounded-lg cursor-pointer transition-all duration-200 group ${activeTab === 'search' ? 'bg-gray-900' : 'hover:bg-gray-900'}`}>
                        <Search size={24} className={`${activeTab === 'search' ? 'text-white' : 'text-gray-500 group-hover:text-white'}`} />
                    </div>
                    <div onClick={() => setIsGroupModalOpen(true)} className="p-3 rounded-lg cursor-pointer transition-all duration-200 group hover:bg-gray-900">
                        <PlusCircle size={24} className="text-blue-500 group-hover:text-blue-400" />
                    </div>
                </div>
                <div className="mt-auto flex flex-col items-center space-y-6">
                    <div className="cursor-pointer text-gray-500 hover:text-white" onClick={logout}>
                        <LogOut size={24} />
                    </div>
                    <img src={user.photoURL} alt="Profile" className="w-8 h-8 rounded-full border border-gray-600" />
                </div>
            </div>

            {/* Sidebar Content Area */}
            <div className={`flex flex-col bg-black border-r border-gray-800 w-full md:w-96 ${activeChat ? 'hidden md:flex' : 'flex'}`}>
                <div className="p-5 border-b border-gray-800">
                    <h2 className="text-xl font-bold text-white">
                        {activeTab === 'messages' && 'Messages'}
                        {activeTab === 'friends' && 'Friends'}
                        {activeTab === 'search' && 'Search'}
                    </h2>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {/* MESSAGES VIEW */}
                    {activeTab === 'messages' && (
                        <div className="p-2">
                            {chats.length === 0 ? (
                                <div className="text-center text-gray-500 mt-10">
                                    <p>No conversations yet.</p>
                                    <button onClick={() => setActiveTab('search')} className="text-[#3797F0] mt-2">Find friends</button>
                                </div>
                            ) : (
                                chats.map(chat => {
                                    const partner = getChatPartner(chat);
                                    const isSelected = activeChat?.id === chat.id;
                                    const unread = isUnread(chat);
                                    return (
                                        <div key={chat.id} onClick={() => handleChatClick(chat)} className={`flex items-center space-x-3 p-3 rounded-lg cursor-pointer hover:bg-gray-900 ${isSelected ? 'bg-gray-900' : ''}`}>
                                            <div className="relative">
                                                <img src={partner.photoURL} className="w-14 h-14 rounded-full object-cover" />
                                                {unread && <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-red-500 rounded-full border-2 border-black"></div>}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-baseline">
                                                    <h4 className={`font-medium truncate ${unread ? 'text-white font-bold' : 'text-gray-200'}`}>{partner.displayName}</h4>
                                                    {unread && <div className="w-2 h-2 bg-blue-500 rounded-full ml-2"></div>}
                                                </div>
                                                <div className="flex items-center text-sm text-gray-500 space-x-1">
                                                    <p className={`truncate max-w-[140px] ${unread ? 'text-white font-semibold' : ''}`}>{chat.lastMessage?.text || 'Sent an attachment'}</p>
                                                    <span>·</span>
                                                    <span>{chat.lastMessageAt ? new Date(chat.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    )}

                    {/* FRIENDS VIEW */}
                    {activeTab === 'friends' && (
                        <div className="p-4 space-y-6">
                            {requests.length > 0 && (
                                <div>
                                    <h3 className="text-sm font-semibold text-gray-400 mb-3 uppercase tracking-wider">Friend Requests</h3>
                                    <div className="space-y-4">
                                        {requests.map(req => (
                                            <div key={req.uid} className="flex items-center justify-between bg-gray-900 p-3 rounded-lg">
                                                <div className="flex items-center space-x-3">
                                                    <img src={req.photoURL} className="w-10 h-10 rounded-full" />
                                                    <div><p className="font-semibold text-white text-sm">{req.displayName}</p></div>
                                                </div>
                                                <div className="flex space-x-2">
                                                    <button onClick={() => acceptRequest(req.uid)} className="p-1.5 bg-blue-600 text-white rounded hover:bg-blue-700"><Check size={16} /></button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            <div>
                                <h3 className="text-sm font-semibold text-gray-400 mb-3 uppercase tracking-wider">My Friends</h3>
                                {friends.length === 0 ? (
                                    <p className="text-gray-500 text-sm">No friends yet.</p>
                                ) : (
                                    <div className="space-y-2">
                                        {friends.map(friend => (
                                            <div key={friend.uid} className="flex items-center justify-between p-2 hover:bg-gray-900 rounded-lg cursor-pointer" onClick={() => startChat(friend.uid)}>
                                                <div className="flex items-center space-x-3">
                                                    <img src={friend.photoURL} className="w-10 h-10 rounded-full" />
                                                    <span className="text-white font-medium">{friend.displayName}</span>
                                                </div>
                                                <MessageCircle size={18} className="text-gray-500" />
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* SEARCH VIEW */}
                    {activeTab === 'search' && (
                        <div className="p-4">
                            <div className="relative mb-6">
                                <input type="text" placeholder="Search users..." className="w-full bg-gray-900 text-white rounded-lg pl-10 pr-4 py-3 focus:outline-none focus:ring-1 focus:ring-blue-500" value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); handleSearch(e); }} />
                                <Search className="absolute left-3 top-3.5 text-gray-500" size={18} />
                            </div>
                            <div className="space-y-2">
                                {searchResults.length > 0 ? (
                                    searchResults.filter(res => res.uid !== user.uid).map(res => {
                                        const status = getFriendStatus(res.uid);
                                        return (
                                            <div key={res.uid} className="flex items-center justify-between p-3 hover:bg-gray-900 rounded-lg">
                                                <div className="flex items-center space-x-3">
                                                    <img src={res.photoURL} className="w-10 h-10 rounded-full" />
                                                    <div>
                                                        <p className="font-medium text-white">{res.displayName}</p>
                                                        <p className="text-xs text-gray-500">@{res.username}</p>
                                                    </div>
                                                </div>
                                                {status === 'none' && <button onClick={() => sendRequest(res.uid)} className="px-3 py-1 bg-blue-600 text-white text-xs font-semibold rounded hover:bg-blue-700">Add</button>}
                                                {status === 'sent' && <span className="text-gray-500 text-xs">Requested</span>}
                                                {status === 'friend' && <span className="text-green-500 text-xs">Friend</span>}
                                            </div>
                                        );
                                    })
                                ) : searchQuery ? <p className="text-gray-500 text-center">No users found.</p> : (
                                    <div className="text-center text-gray-600 mt-10">
                                        <Search size={48} className="mx-auto mb-2 opacity-50" />
                                        <p>Search for people to add</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Chat Area */}
            <div className={`flex-col bg-black ${activeChat ? 'flex fixed inset-0 z-50 md:static md:flex md:flex-1' : 'hidden md:flex md:flex-1'}`}>
                {activeChat ? (
                    <>
                        <div className="h-16 md:h-20 border-b border-gray-800 flex justify-between items-center px-4 md:px-6">
                            <div
                                className="flex items-center space-x-3 cursor-pointer overflow-hidden hover:opacity-80 transition-opacity"
                                onClick={() => {
                                    if (activeChat.type === 'group') {
                                        setIsMembersModalOpen(true);
                                    }
                                }}
                            >
                                <ChevronLeft className="md:hidden text-white mr-1 flex-shrink-0" size={28} onClick={(e) => { e.stopPropagation(); setActiveChat(null); }} />
                                <img src={activePartner?.photoURL} className="w-10 h-10 md:w-11 md:h-11 rounded-full flex-shrink-0" />
                                <div className="min-w-0">
                                    <h3 className="font-semibold text-white text-base md:text-lg truncate">{activePartner?.displayName}</h3>
                                    {activeChat.type === 'group' ? (
                                        <p className="text-xs text-gray-500">{activeChat.participants.length} members</p>
                                    ) : (
                                        <p className="text-xs text-gray-500">Active now</p>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center space-x-4 md:space-x-6 text-white flex-shrink-0">

                                <Video size={24} className="cursor-pointer hover:text-gray-300 md:w-[26px] md:h-[26px]" onClick={() => {
                                    if (activeChat.type !== 'group') {
                                        const partner = activeChat.participants.find(p => p !== user.uid);
                                        console.log("Video call button clicked. Partner:", partner, "Name:", activePartner?.displayName);
                                        if (partner) callUser(partner, activePartner?.displayName, activePartner?.photoURL);
                                    } else {
                                        showToast('Group video calls coming soon!', 'info');
                                    }
                                }} />
                                <Info size={24} className="cursor-pointer hover:text-gray-300 md:w-[26px] md:h-[26px]" />
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-2">
                            {messages.map((msg, index) => {
                                const isMe = msg.senderId === user.uid;
                                const showAvatar = !isMe && (index === messages.length - 1 || messages[index + 1]?.senderId === user.uid);
                                const showName = activeChat.type === 'group' && !isMe && (index === 0 || messages[index - 1]?.senderId !== msg.senderId);

                                // Check if this is the last message sent by me and if it's seen
                                const isLastMyMessage = isMe && messages.slice(index + 1).findIndex(m => m.senderId === user.uid) === -1;
                                const isSeen = msg.seenBy && msg.seenBy.some(uid => uid !== user.uid);

                                return (
                                    <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} group mb-1`}>
                                        <div className={`flex ${isMe ? 'justify-end' : 'justify-start'} items-end w-full`}>
                                            {!isMe && (
                                                <div className="w-8 mr-2 flex-shrink-0">
                                                    {showAvatar && <img src={activePartner?.photoURL} className="w-7 h-7 rounded-full" />}
                                                </div>
                                            )}
                                            <div className={`max-w-[85%] px-4 py-3 rounded-3xl text-[15px] leading-snug ${isMe ? 'bg-[#3797F0] text-white rounded-br-md' : 'bg-[#262626] text-white rounded-bl-md'}`}>
                                                {showName && (
                                                    <p className="text-xs font-bold mb-1" style={{ color: getUserColor(msg.senderId) }}>
                                                        {memberDetails[msg.senderId]?.displayName || 'Loading...'}
                                                    </p>
                                                )}
                                                {msg.media && (
                                                    <div className="mb-2">
                                                        {msg.media.type.startsWith('image/') ? (
                                                            <img
                                                                src={msg.media.url}
                                                                alt="attachment"
                                                                className="rounded-lg max-h-60 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                                                                onClick={() => setSelectedImage(msg.media.url)}
                                                            />
                                                        ) : (
                                                            <a href={msg.media.url} target="_blank" rel="noreferrer" className="flex items-center space-x-2 text-sm underline bg-black/20 p-2 rounded">
                                                                <Paperclip size={16} />
                                                                <span>{msg.media.name}</span>
                                                            </a>
                                                        )}
                                                    </div>
                                                )}
                                                <p>{msg.text}</p>
                                            </div>
                                        </div>
                                        <div className={`text-[10px] text-gray-500 mt-1 mx-1 flex items-center space-x-1 ${isMe ? 'justify-end' : 'justify-start'} ${!isMe ? 'ml-12' : ''}`}>
                                            <span>
                                                {(() => {
                                                    if (!msg.createdAt) return '';
                                                    const date = msg.createdAt.toDate ? msg.createdAt.toDate() : new Date(msg.createdAt);
                                                    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                                                })()}
                                            </span>
                                            {isLastMyMessage && isSeen && (
                                                <span className="font-medium text-gray-400">Seen</span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                            {partnerTyping && (
                                <div className="flex justify-start items-end">
                                    <div className="w-8 mr-2 flex-shrink-0"><img src={activePartner?.photoURL} className="w-7 h-7 rounded-full" /></div>
                                    <div className="bg-[#262626] text-gray-400 px-4 py-2 rounded-3xl rounded-bl-md text-sm animate-pulse">Typing...</div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        <div className="p-3 md:p-4 bg-black border-t border-gray-800 w-full">
                            <form onSubmit={sendMessage} className="flex items-center space-x-2 max-w-4xl mx-auto">
                                <label className="cursor-pointer text-gray-400 hover:text-white p-2">
                                    <ImageIcon size={24} />
                                    <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} disabled={isUploading} />
                                </label>
                                <input type="text" value={newMessage} onChange={(e) => { setNewMessage(e.target.value); handleTyping(); }} placeholder="Message..." className="flex-1 bg-[#262626] text-white rounded-full px-4 py-2.5 focus:outline-none focus:ring-1 focus:ring-gray-600" />
                                <button type="submit" disabled={!newMessage.trim() && !isUploading} className="text-[#3797F0] font-semibold p-2 hover:text-blue-400 disabled:opacity-50">Send</button>
                            </form>
                        </div>
                    </>
                ) : (
                    <div className="hidden md:flex flex-col items-center justify-center h-full text-center">
                        <div className="w-24 h-24 border-2 border-white rounded-full flex items-center justify-center mb-4"><Send size={48} className="text-white ml-2" /></div>
                        <h2 className="text-xl font-semibold text-white mb-2">Your Messages</h2>
                        <p className="text-gray-400">Send private photos and messages to a friend.</p>
                    </div>
                )}
            </div>

            {/* Mobile Bottom Navigation */}
            <div className={`md:hidden fixed bottom-0 left-0 right-0 bg-black border-t border-gray-800 flex justify-around items-center h-16 z-40 ${activeChat ? 'hidden' : 'flex'}`}>
                <div onClick={() => setActiveTab('messages')} className={`p-2 rounded-lg ${activeTab === 'messages' ? 'text-white' : 'text-gray-500'}`}><MessageCircle size={28} /></div>
                <div onClick={() => setActiveTab('friends')} className={`p-2 rounded-lg ${activeTab === 'friends' ? 'text-white' : 'text-gray-500'}`}><Users size={28} /></div>
                <div onClick={() => setActiveTab('search')} className={`p-2 rounded-lg ${activeTab === 'search' ? 'text-white' : 'text-gray-500'}`}><Search size={28} /></div>
                <div onClick={() => setIsGroupModalOpen(true)} className="p-2 text-blue-500"><PlusCircle size={28} /></div>
                <div onClick={logout} className="p-2 text-gray-500"><LogOut size={28} /></div>
                <img src={user.photoURL} alt="Profile" className="w-7 h-7 rounded-full border border-gray-600" />
            </div>

            {/* Image Modal */}
            {selectedImage && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4" onClick={() => setSelectedImage(null)}>
                    <button className="absolute top-4 right-4 text-white hover:text-gray-300 p-2" onClick={() => setSelectedImage(null)}><X size={32} /></button>
                    <img src={selectedImage} alt="Full screen" className="max-w-full max-h-[90vh] object-contain rounded-lg" onClick={(e) => e.stopPropagation()} />
                    <a href={selectedImage} download target="_blank" rel="noreferrer" className="absolute bottom-8 left-1/2 transform -translate-x-1/2 bg-white text-black px-6 py-2 rounded-full font-semibold hover:bg-gray-200 transition-colors flex items-center space-x-2" onClick={(e) => e.stopPropagation()}><span>Open Original</span></a>
                </div>
            )}

            <VideoCall />

            <CreateGroupModal
                isOpen={isGroupModalOpen}
                onClose={() => setIsGroupModalOpen(false)}
                friends={friends}
                onGroupCreated={(newChat) => {
                    setChats([newChat, ...chats]);
                    setActiveChat(newChat);
                    setActiveTab('messages');
                }}
            />

            <GroupMembersModal
                isOpen={isMembersModalOpen}
                onClose={() => setIsMembersModalOpen(false)}
                chat={activeChat}
                currentUserId={user.uid}
            />
        </div>
    );
}
