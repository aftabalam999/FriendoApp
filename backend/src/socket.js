const { Server } = require('socket.io');

let io;

const initSocket = (server) => {
    io = new Server(server, {
        cors: {
            origin: "*", // Allow all origins for now, restrict in production
            methods: ["GET", "POST"]
        }
    });

    io.on('connection', (socket) => {
        console.log('User connected:', socket.id);

        socket.on('join-room', (userId) => {
            socket.join(userId);
            console.log(`User ${userId} joined their room`);
            socket.emit('me', socket.id);
        });

        socket.on('callUser', ({ userToCall, signalData, from, name, photoURL, isVideo }) => {
            io.to(userToCall).emit('callUser', { signal: signalData, from, name, photoURL, isVideo });
        });

        socket.on('answerCall', (data) => {
            io.to(data.to).emit('callAccepted', data.signal);
        });

        socket.on('endCall', ({ to }) => {
            console.log(`End call requested from ${socket.id} to ${to}`);
            io.to(to).emit('callEnded');
        });

        socket.on('disconnect', () => {
            console.log('User disconnected:', socket.id);
        });
    });

    return io;
};

// Returns null when running on Vercel (serverless - no Socket.io)
const getIo = () => io || null;

module.exports = { initSocket, getIo };

