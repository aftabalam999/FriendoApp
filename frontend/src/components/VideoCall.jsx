import React, { useEffect, useState, useRef } from 'react';
import { useSocket } from '../context/SocketContext';
import { Phone, PhoneOff, Video } from 'lucide-react';

const VideoCall = () => {
    const {
        call,
        callAccepted,
        myVideo,
        userVideo,
        stream,
        remoteStream,
        callEnded,
        leaveCall,
        answerCall,
        isCalling
    } = useSocket();

    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const dragRef = useRef(null);
    const offsetRef = useRef({ x: 0, y: 0 });

    // Initialize position to bottom-right on mount
    useEffect(() => {
        setPosition({
            x: window.innerWidth - 220, // Approximate width + margin
            y: window.innerHeight - 320 // Approximate height + margin
        });
    }, []);

    useEffect(() => {
        if (myVideo.current && stream) {
            myVideo.current.srcObject = stream;
            myVideo.current.play().catch(err => console.error("Failed to play local video:", err));
        }
    }, [stream, myVideo]);

    useEffect(() => {
        if (userVideo.current && remoteStream) {
            userVideo.current.srcObject = remoteStream;
            userVideo.current.play().catch(err => console.error("Failed to play remote video:", err));
        }
    }, [remoteStream, userVideo]);

    const handleMouseDown = (e) => {
        setIsDragging(true);
        const rect = dragRef.current.getBoundingClientRect();
        offsetRef.current = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    };

    const handleMouseMove = (e) => {
        if (!isDragging) return;
        e.preventDefault();
        const newX = e.clientX - offsetRef.current.x;
        const newY = e.clientY - offsetRef.current.y;

        // Boundary checks
        const maxX = window.innerWidth - dragRef.current.offsetWidth;
        const maxY = window.innerHeight - dragRef.current.offsetHeight;

        setPosition({
            x: Math.min(Math.max(0, newX), maxX),
            y: Math.min(Math.max(0, newY), maxY)
        });
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    useEffect(() => {
        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        } else {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging]);

    if (!call.isReceivingCall && !callAccepted && !isCalling) return null;

    // Audio Call UI
    if (callAccepted && !callEnded && (!remoteStream || remoteStream.getVideoTracks().length === 0)) {
        return (
            <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center overflow-hidden">
                <div className="flex flex-col md:flex-row w-full h-full">
                    {/* Remote User (Top/Left) */}
                    <div className="relative w-full md:w-1/2 h-1/2 md:h-full flex items-center justify-center overflow-hidden border-b md:border-b-0 md:border-r border-gray-800">
                        {/* Blurred Background */}
                        <div className="absolute inset-0 bg-gray-900">
                            <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 to-purple-900/20 backdrop-blur-3xl" />
                        </div>

                        {/* Avatar */}
                        <div className="relative z-10 flex flex-col items-center animate-pulse">
                            <div className="w-32 h-32 md:w-48 md:h-48 rounded-full bg-gray-700 flex items-center justify-center border-4 border-gray-600 shadow-2xl mb-4">
                                <span className="text-5xl md:text-7xl font-bold text-white">
                                    {call.name ? call.name[0].toUpperCase() : 'U'}
                                </span>
                            </div>
                            <h3 className="text-2xl md:text-3xl font-bold text-white">{call.name || 'User'}</h3>
                            <p className="text-gray-400 mt-2">Connected</p>
                        </div>
                    </div>

                    {/* Local User (Bottom/Right) */}
                    <div className="relative w-full md:w-1/2 h-1/2 md:h-full flex items-center justify-center overflow-hidden">
                        {/* Blurred Background */}
                        <div className="absolute inset-0 bg-gray-900">
                            <div className="absolute inset-0 bg-gradient-to-tl from-emerald-900/20 to-teal-900/20 backdrop-blur-3xl" />
                        </div>

                        {/* Avatar */}
                        <div className="relative z-10 flex flex-col items-center">
                            <div className="w-32 h-32 md:w-48 md:h-48 rounded-full bg-gray-700 flex items-center justify-center border-4 border-gray-600 shadow-2xl mb-4">
                                <span className="text-5xl md:text-7xl font-bold text-white">You</span>
                            </div>
                            <h3 className="text-2xl md:text-3xl font-bold text-white">You</h3>
                        </div>
                    </div>
                </div>

                {/* Controls */}
                <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex items-center space-x-8 z-30">
                    <button onClick={leaveCall} className="bg-red-500 p-4 rounded-full hover:bg-red-600 transition-colors shadow-lg">
                        <PhoneOff size={32} />
                    </button>
                </div>
            </div>
        );
    }

    // Video Call UI
    return (
        <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center overflow-hidden">
            {/* Main Video Container */}
            <div className="relative w-full h-full flex items-center justify-center">

                {/* Remote Video (Full Screen) */}
                {callAccepted && !callEnded ? (
                    <div className="w-full h-full">
                        <video
                            playsInline
                            ref={userVideo}
                            autoPlay
                            className="w-full h-full object-cover"
                        />
                        <div className="absolute top-4 left-4 bg-black/50 px-4 py-2 rounded-lg text-white font-semibold z-10">
                            {call.name || 'User'}
                        </div>
                    </div>
                ) : (
                    /* Placeholder or Self Video when not connected yet */
                    <div className="flex flex-col items-center justify-center h-full text-white">
                        <div className="w-24 h-24 bg-gray-700 rounded-full flex items-center justify-center mb-4 animate-pulse">
                            {call.isVideo ? <Video size={40} /> : <Phone size={40} />}
                        </div>
                        <p className="text-xl font-semibold">
                            {isCalling ? 'Calling...' : (call.isReceivingCall ? `${call.name} is calling...` : 'Connecting...')}
                        </p>
                        {call.isReceivingCall && (
                            <p className="text-gray-400 mt-2">{call.isVideo ? 'Incoming Video Call' : 'Incoming Audio Call'}</p>
                        )}
                    </div>
                )}

                {/* Local Video (Draggable Picture-in-Picture) */}
                {stream && stream.getVideoTracks().length > 0 && (
                    <div
                        ref={dragRef}
                        onMouseDown={handleMouseDown}
                        style={{
                            left: `${position.x}px`,
                            top: `${position.y}px`,
                            cursor: isDragging ? 'grabbing' : 'grab',
                            position: 'absolute'
                        }}
                        className="w-32 h-48 md:w-48 md:h-72 bg-gray-900 rounded-xl overflow-hidden shadow-2xl border-2 border-gray-800 z-20 transition-shadow hover:shadow-white/20"
                    >
                        <video
                            playsInline
                            muted
                            ref={myVideo}
                            autoPlay
                            onLoadedMetadata={() => myVideo.current?.play()}
                            className="w-full h-full object-cover pointer-events-none"
                        />
                        <div className="absolute bottom-2 left-2 bg-black/60 px-2 py-1 rounded text-xs text-white pointer-events-none">
                            You
                        </div>
                    </div>
                )}
            </div>

            {/* Controls */}
            <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex items-center space-x-8 z-30">
                {/* Outgoing Call - Cancel */}
                {isCalling && !callAccepted && (
                    <button onClick={leaveCall} className="bg-red-500 p-4 rounded-full hover:bg-red-600 transition-colors shadow-lg">
                        <PhoneOff size={32} />
                    </button>
                )}

                {/* Incoming Call - Answer */}
                {call.isReceivingCall && !callAccepted && (
                    <button onClick={answerCall} className="bg-green-500 p-4 rounded-full hover:bg-green-600 transition-colors shadow-lg animate-bounce">
                        {call.isVideo ? <Video size={32} /> : <Phone size={32} />}
                    </button>
                )}

                {/* In Call - End */}
                {callAccepted && !callEnded && (
                    <button onClick={leaveCall} className="bg-red-500 p-4 rounded-full hover:bg-red-600 transition-colors shadow-lg">
                        <PhoneOff size={32} />
                    </button>
                )}
            </div>
        </div>
    );
};

export default VideoCall;
