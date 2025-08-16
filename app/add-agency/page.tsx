"use client";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Upload, X, Building2, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAuth } from "@/lib/auth-context"

const agencyCategories = [
  // Логистика и доставка
  "Почтовые и курьерские службы",
  "Международная доставка",
  "Карго-компании",
  "Складские и грузоперевозочные компании",

  // Юриспруденция
  "Адвокатские бюро",
  "Нотариальные конторы",
  "Юридические консультации",
  "Бухгалтерские и налоговые услуги",
  "Регистрация и сопровождение бизнеса",

  // Медицина и здоровье
  "Медицинские клиники",
  "Стоматологии",
  "Лаборатории и диагностика",
  "Аптеки",
  "Центры реабилитации и санатории",
  "Психологические и психиатрические услуги",

  // Работа и трудоустройство
  "Рекрутинговые агентства",
  "Агентства по трудоустройству за рубежом",
  "Биржи труда",
  "HR-консалтинг",

  // Туризм и путешествия
  "Туристические агентства",
  "Отели, хостелы, гостевые дома",
  "Авиакомпании",
  "Автобусные перевозчики",
  "Компании по аренде авто",

  // Образование
  "Университеты и колледжи",
  "Курсы и тренинги",
  "Языковые школы",
  "Онлайн-образование",

  // Консалтинг
  "Бизнес-консалтинг",
  "Финансовый консалтинг",
  "IT-консалтинг",

  // IT и цифровые услуги
  "Маркетинговые агентства",
  "Веб-студии",
  "Разработка мобильных приложений",
  "SEO/SMM агентства",
  "Хостинг-провайдеры",
  "Платёжные системы",

  // Недвижимость
  "Агентства недвижимости",
  "Строительные компании",
  "Управляющие компании ЖК",
  "Ремонт и дизайн интерьеров",

  // Красота и стиль
  "Салоны красоты",
  "Барбершопы",
  "СПА и массажные салоны",
  "Клининг лица и тела",

  // Торговля и магазины
  "Продуктовые магазины",
  "Супермаркеты и гипермаркеты",
  "Интернет-магазины",
  "Магазины техники и электроники",
  "Одежда и обувь",

  // Авто
  "Автосалоны",
  "СТО",
  "Автошколы",
  "Аренда автомобилей",

  // Развлечения
  "Рестораны, кафе, бары",
  "Кинотеатры",
  "Ночные клубы",
  "Организация мероприятий",

  // Финансы
  "Банки",
  "МФО (микрофинансовые организации)",
  "Страховые компании",
  "Инвестиционные фонды",
]

const countries = [
  // Европейские страны
  "Россия",
  "Германия",
  "Великобритания",
  "Франция",
  "Италия",
  "Испания",
  "Нидерланды",
  "Швеция",
  "Дания",
  "Норвегия",
  "Финляндия",
  "Швейцария",
  "Австрия",
  "Бельгия",
  "Польша",
  "Чехия",
  "Венгрия",
  "Португалия",
  "Греция",
  "Ирландия",
  "Словакия",
  "Словения",
  "Хорватия",
  "Болгария",
  "Румыния",
  "Литва",
  "Латвия",
  "Эстония",

  // Среднеазиатские страны
  "Казахстан",
  "Узбекистан",
  "Киргизия",
  "Таджикистан",
  "Туркменистан",
  "Азербайджан",
  "Армения",
  "Грузия",
  "Беларусь",
  "Украина",
  "Молдова",

  // Американские страны
  "США",
  "Канада",
  "Мексика",
  "Бразилия",
  "Аргентина",
  "Чили",
  "Колумбия",
  "Перу",
  "Венесуэла",
  "Эквадор",
  "Уругвай",
  "Парагвай",
  "Боливия",
]

export default function AddAgencyPage() {
  const router = useRouter()
  const { isAuthenticated, user } = useAuth()
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [uploadedLogo, setUploadedLogo] = useState<string | null>(null)
  const [logoUrl, setLogoUrl] = useState<string | null>(null) // добавил отдельное состояние для URL
  const [uploadingLogo, setUploadingLogo] = useState(false) // добавил состояние загрузки
  const [formData, setFormData] = useState({
    name: "",
    type: "",
    country: "",
    website: "",
    shortDescription: "",
    fullDescription: "",
    contactEmail: "",
    contactPhone: "",
  })

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0])
    }
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0])
    }
  }

  const handleFile = async (file: File) => {
    if (file.type.startsWith("image/")) {
      setUploadingLogo(true)

      try {
        const reader = new FileReader()
        reader.onload = (e) => {
          const base64 = e.target?.result as string
          setUploadedLogo(base64)
          setLogoUrl(base64) // используем base64 как URL
          setUploadingLogo(false)
        }
        reader.readAsDataURL(file)
      } catch (error) {
        console.error("Ошибка загрузки:", error)
        alert("Ошибка загрузки логотипа")
        setUploadingLogo(false)
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isAuthenticated) {
      alert("Для добавления агентства необходимо авторизоваться")
      return
    }

    if (isSubmitting) {
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch("/api/agencies", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          logoUrl: logoUrl,
          submittedBy: user?.telegram_id,
        }),
      })

      if (!response.ok) {
        throw new Error("Ошибка отправки заявки")
      }

      const result = await response.json()
      console.log("Заявка отправлена:", result)

      setIsSubmitted(true)
    } catch (error) {
      console.error("Ошибка отправки заявки:", error)
      alert("Ошибка отправки заявки. Попробуйте еще раз.")
      setIsSubmitting(false) // Сбрасываем состояние только при ошибке
    }
  }

  if (isSubmitted) {
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
                Вернуться к каталогу
              </Button>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-400 via-teal-400 to-purple-400 bg-clip-text text-transparent neon-text">
                ZENTO
              </h1>
            </div>
          </div>
        </header>

        <div className="container mx-auto px-6 py-16">
          <div className="max-w-2xl mx-auto text-center">
            <div className="glass-card rounded-2xl p-12">
              <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-emerald-400/20 to-teal-400/20 flex items-center justify-center border border-emerald-400/30 pulse-glow">
                <CheckCircle className="w-12 h-12 text-emerald-400" />
              </div>
              <h2 className="text-3xl font-bold text-white mb-4 neon-text">Заявка отправлена!</h2>
              <p className="text-gray-300 text-lg mb-6">
                Ваша заявка на добавление агентства отправлена на модерацию. Мы рассмотрим её в течение 24-48 часов и
                уведомим вас о результате.
              </p>
              <div className="space-y-4">
                <Button
                  onClick={() => router.push("/")}
                  className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white border-0 neon-glow smooth-transition"
                >
                  Вернуться к каталогу
                </Button>
                <Button
                  onClick={() => {
                    setIsSubmitted(false)
                    setFormData({
                      name: "",
                      type: "",
                      country: "",
                      website: "",
                      shortDescription: "",
                      fullDescription: "",
                      contactEmail: "",
                      contactPhone: "",
                    })
                    setUploadedLogo(null)
                    setLogoUrl(null) // очищаем URL при удалении
                  }}
                  variant="outline"
                  className="w-full border-white/20 text-white hover:bg-white/10 smooth-transition bg-transparent"
                >
                  Добавить ещё одно агентство
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
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
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-4xl font-bold text-white mb-4 neon-text">Добавить агентство</h2>
            <p className="text-gray-300 text-lg">Расскажите о своем агентстве и станьте частью каталога будущего</p>
          </div>

          {!isAuthenticated ? (
            <Card className="glass-card border-white/10">
              <div className="p-12 text-center">
                <Building2 className="w-16 h-16 mx-auto mb-6 text-purple-400 opacity-50" />
                <h3 className="text-2xl font-bold text-white mb-4">Требуется авторизация</h3>
                <p className="text-gray-300 mb-6">
                  Для добавления агентства в каталог необходимо авторизоваться через Telegram
                </p>
                <Button className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white border-0 neon-glow smooth-transition">
                  Войти через Telegram
                </Button>
              </div>
            </Card>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="space-y-8">
                {/* Logo Upload */}
                <Card className="glass-card border-white/10">
                  <div className="p-8">
                    <h3 className="text-2xl font-bold text-white mb-6 neon-text">Логотип агентства</h3>
                    <div
                      className={`relative border-2 border-dashed rounded-2xl p-8 text-center smooth-transition ${
                        dragActive
                          ? "border-emerald-400 bg-emerald-400/10"
                          : "border-white/20 hover:border-emerald-400/50"
                      }`}
                      onDragEnter={handleDrag}
                      onDragLeave={handleDrag}
                      onDragOver={handleDrag}
                      onDrop={handleDrop}
                    >
                      {uploadedLogo ? (
                        <div className="relative">
                          <img
                            src={uploadedLogo || "/placeholder.svg"}
                            alt="Uploaded logo"
                            className="w-32 h-32 mx-auto rounded-2xl object-cover border border-white/10"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setUploadedLogo(null)
                              setLogoUrl(null) // очищаем URL при удалении
                            }}
                            className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-red-500 hover:bg-red-600 text-white p-0"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : (
                        <div>
                          {uploadingLogo ? ( // показываем состояние загрузки
                            <div className="flex flex-col items-center">
                              <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin mb-4"></div>
                              <p className="text-emerald-400">Загружаем логотип...</p>
                            </div>
                          ) : (
                            <>
                              <Upload className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                              <p className="text-white font-medium mb-2">Перетащите логотип сюда</p>
                              <p className="text-gray-400 text-sm mb-4">или нажмите для выбора файла</p>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={handleFileInput}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                disabled={uploadingLogo} // блокируем во время загрузки
                              />
                              <Button
                                type="button"
                                disabled={uploadingLogo} // блокируем во время загрузки
                                className="bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-emerald-400 border border-emerald-400/30 hover:bg-gradient-to-r hover:from-emerald-500 hover:to-teal-500 hover:text-white smooth-transition"
                              >
                                Выбрать файл
                              </Button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </Card>

                {/* Basic Information */}
                <Card className="glass-card border-white/10">
                  <div className="p-8">
                    <h3 className="text-2xl font-bold text-white mb-6 neon-text">Основная информация</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <Label htmlFor="name" className="text-white mb-2 block">
                          Название агентства *
                        </Label>
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className="bg-white/5 border-white/10 text-white placeholder-gray-400 focus:border-emerald-400"
                          placeholder="Введите название агентства"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="website" className="text-white mb-2 block">
                          Веб-сайт
                        </Label>
                        <Input
                          id="website"
                          type="url"
                          value={formData.website}
                          onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                          className="bg-white/5 border-white/10 text-white placeholder-gray-400 focus:border-emerald-400"
                          placeholder="https://example.com"
                        />
                      </div>
                      <div>
                        <Label htmlFor="type" className="text-white mb-2 block">
                          Сфера деятельности *
                        </Label>
                        <Select
                          value={formData.type}
                          onValueChange={(value) => setFormData({ ...formData, type: value })}
                        >
                          <SelectTrigger className="bg-white/5 border-white/10 text-white focus:border-emerald-400">
                            <SelectValue placeholder="Выберите сферу деятельности" />
                          </SelectTrigger>
                          <SelectContent className="bg-gray-900 border-white/10">
                            {agencyCategories.map((category) => (
                              <SelectItem key={category} value={category} className="text-white hover:bg-white/10">
                                {category}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="country" className="text-white mb-2 block">
                          Страна *
                        </Label>
                        <Select
                          value={formData.country}
                          onValueChange={(value) => setFormData({ ...formData, country: value })}
                        >
                          <SelectTrigger className="bg-white/5 border-white/10 text-white focus:border-emerald-400">
                            <SelectValue placeholder="Выберите страну" />
                          </SelectTrigger>
                          <SelectContent className="bg-gray-900 border-white/10">
                            {countries.map((country) => (
                              <SelectItem key={country} value={country} className="text-white hover:bg-white/10">
                                {country}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Description */}
                <Card className="glass-card border-white/10">
                  <div className="p-8">
                    <h3 className="text-2xl font-bold text-white mb-6 neon-text">Описание</h3>
                    <div className="space-y-6">
                      <div>
                        <Label htmlFor="shortDescription" className="text-white mb-2 block">
                          Краткое описание *
                        </Label>
                        <Textarea
                          id="shortDescription"
                          value={formData.shortDescription}
                          onChange={(e) => setFormData({ ...formData, shortDescription: e.target.value })}
                          className="bg-white/5 border-white/10 text-white placeholder-gray-400 focus:border-emerald-400 min-h-[100px]"
                          placeholder="Краткое описание агентства для карточки в каталоге (до 200 символов)"
                          maxLength={200}
                          required
                        />
                        <p className="text-gray-400 text-sm mt-2">{formData.shortDescription.length}/200 символов</p>
                      </div>
                      <div>
                        <Label htmlFor="fullDescription" className="text-white mb-2 block">
                          Подробное описание *
                        </Label>
                        <Textarea
                          id="fullDescription"
                          value={formData.fullDescription}
                          onChange={(e) => setFormData({ ...formData, fullDescription: e.target.value })}
                          className="bg-white/5 border-white/10 text-white placeholder-gray-400 focus:border-emerald-400 min-h-[200px]"
                          placeholder="Подробная информация об агентстве, услугах, команде и достижениях"
                          required
                        />
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Contact Information */}
                <Card className="glass-card border-white/10">
                  <div className="p-8">
                    <h3 className="text-2xl font-bold text-white mb-6 neon-text">Контактная информация</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <Label htmlFor="contactEmail" className="text-white mb-2 block">
                          Email для связи *
                        </Label>
                        <Input
                          id="contactEmail"
                          type="email"
                          value={formData.contactEmail}
                          onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                          className="bg-white/5 border-white/10 text-white placeholder-gray-400 focus:border-emerald-400"
                          placeholder="contact@agency.com"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="contactPhone" className="text-white mb-2 block">
                          Телефон
                        </Label>
                        <Input
                          id="contactPhone"
                          type="tel"
                          value={formData.contactPhone}
                          onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                          className="bg-white/5 border-white/10 text-white placeholder-gray-400 focus:border-emerald-400"
                          placeholder="+7 (999) 123-45-67"
                        />
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Submit */}
                <Card className="glass-card border-white/10">
                  <div className="p-8">
                    <div className="text-center">
                      <p className="text-gray-300 mb-6">
                        После отправки заявка будет рассмотрена модераторами в течение 24-48 часов. Мы уведомим вас о
                        результате по указанному email.
                      </p>
                      <Button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full md:w-auto px-12 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white border-0 neon-glow smooth-transition disabled:opacity-50"
                      >
                        {isSubmitting ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                            Отправляем заявку...
                          </>
                        ) : (
                          "Отправить на модерацию"
                        )}
                      </Button>
                    </div>
                  </div>
                </Card>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
