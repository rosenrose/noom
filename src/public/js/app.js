const socket = io();
const peerFace = document.querySelector("#peerFace");

// Welcome Form (join a room)

const welcome = document.querySelector("#welcome");
const call = document.querySelector("#videoCall");
const welcomeForm = welcome.querySelector("form");
let roomName;
let myPeerConnection;
let myDataChannel;

welcomeForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const input = welcomeForm.querySelector("input");
  roomName = input.value;
  socket.emit("join_room", roomName, initCall);
  input.value = "";
});

async function initCall() {
  welcome.hidden = true;
  call.hidden = false;
  await getMedia();
  makeConnection();
}

// getMedia

const myFace = document.querySelector("#myFace");
const muteBtn = document.querySelector("#mute");
const cameraBtn = document.querySelector("#camera");
const camerasSelect = document.querySelector("#cameras");
let myStream;
let isMuted = false;
let isCameraOff = false;

muteBtn.addEventListener("click", () => {
  muteBtn.textContent = isMuted ? "Mute" : "Unmute";
  isMuted = !isMuted;
  myStream.getAudioTracks().forEach((track) => {
    track.enabled = !track.enabled;
  });
});
cameraBtn.addEventListener("click", () => {
  cameraBtn.textContent = isCameraOff ? "Camera Off" : "Camera On";
  isCameraOff = !isCameraOff;
  myStream.getVideoTracks().forEach((track) => {
    track.enabled = !track.enabled;
  });
});

camerasSelect.addEventListener("change", async (event) => {
  const deviceId = event.target.value;
  await getMedia(deviceId);

  if (myPeerConnection) {
    const audioTrack = myStream.getAudioTracks()[0];
    const videoTrack = myStream.getVideoTracks()[0];
    const [audioSender, videoSender] = myPeerConnection.getSenders();
    audioSender.replaceTrack(audioTrack);
    videoSender.replaceTrack(videoTrack);
  }
});

async function getMedia(deviceId) {
  const initConstraints = { audio: true, video: { facingMode: "user" } };
  const cameraConstraints = {
    audio: true,
    video: { deviceId: { exact: deviceId } },
  };

  try {
    myStream = await navigator.mediaDevices.getUserMedia(
      deviceId ? cameraConstraints : initConstraints
    );
    myFace.srcObject = myStream;

    if (!deviceId) {
      await getCameras();
    }
  } catch (err) {
    console.log(err);
  }
}

async function getCameras() {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const cameras = devices.filter((device) => device.kind === "videoinput");
    const currentCamera = myStream.getVideoTracks()[0];

    cameras.forEach((camera) => {
      const option = document.createElement("option");
      option.value = camera.deviceId;
      option.textContent = camera.label;
      if (camera.label === currentCamera.label) {
        option.selected = true;
      }
      camerasSelect.append(option);
    });
  } catch (err) {
    console.log(err);
  }
}

// Chat

const chatUl = document.querySelector("#videoCall ul");

document.querySelector("#msg").addEventListener("submit", (event) => {
  event.preventDefault();
  const input = event.target.querySelector("input");
  const message = input.value;

  if (myDataChannel) {
    myDataChannel.send(message);
    addMessage(message, "send");
    input.value = "";
  }
});

function addInfoMessage(type) {
  const template = document.querySelector("#msgTemplate").content.cloneNode(true);
  const li = template.firstElementChild;

  li.classList.add("info");
  switch (type) {
    case "join":
      li.querySelector("h5").textContent = "Peer has joined.";
      break;
    case "leave":
      li.querySelector("h5").textContent = "Peer has left.";
      break;
    default:
      break;
  }
  chatUl.append(li);
}

function addMessage(message, type) {
  const template = document.querySelector("#msgTemplate").content.cloneNode(true);
  const li = template.firstElementChild;

  if (type === "receive") {
    li.classList.add("received");
  } else if (type === "send") {
    li.classList.add("sent");
  }
  li.querySelector("h5").textContent = message;
  chatUl.append(li);
}

document.querySelector("#leave").addEventListener("click", () => {
  socket.emit("leave_room", roomName, () => {
    welcome.hidden = false;
    call.hidden = true;
    myFace.srcObject = null;
    peerFace.srcObject = null;
    myPeerConnection = null;
    myDataChannel = null;
    chatUl.replaceChildren();
  });
});

// Socket code

socket.on("welcome", async () => {
  await initCall();
  myDataChannel = myPeerConnection.createDataChannel("chat");
  myDataChannel.addEventListener("message", (event) => {
    addMessage(event.data, "receive");
  });

  const offer = await myPeerConnection.createOffer();
  myPeerConnection.setLocalDescription(offer);
  socket.emit("offer", offer, roomName);
  console.log("sent offer");

  addInfoMessage("join");
});

socket.on("bye", () => {
  addInfoMessage("leave");
  peerFace.srcObject = null;
  myPeerConnection = null;
  myDataChannel = null;
});

socket.on("offer", async (offer) => {
  myPeerConnection.addEventListener("datachannel", (event) => {
    myDataChannel = event.channel;
    myDataChannel.addEventListener("message", (event) => {
      addMessage(event.data, "receive");
    });
  });

  console.log("received offer");
  myPeerConnection.setRemoteDescription(offer);
  const answer = await myPeerConnection.createAnswer();
  myPeerConnection.setLocalDescription(answer);
  socket.emit("answer", answer, roomName);
  console.log("sent answer");
});

socket.on("answer", (answer) => {
  console.log("received answer");
  myPeerConnection.setRemoteDescription(answer);
});

socket.on("ice", (ice) => {
  console.log("received candidate");
  myPeerConnection.addIceCandidate(ice);
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

socket.on("room_full", () => {
  alert("Room is full");
});

// RTC code

function makeConnection() {
  // myPeerConnection = new RTCPeerConnection();
  myPeerConnection = new RTCPeerConnection({
    iceServers: [
      {
        urls: [
          "stun:stun.l.google.com:19302",
          "stun:stun1.l.google.com:19302",
          "stun:stun2.l.google.com:19302",
          "stun:stun3.l.google.com:19302",
          "stun:stun4.l.google.com:19302",
        ],
      },
    ],
  });
  myPeerConnection.addEventListener("icecandidate", (event) => {
    socket.emit("ice", event.candidate, roomName);
    console.log("sent candidate");
  });
  myPeerConnection.addEventListener("track", (event) => {
    peerFace.srcObject = event.streams[0];
  });

  myStream.getTracks().forEach((track) => {
    myPeerConnection.addTrack(track, myStream);
  });
}
