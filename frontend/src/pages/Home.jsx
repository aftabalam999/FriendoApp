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

    const handleSearch = async (query) => {
        try {
            const data = await api.get(`/users/search?q=${query}`);
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
            if (activeChat?.id === chatId) {
                setMessages(prev => {
                    if (prev.some(m => m.id === message.id)) return prev;
                    return [...prev, message];
                });
            }

            setChats(prev => {
                const otherChats = prev.filter(c => c.id !== chatId);
                const chatToUpdate = prev.find(c => c.id === chatId);

                if (chatToUpdate) {
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
                    fetchChats();
                    return prev;
                }
            });
        };

        const handleNewFriendRequest = (request) => {
            setRequests(prev => [...prev, request]);
            showToast(`New friend request from ${request.displayName}`, 'info');
        };

        const handleFriendRequestAccepted = (friend) => {
            setFriends(prev => [...prev, friend]);
            setSentRequests(prev => prev.filter(uid => uid !== friend.uid));
            showToast(`${friend.displayName} accepted your friend request!`, 'success');
            fetchChats();
        };

        socket.on('messagesSeen', handleMessagesSeen);
        socket.on('newMessage', handleNewMessage);
        socket.on('newFriendRequest', handleNewFriendRequest);
        socket.on('friendRequestAccepted', handleFriendRequestAccepted);

        return () => {
            socket.off('messagesSeen', handleMessagesSeen);
            socket.off('newMessage', handleNewMessage);
            socket.off('newFriendRequest', handleNewFriendRequest);
            socket.off('friendRequestAccepted', handleFriendRequestAccepted);
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
        const colors = ['#CBAEEA', '#FFB4B4', '#8FE9A0', '#A9D8EC', '#FAD9A1', '#FFC8DD'];
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
        setChats(prev => prev.map(c => {
            if (c.id === chat.id && c.lastMessage) {
                const seenBy = c.lastMessage.seenBy || [];
                if (!seenBy.includes(user.uid)) {
                    return { ...c, lastMessage: { ...c.lastMessage, seenBy: [...seenBy, user.uid] } };
                }
            }
            return c;
        }));
    };

    return (
        <div className="flex h-[100dvh] bg-[#FAFBFF] font-sans text-gray-800 overflow-hidden relative">
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

            {/* LEFT SIDEBAR — hidden on mobile, always visible on desktop */}
            <div className="hidden md:flex md:relative z-40 w-[260px] h-full bg-[#7042f4] text-white flex-col py-8 rounded-r-[40px] shadow-[10px_0_30px_rgba(112,66,244,0.15)] shrink-0">
                <div className="flex flex-col h-full shrink-0">
                    <div className="px-8 flex items-center justify-between mb-12 cursor-pointer hover:opacity-80 transition-opacity">
                        <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 rounded bg-white/20 flex items-center justify-center font-bold text-sm tracking-wide shrink-0">
                                {user.displayName.substring(0, 2).toUpperCase()}
                            </div>
                            <span className="font-bold tracking-wide uppercase text-sm truncate">{user.displayName}</span>
                        </div>
                        <ChevronLeft size={16} className="rotate-180 opacity-60" />
                    </div>

                    <div className="flex flex-col pr-4 space-y-2">
                        <div onClick={() => setActiveTab('messages')} className={`pl-8 py-3.5 flex justify-between items-center cursor-pointer transition-all ${activeTab === 'messages' ? 'bg-[#FAFBFF] text-[#7042f4] rounded-r-full font-bold shadow-sm' : 'text-purple-200 hover:text-white hover:bg-white/10 rounded-r-full'}`}>
                            <div className="flex items-center space-x-4">
                                <MessageCircle size={20} />
                                <span className="text-[13px] tracking-wider">MESSAGES</span>
                            </div>
                            {hasUnreadMessages && activeTab === 'messages' && <div className="mr-5 text-[#7042f4] font-bold text-[10px] bg-purple-100 rounded-full w-2 h-2"></div>}
                            {hasUnreadMessages && activeTab !== 'messages' && <div className="mr-5 text-white bg-[#FF8FA3] px-1.5 py-0.5 rounded-full text-[10px] font-bold">New</div>}
                        </div>

                        <div onClick={() => setActiveTab('friends')} className={`pl-8 py-3.5 flex justify-between items-center cursor-pointer transition-all ${activeTab === 'friends' ? 'bg-[#FAFBFF] text-[#7042f4] rounded-r-full font-bold shadow-sm' : 'text-purple-200 hover:text-white hover:bg-white/10 rounded-r-full'}`}>
                            <div className="flex items-center space-x-4">
                                <Users size={20} />
                                <span className="text-[13px] tracking-wider">PERSON</span>
                            </div>
                            {requests.length > 0 && <div className={`mr-5 ${activeTab === 'friends' ? 'bg-purple-100 text-[#7042f4]' : 'bg-[#FF8FA3] text-white'} px-2 overflow-hidden py-0.5 shrink-0 rounded-full font-bold text-[10px]`}>{requests.length}</div>}
                        </div>

                        <div onClick={() => setActiveTab('search')} className={`pl-8 py-3.5 flex justify-between items-center cursor-pointer transition-all ${activeTab === 'search' ? 'bg-[#FAFBFF] text-[#7042f4] rounded-r-full font-bold shadow-sm' : 'text-purple-200 hover:text-white hover:bg-white/10 rounded-r-full'}`}>
                            <div className="flex items-center space-x-4">
                                <Search size={20} />
                                <span className="text-[13px] tracking-wider">SEARCH</span>
                            </div>
                        </div>

                        <div onClick={() => setIsGroupModalOpen(true)} className={`pl-8 py-3.5 flex items-center cursor-pointer transition-all text-purple-200 hover:text-white hover:bg-white/10 rounded-r-full`}>
                            <div className="flex items-center space-x-4">
                                <PlusCircle size={20} />
                                <span className="text-[13px] tracking-wider">GROUP</span>
                            </div>
                        </div>
                    </div>

                    <div className="mt-auto pr-4 flex flex-col space-y-2 mb-4 shrink-0">
                        <div className="pl-8 py-3 flex items-center space-x-4 text-purple-200 hover:text-white cursor-pointer transition-colors" onClick={logout}>
                            <LogOut size={20} />
                            <span className="text-[13px] tracking-wider font-semibold">LOGOUT</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* MAIN CONTENT AREA */}
            <div className="flex-1 flex flex-col relative w-full h-full overflow-hidden min-w-0">
                {/* TWO-COLUMN LAYOUT */}
                <div className="flex-1 flex flex-row overflow-hidden md:mx-6 lg:mx-8 mb-4 md:mb-6 rounded-[24px] md:shadow-[0_8px_40px_rgba(0,0,0,0.04)] border-gray-100/80 md:border bg-white mt-4 md:mt-6">

                    {/* LEFT LIST COLUMN */}
                    <div className={`flex flex-col w-full md:w-[320px] lg:w-[360px] shrink-0 border-r border-gray-100 bg-white ${activeChat ? 'hidden md:flex' : 'flex'}`}>
                        {/* Mobile Header logic */}
                        <div className="md:hidden flex items-center justify-between px-6 py-4 border-b border-gray-100">
                            <h2 className="text-xl font-bold text-gray-800 truncate">{user.displayName}</h2>
                            <img src={user.photoURL} className="w-8 h-8 rounded-full shadow cursor-pointer" />
                        </div>

                        <div className="p-1 md:p-6 pb-24 md:pb-6 overflow-y-auto flex-1 custom-scroll">
                            <div className="flex justify-between items-center mb-6 px-4 md:px-0 mt-4 md:mt-0">
                                <h2 className="text-2xl md:text-xl font-bold text-gray-800 capitalize tracking-tight">{activeTab === 'messages' ? 'Recent' : activeTab}</h2>
                            </div>

                            {activeTab === 'messages' && (
                                <div className="space-y-1">
                                    {chats.length === 0 ? (
                                        <div className="text-center text-gray-400 py-10 px-4 text-sm font-medium">
                                            No conversations. Start reaching out!
                                        </div>
                                    ) : chats.map(chat => {
                                        const partner = getChatPartner(chat);
                                        const isSelected = activeChat?.id === chat.id;
                                        const unread = isUnread(chat);

                                        return (
                                            <div key={chat.id} onClick={() => handleChatClick(chat)} className={`flex items-start justify-between p-3.5 mx-2 md:mx-0 rounded-2xl cursor-pointer transition-all duration-200 ${isSelected ? 'bg-purple-50 shrink-0' : 'hover:bg-gray-50 border border-transparent'}`}>
                                                <div className="flex items-center space-x-3 w-full truncate relative">
                                                    {isSelected && <div className="absolute -left-3.5 top-2 bottom-2 w-1 bg-[#7042f4] rounded-r-md"></div>}
                                                    <div className="relative shrink-0 flex items-center justify-center">
                                                        {chat.type === 'group' ? (
                                                            <div className="w-[46px] h-[46px] bg-white rounded-full flex items-center justify-center font-bold text-[16px] text-[#7042f4] border border-gray-200 shadow-sm">{partner.displayName.substring(0, 2).toUpperCase()}</div>
                                                        ) : (
                                                            <img src={partner.photoURL} className="w-[46px] h-[46px] rounded-full object-cover border border-gray-100" />
                                                        )}
                                                        {chat.lastMessage?.senderId !== user.uid && partnerTyping && chat.id === activeChat?.id && <div className="absolute bottom-0 right-0 w-3 h-3 bg-[#80ED99] rounded-full border-2 border-white"></div>}
                                                    </div>
                                                    <div className="flex-1 min-w-0 pr-2 pb-0.5">
                                                        <h4 className={`text-[14.5px] truncate font-semibold ${isSelected ? 'text-[#7042f4]' : 'text-gray-800'}`}>{partner.displayName}</h4>
                                                        <p className={`text-[13px] truncate mt-0.5 leading-snug font-medium ${isSelected ? 'text-gray-600' : 'text-gray-400'}`}>{chat.lastMessage?.text || (chat.lastMessage?.media ? 'Attachment' : 'Start chatting')}</p>
                                                    </div>
                                                    <div className="flex flex-col items-end shrink-0 pl-1 space-y-1.5 self-center">
                                                        {unread && <div className="w-5 h-5 bg-[#FF8FA3] text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-sm">1</div>}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {activeTab === 'friends' && (
                                <div className="space-y-6">
                                    {requests.length > 0 && (
                                        <div className="px-2 md:px-0">
                                            <h3 className="text-[11px] font-bold text-gray-400 mb-3 uppercase tracking-widest pl-1">Friend Requests</h3>
                                            <div className="space-y-2">
                                                {requests.map(req => (
                                                    <div key={req.uid} className="flex items-center justify-between bg-purple-50 p-3 rounded-2xl">
                                                        <div className="flex items-center space-x-3 truncate">
                                                            <img src={req.photoURL} className="w-10 h-10 rounded-full" />
                                                            <p className="font-semibold text-gray-800 text-[14.5px] truncate">{req.displayName}</p>
                                                        </div>
                                                        <button onClick={() => acceptRequest(req.uid)} className="p-2 ml-2 bg-[#7042f4] text-white rounded-xl shadow-md hover:bg-purple-700 transition"><Check size={16} /></button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    <div className="px-2 md:px-0">
                                        <h3 className="text-[11px] font-bold text-gray-400 mb-3 uppercase tracking-widest pl-1">Contacts</h3>
                                        <div className="space-y-1">
                                            {friends.map(friend => (
                                                <div key={friend.uid} className="flex items-center justify-between p-3.5 hover:bg-gray-50 rounded-2xl cursor-pointer transition border border-transparent" onClick={() => startChat(friend.uid)}>
                                                    <div className="flex items-center space-x-3 truncate">
                                                        <img src={friend.photoURL} className="w-11 h-11 rounded-full border border-gray-100" />
                                                        <span className="text-gray-800 font-semibold text-[14.5px] truncate">{friend.displayName}</span>
                                                    </div>
                                                    <MessageCircle size={18} className="text-[#7042f4] opacity-40 shrink-0" />
                                                </div>
                                            ))}
                                            {friends.length === 0 && <p className="text-[13px] text-gray-400 text-center py-6 font-medium">No friends yet. Expand your network!</p>}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'search' && (
                                <div className="px-2 md:px-0">
                                    <div className="relative mb-6">
                                        <input type="text" placeholder="Search people..." className="w-full bg-white border border-gray-200 text-gray-800 rounded-full pl-11 pr-4 py-3 focus:outline-none focus:border-purple-300 font-medium shadow-sm text-[14.5px] transition" value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); handleSearch(e.target.value); }} />
                                        <Search className="absolute left-4 top-[14px] text-gray-400" size={18} />
                                    </div>
                                    <div className="space-y-1">
                                        {searchResults.filter(res => res.uid !== user.uid).map(res => {
                                            const status = getFriendStatus(res.uid);
                                            return (
                                                <div key={res.uid} className="flex items-center justify-between p-3.5 hover:bg-gray-50 rounded-2xl transition cursor-pointer">
                                                    <div className="flex items-center space-x-3 truncate">
                                                        <img src={res.photoURL} className="w-11 h-11 rounded-full shrink-0 border border-gray-100" />
                                                        <div className="truncate">
                                                            <p className="font-bold text-gray-800 text-[14.5px] truncate">{res.displayName}</p>
                                                            <p className="text-xs text-gray-400 truncate">@{res.username}</p>
                                                        </div>
                                                    </div>
                                                    {status === 'none' && <button onClick={() => sendRequest(res.uid)} className="px-5 py-2 bg-[#7042f4] shadow-md shadow-purple-200 text-white text-[10px] font-bold uppercase tracking-wide rounded-full hover:bg-purple-700 transition ml-2">Add</button>}
                                                    {status === 'sent' && <span className="text-gray-400 text-[10px] font-bold tracking-wide uppercase px-2">Sent</span>}
                                                    {status === 'friend' && <span className="text-[#80ED99] text-[10px] font-bold tracking-wide uppercase px-2">Friend</span>}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* RIGHT CHAT COLUMN */}
                    <div className={`flex-1 flex flex-col bg-white overflow-hidden relative min-w-0 ${activeChat ? 'flex' : 'hidden md:flex'}`}>
                        {activeChat ? (
                            <>
                                {/* Chat Header */}
                                <div className="h-20 border-b border-gray-100 flex justify-between items-center px-6 md:px-8 shrink-0 relative bg-white w-full">
                                    <div className="flex items-center space-x-4 cursor-pointer" onClick={() => { if (activeChat.type === 'group') setIsMembersModalOpen(true); }}>
                                        <div className="md:hidden w-10 h-10 rounded-full hover:bg-gray-100 flex items-center justify-center transition" onClick={(e) => { e.stopPropagation(); setActiveChat(null); }}>
                                            <ChevronLeft className="text-gray-600 block" size={24} />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-gray-800 text-[17px] tracking-tight mb-[2px]">{activePartner?.displayName}</h3>
                                            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">{activeChat.type === 'group' ? `${activeChat.participants.length} members` : 'Status: Online'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-1 md:space-x-3">
                                        {activeChat.type === 'group' ? (
                                            <div className="flex items-center -space-x-2 mr-2 md:mr-4">
                                                {activeChat.participants.slice(0, 3).map((p, i) => (
                                                    <img key={p} src={memberDetails[p]?.photoURL || 'https://via.placeholder.com/40'} className="w-8 h-8 rounded-full border-2 border-white relative object-cover bg-gray-100 z-[3]" style={{ zIndex: 3 - i }} />
                                                ))}
                                                {activeChat.participants.length > 3 && <div className="w-8 h-8 rounded-full border-2 border-white bg-gray-100 text-[10px] font-bold text-gray-500 flex items-center justify-center relative z-0">+{activeChat.participants.length - 3}</div>}
                                            </div>
                                        ) : (
                                            <img src={activePartner?.photoURL} className="w-8 h-8 rounded-full object-cover mr-2 md:mr-4 ml-2" />
                                        )}
                                        <div className="w-10 h-10 rounded-full hover:bg-gray-100 flex items-center justify-center cursor-pointer text-gray-400 transition" onClick={() => { if (activeChat.type !== 'group') { const partner = activeChat.participants.find(p => p !== user.uid); if (partner) callUser(partner, activePartner?.displayName, activePartner?.photoURL); } }}>
                                            <Video size={18} />
                                        </div>
                                        <div className="w-10 h-10 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 transition hidden sm:flex cursor-pointer" onClick={() => setIsMembersModalOpen(true)}>
                                            <div className="flex flex-col space-y-1 items-center justify-center h-full">
                                                <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
                                                <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
                                                <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Messages View */}
                                <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-1.5 md:space-y-2 custom-scroll relative">
                                    <div className="text-center text-[10px] font-bold uppercase tracking-widest text-gray-300 py-6 relative before:border-t before:border-gray-100 before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:w-[35%] lg:before:w-[42%] after:border-t after:border-gray-100 after:absolute after:right-0 after:top-1/2 after:-translate-y-1/2 after:w-[35%] lg:after:w-[42%] flex justify-center">
                                        <span className="bg-white px-4 relative z-10 block">Today</span>
                                    </div>
                                    {messages.map((msg, index) => {
                                        const isMe = msg.senderId === user.uid;
                                        const showAvatar = !isMe && (index === messages.length - 1 || messages[index + 1]?.senderId === user.uid);
                                        const showName = activeChat.type === 'group' && !isMe && (index === 0 || messages[index - 1]?.senderId !== msg.senderId);

                                        return (
                                            <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} group w-full ${showName ? 'mt-3' : ''}`}>
                                                <div className={`flex ${isMe ? 'justify-end' : 'justify-start'} items-end w-full max-w-[90%] lg:max-w-[70%]`}>
                                                    {!isMe && (
                                                        <div className="w-8 mr-3 flex-shrink-0 self-start mt-1">
                                                            {showAvatar ? <img src={memberDetails[msg.senderId]?.photoURL || activePartner?.photoURL} className="w-8 h-8 rounded-full object-cover" /> : <div className="w-8 h-8"></div>}
                                                        </div>
                                                    )}
                                                    <div className="flex flex-col w-full">
                                                        {showName && (
                                                            <span className="text-[12px] font-semibold mb-1 pl-2" style={{ color: '#aaa' }}>{memberDetails[msg.senderId]?.displayName || 'User'}</span>
                                                        )}
                                                        <div className={`relative px-5 py-3 shadow-none inline-block max-w-fit ${isMe ? 'bg-[#FAFAFA] border border-gray-100 text-gray-800 rounded-3xl rounded-br-md self-end' : 'text-gray-800 rounded-3xl rounded-bl-md font-medium self-start'}`} style={!isMe ? { backgroundColor: getUserColor(msg.senderId) } : {}}>
                                                            {msg.media && (
                                                                <div className="mb-2">
                                                                    {msg.media.type.startsWith('image/') ? (
                                                                        <img src={msg.media.url} alt="attachment" className="rounded-2xl max-h-60 object-cover cursor-pointer hover:opacity-95 transition" onClick={() => setSelectedImage(msg.media.url)} />
                                                                    ) : (
                                                                        <a href={msg.media.url} target="_blank" rel="noreferrer" className="flex items-center space-x-2 text-[14px] bg-white/40 p-3 rounded-2xl hover:bg-white/60 transition w-fit">
                                                                            <Paperclip size={18} className="text-gray-700 opacity-70" />
                                                                            <span className="font-semibold text-gray-800">{msg.media.name.substring(0, 20)}...</span>
                                                                        </a>
                                                                    )}
                                                                </div>
                                                            )}
                                                            <p className="text-[14.5px] leading-[1.4] tracking-tight px-1">{msg.text}</p>
                                                        </div>
                                                        <div className={`text-[10px] font-bold text-gray-300 mt-1.5 flex items-center space-x-1 uppercase tracking-widest ${isMe ? 'justify-end pr-2' : 'justify-start pl-2'}`}>
                                                            <span>{msg.createdAt && new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }).replace(/ AM| PM/i, p => p.toLowerCase())}</span>
                                                            {isMe && <Check size={12} className={msg.seenBy && msg.seenBy.some(uid => uid !== user.uid) ? 'text-blue-500' : 'text-gray-300'} />}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {partnerTyping && (
                                        <div className="flex justify-start items-start mb-4 animate-in fade-in">
                                            <div className="w-8 mr-3 flex-shrink-0"><img src={activePartner?.photoURL} className="w-8 h-8 rounded-full object-cover" /></div>
                                            <div className="bg-[#FAFAFA] border border-gray-100 text-gray-400 px-5 py-3 rounded-2xl rounded-bl-md flex space-x-1.5 items-center h-[46px]">
                                                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></div>
                                                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }}></div>
                                                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }}></div>
                                            </div>
                                        </div>
                                    )}
                                    <div ref={messagesEndRef} className="h-4" />
                                </div>

                                {/* Chat Input Area */}
                                <div className="p-3 md:p-6 bg-white shrink-0 w-full safe-area-pb">
                                    <form onSubmit={sendMessage} className="flex flex-wrap md:flex-nowrap items-center border border-gray-100 shadow-[0_2px_15px_rgba(0,0,0,0.02)] rounded-full px-2 py-2 bg-[#FAFBFF] w-full lg:w-[95%] xl:w-[85%] mx-auto transition-all focus-within:shadow-[0_2px_20px_rgba(0,0,0,0.05)] focus-within:border-purple-200">
                                        <input type="text" value={newMessage} onChange={(e) => { setNewMessage(e.target.value); handleTyping(); }} placeholder="Type your message ..." className="flex-1 bg-transparent text-gray-800 px-5 py-2.5 font-medium focus:outline-none placeholder-gray-400 text-[14.5px] min-w-[50%]" />

                                        <div className="flex items-center space-x-1.5 text-gray-400 pr-3 shrink-0 md:ml-auto ml-2 overflow-x-auto overflow-y-hidden">
                                            <div className="p-2 cursor-pointer hover:bg-white hover:shadow-sm rounded-full transition"><Smile size={20} /></div>
                                            <label className="p-2 cursor-pointer hover:bg-white hover:shadow-sm rounded-full transition flex-shrink-0">
                                                <Paperclip size={20} className="transform -rotate-45" />
                                                <input type="file" className="hidden" onChange={handleFileUpload} disabled={isUploading} />
                                            </label>
                                        </div>

                                        <button type="submit" disabled={!newMessage.trim() && !isUploading} className="text-[#7042f4] bg-white border border-gray-100 hover:bg-gray-50 hover:text-purple-700 w-[42px] h-[42px] rounded-full flex items-center justify-center transition disabled:opacity-50 disabled:shadow-none shrink-0 shadow-sm mr-1">
                                            {isUploading ? <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div> : <Send size={18} className="translate-x-[2px] -translate-y-[1px]" />}
                                        </button>
                                    </form>
                                    <p className="text-center text-[10px] text-gray-300 font-bold uppercase tracking-wider mt-3 mb-1 hidden md:block">Protected by end-to-end encryption</p>
                                </div>
                            </>
                        ) : (
                            <div className="hidden md:flex flex-col items-center justify-center h-full text-center bg-white p-8">
                                <div className="w-28 h-28 bg-[#FAFAFf] border border-gray-100 rounded-full flex flex-col items-center justify-center mb-6">
                                    <MessageCircle size={40} className="text-[#7042f4] opacity-50" />
                                </div>
                                <h2 className="text-2xl font-bold text-gray-800 mb-3 tracking-tight">Select a Chat to Start</h2>
                                <p className="text-gray-400 text-sm max-w-sm leading-relaxed font-medium">Connect with friends, share moments, and build communities instantly through direct messages.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Mobile Bottom Navigation Bar */}
                <div className={`md:hidden fixed bottom-0 z-[60] left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-gray-100 flex justify-around items-center h-16 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] ${activeChat ? 'hidden' : 'flex'}`}>
                    <div onClick={() => setActiveTab('messages')} className={`flex flex-col items-center gap-1 px-5 py-2 rounded-2xl transition ${activeTab === 'messages' ? 'text-[#7042f4]' : 'text-gray-400'}`}>
                        <MessageCircle size={22} />
                        <span className="text-[9px] font-bold uppercase tracking-wider">Chats</span>
                        {hasUnreadMessages && <span className="absolute top-2 w-2 h-2 rounded-full bg-[#FF8FA3] border border-white"></span>}
                    </div>
                    <div onClick={() => setActiveTab('friends')} className={`flex flex-col items-center gap-1 px-5 py-2 rounded-2xl relative transition ${activeTab === 'friends' ? 'text-[#7042f4]' : 'text-gray-400'}`}>
                        <Users size={22} />
                        <span className="text-[9px] font-bold uppercase tracking-wider">People</span>
                        {requests.length > 0 && <span className="absolute top-1.5 right-3 w-4 h-4 rounded-full bg-[#FF8FA3] border border-white text-white text-[9px] flex items-center justify-center font-bold">{requests.length}</span>}
                    </div>
                    <div onClick={() => setActiveTab('search')} className={`flex flex-col items-center gap-1 px-5 py-2 rounded-2xl transition ${activeTab === 'search' ? 'text-[#7042f4]' : 'text-gray-400'}`}>
                        <Search size={22} />
                        <span className="text-[9px] font-bold uppercase tracking-wider">Search</span>
                    </div>
                    <div onClick={() => setIsGroupModalOpen(true)} className="flex flex-col items-center gap-1 px-5 py-2 rounded-2xl text-gray-400">
                        <PlusCircle size={22} />
                        <span className="text-[9px] font-bold uppercase tracking-wider">Group</span>
                    </div>
                    <div onClick={logout} className="flex flex-col items-center gap-1 px-5 py-2 rounded-2xl text-gray-400">
                        <LogOut size={22} />
                        <span className="text-[9px] font-bold uppercase tracking-wider">Logout</span>
                    </div>
                </div>

            </div>

            {/* Modals and overlay fragments stay exactly identical as logic demands */}
            {selectedImage && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 md:p-12 animate-in fade-in transition" onClick={() => setSelectedImage(null)}>
                    <button className="absolute top-6 right-6 text-white/50 hover:text-white bg-white/10 p-2 rounded-full transition" onClick={() => setSelectedImage(null)}><X size={24} /></button>
                    <img src={selectedImage} alt="Full screen" className="max-w-full max-h-[90vh] object-contain rounded-xl shadow-2xl" onClick={(e) => e.stopPropagation()} />
                </div>
            )}

            <VideoCall />
            <CreateGroupModal isOpen={isGroupModalOpen} onClose={() => setIsGroupModalOpen(false)} friends={friends} onGroupCreated={(newChat) => { setChats([newChat, ...chats]); setActiveChat(newChat); setActiveTab('messages'); }} />
            <GroupMembersModal isOpen={isMembersModalOpen} onClose={() => setIsMembersModalOpen(false)} chat={activeChat} currentUserId={user.uid} />
        </div>
    );
};
