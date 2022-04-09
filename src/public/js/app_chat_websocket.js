const messageForm = document.querySelector("#message");
const messageList = document.querySelector("ul");
const nickForm = document.querySelector("#nickname");
const socket = new WebSocket(`wss://${window.location.host}`);

socket.addEventListener("open", () => {
  console.log("Connected");
});

socket.addEventListener("message", (message) => {
  const { type, nick, msg } = JSON.parse(message.data);
  const template = document.querySelector("#msgTemplate").content.cloneNode(true);
  const li = template.firstElementChild;

  switch (type) {
    case "join":
      li.classList.add("info");
      li.querySelector("h6").remove();
      li.querySelector("h5").textContent = `${nick} has joined`;
      break;
    case "chat":
      li.classList.add("received");
      li.querySelector("h6").textContent = nick;
      li.querySelector("h5").textContent = msg;
      break;
    case "leave":
      li.classList.add("info");
      li.querySelector("h6").remove();
      li.querySelector("h5").textContent = `${nick} has left`;
      break;
    default:
      break;
  }
  messageList.append(li);
});

socket.addEventListener("close", () => {
  console.log("Closed");
});

messageForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const input = event.target.querySelector("input");
  socket.send(makeMessage("chat", input.value));

  const template = document.querySelector("#msgTemplate").content.cloneNode(true);
  const li = template.firstElementChild;
  li.classList.add("sent");

  li.querySelector("h6").remove();
  li.querySelector("h5").textContent = input.value;
  messageList.append(li);

  input.value = "";
});

nickForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const input = event.target.querySelector("input");
  socket.send(makeMessage("nickname", input.value));
  input.placeholder = `current nickname: ${input.value}`;
  input.value = "";
});

function makeMessage(type, payload) {
  return JSON.stringify({ type, payload });
}
