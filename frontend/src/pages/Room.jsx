"use client"

import { useEffect, useRef, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { motion } from "framer-motion"
import { io } from "socket.io-client"
import { Mic, MicOff, Video, VideoOff, Phone, Users, Copy, Check } from "lucide-react"

export default function Room() {
  const { id } = useParams()
  const navigate = useNavigate()
  const localRef = useRef(null)
  const [peers, setPeers] = useState({})
  const [isAudioEnabled, setIsAudioEnabled] = useState(true)
  const [isVideoEnabled, setIsVideoEnabled] = useState(true)
  const [participantCount, setParticipantCount] = useState(1)
  const [copied, setCopied] = useState(false)
  const socketRef = useRef(null)
  const streamRef = useRef(null)
  const [usernames, setUsernames] = useState({})
  const peersRef = useRef({})
  const [userId, setUserId] = useState(null)

  useEffect(() => {
    const initializeRoom = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } },
          audio: true,
        })
        streamRef.current = stream
        if (localRef.current) {
          localRef.current.srcObject = stream
        }

        const token = localStorage.getItem("token")
        if (!token) {
          navigate("/login")
          return
        }

        const { uid } = JSON.parse(atob(token.split(".")[1]))
        setUserId(uid)

        socketRef.current = io(import.meta.env.VITE_API_URL, {
          auth: { token },
          reconnection: true,
          reconnectionAttempts: 5,
        })

        socketRef.current.on("connect", () => {
          socketRef.current.emit("join-room", { roomId: id })
        })

        socketRef.current.on("connect_error", () => {
          alert("Failed to connect to server. Please try again.")
        })

        socketRef.current.on("room-members", ({ members }) => {
          setParticipantCount(members.length)
          const nameMap = {}
          members.forEach((member) => {
            nameMap[member.userId] = member.username || "Anonymous"
          })
          setUsernames(nameMap)
        })

        socketRef.current.on("user-joined", ({ userId: joinedUserId, username }) => {
          setUsernames((prev) => ({ ...prev, [joinedUserId]: username || "Anonymous" }))
        })

        socketRef.current.on("initiate-peer", ({ userId: targetUserId, username }) => {
          if (streamRef.current && targetUserId !== uid && !peersRef.current[targetUserId]) {
            createPeerConnection(targetUserId, true, streamRef.current, { userId: targetUserId, username })
          }
        })

        socketRef.current.on("signal", async ({ from, data }) => {
          let peerConn = peersRef.current[from]
          if (!peerConn && data.type === "offer") {
            peerConn = await createPeerConnection(from, false, streamRef.current, { userId: from, username: usernames[from] || "Anonymous" })
          }
          if (peerConn) {
            try {
              if (data.type === "offer") {
                await peerConn.setRemoteDescription(new RTCSessionDescription(data))
                await createAnswer(from, peerConn)
              } else if (data.type === "answer") {
                await peerConn.setRemoteDescription(new RTCSessionDescription(data))
              } else if (data.candidate) {
                await peerConn.addIceCandidate(new RTCIceCandidate(data.candidate))
              }
            } catch (err) {}
          }
        })

        socketRef.current.on("user-left", ({ userId }) => {
          setParticipantCount((prev) => Math.max(1, prev - 1))
          setUsernames((prev) => {
            const newUsernames = { ...prev }
            delete newUsernames[userId]
            return newUsernames
          })
          removePeer(userId)
        })

        socketRef.current.on("error", (message) => {
          alert(message)
        })

        socketRef.current.on("room-full", () => {
          alert("Room is full")
          navigate("/")
        })
      } catch (err) {
        alert("Unable to access camera/microphone. Please check permissions.")
      }
    }

    initializeRoom()

    return () => {
      socketRef.current?.disconnect()
      streamRef.current?.getTracks().forEach((track) => track.stop())
      Object.values(peersRef.current).forEach((peerConn) => peerConn.close())
      setPeers({})
      peersRef.current = {}
    }
  }, [id, navigate])

  const createPeerConnection = async (userId, initiator, stream, user) => {
    if (!stream || peersRef.current[userId]) return peersRef.current[userId]

    try {
      const peerConn = new RTCPeerConnection({
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun1.l.google.com:19302" },
          {
            urls: "turn:openrelay.metered.ca:80",
            username: "openrelayproject",
            credential: "openrelayproject",
          },
        ],
      })

      stream.getTracks().forEach((track) => {
        peerConn.addTrack(track, stream)
      })

      peerConn.ontrack = (event) => {
        addRemoteVideo(userId, event.streams[0], user.username || usernames[userId] || "Anonymous")
      }

      peerConn.onicecandidate = (event) => {
        if (event.candidate) {
          socketRef.current.emit("signal", {
            to: userId,
            data: { candidate: event.candidate },
          })
        }
      }

      peerConn.onconnectionstatechange = () => {
        if (peerConn.connectionState === "failed" || peerConn.connectionState === "disconnected") {
          removePeer(userId)
        }
      }

      peersRef.current[userId] = peerConn
      setPeers((prev) => ({
        ...prev,
        [userId]: { peerConn, user: { userId, username: user.username || usernames[userId] || "Anonymous" } },
      }))

      if (initiator) {
        const offer = await peerConn.createOffer()
        await peerConn.setLocalDescription(offer)
        socketRef.current.emit("signal", { to: userId, data: offer })
      }

      return peerConn
    } catch (err) {
      return null
    }
  }

  const createAnswer = async (userId, peerConn) => {
    try {
      const answer = await peerConn.createAnswer()
      await peerConn.setLocalDescription(answer)
      socketRef.current.emit("signal", { to: userId, data: answer })
    } catch (err) {}
  }

  const addRemoteVideo = (userId, stream, username) => {
    let videoElement = document.getElementById(`video-${userId}`)
    if (!videoElement) {
      videoElement = document.createElement("video")
      videoElement.id = `video-${userId}`
      videoElement.autoplay = true
      videoElement.playsInline = true
      videoElement.className = "w-full h-full object-cover rounded-xl"

      const nameTag = document.createElement("div")
      nameTag.textContent = username || "Anonymous"
      nameTag.className = "absolute bottom-2 left-2 bg-black/50 px-2 py-1 rounded text-sm text-white"

      const container = document.createElement("div")
      container.className = "relative bg-slate-900 rounded-xl overflow-hidden aspect-video"
      container.appendChild(videoElement)
      container.appendChild(nameTag)

      const remoteVideosContainer = document.getElementById("remote-videos")
      if (remoteVideosContainer) {
        remoteVideosContainer.appendChild(container)
      }
    }
    try {
      videoElement.srcObject = stream
    } catch (err) {}
  }

  const removePeer = (userId) => {
    const peerConn = peersRef.current[userId]
    if (peerConn) {
      peerConn.close()
      delete peersRef.current[userId]
      setPeers((prev) => {
        const newPeers = { ...prev }
        delete newPeers[userId]
        return newPeers
      })
    }

    const videoElement = document.getElementById(`video-${userId}`)
    if (videoElement) {
      videoElement.parentElement.remove()
    }
  }

  const toggleAudio = () => {
    if (streamRef.current) {
      const audioTrack = streamRef.current.getAudioTracks()[0]
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled
        setIsAudioEnabled(audioTrack.enabled)
      }
    }
  }

  const toggleVideo = () => {
    if (streamRef.current) {
      const videoTrack = streamRef.current.getVideoTracks()[0]
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled
        setIsVideoEnabled(videoTrack.enabled)
      }
    }
  }

  const leaveRoom = () => {
    socketRef.current?.emit("leave-room", { roomId: id })
    socketRef.current?.disconnect()
    streamRef.current?.getTracks().forEach((track) => track.stop())
    navigate("/")
  }

  const copyRoomLink = async () => {
    const roomLink = `${window.location.origin}/room/${id}`
    try {
      await navigator.clipboard.writeText(roomLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {}
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <div className="glass-card bg-slate-800/80 border-slate-700/50 p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="font-display text-xl font-semibold">Room {id}</h1>
            <div className="flex items-center space-x-2 text-slate-300">
              <Users className="h-4 w-4" />
              <span className="text-sm">{participantCount} participant{participantCount !== 1 ? "s" : ""}</span>
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={copyRoomLink}
            className="flex items-center space-x-2 bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded-lg transition-colors duration-200"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            <span className="text-sm">{copied ? "Copied!" : "Copy Link"}</span>
          </motion.button>
        </div>
      </div>
      <div className="flex-1 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative bg-slate-800 rounded-xl overflow-hidden aspect-video"
            >
              <video ref={localRef} autoPlay muted playsInline className="w-full h-full object-cover" />
              <div className="absolute bottom-3 left-3 bg-black/50 backdrop-blur-sm px-2 py-1 rounded-lg">
                <span className="text-sm font-medium">You</span>
              </div>
              {!isVideoEnabled && (
                <div className="absolute inset-0 bg-slate-800 flex items-center justify-center">
                  <VideoOff className="h-8 w-8 text-slate-400" />
                </div>
              )}
            </motion.div>
          </div>
          <div id="remote-videos" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"></div>
        </div>
      </div>
      <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card bg-slate-800/90 backdrop-blur-xl border-slate-700/50 p-4 rounded-2xl"
        >
          <div className="flex items-center space-x-4">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={toggleAudio}
              className={`p-3 rounded-xl transition-colors duration-200 ${
                isAudioEnabled ? "bg-slate-700 hover:bg-slate-600 text-white" : "bg-red-500 hover:bg-red-600 text-white"
              }`}
            >
              {isAudioEnabled ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={toggleVideo}
              className={`p-3 rounded-xl transition-colors duration-200 ${
                isVideoEnabled ? "bg-slate-700 hover:bg-slate-600 text-white" : "bg-red-500 hover:bg-red-600 text-white"
              }`}
            >
              {isVideoEnabled ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={leaveRoom}
              className="p-3 bg-red-500 hover:bg-red-600 text-white rounded-xl transition-colors duration-200"
            >
              <Phone className="h-5 w-5 transform rotate-[135deg]" />
            </motion.button>
          </div>
        </motion.div>
      </div>
    </div>
  )
}