"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  Bell,
  Shield,
  MessageSquare,
  Building2,
  CreditCard,
  CheckCircle,
  Clock,
  X,
  Settings,
  AlertCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/lib/auth-context"

export default function ProfilePage() {
  const { user, isAuthenticated } = useAuth()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("overview")
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [showToast, setShowToast] = useState(false)

  const [userAgencies, setUserAgencies] = useState([])
  const [userReviews, setUserReviews] = useState([])
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [unreadCount, setUnreadCount] = useState(0)
  const [dataLoaded, setDataLoaded] = useState(false)

  useEffect(() => {
    if (isAuthenticated && user && !dataLoaded) {
      loadUserData()
      setDataLoaded(true)
    }
  }, [isAuthenticated, user, dataLoaded])

  const loadUserData = async () => {
    try {
      setLoading(true)

      const [agenciesResult, reviewsResult, notificationsResult] = await Promise.allSettled([
        fetch(`/api/agencies?submitted_by=${user.telegram_id}`).then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`)
          return res.json()
        }),
        fetch(`/api/reviews?userId=${user.telegram_id}`).then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`)
          return res.json()
        }),
        fetch(`/api/notifications?user_id=${user.telegram_id}`).then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`)
          return res.json()
        }),
      ])

      if (agenciesResult.status === "fulfilled") {
        const approvedAgencies = agenciesResult.value.filter((agency) => agency.status === "approved")
        setUserAgencies(approvedAgencies)
      } else {
        console.error("Ошибка загрузки агентств:", agenciesResult.reason)
        setUserAgencies([])
      }

      if (reviewsResult.status === "fulfilled") {
        setUserReviews(reviewsResult.value)
      } else {
        console.error("Ошибка загрузки отзывов:", reviewsResult.reason)
        setUserReviews([])
      }

      if (notificationsResult.status === "fulfilled") {
        const uniqueNotifications = notificationsResult.value.filter(
          (notification, index, self) =>
            index ===
            self.findIndex(
              (n) =>
                n.type === notification.type &&
                n.related_id === notification.related_id &&
                n.title === notification.title,
            ),
        )
        setNotifications(uniqueNotifications)
        setUnreadCount(uniqueNotifications.filter((n) => !n.is_read).length)
      } else {
        console.error("Ошибка загрузки уведомлений:", notificationsResult.reason)
        setNotifications([])
        setUnreadCount(0)
      }
    } catch (error) {
      console.error("Ошибка загрузки данных:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleNotificationClick = async (notification) => {
    console.log("Клик по уведомлению:", notification.title)

    if (!notification.is_read) {
      try {
        await fetch(`/api/notifications/${notification.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ is_read: true }),
        })

        setNotifications((prev) => prev.map((n) => (n.id === notification.id ? { ...n, is_read: true } : n)))
        setUnreadCount((prev) => Math.max(0, prev - 1))
      } catch (error) {
        console.error("Ошибка обновления уведомления:", error)
      }
    }

    if (
      notification.type === "review_approved" ||
      (typeof notification.title === "string" && notification.title.includes("одобрен"))
    ) {
      console.log("Обработка уведомления об одобренном отзыве")

      if (notification.related_id) {
        const url = `/agency/${notification.related_id}?user_id=${user.telegram_id}`
        console.log("URL для перехода к агентству с одобренным отзывом:", url)
        router.push(url)
        return
      } else {
        alert("🎉 Поздравляем! Ваш отзыв был одобрен и опубликован в каталоге.")
        return
      }
    }

    if (notification.related_id && (notification.type === "agency_submitted" || notification.type === "new_agency")) {
      const url = `/moderate/agency/${notification.related_id}`
      console.log("URL для перехода на модерацию агентства:", url)
      router.push(url)
    } else if (
      notification.related_id &&
      (notification.type === "review_submitted" || notification.type === "new_review")
    ) {
      const url = `/moderate/review/${notification.related_id}`
      console.log("URL для перехода к модерации отзыва:", url)
      router.push(url)
    } else if (notification.related_id) {
      const url = `/agency/${notification.related_id}?user_id=${user.telegram_id}`
      console.log("URL для перехода к агентству:", url)
      router.push(url)
    } else {
      console.log("Нет related_id, переходим в админку")
      router.push("/admin")
    }
  }

  const handleAgencyClick = (agencyId: number) => {
    router.push(`/agency/${agencyId}`)
  }

  const showPaymentToast = () => {
    setShowToast(true)
    setShowPaymentModal(false)
    setTimeout(() => setShowToast(false), 5000) // автоматически скрыть через 5 секунд
  }

  const Toast = () => (
    <div
      className={`fixed top-4 right-4 z-50 transform transition-all duration-500 ${
        showToast ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"
      }`}
    >
      <Card className="glass-card border-orange-400/30 bg-gradient-to-r from-orange-500/10 to-red-500/10 max-w-sm">
        <div className="p-4">
          <div className="flex items-start space-x-3">
            <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center flex-shrink-0">
              <AlertCircle className="w-5 h-5 text-orange-400" />
            </div>
            <div className="flex-1">
              <h4 className="text-white font-semibold mb-1">Функция в разработке</h4>
              <p className="text-gray-300 text-sm mb-3">
                Оплата пока недоступна. Свяжитесь с нами в Telegram для оформления услуги.
              </p>
              <Button
                onClick={() => {
                  window.open("https://t.me/avvangarbo", "_blank")
                  setShowToast(false)
                }}
                size="sm"
                className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white border-0 text-xs"
              >
                <MessageSquare className="w-3 h-3 mr-1" />
                Написать в Telegram
              </Button>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowToast(false)}
              className="text-gray-400 hover:text-white p-1 h-auto"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )

  const PaymentModal = () => (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <Card className="glass-card border-white/10 max-w-md w-full mx-4">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-white neon-text">Юридическая проверка</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowPaymentModal(false)}
              className="text-gray-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          <div className="space-y-4 mb-6">
            <div className="text-center">
              <Shield className="w-16 h-16 mx-auto mb-4 text-emerald-400" />
              <h4 className="text-lg font-semibold text-white mb-2">Премиум проверка</h4>
              <p className="text-gray-300 text-sm">
                Получите официальную юридическую проверку вашего агентства и повысьте доверие клиентов
              </p>
            </div>

            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
              <div className="flex items-center justify-between mb-2">
                <span className="text-white">Стоимость:</span>
                <span className="text-2xl font-bold text-emerald-400">5000 ₽</span>
              </div>
              <p className="text-gray-400 text-sm">в месяц (~25-50 USD)</p>
            </div>

            <div className="space-y-2 text-sm text-gray-300">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <span>Проверка документов компании</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <span>Верификация контактных данных</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <span>Специальный бейдж в каталоге</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <span>Приоритет в поисковой выдаче</span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <Button
              onClick={() => {
                window.open("https://t.me/avvangarbo", "_blank")
                setShowPaymentModal(false)
              }}
              className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white border-0 neon-glow smooth-transition"
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              Связаться в Telegram
            </Button>
            <Button
              onClick={showPaymentToast}
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white border-0 neon-glow smooth-transition"
            >
              <CreditCard className="w-4 h-4 mr-2" />
              Оплатить картой
            </Button>
            <Button
              onClick={showPaymentToast}
              variant="outline"
              className="w-full border-white/20 text-white hover:bg-white/10 smooth-transition bg-transparent"
            >
              Оплатить через СБП
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass-card rounded-2xl p-8 text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Требуется авторизация</h2>
          <p className="text-gray-300 mb-6">Для доступа к личному кабинету необходимо войти в систему</p>
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
          <div className="animate-spin w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-white">Загрузка данных...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <header className="glass-card sticky top-0 z-40 border-b border-white/10">
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
            <span className="text-gray-400">Личный кабинет</span>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        <Card className="glass-card border-white/10 mb-8">
          <div className="p-8">
            <div className="flex items-center space-x-6">
              <div className="relative">
                <img
                  src={user.photoUrl || "/generic-user-avatar.png"}
                  alt={user.firstName}
                  className="w-20 h-20 rounded-full border-2 border-emerald-400/50 shadow-lg"
                />
                {user.isAdmin && (
                  <div className="absolute -top-1 -right-1 w-6 h-6 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full border-2 border-white/20 shadow-lg flex items-center justify-center">
                    <span className="text-xs font-bold text-white">★</span>
                  </div>
                )}
              </div>
              <div>
                <h2 className="text-3xl font-bold text-white mb-2 neon-text">
                  {user.firstName} {user.lastName}
                </h2>
                <p className="text-gray-400">@{user.username}</p>
                <div className="flex items-center space-x-4 mt-3">
                  <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-400/30">
                    {user.isAdmin ? "Администратор" : "Пользователь"}
                  </Badge>
                  <Badge className="bg-blue-500/20 text-blue-400 border-blue-400/30">ID: {user.id}</Badge>
                </div>
              </div>
            </div>
          </div>
        </Card>

        <div className="flex flex-wrap gap-1 mb-8 glass-card rounded-xl p-1 border-white/10 w-fit">
          {[
            { id: "overview", label: "Обзор", icon: Building2 },
            { id: "agencies", label: "Мои агентства", icon: Building2 },
            { id: "reviews", label: "Мои отзывы", icon: MessageSquare },
            { id: "notifications", label: "Уведомления", icon: Bell, badge: unreadCount > 0 ? unreadCount : null },
            ...(user.isAdmin ? [{ id: "moderation", label: "Модерация", icon: Settings }] : []),
          ].map((tab) => (
            <Button
              key={tab.id}
              variant={activeTab === tab.id ? "default" : "ghost"}
              onClick={() => setActiveTab(tab.id)}
              className={`relative ${
                activeTab === tab.id
                  ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white neon-glow"
                  : "text-gray-400 hover:text-white hover:bg-white/10"
              } smooth-transition`}
            >
              <tab.icon className="w-4 h-4 mr-2" />
              {tab.label}
              {tab.badge && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  {tab.badge}
                </span>
              )}
            </Button>
          ))}
        </div>

        {activeTab === "overview" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="glass-card border-white/10">
              <div className="p-6">
                <div className="flex items-center space-x-4 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">Агентства</h3>
                    <p className="text-gray-400 text-sm">Добавленные вами</p>
                  </div>
                </div>
                <p className="text-3xl font-bold text-emerald-400 mb-2">{userAgencies.length}</p>
                <p className="text-gray-400 text-sm">{userAgencies.length} одобрено</p>
              </div>
            </Card>

            <Card className="glass-card border-white/10">
              <div className="p-6">
                <div className="flex items-center space-x-4 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-teal-500/20 flex items-center justify-center">
                    <MessageSquare className="w-6 h-6 text-teal-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">Отзывы</h3>
                    <p className="text-gray-400 text-sm">Оставленные вами</p>
                  </div>
                </div>
                <p className="text-3xl font-bold text-teal-400 mb-2">{userReviews.length}</p>
                <p className="text-gray-400 text-sm">
                  {userReviews.length > 0
                    ? `Средняя оценка: ${(userReviews.reduce((acc, r) => acc + r.rating, 0) / userReviews.length).toFixed(1)}`
                    : "Отзывов пока нет"}
                </p>
              </div>
            </Card>

            <Card className="glass-card border-white/10">
              <div className="p-6">
                <div className="flex items-center space-x-4 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
                    <Shield className="w-6 h-6 text-purple-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">Проверка</h3>
                    <p className="text-gray-400 text-sm">Юридическая</p>
                  </div>
                </div>
                <Button
                  onClick={() => setShowPaymentModal(true)}
                  className="w-full bg-gradient-to-r from-purple-500/20 to-pink-500/20 hover:from-purple-500 hover:to-pink-500 text-purple-400 hover:text-white border border-purple-400/30 hover:border-transparent smooth-transition"
                >
                  Заказать проверку
                </Button>
              </div>
            </Card>
          </div>
        )}

        {activeTab === "agencies" && (
          <div className="space-y-4">
            {userAgencies.length === 0 ? (
              <Card className="glass-card border-white/10">
                <div className="p-8 text-center">
                  <Building2 className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-xl font-bold text-white mb-2">Нет одобренных агентств</h3>
                  <p className="text-gray-400 mb-4">У вас нет одобренных агентств в каталоге</p>
                  <p className="text-gray-500 text-sm mb-6">
                    Агентства появятся здесь после одобрения администратором. Проверьте уведомления для отслеживания
                    статуса заявок.
                  </p>
                  <Button
                    onClick={() => router.push("/add-agency")}
                    className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600"
                  >
                    Добавить агентство
                  </Button>
                </div>
              </Card>
            ) : (
              userAgencies.map((agency) => (
                <div
                  key={agency.id}
                  onClick={() => handleAgencyClick(agency.id)}
                  className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-6 hover:bg-white/20 transition-all cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-400/20 to-teal-400/20 flex items-center justify-center border border-white/10">
                        <Building2 className="w-6 h-6 text-emerald-400" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-white">{agency.name}</h3>
                        <p className="text-gray-400 text-sm">
                          Одобрено: {new Date(agency.created_at).toLocaleDateString("ru-RU")}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-400/30">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Активно
                      </Badge>
                      <span className="text-gray-400 text-sm">{agency.reviews_count || 0} отзывов</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === "reviews" && (
          <div className="space-y-4">
            {userReviews.length === 0 ? (
              <Card className="glass-card border-white/10">
                <div className="p-8 text-center">
                  <MessageSquare className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-xl font-bold text-white mb-2">Нет отзывов</h3>
                  <p className="text-gray-400">Вы еще не оставили ни одного отзыва</p>
                </div>
              </Card>
            ) : (
              userReviews.map((review) => (
                <Card key={review.id} className="glass-card border-white/10">
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-bold text-white">{review.agency_name}</h3>
                        <p className="text-gray-400 text-sm">
                          {new Date(review.created_at).toLocaleDateString("ru-RU")}
                        </p>
                      </div>
                      <div className="flex items-center space-x-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <div
                            key={star}
                            className={`w-4 h-4 ${star <= review.rating ? "text-yellow-400" : "text-gray-600"}`}
                          >
                            ★
                          </div>
                        ))}
                      </div>
                    </div>
                    <p className="text-gray-300">{review.comment}</p>
                    {review.status === "pending" && (
                      <Badge className="mt-2 bg-yellow-500/20 text-yellow-400 border-yellow-400/30">
                        <Clock className="w-3 h-3 mr-1" />
                        На модерации
                      </Badge>
                    )}
                  </div>
                </Card>
              ))
            )}
          </div>
        )}

        {activeTab === "notifications" && (
          <div className="space-y-4">
            {notifications.length === 0 ? (
              <Card className="glass-card border-white/10">
                <div className="p-8 text-center">
                  <Bell className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-xl font-bold text-white mb-2">Нет уведомлений</h3>
                  <p className="text-gray-400">У вас пока нет уведомлений</p>
                </div>
              </Card>
            ) : (
              notifications.map((notification) => (
                <Card
                  key={notification.id}
                  className={`glass-card border-white/10 cursor-pointer hover:border-emerald-400/30 smooth-transition ${
                    !notification.is_read ? "border-emerald-400/30 bg-emerald-500/5" : ""
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="p-6">
                    <div className="flex items-start space-x-4">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          notification.type === "agency_approved"
                            ? "bg-emerald-500/20 text-emerald-400"
                            : notification.type === "agency_submitted"
                              ? "bg-blue-500/20 text-blue-400"
                              : notification.type === "new_review"
                                ? "bg-purple-500/20 text-purple-400"
                                : "bg-gray-500/20 text-gray-400"
                        }`}
                      >
                        {notification.type === "agency_approved" ? (
                          <CheckCircle className="w-5 h-5" />
                        ) : notification.type === "agency_submitted" ? (
                          <Building2 className="w-5 h-5" />
                        ) : (
                          <MessageSquare className="w-5 h-5" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <h3 className="text-white font-semibold">{notification.title}</h3>
                          {!notification.is_read && <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>}
                        </div>
                        <p className="text-gray-300 text-sm mb-2">{notification.message}</p>
                        <p className="text-gray-400 text-xs">
                          {new Date(notification.created_at).toLocaleDateString("ru-RU")}
                        </p>
                      </div>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        )}

        {activeTab === "moderation" && user.isAdmin && (
          <Card className="glass-card border-white/10">
            <div className="p-8 text-center">
              <Settings className="w-16 h-16 mx-auto mb-6 text-purple-400" />
              <h3 className="text-2xl font-bold text-white mb-4 neon-text">Панель модерации</h3>
              <p className="text-gray-300 mb-6">Управляйте заявками на добавление агентств и отзывов в каталог</p>
              <Button
                onClick={() => router.push("/admin")}
                className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white border-0 neon-glow smooth-transition"
              >
                Перейти к модерации
              </Button>
            </div>
          </Card>
        )}
      </div>

      {showPaymentModal && <PaymentModal />}
      {showToast && <Toast />}
    </div>
  )
}
