import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useSocket } from '../context/SocketContext';
import { Phone, PhoneOff, Video as VideoIcon, Mic, MicOff, VideoOff, Users, MessageSquare } from 'lucide-react';

const Video = ({ peer, isLocal }) => {
    const ref = useRef();

    useEffect(() => {
        if (peer && peer.stream) {
            ref.current.srcObject = peer.stream;
        }
    }, [peer]);

    return (
        <div className="relative w-full h-full bg-[#252525] rounded-2xl overflow-hidden border border-gray-800 shadow-xl group">
            <video
                playsInline
                autoPlay
                ref={ref}
                muted={isLocal} // Mute local video to prevent feedback
                className={`w-full h-full object-cover ${isLocal ? 'transform scale-x-[-1]' : ''}`}
            />
            <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg flex items-center space-x-2">
                <span className="text-white text-sm font-medium">{isLocal ? 'You' : 'User'}</span>
            </div>
        </div>
    );
};

const GroupVideoCall = () => {
    const {
        call,
        callAccepted,
        stream,
        callEnded,
        leaveCall,
        answerCall,
        isCalling,
        peers
    } = useSocket();

    const [isMicOn, setIsMicOn] = useState(true);
    const [isCamOn, setIsCamOn] = useState(true);

    const toggleMic = () => {
        if (stream) {
            const audioTrack = stream.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                setIsMicOn(audioTrack.enabled);
            }
        }
    };

    const toggleCam = () => {
        if (stream) {
            const videoTrack = stream.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.enabled = !videoTrack.enabled;
                setIsCamOn(videoTrack.enabled);
            }
        }
    };

    // Calculate grid columns based on number of participants (peers + self)
    const totalParticipants = peers.length + 1;
    const gridCols = totalParticipants <= 1 ? 'grid-cols-1' : totalParticipants <= 4 ? 'grid-cols-2' : 'grid-cols-3';

    return (
        <div className="fixed inset-0 z-50 bg-[#1a1a1a] flex flex-col font-sans">
            {/* Top Bar */}
            <div className="h-16 bg-[#252525] flex items-center justify-between px-6 shadow-md z-10">
                <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm">
                        G
                    </div>
                    <div>
                        <h3 className="text-white font-semibold text-sm">Group Call</h3>
                        <div className="flex items-center space-x-2 text-xs text-gray-400">
                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                            <span>{peers.length} Participants</span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center space-x-4 text-gray-400">
                    <Users size={20} className="hover:text-white cursor-pointer" />
                    <MessageSquare size={20} className="hover:text-white cursor-pointer" />
                </div>
            </div>

            {/* Main Grid Area */}
            <div className="flex-1 p-4 overflow-hidden">
                <div className={`h-full w-full grid ${gridCols} gap-4 max-w-6xl mx-auto items-center justify-center`}>

                    {/* Local Video */}
                    {stream && (
                        <div className="relative w-full h-full max-h-[600px]">
                            <Video peer={{ stream }} isLocal={true} />
                        </div>
                    )}

                    {/* Remote Peers */}
                    {peers.map((peer, index) => (
                        <div key={peer.peerID} className="relative w-full h-full max-h-[600px]">
                            <Video peer={peer} isLocal={false} />
                        </div>
                    ))}

                </div>
            </div>

            {/* Bottom Control Bar */}
            <div className="h-20 bg-[#252525] flex items-center justify-center space-x-6 shadow-lg z-10">
                <button
                    onClick={toggleMic}
                    className={`p-3 rounded-full transition-all ${isMicOn ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-red-500 text-white hover:bg-red-600'}`}
                >
                    {isMicOn ? <Mic size={24} /> : <MicOff size={24} />}
                </button>

                <button
                    onClick={leaveCall}
                    className="p-4 rounded-full bg-red-600 text-white hover:bg-red-700 transition-all shadow-lg shadow-red-600/20 scale-110"
                >
                    <PhoneOff size={32} />
                </button>

                <button
                    onClick={toggleCam}
                    className={`p-3 rounded-full transition-all ${isCamOn ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-red-500 text-white hover:bg-red-600'}`}
                >
                    {isCamOn ? <VideoIcon size={24} /> : <VideoOff size={24} />}
                </button>
            </div>
        </div>
    );
};

export default GroupVideoCall;
