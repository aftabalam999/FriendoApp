const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const http = require('http');
const { initSocket } = require('./socket');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

// Initialize Socket.io
initSocket(server);

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/friends', require('./routes/friends'));
app.use('/api/chats', require('./routes/chats'));
app.use('/api/upload', require('./routes/upload'));

app.get('/', (req, res) => {
  res.send('Friendo API is running');
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
