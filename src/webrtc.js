import { useStore } from "./store";

const SIGNALING_SERVER = "wss://sigver.co:443";

export function initWebRTC() {
  const { peerId, addPeer, removePeer, setUsers, updateFileContent } =
    useStore.getState();
  const socket = new WebSocket(SIGNALING_SERVER);

  socket.onopen = () => {
    socket.send(JSON.stringify({ type: "join", id: peerId }));
  };

  socket.onmessage = async (event) => {
    const message = JSON.parse(event.data);
    switch (message.type) {
      case "users":
        setUsers(message.users.filter((id) => id !== peerId));
        message.users.forEach((id) => id !== peerId && connectToPeer(id));
        break;
      case "offer":
        handleOffer(message);
        break;
      case "answer":
        handleAnswer(message);
        break;
      case "candidate":
        handleCandidate(message);
        break;
    }
  };

  async function connectToPeer(targetId) {
    const peer = new RTCPeerConnection();
    const dataChannel = peer.createDataChannel("codeSync");

    peer.onicecandidate = (event) => {
      if (event.candidate) {
        socket.send(
          JSON.stringify({
            type: "candidate",
            candidate: event.candidate,
            to: targetId,
          })
        );
      }
    };

    dataChannel.onopen = () =>
      console.log(`Data channel open with ${targetId}`);
    dataChannel.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "content") {
        updateFileContent(data.id, data.content);
      } else if (data.type === "files") {
        useStore.setState({ files: data.files });
      }
    };

    addPeer(targetId, { peer, dataChannel });

    const offer = await peer.createOffer();
    await peer.setLocalDescription(offer);
    socket.send(
      JSON.stringify({ type: "offer", offer, from: peerId, to: targetId })
    );
  }

  async function handleOffer({ offer, from }) {
    const peer = new RTCPeerConnection();
    peer.ondatachannel = (event) => {
      const dataChannel = event.channel;
      dataChannel.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === "content") {
          updateFileContent(data.id, data.content);
        } else if (data.type === "files") {
          useStore.setState({ files: data.files });
        }
      };
      addPeer(from, { peer, dataChannel });
    };

    peer.onicecandidate = (event) => {
      if (event.candidate) {
        socket.send(
          JSON.stringify({
            type: "candidate",
            candidate: event.candidate,
            to: from,
          })
        );
      }
    };

    await peer.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await peer.createAnswer();
    await peer.setLocalDescription(answer);
    socket.send(
      JSON.stringify({ type: "answer", answer, from: peerId, to: from })
    );
  }

  async function handleAnswer({ answer, from }) {
    const { peers } = useStore.getState();
    const peerData = peers[from];
    if (peerData) {
      await peerData.peer.setRemoteDescription(
        new RTCSessionDescription(answer)
      );
    }
  }

  async function handleCandidate({ candidate, from }) {
    const { peers } = useStore.getState();
    const peerData = peers[from];
    if (peerData && candidate) {
      await peerData.peer.addIceCandidate(new RTCIceCandidate(candidate));
    }
  }

  return () => socket.close();
}
