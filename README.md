# Friendo Chat App

A modern, full-stack chat application built with Node.js, Express, React, Vite, and Firebase.

## Features

- **Authentication**: JWT-based auth with bcrypt password hashing.
- **Real-time Chat**: Deterministic P2P messaging.
- **Media Support**: Image and file uploads via Firebase Storage.
- **Friend System**: Send, accept, and view friend requests.
- **Search**: Find users by username.
- **Modern UI**: Polished interface with Tailwind CSS.

## Project Structure

- `backend/`: Node.js/Express API
- `frontend/`: React/Vite Client

## Prerequisites

- Node.js (v16+)
- Firebase Project (Firestore, Storage enabled)
- Service Account Key from Firebase Console

## Quick Start

### 1. Backend Setup

```bash
cd backend
npm install
```

Create a `.env` file in `backend/`:
```env
PORT=3000
JWT_SECRET=your_super_secret_key_change_this
# Option 1: Path to service account file
GOOGLE_APPLICATION_CREDENTIALS=./service-account.json
# Option 2: JSON content string
# FIREBASE_ADMIN_SDK_JSON={"type": "service_account", ...}
```

Run the seed script (optional):
```bash
npm run seed
```

Start the server:
```bash
npm run dev
```

### 2. Frontend Setup

```bash
cd frontend
npm install
```

Start the development server:
```bash
npm run dev
```

Visit `http://localhost:5173` to start chatting!

## Default Users (from seed)

- **Username**: alice, bob, charlie, dave
- **Password**: password123
