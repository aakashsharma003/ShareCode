const express = require("express");
const app = express();
const { Server } = require("socket.io");
const http = require("http");
const ACTIONS = require("./Actions");
const path = require("path")
const server = http.createServer(app);
const io = new Server(server);

// ---------------------Deployment-----------------------------------------------
// const __dirname = path.resolve();
app.use(express.static("../frontend/dist"));

app.use((req, res, next) => {
  res.sendFile(path.join(__dirname,'..','frontend', 'dist', 'index.html'));
})


// app.get("*", (req, res) => {
//   res.sendFile(path.join(__dirname, "frontend/dist/index.html"));
// });

// ---------------------Deployment-----------------------------------------------



const userSocketMap = {};

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

io.on("connection", (socket) => {
  console.log("socket connected", socket.id);

  socket.on(ACTIONS.JOIN, ({ roomId, username }) => {
    userSocketMap[socket.id] = username;
    socket.join(roomId);
    const clients = getAllConnectedClients(roomId);
    // lets notify all clients
    clients.forEach(({ socketId }) => {
      io.to(socketId).emit(ACTIONS.JOINED, {
        clients,
        username,
        socketId: socket.id,
      });
    });
  });

  socket.on(ACTIONS.CODE_CHANGE,({roomId, code}) => {
    // console.log('receiving', code)
    // broadcast nhi krna hai
    // io.to(roomId).emit(ACTIONS.CODE_CHANGE, {code});
    // khudko chodkr baki sb ko bhejna h
    socket.in(roomId).emit(ACTIONS.CODE_CHANGE, {code}); 
  })
   socket.on(ACTIONS.SYNC_CODE, ({ socketId, code }) => {
    //  console.log("receiving", code);
     io.to(socketId).emit(ACTIONS.CODE_CHANGE, { code });
   });
  socket.on("disconnecting", () => {
    const rooms = [...socket.rooms];
    rooms.forEach((roomId) => {
       socket.in(roomId).emit(ACTIONS.DISCONNECTED,{
        socketId:socket.id,
        username:userSocketMap[socket.id]
       })
    });
    delete userSocketMap[socket.id];
    socket.leave();
  })
});



const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`listening on ${PORT}`));
