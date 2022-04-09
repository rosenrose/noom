const socket = io();
const welcome = document.querySelector("#welcome");
const room = document.querySelector("#room");
const ul = room.querySelector("ul");
let roomName;

welcome.querySelector("form").addEventListener("submit", (event) => {
  event.preventDefault();
  const [roomInput, nickInput] = event.target.querySelectorAll("input");
  roomName = roomInput.value;

  socket.emit("enter_room", roomName, nickInput.value, showRoom);
  roomInput.value = "";
  nickInput.value = "";
});

socket.on("welcome", (nickname, newCount) => {
  refreshTitle(roomName, newCount);
  addInfoMessage({ nick: nickname }, "join");
});

socket.on("bye", (nickname, newCount) => {
  refreshTitle(roomName, newCount);
  addInfoMessage({ nick: nickname }, "leave");
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

socket.on("change_nickname", (message) => {
  addInfoMessage(message, "change");
});

room.querySelector("#msg").addEventListener("submit", (event) => {
  event.preventDefault();
  const input = event.target.querySelector("input");
  const message = input.value;
  socket.emit("new_message", message, roomName, () => {
    addMessage({ msg: message });
  });
  input.value = "";
});

room.querySelector("#nickChange").addEventListener("submit", (event) => {
  event.preventDefault();
  const input = event.target.querySelector("input");
  socket.emit("change_nickname", input.value, roomName);
  input.placeholder = `current nickname: ${input.value}`;
  input.value = "";
});

room.querySelector("#leave").addEventListener("click", () => {
  socket.emit("leave_room", roomName, () => {
    welcome.hidden = false;
    room.hidden = true;
  });
});

function showRoom() {
  welcome.hidden = true;
  room.hidden = false;
  const h3 = room.querySelector("h3");
  h3.textContent = `Room ${roomName}`;
}

function addInfoMessage(message, type) {
  const { nick } = message;
  const template = document.querySelector("#msgTemplate").content.cloneNode(true);
  const li = template.firstElementChild;

  li.classList.add("info");
  li.querySelector("h6").remove();
  switch (type) {
    case "join":
      li.querySelector("h5").textContent = `${nick} has joined.`;
      break;
    case "leave":
      li.querySelector("h5").textContent = `${nick} has left.`;
      break;
    case "change":
      const { newNick } = message;
      li.querySelector("h5").textContent = `${nick} has chnaged to ${newNick}.`;
      break;
    default:
      break;
  }
  ul.append(li);
}

function addMessage(message) {
  const template = document.querySelector("#msgTemplate").content.cloneNode(true);
  const li = template.firstElementChild;
  const { nick, msg } = message;

  if (nick) {
    li.classList.add("received");
    li.querySelector("h6").textContent = nick;
  } else {
    li.classList.add("sent");
    li.querySelector("h6").remove();
  }
  li.querySelector("h5").textContent = msg;
  ul.append(li);
}

function refreshTitle(roomName, count) {
  const h3 = room.querySelector("h3");
  h3.textContent = `Room ${roomName} (${count} people)`;
}
