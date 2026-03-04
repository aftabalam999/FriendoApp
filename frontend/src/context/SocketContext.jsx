import React, { createContext, useState, useRef, useEffect, useContext } from 'react';
import { io } from 'socket.io-client';
import Peer from 'simple-peer';
import { useAuth } from './AuthContext';

const SocketContext = createContext();

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
    const { user } = useAuth();
    const [stream, setStream] = useState(null);
    const [remoteStream, setRemoteStream] = useState(null);
    const [me, setMe] = useState('');
    const [call, setCall] = useState({});
    const [callAccepted, setCallAccepted] = useState(false);
    const [callEnded, setCallEnded] = useState(false);
    const [name, setName] = useState('');
    const [isCalling, setIsCalling] = useState(false);
    const [callPartnerId, setCallPartnerId] = useState(null);

    const myVideo = useRef();
    const connectionRef = useRef();
    const [socket, setSocket] = useState(null);
    const streamRef = useRef();

    const callEndedRef = useRef(false);

    useEffect(() => {
        streamRef.current = stream;
    }, [stream]);

    useEffect(() => {
        if (user) {
            const socketUrl = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:3000`;
            console.log("Connecting to socket at:", socketUrl);

            const newSocket = io(socketUrl, {
                reconnectionAttempts: 3,       // stop after 3 failed attempts
                reconnectionDelay: 2000,        // wait 2s between retries
                timeout: 5000,                  // give up connecting after 5s
                transports: ['websocket'],      // don't fall back to polling (avoids 404 flood)
            });

            setSocket(newSocket);

            newSocket.on('connect', () => {
                newSocket.emit('join-room', user.uid);
            });

            newSocket.on('connect_error', (err) => {
                // Silently fail — backend may not support WebSockets (Vercel serverless)
                console.warn('Socket unavailable (real-time features disabled):', err.message);
            });

            newSocket.on('reconnect_failed', () => {
                console.warn('Socket reconnection exhausted. Real-time features are disabled on this deployment.');
                newSocket.disconnect(); // stop all future attempts
            });

            newSocket.on('me', (id) => setMe(id));

            newSocket.on('callUser', ({ from, name: callerName, photoURL, signal, isVideo }) => {
                if (callEndedRef.current) {
                    callEndedRef.current = false;
                }
                setCallEnded(false);
                setCall({ isReceivingCall: true, from, name: callerName, photoURL, signal, isVideo });
            });

            newSocket.on('callAccepted', (signal) => {
                setCallAccepted(true);
                setIsCalling(false);
                if (connectionRef.current) {
                    connectionRef.current.signal(signal);
                }
            });

            newSocket.on('callEnded', () => {
                handleCallEnd();
            });

            return () => newSocket.disconnect();
        }
    }, [user]);


    const answerCall = () => {
        setCallAccepted(true);
        setCallPartnerId(call.from);
        setCallEnded(false);
        callEndedRef.current = false;

        // Default to video if isVideo is undefined
        const isVideoCall = call.isVideo !== false;
        const constraints = { video: isVideoCall, audio: true };

        navigator.mediaDevices.getUserMedia(constraints)
            .then((currentStream) => {
                if (callEndedRef.current) {
                    currentStream.getTracks().forEach(t => t.stop());
                    return;
                }

                setStream(currentStream);
                window.localStream = currentStream;

                const peer = new Peer({
                    initiator: false,
                    trickle: false,
                    stream: currentStream,
                    config: {
                        iceServers: [
                            { urls: 'stun:stun.l.google.com:19302' },
                            { urls: 'stun:global.stun.twilio.com:3478' }
                        ]
                    }
                });

                peer.on('signal', (data) => {
                    socket.emit('answerCall', { signal: data, to: call.from });
                });

                peer.on('stream', (currentRemoteStream) => {
                    setRemoteStream(currentRemoteStream);
                });

                peer.on('close', () => {
                    handleCallEnd();
                });

                peer.on('error', (err) => {
                    console.error("Peer error (answerCall):", err);
                    handleCallEnd();
                });

                peer.signal(call.signal);
                connectionRef.current = peer;
            })
            .catch((err) => {
                console.error('Failed to get local stream (answerCall)', err);
                alert(`Failed to access camera/microphone: ${err.message}. Please check permissions.`);
                handleCallEnd();
            });
    };

    const callUser = (id, partnerName, partnerPhotoURL, isVideo = true) => {
        setIsCalling(true);
        setCallPartnerId(id);
        setCallEnded(false);
        callEndedRef.current = false;
        // Store call type for UI - store partner's photo for my view
        setCall({ isVideo, isReceivingCall: false, from: me, name: partnerName, photoURL: partnerPhotoURL });

        const constraints = { video: isVideo, audio: true };

        navigator.mediaDevices.getUserMedia(constraints)
            .then((currentStream) => {
                if (callEndedRef.current) {
                    currentStream.getTracks().forEach(t => t.stop());
                    return;
                }

                setStream(currentStream);
                window.localStream = currentStream;

                const peer = new Peer({
                    initiator: true,
                    trickle: false,
                    stream: currentStream,
                    config: {
                        iceServers: [
                            { urls: 'stun:stun.l.google.com:19302' },
                            { urls: 'stun:global.stun.twilio.com:3478' }
                        ]
                    }
                });

                peer.on('signal', (data) => {
                    socket.emit('callUser', {
                        userToCall: id,
                        signalData: data,
                        from: me,
                        name: user.displayName,
                        photoURL: user.photoURL, // Send my photo to them
                        isVideo
                    });
                });

                peer.on('stream', (currentRemoteStream) => {
                    setRemoteStream(currentRemoteStream);
                });

                peer.on('close', () => {
                    handleCallEnd();
                });

                peer.on('error', (err) => {
                    console.error("Peer error (callUser):", err);
                    handleCallEnd();
                });

                connectionRef.current = peer;
            })
            .catch((err) => {
                console.error('Failed to get local stream', err);
                alert(`Failed to access camera/microphone: ${err.message}. Please check permissions.`);
                setIsCalling(false);
            });
    };

    const handleCallEnd = () => {
        setCallEnded(true);
        callEndedRef.current = true;
        setIsCalling(false);
        setCallAccepted(false);
        setCallPartnerId(null);
        setCall({});
        setRemoteStream(null);

        if (connectionRef.current) {
            connectionRef.current.destroy();
            connectionRef.current = null;
        }

        // Aggressively stop all known streams
        const streamsToStop = [stream, streamRef.current, window.localStream];
        streamsToStop.forEach(s => {
            if (s) {
                s.getTracks().forEach(track => {
                    track.stop();
                    track.enabled = false;
                });
            }
        });

        setStream(null);
        streamRef.current = null;
        window.localStream = null;
    };

    const leaveCall = () => {
        let targetId = callPartnerId;

        // If we are the receiver and haven't set callPartnerId yet (e.g. rejecting call)
        if (!targetId && call.isReceivingCall) {
            targetId = call.from;
        }

        if (targetId) {
            socket.emit('endCall', { to: targetId });
        }
        handleCallEnd();
    };

    return (
        <SocketContext.Provider value={{
            call,
            callAccepted,
            myVideo,
            remoteStream,
            stream,
            name,
            setName,
            callEnded,
            me,
            callUser,
            leaveCall,
            answerCall,
            setStream,
            isCalling,
            socket
        }}>
            {children}
        </SocketContext.Provider>
    );
};

// 