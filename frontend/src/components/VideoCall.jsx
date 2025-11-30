import React, { useEffect, useCallback, useState } from 'react';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import { PhoneOff, Mic, MicOff, Video as VideoIcon, VideoOff } from 'lucide-react';

export default function VideoCall() {
    const { name, callAccepted, myVideo, remoteStream, callEnded, stream, call, answerCall, leaveCall, isCalling } = useSocket();
    const { user } = useAuth();
    const remoteVideoRef = React.useRef();
    const [imgError, setImgError] = useState(false);



    const setLocalVideoRef = useCallback((node) => {
        if (node && stream) {
            node.srcObject = stream;
            node.play().catch(e => console.error("Failed to play local video:", e));
            myVideo.current = node;
        }
    }, [stream]);

    const setRemoteVideoRef = useCallback((node) => {
        if (node && remoteStream) {
            node.srcObject = remoteStream;
            node.play().catch(e => console.error("Failed to play remote video:", e));
            remoteVideoRef.current = node;
        }
    }, [remoteStream]);

    // Cleanup effect to ensure camera is turned off when component unmounts
    useEffect(() => {
        return () => {
            if (stream) {
                console.log("VideoCall unmounting, stopping tracks");
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, [stream]);

    if (!isCalling && !call.isReceivingCall && !callAccepted) return null;

    return (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center">
            {/* Incoming Call Modal */}
            {call.isReceivingCall && !callAccepted && (
                <div className="bg-gray-800 p-8 rounded-2xl shadow-2xl text-center border border-gray-700 animate-fade-in">
                    <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full mx-auto mb-4 flex items-center justify-center text-3xl font-bold text-white shadow-lg overflow-hidden">
                        {call.photoURL && !imgError ? (
                            <img
                                src={call.photoURL}
                                alt={call.name}
                                className="w-full h-full object-cover"
                                onError={() => setImgError(true)}
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-white">
                                {call.name?.charAt(0).toUpperCase() || 'U'}
                            </div>
                        )}
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-2">{call.name || 'Unknown User'}</h1>
                    <p className="text-gray-400 mb-8">Incoming Video Call...</p>
                    <div className="flex justify-center space-x-6">
                        <button
                            onClick={answerCall}
                            className="bg-green-500 hover:bg-green-600 text-white p-4 rounded-full shadow-lg transform hover:scale-110 transition-all duration-200"
                        >
                            <VideoIcon size={32} />
                        </button>
                        <button
                            onClick={leaveCall}
                            className="bg-red-500 hover:bg-red-600 text-white p-4 rounded-full shadow-lg transform hover:scale-110 transition-all duration-200"
                        >
                            <PhoneOff size={32} />
                        </button>
                    </div>
                </div>
            )}

            {/* Active Call UI */}
            {callAccepted && !callEnded && (
                <div className="relative w-full h-full flex flex-col">
                    {/* Remote Video Area */}
                    <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden">
                        <video
                            playsInline
                            ref={setRemoteVideoRef}
                            autoPlay
                            className="w-full h-full object-cover"
                        />

                        <div className="absolute top-4 left-4 bg-black/40 px-4 py-2 rounded-lg backdrop-blur-sm">
                            <p className="text-white font-semibold shadow-sm">{call.name || 'User'}</p>
                        </div>
                    </div>

                    {/* Local Video (Picture-in-Picture) */}
                    {stream && (
                        <div className="absolute top-4 right-4 w-32 h-48 md:w-48 md:h-72 bg-gray-800 rounded-xl overflow-hidden shadow-2xl border-2 border-white/20 z-[100] transition-shadow hover:shadow-white/40">
                            <video
                                playsInline
                                muted
                                ref={setLocalVideoRef}
                                autoPlay
                                className="w-full h-full object-cover pointer-events-none transform scale-x-[-1]"
                            />
                            <div className="absolute bottom-2 left-2 bg-black/60 px-2 py-1 rounded text-xs text-white pointer-events-none">
                                You
                            </div>
                        </div>
                    )}

                    {/* Controls Bar */}
                    <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex items-center space-x-6 bg-gray-900/80 backdrop-blur-md px-8 py-4 rounded-full border border-white/10 shadow-2xl z-[100]">
                        <button className="p-4 rounded-full bg-gray-700/50 text-white hover:bg-gray-600 transition-colors">
                            <Mic size={24} />
                        </button>
                        <button
                            onClick={leaveCall}
                            className="p-4 rounded-full bg-red-500 text-white hover:bg-red-600 shadow-lg shadow-red-500/30 transform hover:scale-105 transition-all"
                        >
                            <PhoneOff size={28} />
                        </button>
                        <button className="p-4 rounded-full bg-gray-700/50 text-white hover:bg-gray-600 transition-colors">
                            <VideoIcon size={24} />
                        </button>
                    </div>
                </div>
            )}

            {/* Calling State (Outgoing) */}
            {isCalling && !callAccepted && (
                <div className="bg-gray-800 p-8 rounded-2xl shadow-2xl text-center border border-gray-700 animate-pulse">
                    <div className="w-24 h-24 rounded-full mx-auto mb-4 overflow-hidden border-4 border-gray-600">
                        {call.photoURL && !imgError ? <img src={call.photoURL} className="w-full h-full object-cover" onError={() => setImgError(true)} /> : (
                            <div className="w-full h-full bg-gray-700 flex items-center justify-center">
                                <VideoIcon size={32} className="text-gray-400" />
                            </div>
                        )}
                    </div>
                    <h2 className="text-xl font-bold text-white mb-2">Calling {call.name}...</h2>
                    <button
                        onClick={leaveCall}
                        className="mt-6 bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-full transition-colors"
                    >
                        Cancel
                    </button>
                </div>
            )}
        </div>
    );
}
