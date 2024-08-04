'use client'
import { useEffect, useRef, useState } from "react"

import {
    Dialog,
    DialogContent,
} from "@/components/ui/dialog"

export default function Receiver({ username }: { username: string }) {

    const [isOpen, setIsOpen] = useState<boolean>(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const pcRef = useRef<RTCPeerConnection | null>(null);
    const socketRef = useRef<WebSocket | null>(null);

    useEffect(() => {
        const socket = new WebSocket(process.env.NEXT_PUBLIC_WSS_URL!);
        socketRef.current = socket;
        socket.onopen = () => {
            socket.send(JSON.stringify({
                type: 'receiver'
            }));
        }
        socket.onmessage = (event) => {
            const message = JSON.parse(event.data);
            if (message.type === 'createOffer') {
                setIsOpen(true);
                pcRef.current?.setRemoteDescription(message.sdp).then(() => {
                    pcRef.current?.createAnswer().then((answer) => {
                        pcRef.current?.setLocalDescription(answer);
                        socket.send(JSON.stringify({
                            type: 'createAnswer',
                            sdp: answer
                        }));
                    });
                });
            } else if (message.type === 'iceCandidate') {
                pcRef.current?.addIceCandidate(message.candidate);
            }
        }

        return () => {
            socket.close();
        };
    }, []);

    useEffect(() => {
        if (isOpen && !pcRef.current) {
            const pc = new RTCPeerConnection();
            pcRef.current = pc;

            pc.ontrack = (event) => {
                if (!videoRef.current) {
                    return;
                }
                const video = videoRef.current;
                video.autoplay = true;
                video.muted = true;
                video.playsInline = true;
                video.style.width = '640px';
                video.style.height = '480px';
                video.style.border = '1px solid black';

                if (event.streams && event.streams[0]) {
                    video.srcObject = event.streams[0];
                } else {
                    video.srcObject = new MediaStream([event.track]);
                }

                video.onloadedmetadata = () => {
                    video.play().then(() => {
                        console.log("Video playback started");
                    }).catch(e => {
                        console.error("Error playing video:", e);
                    });
                };

                video.onerror = (e) => {
                    console.error("Video error:", e);
                };
            }
        }
    }, [isOpen]);

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
        <div>
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent className="max-w-[90vw] w-full sm:max-w-[600px]">
                    <div className="w-full aspect-video bg-black">
                        <video
                            ref={videoRef}
                            autoPlay
                            muted
                            playsInline
                            className="w-full h-full object-contain"
                        />
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}