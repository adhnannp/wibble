"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2, Video, VideoOff, Mic, MicOff, Send, X, User, ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"

export default function VideoChat() {
  const [username, setUsername] = useState("")
  const [newUsername, setNewUsername] = useState("")
  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [isCameraOn, setIsCameraOn] = useState(true)
  const [isMicOn, setIsMicOn] = useState(true)
  const [messages, setMessages] = useState<{ sender: string; text: string }[]>([])
  const [currentMessage, setCurrentMessage] = useState("")
  const [showNameModal, setShowNameModal] = useState(false)
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)

  // Simulate connection process
  const handleConnect = () => {
    if (!username.trim()) return

    setIsConnecting(true)

    // Simulate connection delay
    setTimeout(() => {
      setIsConnected(true)
      setIsConnecting(false)

      // Add welcome message
      setMessages([{ sender: "System", text: "You are now connected with a random stranger." }])

      // Simulate getting remote video after a delay
      setTimeout(() => {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.src = "/placeholder.svg?height=480&width=640"
          remoteVideoRef.current.poster = "/placeholder.svg?height=480&width=640"
        }
      }, 1000)
    }, 2000)
  }

  const handleDisconnect = () => {
    setIsConnected(false)
    setMessages([])
    if (remoteVideoRef.current) {
      remoteVideoRef.current.src = ""
      remoteVideoRef.current.poster = "/placeholder.svg?height=480&width=640"
    }
  }
  
  const handleNext = () => {
    // First disconnect from current chat
    handleDisconnect()
    
    // Then start a new connection
    setIsConnecting(true)
    
    setTimeout(() => {
      setIsConnected(true)
      setIsConnecting(false)
      
      // Add welcome message
      setMessages([{ sender: "System", text: "You are now connected with a new random stranger." }])
      
      // Simulate getting remote video after a delay
      setTimeout(() => {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.src = "/placeholder.svg?height=480&width=640"
          remoteVideoRef.current.poster = "/placeholder.svg?height=480&width=640"
        }
      }, 1000)
    }, 2000)
  }

  const toggleCamera = () => {
    setIsCameraOn(!isCameraOn)
  }

  const toggleMic = () => {
    setIsMicOn(!isMicOn)
  }

  const openNameModal = () => {
    setNewUsername(username)
    setShowNameModal(true)
  }

  const handleNameChange = () => {
    if (newUsername.trim()) {
      setUsername(newUsername)
      setMessages(prev => [...prev, { sender: "System", text: `You changed your name to ${newUsername}.` }])
    }
    setShowNameModal(false)
  }

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentMessage.trim()) return

    const newMessage = { sender: username, text: currentMessage }
    setMessages([...messages, newMessage])
    setCurrentMessage("")

    // Simulate stranger response after a delay
    setTimeout(() => {
      const responses = [
        "Hey there! How are you?",
        "Nice to meet you!",
        "Where are you from?",
        "What brings you here today?",
        "Interesting! Tell me more about yourself.",
      ]
      const randomResponse = responses[Math.floor(Math.random() * responses.length)]
      setMessages((prev) => [...prev, { sender: "Stranger", text: randomResponse }])
    }, 1500)
  }

  // Scroll to bottom of chat when new messages arrive
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
    }
  }, [messages])

  // Simulate accessing camera for local video
  useEffect(() => {
    if (localVideoRef.current) {
      localVideoRef.current.poster = "/placeholder.svg?height=240&width=320"
    }
  }, [])

  return (
    <div className="flex flex-col min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-200 p-4 bg-white">
        <h1 className="text-2xl font-bold text-center" style={{ color: "#1a2f36" }}>Wibble Chat</h1>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-6 flex flex-col md:flex-row gap-6">
        {!isConnected ? (
          <div className="flex flex-col items-center justify-center w-full space-y-6 py-12">
            <div className="w-full max-w-md space-y-4">
              <h2 className="text-xl font-semibold text-center">Start a Random Chat</h2>
              <div className="space-y-4">
                <div>
                  <label htmlFor="username" className="block text-sm font-medium mb-1">
                    Your Name
                  </label>
                  <Input
                    id="username"
                    type="text"
                    placeholder="Enter your name"
                    value={username}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUsername(e.target.value)}
                    className="border-gray-300 focus:ring-blue-300"
                  />
                </div>
                <Button
                  onClick={handleConnect}
                  disabled={isConnecting || !username.trim()}
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
          </div>
        ) : (
          <>
            {/* Video Area */}
            <div className="flex-1 flex flex-col space-y-4">
              <div className="relative w-full bg-gray-100 rounded-lg overflow-hidden" style={{ aspectRatio: "16/9" }}>
                {/* Remote Video */}
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                  poster="/placeholder.svg?height=480&width=640"
                />

                {/* Local Video (Picture-in-Picture) */}
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

                {/* Stranger's name */}
                <div className="absolute top-4 left-4 bg-gray-800 bg-opacity-50 text-white px-3 py-1 rounded-full text-sm">
                  Stranger
                </div>
              </div>

              {/* Controls */}
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
                  onClick={openNameModal}
                  variant="outline"
                  className="border-gray-300"
                  aria-label="Change username"
                >
                  <User className="h-5 w-5" />
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

            {/* Chat Area */}
            <div className="w-full md:w-80 flex flex-col border border-gray-200 rounded-lg overflow-hidden">
              <div className="p-3 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                <h2 className="font-medium">Chat</h2>
                <div className="text-sm text-gray-500">
                  You: {username}
                </div>
              </div>

              {/* Messages */}
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
                          : "mr-auto bg-gray-200 rounded-bl-none",
                    )}
                    style={{ backgroundColor: message.sender === username ? "#1a2f36" : message.sender === "System" ? "" : "" }}
                  >
                    {message.sender !== username && message.sender !== "System" && (
                      <div className="font-semibold text-xs mb-1">{message.sender}</div>
                    )}
                    <div>{message.text}</div>
                  </div>
                ))}
              </div>

              {/* Message Input */}
              <form onSubmit={sendMessage} className="p-3 border-t border-gray-200 flex">
                <Input
                  type="text"
                  placeholder="Type a message..."
                  value={currentMessage}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCurrentMessage(e.target.value)}
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

      {/* Username Change Modal */}
      <Dialog open={showNameModal} onOpenChange={setShowNameModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Change Your Name</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="new-username" className="block text-sm font-medium">
                New Name
              </label>
              <Input
                id="new-username"
                type="text"
                placeholder="Enter new name"
                value={newUsername}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewUsername(e.target.value)}
                className="border-gray-300 focus:ring-blue-300"
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setShowNameModal(false)}
              className="border-gray-300"
            >
              Cancel
            </Button>
            <Button 
              type="button" 
              onClick={handleNameChange}
              className="text-white"
              style={{ backgroundColor: "#1a2f36" }}
              disabled={!newUsername.trim()}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}