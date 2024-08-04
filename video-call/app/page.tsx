'use client'
import { useEffect, useRef, useState } from "react";
import { FaVideo } from "react-icons/fa";
import { useToast } from "@/components/ui/use-toast";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export default function Page() {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [hidden, setHidden] = useState<boolean>(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const { toast } = useToast();
  const pcRef = useRef<RTCPeerConnection | null>(null);

  useEffect(() => {
    const socket = new WebSocket(process.env.NEXT_PUBLIC_WSS_URL!);
    setSocket(socket);
    socket.onopen = () => {
      socket.send(JSON.stringify({
        type: 'videoSender'
      }));
    };

    return () => {
      socket.close();
    };
  }, []);

  const initiateConn = async () => {
    if (!socket) {
      toast({
        title: 'Error',
        description: "Connection not found",
        variant: 'destructive',
        duration: 3000
      });
      return;
    }

    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });
    pcRef.current = pc;

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

    pc.onnegotiationneeded = async () => {
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.send(JSON.stringify({
          type: 'videoCreateOffer',
          sdp: pc.localDescription
        }));
      } catch (error) {
        console.error("Error during negotiation:", error);
      }
    };

    socket.onmessage = async (event) => {
      const message = JSON.parse(event.data);
      if (message.type === 'videoCreateAnswer') {
        await pc.setRemoteDescription(message.sdp);
      } else if (message.type === 'videoIceCandidate') {
        await pc.addIceCandidate(message.candidate);
      }
    };

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });
      setIsOpen(true);
      setHidden(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: "Failed to access media devices",
        variant: 'destructive',
        duration: 3000
      });
      console.error("Error accessing media devices:", error);
    }
  };

  useEffect(() => {
    return () => {
      if (pcRef.current) {
        pcRef.current.close();
      }
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
        tracks.forEach((track) => track.stop());
      }
    };
  }, []);

  return (
    <div className="">
      <Button onClick={initiateConn}>Start call</Button>
      <div className={`w-full aspect-video bg-black ${hidden ? "hidden" : ""}`}>
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-contain"
          />
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-contain"
          />
        </div>
    </div>
  );
};
