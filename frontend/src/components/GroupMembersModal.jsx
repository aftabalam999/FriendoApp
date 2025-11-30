import React, { useEffect, useState } from 'react';
import { X, User, UserPlus, Trash2, Check } from 'lucide-react';
import { api } from '../api/client';

const GroupMembersModal = ({ isOpen, onClose, chat, currentUserId }) => {
    const [members, setMembers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isAdding, setIsAdding] = useState(false);
    const [friends, setFriends] = useState([]);
    const [selectedFriends, setSelectedFriends] = useState([]);
    const [confirmRemoveUid, setConfirmRemoveUid] = useState(null);

    useEffect(() => {
        if (isOpen && chat && chat.participants) {
            fetchMembers();
            setIsAdding(false);
            setSelectedFriends([]);
            setConfirmRemoveUid(null);
        }
    }, [isOpen, chat]);

    const fetchMembers = async () => {
        setLoading(true);
        try {
            const memberPromises = chat.participants.map(async (uid) => {
                try {
                    const userData = await api.get(`/users/${uid}`);
                    return { ...userData, uid };
                } catch (err) {
                    console.error(`Failed to fetch user ${uid}`, err);
                    return { uid, displayName: 'Unknown User', photoURL: '' };
                }
            });

            const fetchedMembers = await Promise.all(memberPromises);
            setMembers(fetchedMembers);
        } catch (error) {
            console.error('Failed to fetch group members', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchFriendsToAdd = async () => {
        try {
            const allFriends = await api.get('/friends');
            // Filter out friends who are already in the group
            const availableFriends = allFriends.filter(f => !chat.participants.includes(f.uid));
            setFriends(availableFriends);
        } catch (error) {
            console.error(error);
        }
    };

    const handleAddMode = () => {
        setIsAdding(true);
        fetchFriendsToAdd();
    };

    const toggleFriendSelection = (uid) => {
        if (selectedFriends.includes(uid)) {
            setSelectedFriends(selectedFriends.filter(id => id !== uid));
        } else {
            setSelectedFriends([...selectedFriends, uid]);
        }
    };

    const addSelectedMembers = async () => {
        if (selectedFriends.length === 0) return;
        try {
            await api.post(`/chats/${chat.id}/participants`, { newParticipants: selectedFriends });
            onClose();
            window.location.reload();
        } catch (error) {
            console.error('Failed to add members', error);
        }
    };

    const handleRemoveClick = (uid) => {
        setConfirmRemoveUid(uid);
    };

    const cancelRemove = () => {
        setConfirmRemoveUid(null);
    };

    const confirmRemoveMember = async (uid) => {
        try {
            await api.delete(`/chats/${chat.id}/participants/${uid}`);
            setMembers(members.filter(m => m.uid !== uid));
            setConfirmRemoveUid(null);
        } catch (error) {
            console.error('Failed to remove member', error);
        }
    };

    if (!isOpen) return null;

    const isAdmin = chat.admin === currentUserId;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={onClose}>
            <div className="bg-gray-900 w-full max-w-md rounded-2xl border border-gray-800 shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-gray-800 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-white flex items-center">
                        <User className="mr-2 text-blue-500" />
                        {isAdding ? 'Add Members' : 'Group Members'}
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">
                        <X size={24} />
                    </button>
                </div>

                <div className="p-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
                    {loading ? (
                        <div className="flex justify-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                        </div>
                    ) : isAdding ? (
                        <div className="space-y-3">
                            {friends.length === 0 ? (
                                <p className="text-gray-500 text-center">No friends available to add.</p>
                            ) : (
                                friends.map(friend => (
                                    <div key={friend.uid} className="flex items-center justify-between p-2 hover:bg-gray-800 rounded-lg cursor-pointer" onClick={() => toggleFriendSelection(friend.uid)}>
                                        <div className="flex items-center space-x-3">
                                            <img src={friend.photoURL} className="w-10 h-10 rounded-full" />
                                            <span className="text-white font-medium">{friend.displayName}</span>
                                        </div>
                                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${selectedFriends.includes(friend.uid) ? 'bg-blue-500 border-blue-500' : 'border-gray-600'}`}>
                                            {selectedFriends.includes(friend.uid) && <Check size={14} className="text-white" />}
                                        </div>
                                    </div>
                                ))
                            )}
                            <div className="flex space-x-3 mt-4">
                                <button onClick={() => setIsAdding(false)} className="flex-1 py-2 bg-gray-800 text-white rounded-lg font-medium">Cancel</button>
                                <button onClick={addSelectedMembers} disabled={selectedFriends.length === 0} className="flex-1 py-2 bg-blue-600 text-white rounded-lg font-medium disabled:opacity-50">Add Selected</button>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="space-y-3 mb-4">
                                {members.map(member => (
                                    <div key={member.uid} className="flex items-center justify-between p-2 hover:bg-gray-800 rounded-lg transition-colors group">
                                        <div className="flex items-center space-x-3">
                                            <img
                                                src={member.photoURL || 'https://via.placeholder.com/40'}
                                                alt={member.displayName}
                                                className="w-10 h-10 rounded-full object-cover border border-gray-700"
                                            />
                                            <div>
                                                <p className="text-white font-medium flex items-center">
                                                    {member.displayName}
                                                    {member.uid === currentUserId && <span className="text-gray-500 text-sm ml-2">(You)</span>}
                                                    {chat.admin === member.uid && <span className="text-blue-500 text-xs ml-2 border border-blue-500 px-1 rounded">Admin</span>}
                                                </p>
                                                <p className="text-gray-500 text-xs">@{member.username || 'user'}</p>
                                            </div>
                                        </div>
                                        {isAdmin && member.uid !== currentUserId && (
                                            <div className="flex items-center">
                                                {confirmRemoveUid === member.uid ? (
                                                    <div className="flex items-center space-x-2 animate-in fade-in slide-in-from-right-4 duration-200">
                                                        <button onClick={() => confirmRemoveMember(member.uid)} className="p-1.5 bg-red-600 text-white rounded hover:bg-red-700 transition-colors" title="Confirm Remove">
                                                            <Check size={16} />
                                                        </button>
                                                        <button onClick={cancelRemove} className="p-1.5 bg-gray-700 text-white rounded hover:bg-gray-600 transition-colors" title="Cancel">
                                                            <X size={16} />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button onClick={() => handleRemoveClick(member.uid)} className="text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-red-500/10 rounded-full" title="Remove Member">
                                                        <Trash2 size={18} />
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>

                            <button onClick={handleAddMode} className="w-full py-3 flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-colors">
                                <UserPlus size={20} />
                                <span>Add Members</span>
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default GroupMembersModal;
