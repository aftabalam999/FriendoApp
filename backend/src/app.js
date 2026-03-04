const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const http = require('http');
const { initSocket } = require('./socket');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

// Allow all origins (CORS) - filter by env for security
const allowedOrigins = [
  'https://onefriendo.vercel.app',
  'https://friendo-app-xi.vercel.app',
  'https://friendo-nine.vercel.app',
  'http://localhost:5173',
  'http://localhost:3000',
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (curl, Postman, same-origin)
    if (!origin) return callback(null, true);
    // Allow localhost and any vercel.app subdomain
    if (
      allowedOrigins.includes(origin) ||
      origin.endsWith('.vercel.app') ||
      origin.startsWith('http://localhost')
    ) {
      return callback(null, true);
    }
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/friends', require('./routes/friends'));
app.use('/api/chats', require('./routes/chats'));
app.use('/api/upload', require('./routes/upload'));

app.get('/', (req, res) => {
  res.send('Friendo API is running ✅');
});

// Only start socket + listen when running locally (not on Vercel serverless)
if (process.env.VERCEL !== '1') {
  initSocket(server);
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

// Export for Vercel serverless
module.exports = app;

