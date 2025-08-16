"use client";

export const dynamic = "force-dynamic";
export const revalidate = false;
export const fetchCache = "force-no-store";

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, CheckCircle, X, Clock, Building2, Globe, Loader2, MessageSquare } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/lib/auth-context"

interface PendingApplication {
  id: number
  name: string
  type: string
  country: string
  description: string
  logo_url?: string
  status: string
  submitted_by: number
  created_at: string
}

interface PendingReview {
  id: number
  agency_id: number
  user_id: number
  first_name: string
  last_name: string
  country: string
  rating: number
  comment: string
  status: string
  created_at: string
  agency: {
    name: string
  }
}

export default function AdminPage() {
  const { user, isAuthenticated } = useAuth()
  const router = useRouter()
  const [applications, setApplications] = useState<PendingApplication[]>([])
  const [reviews, setReviews] = useState<PendingReview[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedApp, setSelectedApp] = useState<PendingApplication | null>(null)
  const [rejectionReason, setRejectionReason] = useState("")
  const [showRejectionModal, setShowRejectionModal] = useState(false)

  useEffect(() => {
    const loadModerationData = async () => {
      try {
        setLoading(true)

        const [agenciesResponse, reviewsResponse] = await Promise.allSettled([
          fetch("/api/agencies?status=pending"),
          fetch("/api/reviews?status=pending"),
        ])

        if (agenciesResponse.status === "fulfilled" && agenciesResponse.value.ok) {
          const agenciesData = await agenciesResponse.value.json()
          setApplications(agenciesData)
        }

        if (reviewsResponse.status === "fulfilled" && reviewsResponse.value.ok) {
          const reviewsData = await reviewsResponse.value.json()
          setReviews(reviewsData)
        }
      } catch (error) {
        console.error("Ошибка загрузки данных модерации:", error)
      } finally {
        setLoading(false)
      }
    }

    if (isAuthenticated && user?.is_admin) {
      loadModerationData()
    }
  }, [isAuthenticated, user])

  if (!isAuthenticated || !user?.is_admin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass-card rounded-2xl p-8 text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Доступ запрещен</h2>
          <p className="text-gray-300 mb-6">У вас нет прав администратора для доступа к этой странице</p>
          <Button onClick={() => router.push("/")} className="bg-gradient-to-r from-emerald-500 to-teal-500">
            Вернуться на главную
          </Button>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass-card rounded-2xl p-8 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-emerald-400" />
          <p className="text-white">Загрузка данных модерации...</p>
        </div>
      </div>
    )
  }

  const handleApprove = async (appId: number) => {
    try {
      const response = await fetch(`/api/agencies/${appId}/moderate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "approve" }),
      })

      if (response.ok) {
        setApplications((apps) => apps.filter((app) => app.id !== appId))
        alert("Заявка одобрена! Агентство добавлено в каталог.")
      } else {
        alert("Ошибка при одобрении заявки")
      }
    } catch (error) {
      alert("Ошибка при одобрении заявки")
    }
  }

  const handleReject = (app: PendingApplication) => {
    setSelectedApp(app)
    setShowRejectionModal(true)
  }

  const confirmReject = async () => {
    if (selectedApp) {
      try {
        const response = await fetch(`/api/agencies/${selectedApp.id}/moderate`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "reject",
            reason: rejectionReason,
          }),
        })

        if (response.ok) {
          setApplications((apps) => apps.filter((app) => app.id !== selectedApp.id))
          alert(`Заявка отклонена. Причина: ${rejectionReason}`)
        } else {
          alert("Ошибка при отклонении заявки")
        }
      } catch (error) {
        alert("Ошибка при отклонении заявки")
      }

      setShowRejectionModal(false)
      setSelectedApp(null)
      setRejectionReason("")
    }
  }

  const handleApproveReview = async (reviewId: number) => {
    try {
      const response = await fetch(`/api/reviews/${reviewId}/moderate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "approve" }),
      })

      if (response.ok) {
        setReviews((reviews) => reviews.filter((review) => review.id !== reviewId))
        alert("Отзыв одобрен!")
      } else {
        alert("Ошибка при одобрении отзыва")
      }
    } catch (error) {
      alert("Ошибка при одобрении отзыва")
    }
  }

  const handleRejectReview = async (reviewId: number) => {
    try {
      const response = await fetch(`/api/reviews/${reviewId}/moderate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "reject" }),
      })

      if (response.ok) {
        setReviews((reviews) => reviews.filter((review) => review.id !== reviewId))
        alert("Отзыв отклонен")
      } else {
        alert("Ошибка при отклонении отзыва")
      }
    } catch (error) {
      alert("Ошибка при отклонении отзыва")
    }
  }

  const RejectionModal = () => (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <Card className="glass-card border-white/10 max-w-md w-full mx-4">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-white neon-text">Отклонить заявку</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowRejectionModal(false)}
              className="text-gray-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          <div className="space-y-4 mb-6">
            <p className="text-gray-300">
              Вы собираетесь отклонить заявку от агентства "{selectedApp?.name}". Укажите причину отклонения:
            </p>

            <div>
              <Label htmlFor="rejectionReason" className="text-white mb-2 block">
                Причина отклонения *
              </Label>
              <Textarea
                id="rejectionReason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="bg-white/5 border-white/10 text-white placeholder-gray-400 focus:border-red-400 min-h-[100px]"
                placeholder="Укажите причину отклонения заявки..."
                required
              />
            </div>
          </div>

          <div className="flex space-x-3">
            <Button
              onClick={() => setShowRejectionModal(false)}
              variant="outline"
              className="flex-1 border-white/20 text-white hover:bg-white/10 smooth-transition bg-transparent"
            >
              Отмена
            </Button>
            <Button
              onClick={confirmReject}
              disabled={!rejectionReason.trim()}
              className="flex-1 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white border-0 smooth-transition disabled:opacity-50"
            >
              Отклонить
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="glass-card sticky top-0 z-40 border-b border-white/10">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              onClick={() => router.push("/profile")}
              className="text-white hover:bg-white/10 smooth-transition"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Назад в профиль
            </Button>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-400 via-teal-400 to-purple-400 bg-clip-text text-transparent neon-text">
              ZENTO
            </h1>
            <span className="text-gray-400">Панель модерации</span>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="glass-card border-white/10">
            <div className="p-6">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 rounded-xl bg-yellow-500/20 flex items-center justify-center">
                  <Clock className="w-6 h-6 text-yellow-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">На модерации</h3>
                  <p className="text-gray-400 text-sm">Агентства и отзывы</p>
                </div>
              </div>
              <p className="text-3xl font-bold text-yellow-400 mt-4">{applications.length + reviews.length}</p>
            </div>
          </Card>

          <Card className="glass-card border-white/10">
            <div className="p-6">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Агентства</h3>
                  <p className="text-gray-400 text-sm">Ожидают модерации</p>
                </div>
              </div>
              <p className="text-3xl font-bold text-emerald-400 mt-4">{applications.length}</p>
            </div>
          </Card>

          <Card className="glass-card border-white/10">
            <div className="p-6">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
                  <MessageSquare className="w-6 h-6 text-purple-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Отзывы</h3>
                  <p className="text-gray-400 text-sm">Ожидают модерации</p>
                </div>
              </div>
              <p className="text-3xl font-bold text-purple-400 mt-4">{reviews.length}</p>
            </div>
          </Card>
        </div>

        {/* Applications List */}
        <Card className="glass-card border-white/10 mb-8">
          <div className="p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white neon-text">Заявки на добавление агентств</h2>
              <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-400/30">
                {applications.length} заявок
              </Badge>
            </div>

            {applications.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle className="w-16 h-16 mx-auto mb-4 text-emerald-400 opacity-50" />
                <h3 className="text-xl font-semibold text-white mb-2">Нет заявок на модерацию</h3>
                <p className="text-gray-400">На данный момент нет заявок на добавление агентств</p>
              </div>
            ) : (
              <div className="space-y-6">
                {applications.map((app) => (
                  <Card key={app.id} className="glass-card border-white/5">
                    <div className="p-6">
                      <div className="flex items-start space-x-6">
                        {/* Logo */}
                        <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-emerald-400/20 to-teal-400/20 flex items-center justify-center border border-white/10 flex-shrink-0">
                          <img
                            src={app.logo_url || "/placeholder.svg"}
                            alt={app.name}
                            className="w-16 h-16 rounded-lg object-cover"
                          />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between mb-4">
                            <div>
                              <h3 className="text-xl font-bold text-white mb-2">{app.name}</h3>
                              <div className="flex items-center space-x-4 text-sm text-gray-400 mb-2">
                                <div className="flex items-center space-x-1">
                                  <Building2 className="w-4 h-4" />
                                  <span>{app.type}</span>
                                </div>
                                <div className="flex items-center space-x-1">
                                  <Globe className="w-4 h-4" />
                                  <span>{app.country}</span>
                                </div>
                              </div>
                              <p className="text-gray-300 text-sm mb-3 line-clamp-2">{app.description}</p>
                            </div>
                            <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-400/30 flex-shrink-0">
                              <Clock className="w-3 h-3 mr-1" />
                              На модерации
                            </Badge>
                          </div>

                          <div className="text-sm text-gray-400 mb-4">
                            Подано: {new Date(app.created_at).toLocaleDateString("ru-RU")} в{" "}
                            {new Date(app.created_at).toLocaleTimeString("ru-RU", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </div>

                          {/* Actions */}
                          <div className="flex items-center space-x-3">
                            <Button
                              onClick={() => handleApprove(app.id)}
                              className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white border-0 neon-glow smooth-transition"
                            >
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Одобрить
                            </Button>
                            <Button
                              onClick={() => handleReject(app)}
                              variant="outline"
                              className="border-red-400/30 text-red-400 hover:bg-red-500/10 hover:border-red-400 smooth-transition bg-transparent"
                            >
                              <X className="w-4 h-4 mr-2" />
                              Отклонить
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </Card>

        {/* Reviews List */}
        <Card className="glass-card border-white/10">
          <div className="p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white neon-text">Отзывы на модерации</h2>
              <Badge className="bg-purple-500/20 text-purple-400 border-purple-400/30">{reviews.length} отзывов</Badge>
            </div>

            {reviews.length === 0 ? (
              <div className="text-center py-12">
                <MessageSquare className="w-16 h-16 mx-auto mb-4 text-purple-400 opacity-50" />
                <h3 className="text-xl font-semibold text-white mb-2">Нет отзывов на модерации</h3>
                <p className="text-gray-400">На данный момент нет отзывов, ожидающих модерации</p>
              </div>
            ) : (
              <div className="space-y-6">
                {reviews.map((review) => (
                  <Card key={review.id} className="glass-card border-white/5">
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="text-lg font-bold text-white mb-2">
                            Отзыв для агентства "{review.agency.name}"
                          </h3>
                          <div className="flex items-center space-x-4 text-sm text-gray-400 mb-3">
                            <span>
                              {review.first_name} {review.last_name}
                            </span>
                            <span>•</span>
                            <span>{review.country}</span>
                            <span>•</span>
                            <div className="flex items-center space-x-1">
                              {[...Array(5)].map((_, i) => (
                                <div
                                  key={i}
                                  className={`w-3 h-3 rounded-full ${
                                    i < review.rating ? "bg-yellow-400" : "bg-gray-600"
                                  }`}
                                />
                              ))}
                              <span className="ml-2 text-yellow-400">{review.rating}/5</span>
                            </div>
                          </div>
                          <p className="text-gray-300 mb-3">{review.comment}</p>
                          <div className="text-sm text-gray-400">
                            Отправлено: {new Date(review.created_at).toLocaleDateString("ru-RU")} в{" "}
                            {new Date(review.created_at).toLocaleTimeString("ru-RU", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </div>
                        </div>
                        <Badge className="bg-purple-500/20 text-purple-400 border-purple-400/30 flex-shrink-0">
                          <Clock className="w-3 h-3 mr-1" />
                          На модерации
                        </Badge>
                      </div>

                      <div className="flex items-center space-x-3">
                        <Button
                          onClick={() => handleApproveReview(review.id)}
                          className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white border-0 neon-glow smooth-transition"
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Одобрить отзыв
                        </Button>
                        <Button
                          onClick={() => handleRejectReview(review.id)}
                          variant="outline"
                          className="border-red-400/30 text-red-400 hover:bg-red-500/10 hover:border-red-400 smooth-transition bg-transparent"
                        >
                          <X className="w-4 h-4 mr-2" />
                          Отклонить отзыв
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>

      {showRejectionModal && <RejectionModal />}
    </div>
  )
}
