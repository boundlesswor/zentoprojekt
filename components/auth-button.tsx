"use client"

import { useState, useEffect } from "react"
import { LogIn, LogOut, User, MessageCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/context/AuthContext"
import { useRouter } from "next/navigation"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

export function AuthButton() {
  const { user, isAuthenticated, isLoading, login, logout } = useAuth()
  const [isLoggingIn, setIsLoggingIn] = useState(false)
  const [code, setCode] = useState("")
  const [error, setError] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const router = useRouter()

  useEffect(() => {
    if (isAuthenticated && user) {
      loadNotificationsCount()
      const interval = setInterval(loadNotificationsCount, 30000)
      return () => clearInterval(interval)
    }
  }, [isAuthenticated, user])

  const loadNotificationsCount = async () => {
    try {
      const response = await fetch(`/api/notifications?user_id=${user.telegram_id}`)
      if (response.ok) {
        const notifications = await response.json()
        const unread = notifications.filter((n) => !n.is_read).length
        setUnreadCount(unread)
      }
    } catch (error) {
      console.error("Ошибка загрузки уведомлений:", error)
    }
  }

  const handleLogin = async () => {
    if (!code.trim()) {
      setError("Введите код")
      return
    }

    setIsLoggingIn(true)
    setError("")

    try {
      await login(code)
      setIsDialogOpen(false)
      setCode("")
    } catch (error: any) {
      setError(error.message || "Ошибка авторизации")
    } finally {
      setIsLoggingIn(false)
    }
  }

  const handleLogout = () => {
    logout()
    router.push("/")
  }

  const openTelegram = () => {
    window.open("https://t.me/orbitsanketa_bot", "_blank")
  }

  if (isLoading) {
    return (
      <Button disabled className="bg-white/5 border-white/10">
        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
        Загрузка...
      </Button>
    )
  }

  if (isAuthenticated && user) {
    return (
      <div className="flex items-center space-x-3">
        <Button
          onClick={() => router.push("/profile")}
          variant="ghost"
          className="text-white hover:bg-white/10 smooth-transition flex items-center space-x-2"
        >
          <div className="relative">
            <img
              src="/generic-user-avatar.png"
              alt={user.first_name || "User"}
              className="w-8 h-8 rounded-full border-2 border-emerald-400/50 shadow-lg"
            />
            {unreadCount > 0 && (
              <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full border-2 border-white/20 shadow-lg flex items-center justify-center">
                <span className="text-xs font-bold text-white">{unreadCount > 9 ? "9+" : unreadCount}</span>
              </div>
            )}
          </div>
          <div className="flex flex-col items-start">
            <span className="text-sm font-medium">{user.first_name || "Пользователь"}</span>
            {user.is_admin && <span className="text-xs text-emerald-400">Админ</span>}
          </div>
        </Button>
        <Button
          onClick={handleLogout}
          variant="ghost"
          size="sm"
          className="text-gray-400 hover:text-white hover:bg-white/10 smooth-transition"
        >
          <LogOut className="w-4 h-4" />
        </Button>
      </div>
    )
  }

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white border-0 neon-glow smooth-transition">
          <LogIn className="w-4 h-4 mr-2" />
          Войти через Telegram
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-gray-900/95 border-gray-700/50 backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center space-x-2">
            <User className="w-5 h-5 text-emerald-400" />
            <span>Авторизация в ZENTO</span>
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Получите код в Telegram боте и введите его здесь
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <Button
            onClick={openTelegram}
            className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white"
          >
            <MessageCircle className="w-4 h-4 mr-2" />
            Перейти в Telegram бот
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-gray-600/50" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-gray-900 px-2 text-gray-400">Затем введите код</span>
            </div>
          </div>

          <div>
            <Input
              type="text"
              placeholder="Введите 6-значный код..."
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              className="bg-gray-800/50 border-gray-600/50 text-white placeholder-gray-400 focus:border-emerald-400/50 text-center text-lg tracking-widest"
              onKeyPress={(e) => e.key === "Enter" && handleLogin()}
              maxLength={6}
            />
            {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
          </div>

          <div className="text-xs text-gray-500 space-y-1 bg-gray-800/30 p-3 rounded-lg">
            <p className="font-medium text-gray-400">Как получить код:</p>
            <p>1. Нажмите "Перейти в Telegram бот"</p>
            <p>2. Отправьте команду /start</p>
            <p>3. Отправьте команду /code</p>
            <p>4. Введите полученный код здесь</p>
          </div>

          <Button
            onClick={handleLogin}
            disabled={isLoggingIn || code.length !== 6}
            className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white disabled:opacity-50"
          >
            {isLoggingIn ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                Проверка кода...
              </>
            ) : (
              "Войти"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
