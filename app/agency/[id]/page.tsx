"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, MapPin, Building2, Star, User, Calendar, MessageSquare, Loader2, Check, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/context/AuthContext"

interface Agency {
  id: number
  name: string
  type: string
  country: string
  description: string
  logo_url?: string
  rating: number
  reviews_count: number
  status: string
}

interface Review {
  id: number
  first_name: string
  last_name: string
  country: string
  rating: number
  comment: string
  created_at: string
}

export default function AgencyPage() {
  const params = useParams()
  const router = useRouter()
  const { isAuthenticated, user } = useAuth()
  const [agency, setAgency] = useState<Agency | null>(null)
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reviewForm, setReviewForm] = useState({
    firstName: "",
    lastName: "",
    country: "",
    rating: 5,
    text: "",
  })
  const [reviewSubmitting, setReviewSubmitting] = useState(false)
  const [reviewSubmitted, setReviewSubmitted] = useState(false)
  const [reviewError, setReviewError] = useState<string | null>(null)

  useEffect(() => {
    const loadAgencyData = async () => {
      try {
        setLoading(true)
        setError(null)

        // Загружаем данные агентства
        const agencyResponse = await fetch(`/api/agencies/${params.id}`)
        if (!agencyResponse.ok) {
          throw new Error("Агентство не найдено")
        }
        const agencyData = await agencyResponse.json()
        setAgency(agencyData)

        // Загружаем отзывы для агентства
        const reviewsResponse = await fetch(`/api/reviews?agencyId=${params.id}&status=approved`)
        if (reviewsResponse.ok) {
          const reviewsData = await reviewsResponse.json()
          setReviews(reviewsData)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Ошибка загрузки данных")
      } finally {
        setLoading(false)
      }
    }

    if (params.id) {
      loadAgencyData()
    }
  }, [params.id])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-emerald-400" />
          <p className="text-gray-400">Загрузка агентства...</p>
        </div>
      </div>
    )
  }

  if (error || !agency) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <X className="w-16 h-16 mx-auto mb-4 text-red-400" />
          <h2 className="text-2xl font-bold text-white mb-4">Агентство не найдено</h2>
          <p className="text-gray-400 mb-6">{error || "Агентство с указанным ID не существует"}</p>
          <Button
            onClick={() => router.push("/")}
            className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white border-0"
          >
            Вернуться к каталогу
          </Button>
        </div>
      </div>
    )
  }

  const RatingIndicator = ({ rating, size = "large" }: { rating: number; size?: "small" | "large" }) => {
    const percentage = (rating / 5) * 100
    const width = size === "large" ? "w-32" : "w-20"
    const height = size === "large" ? "h-4" : "h-3"

    return (
      <div className={`relative ${width} ${height} bg-gray-800 rounded-full overflow-hidden`}>
        <div
          className="absolute top-0 left-0 h-full bg-gradient-to-r from-emerald-400 to-teal-400 rounded-full transition-all duration-500 pulse-glow"
          style={{ width: `${percentage}%` }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`${size === "large" ? "text-sm" : "text-xs"} font-bold text-white neon-text`}>{rating}</span>
        </div>
      </div>
    )
  }

  const StarRating = ({
    rating,
    interactive = false,
    onChange,
  }: {
    rating: number
    interactive?: boolean
    onChange?: (rating: number) => void
  }) => {
    return (
      <div className="flex space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-5 h-5 ${
              star <= rating ? "text-yellow-400 fill-yellow-400" : "text-gray-600"
            } ${interactive ? "cursor-pointer hover:text-yellow-300 smooth-transition" : ""}`}
            onClick={() => interactive && onChange && onChange(star)}
          />
        ))}
      </div>
    )
  }

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isAuthenticated || !user) {
      setReviewError("Для добавления отзыва необходимо авторизоваться")
      return
    }

    if (!agency) {
      setReviewError("Ошибка: агентство не найдено")
      return
    }

    setReviewSubmitting(true)
    setReviewError(null)

    try {
      const response = await fetch("/api/reviews", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          agencyId: agency.id,
          userId: user.telegram_id,
          firstName: reviewForm.firstName,
          lastName: reviewForm.lastName,
          country: reviewForm.country,
          rating: reviewForm.rating,
          comment: reviewForm.text,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Ошибка отправки отзыва")
      }

      setReviewSubmitted(true)
      setReviewForm({ firstName: "", lastName: "", country: "", rating: 5, text: "" })
    } catch (error) {
      setReviewError(error instanceof Error ? error.message : "Ошибка при отправке отзыва. Попробуйте еще раз.")
    } finally {
      setReviewSubmitting(false)
    }
  }

  const resetReviewForm = () => {
    setReviewSubmitted(false)
    setReviewError(null)
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="glass-card sticky top-0 z-50 border-b border-white/10">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              onClick={() => router.push("/")}
              className="text-white hover:bg-white/10 smooth-transition"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Назад к каталогу
            </Button>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-400 via-teal-400 to-purple-400 bg-clip-text text-transparent neon-text">
              ZENTO
            </h1>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        {/* Agency Info */}
        <Card className="glass-card border-white/10 mb-8">
          <div className="p-8">
            <div className="flex flex-col md:flex-row items-start space-y-6 md:space-y-0 md:space-x-8">
              {/* Logo */}
              <div className="w-32 h-32 rounded-2xl bg-gradient-to-br from-emerald-400/20 to-teal-400/20 flex items-center justify-center border border-white/10 float-animation">
                <img src={agency.logo_url || "/placeholder.svg"} alt={agency.name} className="w-24 h-24 rounded-xl" />
              </div>

              {/* Info */}
              <div className="flex-1">
                <h1 className="text-4xl font-bold text-white mb-4 neon-text">{agency.name}</h1>

                <div className="flex flex-wrap gap-4 mb-6">
                  <div className="flex items-center space-x-2 text-emerald-400">
                    <Building2 className="w-5 h-5" />
                    <span className="font-medium">{agency.type}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-teal-400">
                    <MapPin className="w-5 h-5" />
                    <span className="font-medium">{agency.country}</span>
                  </div>
                </div>

                <div className="flex items-center space-x-4 mb-6">
                  <span className="text-white font-medium">Рейтинг:</span>
                  <RatingIndicator rating={agency.rating} />
                  <span className="text-gray-400">({agency.reviews_count} отзывов)</span>
                </div>

                <p className="text-gray-300 text-lg leading-relaxed">{agency.description}</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Reviews Section */}
        <Card className="glass-card border-white/10 mb-8">
          <div className="p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white neon-text">Отзывы ({reviews.length})</h2>
            </div>

            {reviews.length === 0 ? (
              <div className="text-center py-8">
                <MessageSquare className="w-16 h-16 mx-auto mb-4 text-gray-600" />
                <p className="text-gray-400">Пока нет отзывов. Будьте первым!</p>
              </div>
            ) : (
              <div className="space-y-6">
                {reviews.map((review) => (
                  <div key={review.id} className="glass-card border-white/5 p-6 rounded-xl">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-400/20 to-pink-400/20 flex items-center justify-center border border-white/10">
                          <User className="w-6 h-6 text-purple-400" />
                        </div>
                        <div>
                          <h4 className="text-white font-semibold">
                            {review.first_name} {review.last_name}
                          </h4>
                          <div className="flex items-center space-x-2 text-sm text-gray-400">
                            <MapPin className="w-4 h-4" />
                            <span>{review.country}</span>
                            <Calendar className="w-4 h-4 ml-2" />
                            <span>{new Date(review.created_at).toLocaleDateString("ru-RU")}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <StarRating rating={review.rating} />
                        <span className="text-yellow-400 font-bold">{review.rating}</span>
                      </div>
                    </div>
                    <p className="text-gray-300 leading-relaxed">{review.comment}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

        {/* Add Review Form */}
        <Card className="glass-card border-white/10">
          <div className="p-8">
            <h2 className="text-2xl font-bold text-white mb-6 neon-text">Добавить отзыв</h2>

            {!isAuthenticated ? (
              <div className="text-center py-8">
                <p className="text-gray-400 mb-4">Для добавления отзыва необходимо авторизоваться</p>
                <Button className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white border-0 neon-glow smooth-transition">
                  Войти через Telegram
                </Button>
              </div>
            ) : reviewSubmitted ? (
              <div className="text-center py-12">
                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 flex items-center justify-center animate-pulse">
                  <Check className="w-10 h-10 text-white animate-bounce" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-4 neon-text">Отзыв отправлен на модерацию!</h3>
                <p className="text-gray-300 mb-8">Ваш отзыв будет опубликован после проверки администратором</p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button
                    onClick={resetReviewForm}
                    className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white border-0 neon-glow smooth-transition"
                  >
                    Добавить еще отзыв
                  </Button>
                  <Button
                    onClick={() => router.push("/")}
                    variant="outline"
                    className="border-white/20 text-white hover:bg-white/10 smooth-transition"
                  >
                    Вернуться к каталогу
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmitReview} className="space-y-6">
                {reviewError && (
                  <div className="flex items-center space-x-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
                    <X className="w-5 h-5 text-red-400" />
                    <p className="text-red-400">{reviewError}</p>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="firstName" className="text-white mb-2 block">
                      Имя
                    </Label>
                    <Input
                      id="firstName"
                      value={reviewForm.firstName}
                      onChange={(e) => setReviewForm({ ...reviewForm, firstName: e.target.value })}
                      className="bg-white/5 border-white/10 text-white placeholder-gray-400 focus:border-emerald-400"
                      disabled={reviewSubmitting}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="lastName" className="text-white mb-2 block">
                      Фамилия
                    </Label>
                    <Input
                      id="lastName"
                      value={reviewForm.lastName}
                      onChange={(e) => setReviewForm({ ...reviewForm, lastName: e.target.value })}
                      className="bg-white/5 border-white/10 text-white placeholder-gray-400 focus:border-emerald-400"
                      disabled={reviewSubmitting}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="country" className="text-white mb-2 block">
                      Страна
                    </Label>
                    <Input
                      id="country"
                      value={reviewForm.country}
                      onChange={(e) => setReviewForm({ ...reviewForm, country: e.target.value })}
                      className="bg-white/5 border-white/10 text-white placeholder-gray-400 focus:border-emerald-400"
                      disabled={reviewSubmitting}
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-white mb-2 block">Рейтинг</Label>
                  <div className="flex items-center space-x-4">
                    <StarRating
                      rating={reviewForm.rating}
                      interactive={!reviewSubmitting}
                      onChange={(rating) => setReviewForm({ ...reviewForm, rating })}
                    />
                    <span className="text-yellow-400 font-bold">{reviewForm.rating}</span>
                  </div>
                </div>

                <div>
                  <Label htmlFor="reviewText" className="text-white mb-2 block">
                    Отзыв
                  </Label>
                  <Textarea
                    id="reviewText"
                    value={reviewForm.text}
                    onChange={(e) => setReviewForm({ ...reviewForm, text: e.target.value })}
                    className="bg-white/5 border-white/10 text-white placeholder-gray-400 focus:border-emerald-400 min-h-[120px]"
                    placeholder="Поделитесь своим опытом работы с агентством..."
                    disabled={reviewSubmitting}
                    required
                  />
                </div>

                <Button
                  type="submit"
                  disabled={reviewSubmitting}
                  className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white border-0 neon-glow smooth-transition disabled:opacity-50"
                >
                  {reviewSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Отправка отзыва...
                    </>
                  ) : (
                    "Отправить отзыв"
                  )}
                </Button>
              </form>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}
