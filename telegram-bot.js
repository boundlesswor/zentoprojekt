// Код для Telegram бота (запускать отдельно на сервере)
require("dotenv").config()
const TelegramBot = require("node-telegram-bot-api")
const { createClient } = require("@supabase/supabase-js")

const token = process.env.TELEGRAM_BOT_TOKEN
const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_ANON_KEY

if (!token || !supabaseUrl || !supabaseKey) {
  console.error("❌ Ошибка: Не найдены переменные окружения!")
  console.error("Создайте файл .env с переменными:")
  console.error("TELEGRAM_BOT_TOKEN=ваш_токен")
  console.error("SUPABASE_URL=ваш_url")
  console.error("SUPABASE_ANON_KEY=ваш_ключ")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)
const bot = new TelegramBot(token)

bot.on("message", async (msg) => {
  const chatId = msg.chat.id
  const text = msg.text
  const userId = msg.from.id
  const username = msg.from.username || msg.from.first_name || "Пользователь"

  if (text === "/start") {
    const welcomeMessage = `🚀 Добро пожаловать в ZENTO!

Привет, ${username}! 

ZENTO - это футуристичный каталог лучших агентств. Здесь вы можете:
• 📝 Добавлять свои агентства
• ⭐ Оставлять отзывы
• 🔍 Находить проверенные агентства

Для входа на сайт нажмите кнопку ниже:`

    const keyboard = {
      inline_keyboard: [[{ text: "🔑 Получить код для входа", callback_data: "get_code" }]],
    }

    bot.sendMessage(chatId, welcomeMessage, { reply_markup: keyboard })
  }
})

bot.on("callback_query", async (callbackQuery) => {
  const msg = callbackQuery.message
  const chatId = msg.chat.id
  const userId = callbackQuery.from.id
  const username = callbackQuery.from.username || ""
  const firstName = callbackQuery.from.first_name || ""
  const lastName = callbackQuery.from.last_name || ""

  console.log(`👤 Пользователь запросил код:`)
  console.log(`   Telegram ID: ${userId}`)
  console.log(`   Username: @${username}`)
  console.log(`   Имя: ${firstName} ${lastName}`)

  if (callbackQuery.data === "get_code") {
    try {
      const { data: existingUser } = await supabase.from("users").select("*").eq("telegram_id", userId).single()

      if (!existingUser) {
        // Создаем нового пользователя
        const { error: userError } = await supabase.from("users").insert([
          {
            telegram_id: userId,
            username: username,
            first_name: firstName,
            last_name: lastName,
            is_admin: false,
          },
        ])

        if (userError) {
          console.error("Ошибка создания пользователя:", userError)
          bot.answerCallbackQuery(callbackQuery.id, { text: "Ошибка создания пользователя" })
          return
        }
      }

      // Генерируем 6-значный код
      const code = Math.floor(100000 + Math.random() * 900000).toString()
      const now = new Date()
      const expirationTime = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000) // 3 дня

      console.log("Создание кода:", code)
      console.log("Текущее время (UTC):", now.toISOString())
      console.log("Время истечения (UTC):", expirationTime.toISOString())

      const { error } = await supabase.from("auth_codes").insert([
        {
          telegram_id: userId,
          code: code,
          expires_at: expirationTime.toISOString().replace("Z", "+00:00"), // Явно указываем UTC
        },
      ])

      if (error) {
        console.error("Ошибка сохранения кода:", error)
        bot.answerCallbackQuery(callbackQuery.id, { text: "Ошибка генерации кода" })
        return
      }

      const codeMessage = `🔐 Ваш код для входа: **${code}**

⏰ Код действителен 3 дня
🌐 Введите его на сайте ZENTO для авторизации

Удачи! 🚀`

      bot.sendMessage(chatId, codeMessage, { parse_mode: "Markdown" })
      bot.answerCallbackQuery(callbackQuery.id, { text: "Код сгенерирован!" })
    } catch (error) {
      console.error("Ошибка:", error)
      bot.answerCallbackQuery(callbackQuery.id, { text: "Произошла ошибка" })
    }
  }
})

// Для локального тестирования используем polling
bot.startPolling()

console.log("🤖 Telegram бот @orbitsanketa_bot запущен в режиме polling")
console.log("📱 Отправьте /start боту для получения кода авторизации")
