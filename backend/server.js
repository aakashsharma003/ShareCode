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
const io = new Server(server);

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
const userSocketMap = {};
// Setting up multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    cb(null, `${Date.now()}-${file.originalname}`);
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
      filePath: `/uploads/${req.file.filename}`,
    });
  } else {
    res.status(400).send("No file uploaded");
  }
});

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
  try {
    await fs.emptyDir(uploadDir);
    console.log(`Cleared all uploads`);
  } catch (err) {
    console.error(`Failed to clear uploads:`, err);
  }
}
io.on("connection", (socket) => {
  console.log("socket connected", socket.id);

  socket.on(ACTIONS.JOIN, ({ roomId, username }) => {
    userSocketMap[socket.id] = username;
    socket.join(roomId);
    const clients = getAllConnectedClients(roomId);
    // console.log("length",clients.length);
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
    io.to(songData.roomId).emit(ACTIONS.UPLOAD_SONG, songData);
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
