const socket = io();

// Welcome Form (join a room)

const welcome = document.querySelector("#welcome");
const call = document.querySelector("#videoCall");
const welcomeForm = welcome.querySelector("form");
let roomName;
let myPeerConnection;
let myDataChannel;

welcomeForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const input = welcomeForm.querySelector("input");
  roomName = input.value;
  await initCall();
  socket.emit("join_room", roomName);
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
    const videoTrack = myStream.getVideoTracks()[0];
    const [audioSender, videoSender] = myPeerConnection.getSenders();
    videoSender.replaceTrack(videoTrack);
  }
});

async function getMedia(deviceId) {
  const initConstraints = { audio: true, video: { facingMode: "user" } };
  const cameraConstraints = { audio: true, video: { deviceId: { exact: deviceId } } };

  try {
    myStream = await navigator.mediaDevices.getUserMedia(deviceId ? cameraConstraints : initConstraints);
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

// Socket code

socket.on("welcome", async () => {
  myDataChannel = myPeerConnection.createDataChannel("chat");
  myDataChannel.addEventListener("message", handleMessage);

  const offer = await myPeerConnection.createOffer();
  myPeerConnection.setLocalDescription(offer);
  socket.emit("offer", offer, roomName);
  console.log("sent offer");
});

socket.on("offer", async (offer) => {
  myPeerConnection.addEventListener("datachannel", (event) => {
    myDataChannel = event.channel;
    myDataChannel.addEventListener("message", handleMessage);
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

function handleMessage(event) {
  console.log(event.data);
}

// RTC code

function makeConnection() {
  myPeerConnection = new RTCPeerConnection({
    iceServers: [
      {
        urls: "stun:stun.l.google.com:19302",
      },
    ],
  });
  // myPeerConnection = new RTCPeerConnection();
  myPeerConnection.addEventListener("icecandidate", (event) => {
    socket.emit("ice", event.candidate, roomName);
    console.log("sent candidate");
  });
  myPeerConnection.addEventListener("track", (event) => {
    const peerFace = document.querySelector("#peerFace");
    peerFace.srcObject = event.streams[0];
  });

  myStream.getTracks().forEach((track) => {
    myPeerConnection.addTrack(track, myStream);
  });
}
