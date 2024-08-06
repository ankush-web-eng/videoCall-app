'use client'
import { useEffect, useRef, useState } from "react";

export default function Receiver() {
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const [hidden, setHidden] = useState<boolean>(true);

  useEffect(() => {
    const socket = new WebSocket(process.env.NEXT_PUBLIC_WSS_URL!);
    socket.onopen = () => {
      socket.send(JSON.stringify({
        type: 'videoReceiver'
      }));
    };
    startReceiving(socket);
  }, []);

  async function startReceiving(socket: WebSocket) {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.send(JSON.stringify({
          type: 'videoIceCandidate',
          candidate: event.candidate
        }));
      }
    };

    pc.ontrack = (event) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    socket.onmessage = async (event) => {
      const message = JSON.parse(event.data);
      if (message.type === 'videoCreateOffer') {
        await pc.setRemoteDescription(message.sdp);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.send(JSON.stringify({
          type: 'videoCreateAnswer',
          sdp: answer
        }));
      } else if (message.type === 'videoIceCandidate') {
        await pc.addIceCandidate(message.candidate);
      }
    };

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        localVideoRef.current.play();
        setHidden(false)
      }
      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });
    } catch (error) {
      console.error("Error accessing media devices:", error);
    }
  }

  return (
    <dialog
      open={!hidden}
      className="w-full h-full max-w-full max-h-full p-0 bg-gray-100 flex flex-col justify-center items-center"
    >
      <div className="w-full h-full max-w-screen-lg max-h-screen flex flex-col justify-center items-center gap-4 p-4">
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="w-full max-h-[60vh] object-contain bg-white"
        />
        <video
          ref={localVideoRef}
          autoPlay
          muted
          playsInline
          className="w-full max-h-[30vh] object-contain bg-white"
        />
      </div>
    </dialog>
  );
}
