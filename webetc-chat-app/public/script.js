const localVideo = document.getElementById("localVideo");
const remoteVideo = document.getElementById("remoteVideo");
const chatInput = document.getElementById("chatInput");
const sendBtn = document.getElementById("sendBtn");
const messages = document.getElementById("messages");

const socket = new WebSocket(`ws://${location.host}`);
const roomId = new URLSearchParams(window.location.search).get("room") || "default";

let localStream;
let peer;
let dataChannel;

socket.onopen = () => {
  socket.send(JSON.stringify({ type: "join", room: roomId }));
};

socket.onmessage = async (event) => {
  const { type, payload } = JSON.parse(event.data);
  if (type === "signal") {
    if (payload.sdp) {
      await peer.setRemoteDescription(new RTCSessionDescription(payload.sdp));
      if (payload.sdp.type === "offer") {
        const answer = await peer.createAnswer();
        await peer.setLocalDescription(answer);
        socket.send(JSON.stringify({ type: "signal", room: roomId, payload: { sdp: peer.localDescription } }));
      }
    } else if (payload.candidate) {
      await peer.addIceCandidate(new RTCIceCandidate(payload.candidate));
    }
  }
};

async function start() {
  localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
  localVideo.srcObject = localStream;

  peer = new RTCPeerConnection({
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
  });

  // Setup DataChannel for chat
  dataChannel = peer.createDataChannel("chat");
  dataChannel.onmessage = (e) => appendMessage("Peer", e.data);

  peer.ondatachannel = (event) => {
    event.channel.onmessage = (e) => appendMessage("Peer", e.data);
  };

  // Add local tracks
  localStream.getTracks().forEach(track => peer.addTrack(track, localStream));

  peer.ontrack = (event) => {
    remoteVideo.srcObject = event.streams[0];
  };

  peer.onicecandidate = (event) => {
    if (event.candidate) {
      socket.send(JSON.stringify({ type: "signal", room: roomId, payload: { candidate: event.candidate } }));
    }
  };

  const offer = await peer.createOffer();
  await peer.setLocalDescription(offer);
  socket.send(JSON.stringify({ type: "signal", room: roomId, payload: { sdp: offer } }));
}

sendBtn.onclick = () => {
  const msg = chatInput.value;
  if (msg && dataChannel && dataChannel.readyState === "open") {
    dataChannel.send(msg);
    appendMessage("You", msg);
    chatInput.value = "";
  }
};

function appendMessage(sender, text) {
  const el = document.createElement("div");
  el.textContent = `${sender}: ${text}`;
  messages.appendChild(el);
}

start();
