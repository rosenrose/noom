import http from "http";
import WebSocket from "ws";
import express from "express";

const app = express();

app.set("view engine", "pug");
app.set("views", __dirname + "/views");
app.use("/public", express.static(__dirname + "/public"));
app.get("/", (_, res) => res.render("home"));
app.get("/*", (_, res) => res.redirect("/"));

const handleListen = () => console.log(`Listening on http://localhost:3000`);

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Put all your backend code here.

const PORT = process.env.PORT || 3000;
server.listen(PORT, handleListen);

let sockets = [];

wss.on("connection", (socket) => {
  socket["nickname"] = `Anonymous${sockets.length}`;
  sockets.forEach((s) => {
    s.send(
      JSON.stringify({
        type: "join",
        nick: socket.nickname,
      })
    );
  });
  sockets.push(socket);

  socket.on("message", (msg) => {
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
          s.send(
            JSON.stringify({
              type: "chat",
              nick: socket.nickname,
              msg: message.payload,
            })
          );
        });
        break;
      default:
        break;
    }
  });

  socket.on("close", () => {
    sockets = sockets.filter((s) => s !== socket);
    sockets.forEach((s) => {
      s.send(
        JSON.stringify({
          type: "leave",
          nick: socket.nickname,
        })
      );
    });
  });
});
