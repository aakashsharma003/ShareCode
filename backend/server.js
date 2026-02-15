const express = require("express");
const app = express();
const { Server } = require("socket.io");
const http = require("http");
const multer = require("multer");
const ACTIONS = require("./Actions");
const path = require("path");
const cors = require("cors");
const fs = require("fs-extra");
app.use(cors({ origin: "*" }));
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// ---------------------Deployment-----------------------------------------------
// const __dirname = path.resolve();
// app.use(express.static("../frontend/dist"));

// app.use((req, res, next) => {
//   res.sendFile(path.join(__dirname,'..','frontend', 'dist', 'index.html'));
// })

// app.get("*", (req, res) => {
//   res.sendFile(path.join(__dirname, "frontend/dist/index.html"));
// });

// ---------------------Deployment-----------------------------------------------

const uploadDir = path.join(__dirname, "uploads");
fs.ensureDirSync(uploadDir);
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("cloudinary").v2;
const dotenv = require("dotenv");
dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "sharecode_uploads",
    resource_type: "auto",
  },
});

const upload = multer({ storage: storage });

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// file upload route
app.post("/upload", upload.single("file"), (req, res) => {
  if (req.file) {
    console.log("Uploaded file details:", req.file);
    res.json({
      originalName: req.file.originalname,
      filePath: req.file.path,
    });
  } else {
    res.status(400).send("No file uploaded");
  }
});

const userSocketMap = {};
const roomState = {}; // { roomId: { songs: [] } }

function getAllConnectedClients(roomId) {
  return Array.from(io.sockets.adapter.rooms.get(roomId) || []).map(
    (socketId) => {
      return {
        socketId,
        username: userSocketMap[socketId],
      };
    }
  );
}
async function clearUploads() {
  console.log("Uploads are managed by Cloudinary, no local cleanup needed.");
}
io.on("connection", (socket) => {
  console.log("socket connected", socket.id);

  socket.on(ACTIONS.JOIN, ({ roomId, username }) => {
    userSocketMap[socket.id] = username;
    socket.join(roomId);

    // Initialize room state if not exists
    if (!roomState[roomId]) {
      roomState[roomId] = { songs: [] };
    }

    const clients = getAllConnectedClients(roomId);

    // Sync existing songs to the user who just joined
    io.to(socket.id).emit(ACTIONS.SYNC_SONGS, {
      songs: roomState[roomId].songs
    });

    // lets notify all clients
    clients.forEach(({ socketId }) => {
      io.to(socketId).emit(ACTIONS.JOINED, {
        clients,
        username,
        socketId: socket.id,
      });
    });
  });

  socket.on(ACTIONS.CODE_CHANGE, ({ roomId, code }) => {
    // console.log('receiving', code)
    // broadcast nhi krna hai
    // io.to(roomId).emit(ACTIONS.CODE_CHANGE, {code});
    // khudko chodkr baki sb ko bhejna h
    socket.in(roomId).emit(ACTIONS.CODE_CHANGE, { code });
  });
  socket.on(ACTIONS.SYNC_CODE, ({ socketId, code }) => {
    //  console.log("receiving", code);
    io.to(socketId).emit(ACTIONS.CODE_CHANGE, { code });
  });

  socket.on(ACTIONS.UPLOAD_SONG, (songData) => {
    console.log("Song uploaded:", songData);

    const { roomId, songName, songPath, coverImage, username } = songData;
    if (roomId && roomState[roomId]) {
      roomState[roomId].songs.push({ songName, songPath, coverImage, addedBy: username });
    }

    io.to(roomId).emit(ACTIONS.UPLOAD_SONG, songData);
  });

  socket.on(ACTIONS.CURSOR_CHANGE, ({ roomId, cursor }) => {
    const username = userSocketMap[socket.id];
    socket.in(roomId).emit(ACTIONS.CURSOR_CHANGE, {
      socketId: socket.id,
      cursor,
      username
    });
  });

  socket.on(ACTIONS.START_STREAM, (song) => {
    if (song && song.roomId) {
      console.log("Starting stream for song from backend:", song);
      io.to(song.roomId).emit(ACTIONS.START_STREAM, song);
    } else {
      console.error("Invalid song object:", song);
    }
  });

  socket.on(ACTIONS.STOP_STREAM, (roomId) => {
    console.log("Stopping stream for room:", roomId);
    io.to(roomId).emit(ACTIONS.STOP_STREAM);
  });

  socket.on("disconnecting", () => {
    const rooms = [...socket.rooms];
    rooms.forEach((roomId) => {
      socket.in(roomId).emit(ACTIONS.DISCONNECTED, {
        socketId: socket.id,
        username: userSocketMap[socket.id],
      });
    });
    delete userSocketMap[socket.id];

    socket.on("disconnect", () => {
      if (io.sockets.sockets.size === 0) {
        clearUploads().then(() => {
          console.log("All clients disconnected, cleared uploads");
        });
      }
    });
    socket.leave();
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`listening on ${PORT}`));
