# Share Code

<p align="center">
  <img src="https://img.shields.io/badge/build-passing-brightgreen">
  <img src="https://img.shields.io/badge/App-Share%20Code-informational">
  <img src="https://img.shields.io/badge/Version-1.0.0-informational">
  <img src="https://img.shields.io/badge/maintainer-Akash%20Sharma-brightgreen">
  <img src="https://img.shields.io/badge/Server-ExpressJs-informational">
  <img src="https://img.shields.io/badge/os-linux-brightgreen">
</p>

A real-time code collaboration platform that lets you code with friends, listen to music together, and chat in real-time.

## 🚀 Features

- **Real-time Code Collaboration**: Code with multiple users in real-time using Socket.IO.
- **Syntax Highlighting**: Supports JavaScript syntax highlighting via CodeMirror.
- **Collaborative Music Player**:
  - Synchronized playback across all users in the room.
  - Upload audio files and cover art.
  - Real-time seek and play/pause controls.
  - Song history and queue.
- **Real-time Cursor Tracking**: See other users' cursors and names as they type.
- **Modern UI**: Sleek, dark-themed interface with glassmorphism effects.
- **Room Management**: Create unique rooms and invite others via Room ID.

## 🛠️ Tech Stack

- **Frontend**: React.js, Vite, Socket.IO Client, CodeMirror, React Hot Toast
- **Backend**: Node.js, Express.js, Socket.IO, Cloudinary (for file storage)
- **Styling**: Vanilla CSS with modern variables and flexbox/grid layouts

## ⚙️ Installation & Setup

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- A Cloudinary account (for media uploads)

### 1. Clone the Repository

```bash
git clone https://github.com/aakashsharma003/ShareCode.git
cd ShareCode
```

### 2. Backend Setup

Navigate to the backend directory and install dependencies:

```bash
cd backend
npm install
```

Create a `.env` file in the `backend` directory with the following variables:

```env
PORT=5000
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

Start the backend server:

```bash
# Development mode (restarts on changes)
npm run dev

# Production
npm start
```

### 3. Frontend Setup

Open a new terminal, navigate to the frontend directory and install dependencies:

```bash
cd frontend
npm install
# or
yarn install
```

Create a `.env` file in the `frontend` directory:

```env
VITE_APP_BACKEND_URL=http://localhost:5000
```

Start the frontend development server:

```bash
npm run dev
# or
yarn dev
```

## 🖥️ Usage

1. Open `http://localhost:5173` in your browser.
2. Enter a **Room ID** (or create a new one) and a **Username**.
3. Click **Join**.
4. Share the Room ID with friends to collaborate!

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License.


<p align="center">
  <img src="https://img.shields.io/badge/build-passing-brightgreen">
  <img src="https://img.shields.io/badge/App-Share%20Code-informational">
  <img src="https://img.shields.io/badge/Version-0.1.0-informational">
  <img src="https://img.shields.io/badge/maintainer-Akash%20Sharma-brightgreen">
  <img src="https://img.shields.io/badge/Server-ExpressJs-informational">
  <img src="https://img.shields.io/badge/os-linux-brightgreen">
  <img src="https://img.shields.io/badge/published%20on-vercel-brightgreen">
  <img src="https://img.shields.io/badge/downloads-102-informational">
</p>

</br>

# Problem 
- we are facing ``deadlock`` via simultaneous read and write operation and must remove that via `semaphores` and `locks`.


## Todo
- Responsive UI for editor and also a custom music player component which should be portable
- Open dashboard with digital ocean backend deployement
- mobile responsiveness for sidebar.
- homepage. 
- It is not visible that who one is typing that should be fixed.
- webrtc connection instead of socket.io with mess topology (if needed)
- chat functionality and room Admin control accesses
- syncronization in song when someone new joins the room
- each uploaded song should be saved in roomId directory and that directory should be cleared when all leave instead of all songs. 

## Repo Activity
![ShareCode](https://repobeats.axiom.co/api/embed/ea3d62398d96c66d51b387967b8650199f7a6d91.svg "Repobeats analytics image")
