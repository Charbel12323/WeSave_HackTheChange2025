"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import Link from "next/link"
import { Eye, EyeOff } from "lucide-react"
import { Button } from "../components/ui/button"

export default function SignUpPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const fadeIn = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError("")
    setSuccess("")
    const form = e.currentTarget
    const username = (form.elements.namedItem("username") as HTMLInputElement).value
    const email = (form.elements.namedItem("email") as HTMLInputElement).value
    const password = (form.elements.namedItem("password") as HTMLInputElement).value

    try {
      const res = await fetch("http://localhost:5000/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, email, password }),
      })

      const data = await res.json()
      if (res.ok) {
        setSuccess("User created successfully!")
      } else {
        setError(data.error || "Error creating user")
      }
    } catch (err: any) {
      setError("Network error")
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-900 to-teal-700 flex flex-col justify-center items-center px-4 py-12">
      <motion.div
        initial="hidden"
        animate="visible"
        variants={fadeIn}
        transition={{ duration: 0.5 }}
        className="bg-white bg-opacity-10 backdrop-filter backdrop-blur-lg rounded-lg p-8 w-full max-w-md"
      >
        <h2 className="text-3xl font-bold text-white mb-6 text-center">
          Sign Up for FinanceTrack
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-teal-300 mb-1">
              Full Name
            </label>
            <input
              type="text"
              id="username"
              name="username"
              className="w-full px-3 py-2 bg-white bg-opacity-20 border border-teal-500 rounded-md text-white placeholder-teal-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
              placeholder="John Doe"
              required
            />
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-teal-300 mb-1">
              Email Address
            </label>
            <input
              type="email"
              id="email"
              name="email"
              className="w-full px-3 py-2 bg-white bg-opacity-20 border border-teal-500 rounded-md text-white placeholder-teal-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
              placeholder="john@example.com"
              required
            />
          </div>
          <div className="relative">
            <label htmlFor="password" className="block text-sm font-medium text-teal-300 mb-1">
              Password
            </label>
            <input
              type={showPassword ? "text" : "password"}
              id="password"
              name="password"
              className="w-full px-3 py-2 bg-white bg-opacity-20 border border-teal-500 rounded-md text-white placeholder-teal-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
              placeholder="••••••••"
              required
            />
            <button
              type="button"
              className="absolute right-3 top-8 text-teal-300"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
          {error && <p className="text-red-500 text-center">{error}</p>}
          {success && <p className="text-green-500 text-center">{success}</p>}
          <Button type="submit" size="lg" className="w-full">
            Sign Up
          </Button>
        </form>

        {/* Links for Login & Forgot Password */}
        <div className="mt-6 text-center">
          <Link href="/login" className="text-teal-300 hover:text-teal-100 transition-colors">
            Already have an account? Log in
          </Link>
        </div>
        <div className="mt-2 text-center">
          <Link href="/forgot-password" className="text-teal-300 hover:text-teal-100 transition-colors">
            Forgot your password?
          </Link>
        </div>

        {/* Low Income Sign-Up */}
        <div className="mt-4 text-center">
          <Link href="/lowincomeform">
            <Button className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-medium">
              I want to sign up as a low income
            </Button>
          </Link>
        </div>
      </motion.div>
    </div>
  )
}
