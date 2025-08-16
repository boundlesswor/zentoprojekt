"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/context/AuthContext"
import { Menu, X, Home, Building2, MessageSquare, Bell, User } from "lucide-react"

export function MobileNav() {
  const [isOpen, setIsOpen] = useState(false)
  const router = useRouter()
  const { user, isAuthenticated } = useAuth()

  const navItems = [
    { icon: Home, label: "Главная", href: "/" },
    { icon: Building2, label: "Добавить агентство", href: "/add-agency" },
    ...(isAuthenticated
      ? [
          { icon: MessageSquare, label: "Мои отзывы", href: "/profile?tab=reviews" },
          { icon: Bell, label: "Уведомления", href: "/profile?tab=notifications" },
          { icon: User, label: "Профиль", href: "/profile" },
        ]
      : []),
  ]

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="md:hidden fixed top-4 left-4 z-50 p-2 bg-slate-800/80 backdrop-blur-sm rounded-lg border border-slate-700"
      >
        {isOpen ? <X className="w-6 h-6 text-white" /> : <Menu className="w-6 h-6 text-white" />}
      </button>

      {/* Mobile Menu Overlay */}
      {isOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={() => setIsOpen(false)} />
      )}

      {/* Mobile Menu */}
      <div
        className={`md:hidden fixed top-0 left-0 z-40 w-80 h-full bg-slate-900/95 backdrop-blur-md border-r border-slate-700 transform transition-transform duration-300 ${isOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="pt-20 px-6">
          <div className="space-y-4">
            {navItems.map((item) => (
              <button
                key={item.href}
                onClick={() => {
                  router.push(item.href)
                  setIsOpen(false)
                }}
                className="w-full flex items-center gap-3 p-3 text-left text-white hover:bg-slate-800/50 rounded-lg transition-colors"
              >
                <item.icon className="w-5 h-5" />
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
