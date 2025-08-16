"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { useAuth } from "@/context/AuthContext"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, XCircle, Star, ArrowLeft } from "lucide-react"

export default function ModerateReviewPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const [review, setReview] = useState<any>(null)
  const [agency, setAgency] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [moderating, setModerating] = useState(false)
  const [rejectionReason, setRejectionReason] = useState("")
  const [showRejectionForm, setShowRejectionForm] = useState(false)

  useEffect(() => {
    if (!user?.is_admin) {
      router.push("/")
      return
    }

    loadReviewData()
  }, [user])

  const loadReviewData = async () => {
    try {
      const response = await fetch(`/api/reviews/${params.id}?user_id=${user?.telegram_id}`)
      if (response.ok) {
        const data = await response.json()
        setReview(data.review)
        setAgency(data.agency)
      }
    } catch (error) {
      console.error("Ошибка загрузки отзыва:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleModeration = async (action: "approve" | "reject") => {
    setModerating(true)
    try {
      const response = await fetch(`/api/reviews/${params.id}/moderate`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          reason: action === "reject" ? rejectionReason : undefined,
        }),
      })

      if (response.ok) {
        router.push("/profile")
      }
    } catch (error) {
      console.error("Ошибка модерации:", error)
    } finally {
      setModerating(false)
    }
  }

  if (!user?.is_admin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <h2 className="text-xl font-bold mb-4">Доступ запрещен</h2>
            <p className="text-gray-600 mb-4">У вас нет прав администратора для доступа к этой странице</p>
            <Button onClick={() => router.push("/")} variant="outline">
              Вернуться на главную
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-white text-xl">Загрузка...</div>
      </div>
    )
  }

  if (!review) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <h2 className="text-xl font-bold mb-4">Отзыв не найден</h2>
            <Button onClick={() => router.push("/profile")} variant="outline">
              Вернуться к уведомлениям
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4">
      <div className="max-w-4xl mx-auto">
        <Button onClick={() => router.push("/profile")} variant="ghost" className="text-white hover:bg-white/10 mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Назад к уведомлениям
        </Button>

        <Card className="bg-white/10 backdrop-blur-md border-white/20">
          <CardHeader>
            <CardTitle className="text-white text-2xl">Модерация отзыва</CardTitle>
            <Badge variant="secondary" className="w-fit">
              Агентство: {agency?.name}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <h3 className="text-white font-semibold mb-2">Автор отзыва</h3>
                  <p className="text-gray-300">
                    {review.first_name} {review.last_name}
                  </p>
                  <p className="text-gray-400 text-sm">{review.country}</p>
                </div>

                <div>
                  <h3 className="text-white font-semibold mb-2">Рейтинг</h3>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`h-5 w-5 ${
                          star <= review.rating ? "text-yellow-400 fill-yellow-400" : "text-gray-400"
                        }`}
                      />
                    ))}
                    <span className="text-white ml-2">{review.rating}/5</span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-white font-semibold mb-2">Комментарий</h3>
                <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                  <p className="text-gray-300">{review.comment}</p>
                </div>
              </div>
            </div>

            {!showRejectionForm ? (
              <div className="flex gap-4 pt-6">
                <Button
                  onClick={() => handleModeration("approve")}
                  disabled={moderating}
                  className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Принять отзыв
                </Button>
                <Button
                  onClick={() => setShowRejectionForm(true)}
                  disabled={moderating}
                  variant="destructive"
                  className="flex-1 bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Отклонить отзыв
                </Button>
              </div>
            ) : (
              <div className="space-y-4 pt-6">
                <div>
                  <label className="text-white font-semibold mb-2 block">Причина отклонения</label>
                  <Textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Укажите причину отклонения отзыва..."
                    className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                  />
                </div>
                <div className="flex gap-4">
                  <Button
                    onClick={() => handleModeration("reject")}
                    disabled={moderating}
                    variant="destructive"
                    className="flex-1"
                  >
                    Отклонить с причиной
                  </Button>
                  <Button onClick={() => setShowRejectionForm(false)} variant="outline" className="flex-1">
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
