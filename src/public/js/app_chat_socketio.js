const socket = io();
const welcome = document.querySelector("#welcome");
const room = document.querySelector("#room");
let roomName;

welcome.querySelector("form").addEventListener("submit", (event) => {
  event.preventDefault();
  const [roomInput, nickInput] = event.target.querySelectorAll("input");
  roomName = roomInput.value;

  socket.emit("enter_room", roomName, nickInput.value, showRoom);
});

socket.on("welcome", (nickname, newCount) => {
  refreshTitle(roomName, newCount);
  addMessage(`${nickname} Joined`);
});

socket.on("bye", (nickname, newCount) => {
  refreshTitle(roomName, newCount);
  addMessage(`${nickname} Left`);
});

socket.on("room_change", (rooms) => {
  const roomList = welcome.querySelector("ul");
  roomList.replaceChildren();

  rooms.forEach((room) => {
    const li = document.createElement("li");
    li.textContent = room;
    roomList.append(li);
  });
});

socket.on("new_message", addMessage);

function showRoom() {
  welcome.hidden = true;
  room.hidden = false;
  const h3 = room.querySelector("h3");
  h3.textContent = `Room ${roomName}`;

  const msgForm = room.querySelector("#msg");
  msgForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const input = event.target.querySelector("input");
    const message = input.value;
    socket.emit("new_message", message, roomName, () => {
      addMessage(`You: ${message}`);
    });
    input.value = "";
  });
}

function addMessage(message) {
  const ul = room.querySelector("ul");
  const li = document.createElement("li");
  li.textContent = message;
  ul.append(li);
}

function refreshTitle(roomName, count) {
  const h3 = room.querySelector("h3");
  h3.textContent = `Room ${roomName} (${count})`;
}

/* const messageForm = document.querySelector("#message");
const messageList = document.querySelector("ul");
const nickForm = document.querySelector("#nickname");
const socket = new WebSocket(`ws://${window.location.host}`);

socket.addEventListener("open", () => {
  console.log("Connected");
});

socket.addEventListener("message", (message) => {
  const li = document.createElement("li");
  li.textContent = message.data;
  messageList.append(li);
});

socket.addEventListener("close", () => {
  console.log("Closed");
});

messageForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const input = event.target.querySelector("input");
  socket.send(makeMessage("chat", input.value));

  const li = document.createElement("li");
  li.textContent = `You: ${input.value}`;
  messageList.append(li);

  input.value = "";
});

nickForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const input = event.target.querySelector("input");
  socket.send(makeMessage("nickname", input.value));
  input.value = "";
});

function makeMessage(type, payload) {
  return JSON.stringify({ type, payload });
} */
