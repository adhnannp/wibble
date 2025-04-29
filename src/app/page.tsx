"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Video, VideoOff, Mic, MicOff, Send, X, ArrowRight, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

// Error Component
const ErrorMessage = ({ message, onRetry }: { message: string; onRetry?: () => void }) => (
  <div className="flex flex-col items-center justify-center w-full h-full p-6 bg-red-50 rounded-lg text-center space-y-4">
    <AlertCircle className="h-12 w-12 text-red-500" />
    <p className="text-red-600">{message}</p>
    {onRetry && (
      <Button
        onClick={onRetry}
        className="text-white"
        style={{ backgroundColor: "#1a2f36" }}
      >
        Retry
      </Button>
    )}
  </div>
);

export default function VideoChat() {
  const [username, setUsername] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isMicOn, setIsMicOn] = useState(true);
  const [messages, setMessages] = useState<{ sender: string; text: string }[]>([]);
  const [currentMessage, setCurrentMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const userIdRef = useRef<string>("");
  const strangerIdRef = useRef<string>("");
  const localStreamRef = useRef<MediaStream | null>(null);
  useEffect(() => {
    document.body.removeAttribute('cz-shortcut-listen');
  }, []);
  // Function to initialize WebSocket connection
  const connectWebSocket = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      return;
    }

    setIsConnecting(true);
    setError(null);
    wsRef.current = new WebSocket("wss://10.0.14.210:3001");

    wsRef.current.onopen = () => {
      console.log("WebSocket connected");
      wsRef.current?.send(JSON.stringify({ type: "connect" }));
    };

    wsRef.current.onerror = (error) => {
      console.error("WebSocket error:", error);
      setError("Failed to connect to the server. Please try again.");
      setIsConnecting(false);
    };

    wsRef.current.onmessage = (event) => {
      const message = JSON.parse(event.data);
      handleWebSocketMessage(message);
    };

    wsRef.current.onclose = (event) => {
      console.log("WebSocket closed:", event.code, event.reason);
      setIsConnected(false);
      setIsConnecting(false);
      setMessages([]);
      cleanupPeerConnection();
    };
  };

  // Initialize WebSocket and WebRTC
  useEffect(() => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError("Your browser does not support camera and microphone access.");
      return;
    }

    connectWebSocket();

    // Initialize WebRTC
    peerConnectionRef.current = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });

    peerConnectionRef.current.onicecandidate = (event) => {
      if (event.candidate && wsRef.current) {
        wsRef.current.send(
          JSON.stringify({
            type: "candidate",
            senderId: userIdRef.current,
            receiverId: strangerIdRef.current,
            data: event.candidate,
          })
        );
      }
    };

    peerConnectionRef.current.ontrack = (event) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    // Get local media
    const getMedia = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        stream.getTracks().forEach((track) => {
          peerConnectionRef.current?.addTrack(track, stream);
        });
      } catch (err: any) {
        console.error("Error accessing media devices:", err);
        if (err.name === "NotAllowedError") {
          setError("Camera and microphone permissions are required. Please allow access and retry.");
        } else if (err.name === "NotFoundError") {
          setError("No camera or microphone found. Please connect a device and retry.");
        } else {
          setError("Failed to access camera and microphone. Please check your settings.");
        }
      }
    };

    getMedia();

    return () => {
      wsRef.current?.close();
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      cleanupPeerConnection();
    };
  }, []);

  const handleWebSocketMessage = async (message: any) => {
    switch (message.type) {
      case "welcome":
        userIdRef.current = message.userId;
        setUsername(message.username);
        break;
      case "system":
        setMessages((prev) => [...prev, { sender: "System", text: message.text }]);
        if (message.strangerId) {
          strangerIdRef.current = message.strangerId;
          setIsConnected(true);
          setIsConnecting(false);
          if (userIdRef.current < strangerIdRef.current) {
            const offer = await peerConnectionRef.current?.createOffer();
            await peerConnectionRef.current?.setLocalDescription(offer);
            wsRef.current?.send(
              JSON.stringify({
                type: "offer",
                senderId: userIdRef.current,
                receiverId: strangerIdRef.current,
                data: offer,
              })
            );
          }
        }
        break;
      case "chat":
        setMessages((prev) => [...prev, message.message]);
        break;
      case "offer":
        if (message.senderId === strangerIdRef.current) {
          await peerConnectionRef.current?.setRemoteDescription(
            new RTCSessionDescription(message.data)
          );
          const answer = await peerConnectionRef.current?.createAnswer();
          await peerConnectionRef.current?.setLocalDescription(answer);
          wsRef.current?.send(
            JSON.stringify({
              type: "answer",
              senderId: userIdRef.current,
              receiverId: strangerIdRef.current,
              data: answer,
            })
          );
        }
        break;
      case "answer":
        if (message.senderId === strangerIdRef.current) {
          await peerConnectionRef.current?.setRemoteDescription(
            new RTCSessionDescription(message.data)
          );
        }
        break;
      case "candidate":
        if (message.senderId === strangerIdRef.current) {
          await peerConnectionRef.current?.addIceCandidate(
            new RTCIceCandidate(message.data)
          );
        }
        break;
    }
  };

  const cleanupPeerConnection = () => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
  };

  const handleDisconnect = () => {
    if (wsRef.current) {
      wsRef.current.send(JSON.stringify({ type: "disconnect" }));
    }
    setIsConnected(false);
    setMessages([]);
    cleanupPeerConnection();
  };

  const handleNext = () => {
    if (wsRef.current) {
      wsRef.current.send(JSON.stringify({ type: "next" }));
    }
    setIsConnecting(true);
    setMessages([]);
    cleanupPeerConnection();
    peerConnectionRef.current = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });
    peerConnectionRef.current.onicecandidate = (event) => {
      if (event.candidate && wsRef.current) {
        wsRef.current.send(
          JSON.stringify({
            type: "candidate",
            senderId: userIdRef.current,
            receiverId: strangerIdRef.current,
            data: event.candidate,
          })
        );
      }
    };
    peerConnectionRef.current.ontrack = (event) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        peerConnectionRef.current?.addTrack(track, localStreamRef.current!);
      });
    }
  };

  const toggleCamera = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach((track) => (track.enabled = !track.enabled));
      setIsCameraOn(!isCameraOn);
    }
  };

  const toggleMic = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((track) => (track.enabled = !track.enabled));
      setIsMicOn(!isMicOn);
    }
  };

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentMessage.trim() || !wsRef.current) return;

    wsRef.current.send(
      JSON.stringify({ type: "chat", text: currentMessage })
    );
    setCurrentMessage("");
  };

  const retryMediaAccess = () => {
    setError(null);
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((stream) => {
        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        stream.getTracks().forEach((track) => {
          peerConnectionRef.current?.addTrack(track, stream);
        });
      })
      .catch((err: any) => {
        console.error("Retry failed:", err);
        if (err.name === "NotAllowedError") {
          setError("Camera and microphone permissions are required. Please allow access and retry.");
        } else if (err.name === "NotFoundError") {
          setError("No camera or microphone found. Please connect a device and retry.");
        } else {
          setError("Failed to access camera and microphone. Please check your settings.");
        }
      });
  };

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  if (error) {
    return (
      <div className="flex flex-col min-h-screen bg-white">
        <header className="border-b border-gray-200 p-4 bg-white">
          <h1 className="text-2xl font-bold text-center" style={{ color: "#1a2f36" }}>
            Wibble Chat
          </h1>
        </header>
        <main className="flex-1 p-4 md:p-6">
          <ErrorMessage message={error} onRetry={connectWebSocket} />
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-white">
      <header className="border-b border-gray-200 p-4 bg-white">
        <h1 className="text-2xl font-bold text-center" style={{ color: "#1a2f36" }}>
          Wibble Chat
        </h1>
      </header>
      <main className="flex-1 p-4 md:p-6 flex flex-col md:flex-row gap-6">
        {!isConnected ? (
          <div className="flex flex-col items-center justify-center w-full space-y-6 py-12">
            <div className="w-full max-w-md space-y-4">
              <h2 className="text-xl font-semibold text-center">Start a Random Chat</h2>
              <Button
                onClick={connectWebSocket}
                disabled={isConnecting}
                className="w-full text-white"
                style={{ backgroundColor: "#1a2f36", borderColor: "#1a2f36" }}
              >
                {isConnecting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  "Connect"
                )}
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex-1 flex flex-col space-y-4">
              <div
                className="relative w-full bg-gray-100 rounded-lg overflow-hidden"
                style={{ aspectRatio: "16/9" }}
              >
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                  poster="/placeholder.svg?height=480&width=640"
                />
                <div className="absolute bottom-4 right-4 w-1/4 aspect-video bg-gray-200 rounded overflow-hidden shadow-lg">
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className={cn("w-full h-full object-cover", !isCameraOn && "hidden")}
                  />
                  {!isCameraOn && (
                    <div className="w-full h-full flex items-center justify-center bg-gray-800">
                      <VideoOff className="h-8 w-8 text-white" />
                    </div>
                  )}
                </div>
                <div className="absolute top-4 left-4 bg-gray-800 bg-opacity-50 text-white px-3 py-1 rounded-full text-sm">
                  Stranger
                </div>
              </div>
              <div className="flex justify-center space-x-3 flex-wrap">
                <Button
                  onClick={toggleCamera}
                  variant="outline"
                  className="border-gray-300"
                  aria-label={isCameraOn ? "Turn camera off" : "Turn camera on"}
                >
                  {isCameraOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
                </Button>
                <Button
                  onClick={toggleMic}
                  variant="outline"
                  className="border-gray-300"
                  aria-label={isMicOn ? "Mute microphone" : "Unmute microphone"}
                >
                  {isMicOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
                </Button>
                <Button
                  onClick={handleNext}
                  className="text-white"
                  style={{ backgroundColor: "#1a2f36" }}
                  aria-label="Next chat"
                >
                  <ArrowRight className="h-5 w-5 mr-2" />
                  Next
                </Button>
                <Button
                  onClick={handleDisconnect}
                  className="text-white"
                  style={{ backgroundColor: "#FF5252" }}
                  aria-label="Disconnect"
                >
                  <X className="h-5 w-5 mr-2" />
                  Disconnect
                </Button>
              </div>
            </div>
            <div className="w-full md:w-80 flex flex-col border border-gray-200 rounded-lg overflow-hidden">
              <div className="p-3 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                <h2 className="font-medium">Chat</h2>
                <div className="text-sm text-gray-500">You: {username}</div>
              </div>
              <div
                ref={chatContainerRef}
                className="flex-1 p-3 space-y-3 overflow-y-auto"
                style={{ maxHeight: "calc(100vh - 300px)" }}
              >
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={cn(
                      "max-w-[85%] p-3 rounded-lg",
                      message.sender === username
                        ? "ml-auto text-white rounded-br-none"
                        : message.sender === "System"
                        ? "mx-auto bg-gray-100 text-gray-600 text-sm italic text-center"
                        : "mr-auto bg-gray-200 rounded-bl-none"
                    )}
                    style={{
                      backgroundColor:
                        message.sender === username
                          ? "#1a2f36"
                          : message.sender === "System"
                          ? ""
                          : "",
                    }}
                  >
                    {message.sender !== username && message.sender !== "System" && (
                      <div className="font-semibold text-xs mb-1">{message.sender}</div>
                    )}
                    <div>{message.text}</div>
                  </div>
                ))}
              </div>
              <form onSubmit={sendMessage} className="p-3 border-t border-gray-200 flex">
                <Input
                  type="text"
                  placeholder="Type a message..."
                  value={currentMessage}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setCurrentMessage(e.target.value)
                  }
                  className="flex-1 border-gray-300 focus:ring-blue-300"
                />
                <Button
                  type="submit"
                  className="ml-2 text-white"
                  style={{ backgroundColor: "#1a2f36" }}
                  disabled={!currentMessage.trim()}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </>
        )}
      </main>
    </div>
  );
}