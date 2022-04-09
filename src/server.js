import http from "http";
import SocketIO from "socket.io";
import express from "express";

const app = express();

app.set("view engine", "pug");
app.set("views", __dirname + "/views");
app.use("/public", express.static(__dirname + "/public"));
app.get("/", (_, res) => res.render("home"));
app.get("/*", (_, res) => res.redirect("/"));

const httpServer = http.createServer(app);
const wsServer = SocketIO(httpServer);

wsServer.on("connection", (socket) => {
  wsServer.sockets.emit("room_change", publicRooms());

  socket.on("join_room", (roomName, done) => {
    // console.log(countRoom(roomName));
    if (countRoom(roomName) === undefined || countRoom(roomName) < 2) {
      socket.join(roomName);
      socket.to(roomName).emit("welcome");
      wsServer.sockets.emit("room_change", publicRooms());
      done();
    } else {
      socket.emit("room_full");
    }
  });

  socket.on("disconnecting", () => {
    socket.rooms.forEach((room) => {
      sendBye(socket, room);
    });
  });

  socket.on("disconnect", () => {
    wsServer.sockets.emit("room_change", publicRooms());
  });

  socket.on("leave_room", (room, done) => {
    sendBye(socket, room);
    socket.leave(room);
    wsServer.sockets.emit("room_change", publicRooms());
    done();
  });

  socket.on("offer", (offer, roomName) => {
    socket.to(roomName).emit("offer", offer);
  });

  socket.on("answer", (answer, roomName) => {
    socket.to(roomName).emit("answer", answer);
  });

  socket.on("ice", (ice, roomName) => {
    socket.to(roomName).emit("ice", ice);
  });
});

const handleListen = () => console.log(`Listening on http://localhost:3000`);
httpServer.listen(process.env.PORT, handleListen);

function countRoom(roomName) {
  return wsServer.sockets.adapter.rooms.get(roomName)?.size;
}

function sendBye(socket, room) {
  socket.to(room).emit("bye");
}

function publicRooms() {
  const { sids, rooms } = wsServer.sockets.adapter;
  const publicRooms = [...rooms.keys()].filter((key) => !sids.has(key));

  return publicRooms;
}
