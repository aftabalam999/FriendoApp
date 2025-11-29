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

        socket.on('callUser', ({ userToCall, signalData, from, name, isVideo }) => {
            io.to(userToCall).emit('callUser', { signal: signalData, from, name, isVideo });
        });

        socket.on('answerCall', (data) => {
            io.to(data.to).emit('callAccepted', data.signal);
        });
        
        socket.on('endCall', ({ to }) => {
            io.to(to).emit('callEnded');
        });

        socket.on('disconnect', () => {
            console.log('User disconnected:', socket.id);
            socket.broadcast.emit("callEnded");
        });
    });

    return io;
};

const getIo = () => {
    if (!io) {
        throw new Error("Socket.io not initialized!");
    }
    return io;
};

module.exports = { initSocket, getIo };
