"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { useAuth } from "@/context/AuthContext"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft, Building2, MapPin, Check, X } from "lucide-react"
import Image from "next/image"

interface Agency {
  id: number
  name: string
  type: string
  country: string
  description: string
  logo_url?: string
  status: string
  created_at: string
  submitted_by: number
}

export default function ModerateAgencyPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const [agency, setAgency] = useState<Agency | null>(null)
  const [loading, setLoading] = useState(true)
  const [moderating, setModerating] = useState(false)
  const [rejectReason, setRejectReason] = useState("")
  const [showRejectForm, setShowRejectForm] = useState(false)

  useEffect(() => {
    if (!user?.is_admin) {
      router.push("/")
      return
    }

    loadAgency()
  }, [params.id, user])

  const loadAgency = async () => {
    try {
      console.log("Загружаю агентство:", params.id)
      console.log("Пользователь:", user)
      console.log("Telegram ID:", user?.telegram_id)
      console.log("Является админом:", user?.is_admin)

      const apiUrl = `/api/agencies/${params.id}?user_id=${user?.telegram_id}`
      console.log("API URL:", apiUrl)

      const response = await fetch(apiUrl)
      console.log("Ответ API:", response.status, response.statusText)

      if (response.ok) {
        const data = await response.json()
        console.log("Данные агентства:", data)
        setAgency(data)
      } else {
        const errorData = await response.text()
        console.error("Ошибка загрузки агентства:", response.status, errorData)
      }
    } catch (error) {
      console.error("Ошибка:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async () => {
    setModerating(true)
    try {
      const response = await fetch(`/api/agencies/${params.id}/moderate`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "approve",
          moderator_id: user?.telegram_id,
        }),
      })

      if (response.ok) {
        alert("Агентство одобрено!")
        router.push("/profile")
      } else {
        alert("Ошибка при одобрении")
      }
    } catch (error) {
      console.error("Ошибка:", error)
      alert("Ошибка при одобрении")
    } finally {
      setModerating(false)
    }
  }

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      alert("Укажите причину отклонения")
      return
    }

    setModerating(true)
    try {
      const response = await fetch(`/api/agencies/${params.id}/moderate`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reject",
          reason: rejectReason,
          moderator_id: user?.telegram_id,
        }),
      })

      if (response.ok) {
        alert("Агентство отклонено")
        router.push("/profile")
      } else {
        alert("Ошибка при отклонении")
      }
    } catch (error) {
      console.error("Ошибка:", error)
      alert("Ошибка при отклонении")
    } finally {
      setModerating(false)
    }
  }

  if (!user?.is_admin) {
    return <div>Доступ запрещен</div>
  }

  if (loading) {
    return <div className="flex justify-center items-center min-h-screen">Загрузка...</div>
  }

  if (!agency) {
    return <div className="flex justify-center items-center min-h-screen">Агентство не найдено</div>
  }

  const LogoComponent = () => {
    const logoSrc = agency.logo_url || "/abstract-agency-logo.png"

    if (logoSrc.startsWith("data:image")) {
      // Base64 изображение - используем обычный img
      return (
        <img
          src={logoSrc || "/placeholder.svg"}
          alt={agency.name}
          className="w-full h-full object-cover"
          onError={(e) => {
            const target = e.target as HTMLImageElement
            target.src = "/abstract-agency-logo.png"
          }}
        />
      )
    } else {
      // URL изображение - используем Next.js Image с fallback
      return (
        <Image
          src={logoSrc || "/placeholder.svg"}
          alt={agency.name}
          width={96}
          height={96}
          className="w-full h-full object-cover"
          onError={(e) => {
            const target = e.target as HTMLImageElement
            target.src = "/abstract-agency-logo.png"
          }}
        />
      )
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="container mx-auto px-4 py-8">
        <Button variant="ghost" onClick={() => router.back()} className="mb-6 text-white hover:bg-white/10">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Назад
        </Button>

        <Card className="max-w-4xl mx-auto bg-white/10 backdrop-blur-md border-white/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-2xl text-white">Модерация агентства</CardTitle>
              <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-300 border-yellow-500/30">
                На модерации
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="flex items-start gap-6">
              <div className="w-24 h-24 rounded-lg overflow-hidden bg-white/10 flex items-center justify-center">
                <LogoComponent />
              </div>

              <div className="flex-1">
                <h1 className="text-3xl font-bold text-white mb-2">{agency.name}</h1>

                <div className="flex items-center gap-4 text-gray-300 mb-4">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4" />
                    <span>{agency.type}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    <span>{agency.country}</span>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-white mb-3">Описание</h3>
              <p className="text-gray-300 leading-relaxed">{agency.description}</p>
            </div>

            <div className="text-sm text-gray-400">
              Подано: {new Date(agency.created_at).toLocaleDateString("ru-RU")}
            </div>

            {!showRejectForm ? (
              <div className="flex gap-4 pt-6">
                <Button
                  onClick={handleApprove}
                  disabled={moderating}
                  className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-semibold px-6 py-2 shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  <Check className="w-4 h-4 mr-2" />
                  {moderating ? "Обработка..." : "Принять"}
                </Button>

                <Button
                  onClick={() => setShowRejectForm(true)}
                  disabled={moderating}
                  className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-semibold px-6 py-2 shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  <X className="w-4 h-4 mr-2" />
                  Отклонить
                </Button>
              </div>
            ) : (
              <div className="space-y-4 pt-6">
                <div>
                  <label className="block text-sm font-medium text-white mb-2">Причина отклонения</label>
                  <Textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Укажите причину отклонения заявки..."
                    className="bg-white/10 border-white/20 text-white placeholder:text-gray-400 focus:border-white/40 focus:ring-white/20"
                    rows={3}
                  />
                </div>

                <div className="flex gap-4">
                  <Button
                    onClick={handleReject}
                    disabled={moderating || !rejectReason.trim()}
                    className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-semibold px-6 py-2 shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50"
                  >
                    <X className="w-4 h-4 mr-2" />
                    {moderating ? "Отклонение..." : "Отклонить с причиной"}
                  </Button>

                  <Button
                    onClick={() => {
                      setShowRejectForm(false)
                      setRejectReason("")
                    }}
                    variant="ghost"
                    className="text-white hover:bg-white/10 border border-white/20 hover:border-white/30 transition-all duration-200"
                  >
                    Отмена
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
