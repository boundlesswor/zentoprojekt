"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/context/AuthContext"

const Login = () => {
  const [code, setCode] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const { login } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      const response = await fetch("/api/auth/verify-code", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ code }),
      })

      const data = await response.json()

      if (data.ok && data.user) {
        localStorage.setItem("user", JSON.stringify(data.user))
        login(data.user)
        router.push("/profile")
      } else {
        const errorMessages = {
          CODE_NOT_FOUND: "Код не найден или уже использован",
          CODE_ALREADY_USED: "Код уже был использован",
          CODE_EXPIRED: "Код истек, запросите новый",
          USER_NOT_FOUND: "Пользователь не найден",
          USER_CREATE_FAILED: "Ошибка создания пользователя",
        }
        setError(errorMessages[data.error as keyof typeof errorMessages] || "Неверный код")
      }
    } catch (error) {
      setError("Ошибка подключения к серверу")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 w-full max-w-md border border-white/20">
        <h1 className="text-2xl font-bold text-white text-center mb-6">Вход в ZENTO</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Введите код из Telegram"
            className="w-full px-4 py-3 rounded-lg bg-white/20 border border-white/30 text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-blue-400"
            required
          />
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg font-semibold hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isLoading ? "Проверка кода..." : "Войти"}
          </button>
          {error && (
            <p className="text-red-300 text-center text-sm bg-red-500/20 rounded-lg p-3 border border-red-500/30">
              {error}
            </p>
          )}
        </form>
      </div>
    </div>
  )
}

export default Login
