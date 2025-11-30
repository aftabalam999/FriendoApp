import React, { useState } from 'react';
import { X, Check, Users } from 'lucide-react';
import { api } from '../api/client';

const CreateGroupModal = ({ isOpen, onClose, friends, onGroupCreated }) => {
    const [groupName, setGroupName] = useState('');
    const [selectedFriends, setSelectedFriends] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    if (!isOpen) return null;

    const toggleFriend = (uid) => {
        if (selectedFriends.includes(uid)) {
            setSelectedFriends(selectedFriends.filter(id => id !== uid));
        } else {
            setSelectedFriends([...selectedFriends, uid]);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!groupName.trim() || selectedFriends.length === 0) return;

        setIsLoading(true);
        try {
            const newChat = await api.post('/chats/group', {
                name: groupName,
                participants: selectedFriends
            });
            onGroupCreated(newChat);
            onClose();
            setGroupName('');
            setSelectedFriends([]);
        } catch (error) {
            console.error('Failed to create group:', error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
            <div className="bg-gray-900 w-full max-w-md rounded-2xl border border-gray-800 shadow-2xl overflow-hidden">
                <div className="p-4 border-b border-gray-800 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-white flex items-center">
                        <Users className="mr-2 text-blue-500" /> Create New Group
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-4">
                    <div className="mb-6">
                        <label className="block text-gray-400 text-sm font-semibold mb-2">Group Name</label>
                        <input
                            type="text"
                            value={groupName}
                            onChange={(e) => setGroupName(e.target.value)}
                            placeholder="e.g. Weekend Trip"
                            className="w-full bg-black text-white rounded-lg px-4 py-3 border border-gray-700 focus:outline-none focus:border-blue-500"
                            autoFocus
                        />
                    </div>

                    <div className="mb-6">
                        <label className="block text-gray-400 text-sm font-semibold mb-2">Select Members ({selectedFriends.length})</label>
                        <div className="max-h-60 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                            {friends.length === 0 ? (
                                <p className="text-gray-500 text-center py-4">No friends found. Add friends first!</p>
                            ) : (
                                friends.map(friend => (
                                    <div
                                        key={friend.uid}
                                        onClick={() => toggleFriend(friend.uid)}
                                        className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${selectedFriends.includes(friend.uid) ? 'bg-blue-900/30 border border-blue-500/50' : 'bg-black border border-gray-800 hover:border-gray-600'}`}
                                    >
                                        <div className="flex items-center space-x-3">
                                            <img src={friend.photoURL} alt={friend.displayName} className="w-10 h-10 rounded-full" />
                                            <span className="text-white font-medium">{friend.displayName}</span>
                                        </div>
                                        {selectedFriends.includes(friend.uid) && (
                                            <div className="bg-blue-500 rounded-full p-1">
                                                <Check size={14} className="text-white" />
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={!groupName.trim() || selectedFriends.length === 0 || isLoading}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                    >
                        {isLoading ? 'Creating...' : 'Create Group'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default CreateGroupModal;
