"use client";

import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Video, Menu, X, LogOut, User } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "../context/authContext";

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const { isLoggedIn, setIsLoggedIn } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    const token = localStorage.getItem("token");
    const deviceId = localStorage.getItem("deviceId");

    if (token && deviceId) {
      try {
        await fetch(`${import.meta.env.VITE_API_URL}/api/auth/logout`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ deviceId })
        });
      } catch (err) {
        console.error("Logout request failed", err);
      }
    }

    localStorage.removeItem("token");
    localStorage.removeItem("deviceId");
    setIsLoggedIn(false); // instant UI update
    navigate("/");
  };

  return (
    <nav className="glass-card sticky top-0 z-50 border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2 group">
            <div className="p-2 bg-gradient-to-r from-primary-600 to-accent-600 rounded-lg group-hover:scale-105 transition-transform duration-200">
              <Video className="h-6 w-6 text-white" />
            </div>
            <span className="font-display font-bold text-xl bg-gradient-to-r from-primary-600 to-accent-600 bg-clip-text text-transparent">
              wibble
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center space-x-8">
            <Link to="/" className="nav-link">
              Home
            </Link>
            {!isLoggedIn ? (
              <>
                <Link to="/login" className="nav-link">
                  Login
                </Link>
                <Link to="/register" className="btn-primary">
                  Get Started
                </Link>
              </>
            ) : (
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2 text-slate-600">
                  <User className="h-4 w-4" />
                  <span className="text-sm">Welcome back!</span>
                </div>
                <button onClick={handleLogout} className="btn-secondary flex items-center space-x-2">
                  <LogOut className="h-4 w-4" />
                  <span>Logout</span>
                </button>
              </div>
            )}
          </div>

          {/* Mobile toggle */}
          <div className="md:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="p-2 rounded-lg text-slate-600 hover:text-primary-600 hover:bg-white/50 transition-colors duration-200"
            >
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        <motion.div
          initial={false}
          animate={{ height: isOpen ? "auto" : 0, opacity: isOpen ? 1 : 0 }}
          transition={{ duration: 0.2 }}
          className="md:hidden overflow-hidden"
        >
          <div className="py-4 space-y-4 border-t border-white/10">
            <Link to="/" className="block nav-link" onClick={() => setIsOpen(false)}>
              Home
            </Link>
            {!isLoggedIn ? (
              <>
                <Link to="/login" className="block nav-link" onClick={() => setIsOpen(false)}>
                  Login
                </Link>
                <Link to="/register" className="block nav-link" onClick={() => setIsOpen(false)}>
                  Register
                </Link>
              </>
            ) : (
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 text-slate-600 hover:text-primary-600"
              >
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </nav>
  );
}
