import http from "http";
import express from "express";
import WebSocket from "ws";
import { Server } from "socket.io";
import { instrument } from "@socket.io/admin-ui";
import path from "path";

const app = express();

app.set("view engine", "pug");
app.set("views", path.join(__dirname, "views"));
app.use("/public", express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => res.render("home"));
app.get("/*", (req, res) => res.redirect("/"));
// app.listen(3000, handleListen);

const httpServer = http.createServer(app);
httpServer.listen(3000, handleListen);
function handleListen() {
  console.log(path.join(__dirname, "public"));
}

const io = new Server(httpServer, {
  cors: {
    origin: ["https://admin.socket.io"],
    credentials: true,
  },
});

instrument(io, { auth: false });

io.on("connection", (socket) => {
  io.sockets.emit("room_change", publicRooms());

  socket.on("enter_room", (roomName, nickname, done) => {
    socket["nickname"] = nickname;
    socket.join(roomName);
    done();
    socket.to(roomName).emit("welcome", socket["nickname"], countRoom(roomName));
    io.sockets.emit("room_change", publicRooms());
  });

  socket.on("disconnecting", () => {
    socket.rooms.forEach((room) => {
      socket.to(room).emit("bye", socket["nickname"], countRoom(room) - 1);
    });
  });

  socket.on("disconnect", () => {
    io.sockets.emit("room_change", publicRooms());
  });

  socket.on("new_message", (message, room, done) => {
    socket.to(room).emit("new_message", `${socket["nickname"]}: ${message}`);
    done();
  });

  socket.onAny((event) => {
    console.log(event);
  });
});

function publicRooms() {
  const { sids, rooms } = io.sockets.adapter;
  const publicRooms = [];

  for (const [key] of rooms.entries()) {
    if (!sids.has(key)) {
      publicRooms.push(key);
    }
  }
  return publicRooms;
}

function countRoom(roomName) {
  return io.sockets.adapter.rooms.get(roomName).size;
}

/* const wsServer = new WebSocket.Server({ server });
let sockets = [];

wsServer.on("connection", (socket) => {
  socket["nickname"] = "Anonymous";
  sockets.push(socket);
  console.log(sockets.length);

  socket.on("message", (msg) => {
    // console.log(msg, msg.toString());
    const message = JSON.parse(msg.toString());

    switch (message.type) {
      case "nickname":
        socket["nickname"] = message.payload;
        break;
      case "chat":
        sockets.forEach((s) => {
          if (s === socket) {
            return;
          }
          s.send(`${socket.nickname}: ${message.payload}`);
        });
        break;
    }
  });

  socket.on("close", () => {
    sockets = sockets.filter((s) => s !== socket);
    console.log(sockets.length);
  });
}); */
