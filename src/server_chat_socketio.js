import http from "http";
import SocketIO from "socket.io";
import express from "express";
import path from "path";

const app = express();

app.set("view engine", "pug");
app.set("views", path.join(__dirname, "views"));
app.use("/public", express.static(path.join(__dirname, "public")));
app.get("/", (_, res) => res.render("home"));
app.get("/*", (_, res) => res.redirect("/"));

const httpServer = http.createServer(app);
const wsServer = SocketIO(httpServer);

wsServer.on("connection", (socket) => {
  wsServer.sockets.emit("room_change", publicRooms());

  socket.on("enter_room", (roomName, nickname, done) => {
    socket["nickname"] = nickname;
    socket.join(roomName);
    done();
    socket.to(roomName).emit("welcome", socket["nickname"], countRoom(roomName));
    wsServer.sockets.emit("room_change", publicRooms());
  });

  socket.on("disconnecting", () => {
    socket.rooms.forEach((room) => {
      sendBye(socket, room);
    });
  });

  socket.on("disconnect", () => {
    wsServer.sockets.emit("room_change", publicRooms());
  });

  socket.on("new_message", (message, room, done) => {
    socket.to(room).emit("new_message", { nick: socket["nickname"], msg: message });
    done();
  });

  socket.on("change_nickname", (nickname, room) => {
    socket.to(room).emit("change_nickname", { nick: socket["nickname"], newNick: nickname });
    socket["nickname"] = nickname;
  });

  socket.on("leave_room", (room, done) => {
    sendBye(socket, room);
    socket.leave(room);
    wsServer.sockets.emit("room_change", publicRooms());
    done();
  });
});

function publicRooms() {
  const { sids, rooms } = wsServer.sockets.adapter;
  const publicRooms = [...rooms.keys()].filter((key) => !sids.has(key));

  return publicRooms;
}

function countRoom(roomName) {
  return wsServer.sockets.adapter.rooms.get(roomName).size;
}

function sendBye(socket, room) {
  socket.to(room).emit("bye", socket["nickname"], countRoom(room) - 1);
}

const handleListen = () => console.log(`Listening on http://localhost:3000`);
httpServer.listen(process.env.PORT, handleListen);
