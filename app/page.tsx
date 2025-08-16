"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Search, Filter, Plus, MapPin, Building2, X, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { AuthButton } from "@/components/auth-button"
import { MobileNav } from "@/components/mobile-nav"

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

// Interface for agency data
interface Agency {
  id: number
  name: string
  type: string
  country: string
  description: string
  rating: number
  logo_url?: string
  reviews_count: number
}

export default function HomePage() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")
  const [agencies, setAgencies] = useState<Agency[]>([])
  const [filteredAgencies, setFilteredAgencies] = useState<Agency[]>([])
  const [loading, setLoading] = useState(true)
  const [showFilters, setShowFilters] = useState(false)
  const [selectedType, setSelectedType] = useState("")
  const [selectedCountry, setSelectedCountry] = useState("")
  const [minRating, setMinRating] = useState(0)

  // Function to load real agency data
  const loadAgencies = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/agencies?status=approved")
      if (response.ok) {
        const data = await response.json()
        setAgencies(data)
        setFilteredAgencies(data)
      }
    } catch (error) {
      console.error("Ошибка загрузки агентств:", error)
    } finally {
      setLoading(false)
    }
  }

  // Load agencies on component mount
  useEffect(() => {
    loadAgencies()
  }, [])

  const applyFilters = () => {
    const filtered = agencies.filter((agency) => {
      const matchesSearch =
        agency.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        agency.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
        agency.country.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesType = !selectedType || agency.type === selectedType
      const matchesCountry = !selectedCountry || agency.country === selectedCountry
      const matchesRating = agency.rating >= minRating

      return matchesSearch && matchesType && matchesCountry && matchesRating
    })
    setFilteredAgencies(filtered)
  }

  const handleSearch = (query: string) => {
    setSearchQuery(query)
    setTimeout(applyFilters, 0)
  }

  const resetFilters = () => {
    setSelectedType("")
    setSelectedCountry("")
    setMinRating(0)
    setSearchQuery("")
    setFilteredAgencies(agencies)
  }

  const handleFilterChange = () => {
    setTimeout(applyFilters, 0)
  }

  const uniqueTypes = [...new Set(agencies.map((agency) => agency.type))]
  const uniqueCountries = [...new Set(agencies.map((agency) => agency.country))]

  const RatingIndicator = ({ rating }: { rating: number }) => {
    const percentage = (rating / 5) * 100
    return (
      <div className="relative w-24 h-3 bg-gray-800 rounded-full overflow-hidden">
        <div
          className="absolute top-0 left-0 h-full bg-gradient-to-r from-emerald-400 to-teal-400 rounded-full transition-all duration-500 neon-glow"
          style={{ width: `${percentage}%` }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs font-bold text-white neon-text">{rating}</span>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass-card rounded-2xl p-8 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-emerald-400" />
          <p className="text-gray-400">Загрузка агентств...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      {/* Mobile Navigation */}
      <MobileNav />

      {/* Header */}
      <header className="glass-card sticky top-0 z-50 border-b border-white/10">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {/* Header Title with Left Margin for Mobile Menu */}
              <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-400 via-teal-400 to-purple-400 bg-clip-text text-transparent neon-text ml-12 md:ml-0">
                ZENTO
              </h1>
              <span className="text-gray-400 text-sm hidden sm:block">Каталог агентств будущего</span>
            </div>
            <div className="flex items-center space-x-4">
              {/* Desktop Button for Adding Agency */}
              <Button
                onClick={() => router.push("/add-agency")}
                className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white border-0 neon-glow smooth-transition hidden sm:flex"
              >
                <Plus className="w-4 h-4 mr-2" />
                Добавить агентство
              </Button>
              {/* Mobile Button for Adding Agency */}
              <Button
                onClick={() => router.push("/add-agency")}
                size="sm"
                className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white border-0 neon-glow smooth-transition sm:hidden"
              >
                <Plus className="w-4 h-4" />
              </Button>
              <AuthButton />
            </div>
          </div>
        </div>
      </header>

      {/* Search and Filters */}
      <section className="container mx-auto px-6 py-8">
        <div className="glass-card rounded-2xl p-6 mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                placeholder="Поиск агентств..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10 bg-white/5 border-white/10 text-white placeholder-gray-400 focus:border-emerald-400 smooth-transition"
              />
            </div>
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className={`border-white/20 text-white hover:bg-white/10 smooth-transition bg-transparent ${showFilters ? "bg-white/10" : ""}`}
            >
              <Filter className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Фильтры</span>
            </Button>
          </div>

          {showFilters && (
            <div className="mt-6 pt-6 border-t border-white/10">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Сфера деятельности</label>
                  <select
                    value={selectedType}
                    onChange={(e) => {
                      setSelectedType(e.target.value)
                      handleFilterChange()
                    }}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:border-emerald-400 smooth-transition"
                  >
                    <option value="">Все сферы</option>
                    {uniqueTypes.map((type) => (
                      <option key={type} value={type} className="bg-gray-800">
                        {type}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Страна</label>
                  <select
                    value={selectedCountry}
                    onChange={(e) => {
                      setSelectedCountry(e.target.value)
                      handleFilterChange()
                    }}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:border-emerald-400 smooth-transition"
                  >
                    <option value="">Все страны</option>
                    {uniqueCountries.map((country) => (
                      <option key={country} value={country} className="bg-gray-800">
                        {country}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Рейтинг</label>
                  <select
                    value={minRating}
                    onChange={(e) => {
                      setMinRating(Number(e.target.value))
                      handleFilterChange()
                    }}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:border-emerald-400 smooth-transition"
                  >
                    <option value={0} className="bg-gray-800">
                      Любой рейтинг
                    </option>
                    <option value={1} className="bg-gray-800">
                      1+ звезда
                    </option>
                    <option value={2} className="bg-gray-800">
                      2+ звезды
                    </option>
                    <option value={3} className="bg-gray-800">
                      3+ звезды
                    </option>
                    <option value={4} className="bg-gray-800">
                      4+ звезды
                    </option>
                    <option value={5} className="bg-gray-800">
                      5 звезд
                    </option>
                  </select>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">Найдено агентств: {filteredAgencies.length}</span>
                <Button
                  onClick={resetFilters}
                  variant="outline"
                  size="sm"
                  className="border-white/20 text-white hover:bg-white/10 smooth-transition bg-transparent"
                >
                  <X className="w-4 h-4 mr-2" />
                  Сбросить
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* No results message */}
        {filteredAgencies.length === 0 && !loading && (
          <div className="glass-card rounded-2xl p-8 text-center">
            <div className="text-gray-400 mb-4">
              <Building2 className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <h3 className="text-xl font-semibold mb-2">Агентство не найдено</h3>
              <p>Не нашли нужное агентство? Добавьте его в каталог!</p>
            </div>
            <Button
              onClick={() => router.push("/add-agency")}
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white border-0 neon-glow smooth-transition mt-4"
            >
              <Plus className="w-4 h-4 mr-2" />
              Добавить новое агентство
            </Button>
          </div>
        )}

        {/* Agencies Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAgencies.map((agency, index) => (
            <Card
              key={agency.id}
              className="glass-card border-white/10 hover:border-emerald-400/50 smooth-transition float-animation group cursor-pointer"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="p-6">
                <div className="flex items-start space-x-4 mb-4">
                  <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-emerald-400/20 to-teal-400/20 flex items-center justify-center border border-white/10 group-hover:border-emerald-400/50 smooth-transition">
                    <img
                      src={agency.logo_url || "/placeholder.svg"}
                      alt={agency.name}
                      className="w-12 h-12 rounded-lg"
                    />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-white mb-1 group-hover:text-emerald-400 smooth-transition">
                      {agency.name}
                    </h3>
                    <div className="flex items-center space-x-2 text-sm text-gray-400">
                      <Building2 className="w-4 h-4" />
                      <span>{agency.type}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2 text-sm text-gray-400 mb-3">
                  <MapPin className="w-4 h-4" />
                  <span>{agency.country}</span>
                </div>

                <p className="text-gray-300 text-sm mb-4 line-clamp-2">{agency.description}</p>

                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm text-gray-400">Рейтинг:</span>
                  <RatingIndicator rating={agency.rating} />
                </div>

                <Button
                  onClick={() => router.push(`/agency/${agency.id}`)}
                  className="w-full bg-gradient-to-r from-emerald-500/20 to-teal-500/20 hover:from-emerald-500 hover:to-teal-500 text-emerald-400 hover:text-white border border-emerald-400/30 hover:border-transparent smooth-transition"
                >
                  Подробнее
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </section>
    </div>
  )
}
