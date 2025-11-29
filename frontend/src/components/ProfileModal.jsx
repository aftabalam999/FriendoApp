import React, { useState, useRef } from 'react';
import { X, Camera, Calendar, User, Edit2, Save } from 'lucide-react';
import { api } from '../api/client';

export default function ProfileModal({ isOpen, onClose, currentUser, onUpdate }) {
    if (!isOpen) return null;

    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        displayName: currentUser.displayName || '',
        bio: currentUser.bio || '',
        dob: currentUser.dob || ''
    });
    const [previewUrl, setPreviewUrl] = useState(currentUser.photoURL);
    const fileInputRef = useRef(null);

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Preview
        const reader = new FileReader();
        reader.onloadend = () => setPreviewUrl(reader.result);
        reader.readAsDataURL(file);

        // Upload immediately or wait for save? 
        // Let's upload on save to avoid orphan files if cancelled, 
        // BUT for simplicity in this flow, let's upload on save.
        // We'll store the file in state.
        setFormData(prev => ({ ...prev, file }));
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            let photoURL = currentUser.photoURL;

            if (formData.file) {
                const uploadRes = await api.upload('/upload', formData.file);
                photoURL = uploadRes.url;
            }

            const updates = {
                displayName: formData.displayName,
                bio: formData.bio,
                dob: formData.dob,
                photoURL
            };

            const updatedUser = await api.put('/users/me', updates);
            onUpdate(updatedUser);
            setIsEditing(false);
        } catch (error) {
            console.error('Failed to update profile', error);
            alert('Failed to update profile');
        }
        setLoading(false);
    };

    return (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
            <div className="bg-[#262626] w-full max-w-md rounded-xl overflow-hidden shadow-2xl border border-gray-800">

                {/* Header */}
                <div className="flex justify-between items-center p-4 border-b border-gray-800">
                    <h2 className="text-white font-semibold text-lg">Profile</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">
                        <X size={24} />
                    </button>
                </div>

                <div className="p-6 flex flex-col items-center">
                    {/* Avatar */}
                    <div className="relative group mb-6">
                        <img
                            src={previewUrl}
                            alt="Profile"
                            className="w-32 h-32 rounded-full object-cover border-4 border-black"
                        />
                        {isEditing && (
                            <div
                                className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <Camera className="text-white" size={32} />
                            </div>
                        )}
                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            accept="image/*"
                            onChange={handleFileChange}
                        />
                    </div>

                    {/* View Mode */}
                    {!isEditing ? (
                        <div className="w-full space-y-4 text-center">
                            <div>
                                <h3 className="text-2xl font-bold text-white">{currentUser.displayName}</h3>
                                <p className="text-gray-500">@{currentUser.username}</p>
                            </div>

                            <div className="bg-black/30 p-4 rounded-lg w-full text-left space-y-3">
                                <div className="flex items-start space-x-3">
                                    <User size={20} className="text-gray-500 mt-1" />
                                    <div>
                                        <p className="text-xs text-gray-500 uppercase font-semibold">Bio</p>
                                        <p className="text-gray-300">{currentUser.bio || 'No bio yet.'}</p>
                                    </div>
                                </div>
                                <div className="flex items-start space-x-3">
                                    <Calendar size={20} className="text-gray-500 mt-1" />
                                    <div>
                                        <p className="text-xs text-gray-500 uppercase font-semibold">Date of Birth</p>
                                        <p className="text-gray-300">{currentUser.dob || 'Not set'}</p>
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={() => setIsEditing(true)}
                                className="w-full bg-[#3797F0] hover:bg-blue-600 text-white py-2 rounded-lg font-semibold flex items-center justify-center space-x-2 transition-colors"
                            >
                                <Edit2 size={18} />
                                <span>Edit Profile</span>
                            </button>
                        </div>
                    ) : (
                        /* Edit Mode */
                        <div className="w-full space-y-4">
                            <div>
                                <label className="block text-xs text-gray-500 uppercase font-semibold mb-1">Display Name</label>
                                <input
                                    type="text"
                                    value={formData.displayName}
                                    onChange={e => setFormData({ ...formData, displayName: e.target.value })}
                                    className="w-full bg-black border border-gray-700 rounded-lg px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-xs text-gray-500 uppercase font-semibold mb-1">Bio</label>
                                <textarea
                                    value={formData.bio}
                                    onChange={e => setFormData({ ...formData, bio: e.target.value })}
                                    className="w-full bg-black border border-gray-700 rounded-lg px-3 py-2 text-white focus:border-blue-500 focus:outline-none resize-none h-24"
                                    placeholder="Tell us about yourself..."
                                />
                            </div>

                            <div>
                                <label className="block text-xs text-gray-500 uppercase font-semibold mb-1">Date of Birth</label>
                                <input
                                    type="date"
                                    value={formData.dob}
                                    onChange={e => setFormData({ ...formData, dob: e.target.value })}
                                    className="w-full bg-black border border-gray-700 rounded-lg px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
                                />
                            </div>

                            <div className="flex space-x-3 pt-2">
                                <button
                                    onClick={() => setIsEditing(false)}
                                    className="flex-1 bg-gray-800 hover:bg-gray-700 text-white py-2 rounded-lg font-semibold transition-colors"
                                    disabled={loading}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSave}
                                    className="flex-1 bg-[#3797F0] hover:bg-blue-600 text-white py-2 rounded-lg font-semibold flex items-center justify-center space-x-2 transition-colors"
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <span className="animate-pulse">Saving...</span>
                                    ) : (
                                        <>
                                            <Save size={18} />
                                            <span>Save Changes</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
