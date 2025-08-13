"use client"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { motion } from "framer-motion"
import {ArrowRight, Plus } from "lucide-react"
import { useAuth } from "../context/authContext";

export default function Home() {
  const { isLoggedIn } = useAuth();
  const [isCreating, setIsCreating] = useState(false)
  const navigate = useNavigate()
  const [roomId,setRoomId] = useState();

  const createRoom = async () => {
    const token = localStorage.getItem("token")
    if (!token) {
      navigate("/login")
      return
    }

    setIsCreating(true)
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/rooms/create`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })
      const data = await res.json()
      if (!data.ok) throw new Error(data.error || "Failed to create room")
      navigate(`/room/${data.roomId}`)
    } catch (err) {
      alert(err.message)
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 lg:py-32">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-50 via-white to-accent-50"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <h1 className="font-display text-5xl lg:text-7xl font-bold text-slate-900 mb-6">
              Connect{" "}
              <span className="bg-gradient-to-r from-primary-600 to-accent-600 bg-clip-text text-transparent">
                Instantly
              </span>
            </h1>
            <p className="text-xl lg:text-2xl text-slate-600 mb-8 max-w-3xl mx-auto leading-relaxed">
              Experience seamless video calling with our modern, secure platform. Create rooms instantly and connect
              with anyone, anywhere.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              {isLoggedIn ? (
                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                  {/* Create Room Button */}
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={createRoom}
                    disabled={isCreating}
                    className="btn-primary flex items-center space-x-2 text-lg px-8 py-4 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isCreating ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        <span>Creating Room...</span>
                      </>
                    ) : (
                      <>
                        <Plus className="h-5 w-5" />
                        <span>Create Room</span>
                      </>
                    )}
                  </motion.button>

                  {/* Join Room */}
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Enter Room ID"
                      value={roomId}
                      onChange={(e) => setRoomId(e.target.value)}
                      className="input-field px-4 py-2"
                    />
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                          if (roomId.trim()) navigate(`/room/${roomId.trim()}`);
                        }}
                      className="btn-secondary px-6 py-2"
                      disabled={isCreating}
                    >
                      <span>Join Room</span>
                    </motion.button>
                  </div>
                </div>
              ) : (
                <>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => navigate("/register")}
                    className="btn-primary flex items-center space-x-2 text-lg px-8 py-4"
                  >
                    <span>Get Started</span>
                    <ArrowRight className="h-5 w-5" />
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => navigate("/login")}
                    className="btn-secondary text-lg px-8 py-4"
                  >
                    Sign In
                  </motion.button>
                </>
              )}
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  )
}
